import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { loadSharedKnowledge, loadProductKnowledge, getProductById } from "./src/lib/knowledge";
import { generateLocalMessageFallback } from "./src/lib/messageFallback";
import { validateGeneratedMessage } from "./src/lib/messageValidator";
import { appendProgrammaticSignature } from "./src/lib/emailSignature";
import { shouldIncludeLink } from "./src/lib/outreachLink";
import { FunnelStage, IntentClassification, ProductKnowledge, SharedKnowledge } from "./src/types";

dotenv.config();

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!geminiClient && apiKey) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout (${ms}ms)`));
    }, ms);
  });

  return Promise.race([
    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        return res;
      },
      (err) => {
        clearTimeout(timeoutId);
        throw err;
      }
    ),
    timeoutPromise,
  ]);
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface InboundEmailEvent {
  id: string;
  from: string;
  senderEmail: string;
  to?: string;
  inReplyTo?: string;
  subject: string;
  text: string;
  intent: IntentClassification;
  reason?: string;
  receivedAt: string;
}

// Local in-memory buffer for inbound events (guarantees zero data loss and avoids polling errors if Supabase table is not provisioned)
let inMemoryInboundEvents: InboundEmailEvent[] = [];
let isSupabaseInboundAvailable: boolean | null = null;
let lastSupabaseCheckTime = 0;

const ipLimits = new Map<string, { count: number; reset: number }>();
const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const limit = 30;
  const windowMs = 60000;

  let userData = ipLimits.get(ip);
  if (!userData || now > userData.reset) {
    userData = { count: 0, reset: now + windowMs };
  }

  userData.count++;
  ipLimits.set(ip, userData);

  if (userData.count > limit) {
    return res.status(429).json({ error: "Troppe richieste (Rate limit: 30/min). Riprova tra un minuto." });
  }
  next();
};

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const publicPaths = ["/api/health", "/api/webhooks/resend-inbound", "/webhooks/resend-inbound"];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  const token = process.env.APP_ACCESS_TOKEN;
  if (!token) {
    // Se il token non è configurato sul server, permettiamo l'accesso (utile per il primo setup)
    // ma logghiamo un warning
    console.warn("APP_ACCESS_TOKEN non configurato. Accesso API pubblico attivo.");
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return res.status(401).json({ error: "Accesso non autorizzato (Token mancante o invalido)" });
  }
  next();
};

async function checkSupabaseInboundAvailability(): Promise<boolean> {
  if (!supabase) return false;
  const now = Date.now();
  // Cache check for 60 seconds
  if (isSupabaseInboundAvailable !== null && now - lastSupabaseCheckTime < 60000) {
    return isSupabaseInboundAvailable;
  }

  try {
    const { error } = await supabase.from("inbound_events").select("id").limit(1);
    lastSupabaseCheckTime = now;
    if (error) {
      if (isSupabaseInboundAvailable !== false) {
        console.warn(`[Supabase Inbound] Tabella 'inbound_events' non disponibile (${error.message || error.code}). Utilizzo storage in-memory locale.`);
      }
      isSupabaseInboundAvailable = false;
      return false;
    }
    isSupabaseInboundAvailable = true;
    return true;
  } catch {
    lastSupabaseCheckTime = now;
    isSupabaseInboundAvailable = false;
    return false;
  }
}

async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from("suppression_list")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .single();
    
    if (error && error.code !== "PGRST116") {
      console.warn(`[Supabase] Errore verifica suppression list per ${email}:`, error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error(`[Supabase] Eccezione verifica suppression list:`, err);
    return false;
  }
}

async function addToSuppressionList(email: string, reason: string) {
  if (!supabase) {
    console.warn(`[Suppression] Impossibile aggiungere ${email} alla lista (Supabase non configurato)`);
    return;
  }
  try {
    const { error } = await supabase.from("suppression_list").upsert({
      email: email.toLowerCase().trim(),
      reason,
      added_at: new Date().toISOString(),
    }, { onConflict: 'email' });
    
    if (error) {
      console.warn(`[Supabase] Errore aggiunta a suppression list:`, error.message);
    } else {
      console.log(`[Suppression] Email ${email} aggiunta alla lista (Motivo: ${reason})`);
    }
  } catch (err) {
    console.error(`[Supabase] Eccezione aggiunta suppression list:`, err);
  }
}

async function logAction(params: {
  action: string;
  lead_id?: string;
  product_id?: string;
  model?: string;
  outcome?: string;
  details?: any;
  run_id?: string;
}) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("agent_actions").insert([
      {
        ts: new Date().toISOString(),
        run_id: params.run_id || `run_${Date.now()}`,
        action: params.action,
        lead_id: params.lead_id,
        product_id: params.product_id,
        model: params.model,
        outcome: params.outcome || "success",
        details: params.details || {},
      },
    ]);
    if (error) console.warn("[Supabase] Errore log action:", error.message);
  } catch (err) {
    console.error("[Supabase] Eccezione log action:", err);
  }
}

async function getDailySentCountServer(): Promise<number> {
  if (!supabase) return 0;
  try {
    const zurichToday = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
    const { count, error } = await supabase
      .from("agent_actions")
      .select("*", { count: "exact", head: true })
      .eq("action", "sent")
      .gte("ts", `${zurichToday}T00:00:00Z`);

    if (error) {
      console.warn("[Supabase] Errore conteggio quota:", error.message);
      return 0;
    }
    return count || 0;
  } catch {
    return 0;
  }
}


// Helper heuristic classification when AI is unavailable
function classifyTextLocally(text: string): { intent: IntentClassification; reason: string } {
  const lower = (text || "").toLowerCase();

  if (
    lower.includes("disiscrivimi") ||
    lower.includes("unsubscribe") ||
    lower.includes("abmelden") ||
    lower.includes("désabonner") ||
    lower.includes("stop") ||
    lower.includes("no further emails") ||
    lower.includes("no more emails") ||
    lower.includes("non scrivermi") ||
    lower.includes("cancella")
  ) {
    return { intent: "unsubscribe", reason: "Richiesta di disiscrizione rilevata" };
  }

  if (
    lower.includes("out of office") ||
    lower.includes("fuori ufficio") ||
    lower.includes("assente") ||
    lower.includes("vacanza") ||
    lower.includes("reindirizzato") ||
    lower.includes("holiday") ||
    lower.includes("abwesenheitsnotiz")
  ) {
    return { intent: "out_of_office", reason: "Risposta automatica di assenza rilevata" };
  }

  if (
    lower.includes("pronti") ||
    lower.includes("attivare") ||
    lower.includes("contratto") ||
    lower.includes("link referral") ||
    lower.includes("chiudere") ||
    lower.includes("codice referral") ||
    lower.includes("siamo dentro") ||
    lower.includes("ready")
  ) {
    return { intent: "ready_to_close", reason: "Disponibilità immediata alla chiusura partnership" };
  }
  if (
    lower.includes("non siamo interessati") ||
    lower.includes("non accettiamo") ||
    lower.includes("no grazie") ||
    lower.includes("altre priorità") ||
    lower.includes("rifiuto")
  ) {
    return { intent: "not_interested", reason: "Rifiuto o disinteresse esplicito" };
  }
  if (
    lower.includes("quanto") ||
    lower.includes("percentuali") ||
    lower.includes("come funziona") ||
    lower.includes("dettagli") ||
    lower.includes("condizioni") ||
    lower.includes("minimo garantito") ||
    lower.includes("chiarimento") ||
    lower.includes("faq")
  ) {
    return { intent: "info_requested", reason: "Richiesta di informazioni tecniche o commerciali" };
  }

  return { intent: "interested", reason: "Interesse positivo generale o richiesta di incontro" };
}

// AI Classifier via OpenRouter
// AI Classifier with multi-provider support
async function classifyTextWithAI(
  text: string
): Promise<{ intent: IntentClassification; reason: string }> {
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();

  const prompt = `Sei un assistente commerciale B2B esperto. Classifica la seguente risposta ricevuta da un lead in una delle categorie di intento:
- "interested": Mostra interesse, chiede di fissare una call o approfondire la collaborazione.
- "info_requested": Chiede specifiche su percentuali, modalità operative, requisiti o dettagli tecnici.
- "ready_to_close": Vuole procedere immediatamente (chiede link referral, contratto, coupon o onboarding immediato).
- "not_interested": Rifiuta l'offerta o dice di non essere interessato.
- "unsubscribe": Chiede esplicitamente di essere rimosso, di non scrivere più o usa parole come STOP/DISISCRIVIMI.
- "out_of_office": Risposta automatica di assenza dall'ufficio o ferie.

Testo della risposta ricevuta:
"""
${text}
"""

Rispondi ESCLUSIVAMENTE con un JSON valido nel formato:
{"intent": "interested" | "info_requested" | "ready_to_close" | "not_interested" | "unsubscribe" | "out_of_office", "reason": "breve motivazione in italiano"}`;

  // 1. Try Gemini Flash if key is present
  if (geminiKey) {
    try {
      const genAI = getGemini();
      if (genAI) {
        const result = await withTimeout(genAI.models.generateContent({ 
          model: "gemini-flash-latest",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        }), 8000, "Gemini Classification");
        const data = JSON.parse(result.text || "{}");
        if (data.intent) return data;
      }
    } catch (e) {
      console.warn("Gemini Classification failed, falling back to OpenRouter:", e);
    }
  }

  // 2. Fallback to OpenRouter (llama-3-8b)
  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://affiliate-sales-agent.local",
          "X-Title": "Affiliate Sales Agent",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            intent: parsed.intent,
            reason: parsed.reason || "Classificato da OpenRouter",
          };
        }
      }
    } catch (err) {
      console.warn("OpenRouter Classification failed, using local heuristic:", err);
    }
  }

  return classifyTextLocally(text);
}

// Helpers for email content validation, signature handling, and greeting sanitization
function getProductDataText(config: any): string {
  const parts: string[] = [];
  if (config?.productName) {
    parts.push(config.productName);
  }
  if (config?.productAnalysis?.valueProposition) {
    parts.push(config.productAnalysis.valueProposition);
  }
  if (Array.isArray(config?.productAnalysis?.keyFeatures)) {
    parts.push(...config.productAnalysis.keyFeatures);
  }
  if (config?.productAnalysis?.pricingHint) {
    parts.push(config.productAnalysis.pricingHint);
  }
  if (config?.productDescription) {
    parts.push(config.productDescription);
  }
  if (config?.painPoint) {
    parts.push(config.painPoint);
  }
  if (config?.freeTrialText) {
    parts.push(config.freeTrialText);
  }
  return parts.join(" ");
}

function stripModelSignature(body: string): string {
  let cleaned = body.trim();
  // Cut any trailing closing phrases or signatures after the CTA question mark
  const lastQuestionIdx = cleaned.lastIndexOf("?");
  if (lastQuestionIdx !== -1) {
    const after = cleaned.slice(lastQuestionIdx + 1).trim();
    if (after.length > 0) {
      cleaned = cleaned.slice(0, lastQuestionIdx + 1).trim();
    }
  }
  return cleaned;
}

function sanitizeGreeting(body: string, isInformal: boolean, contactName?: string): string {
  const trimmed = body.trim();
  const cName = (contactName || "").trim();
  const expectedGreeting = cName
    ? (isInformal ? `Ciao ${cName},` : `Buongiorno ${cName},`)
    : (isInformal ? "Ciao," : "Buongiorno,");

  // If contactName is missing, enforce strictly "Ciao," or "Buongiorno," without any invented name
  if (!cName) {
    const lines = trimmed.split("\n");
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (/^(ciao|buongiorno|salve|gentile)\b/i.test(firstLine)) {
        lines[0] = expectedGreeting;
        return lines.join("\n");
      }
    }
  }
  return trimmed;
}

function isCountryOrEmpty(city?: string): boolean {
  if (!city) return true;
  const lower = city.trim().toLowerCase();
  const countries = [
    "svizzera", "suisse", "schweiz", "switzerland", "ch",
    "italia", "italy", "it", "germany", "deutschland", "de",
    "france", "fr"
  ];
  return countries.includes(lower);
}

// Single helper for generating messages with FunnelStage awareness
async function generateMessageInternal(
  lead: any,
  config: any,
  stage: FunnelStage = "awareness"
): Promise<{ subject: string; body: string; generatedBy: "gemini" | "openrouter" | "fallback"; wordCount: number }> {
  const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
  const openRouterApiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const modelOpenRouter = (config?.openRouterModel || "meta-llama/llama-3-8b-instruct:free").trim();
  const modelGemini = process.env.GEMINI_PRODUCT_MODEL || "gemini-2.0-flash-exp";
  
  const product_id = config.product_id || 'legacy';
  const kbProduct = product_id !== 'legacy' ? getProductById(product_id) : null;
  const shared = loadSharedKnowledge();

  const tone = lead.toneOfVoice || "Formale";
  const language = lead.language || "it";

  const targetUrl = (config?.productUrl || config?.productAnalysis?.sourceUrl || "").trim();
  const productName = (config?.productName || "").trim();
  const emailFromName = (config?.emailFromName || "").trim();

  if (!productName || !emailFromName) {
    throw new Error("Configura nome prodotto e mittente prima di generare le email");
  }

  const valueProp = (kbProduct?.description || config?.productAnalysis?.valueProposition || config?.productDescription || "").trim();
  const productDataText = getProductDataText(config);

  // Intelligently resolve the specific sector / merchandise category
  const rawInd = (lead.industry || "").trim();
  const rawLower = rawInd.toLowerCase();
  let categoryClean = rawInd;
  if (!rawInd || ["e-commerce", "ecommerce", "web", "online", "non specificato", "generico", "digitale", "aziendale", "altro"].includes(rawLower)) {
    const ctx = `${lead.shopName || ""} ${lead.shortNotes || ""} ${config?.targetMerchandiseCategory || ""} ${config?.targetAudience || ""}`.toLowerCase();
    if (/(pittur|pittor|imbianchin|verniciat|tintegg|cartongess|facciat)/i.test(ctx)) {
      categoryClean = "Pittura & Imbiancatura";
    } else if (/(idraulic|plumb|sanitar|tubatur|riscaldament|caldai|pompa.*calor|termoidraulic)/i.test(ctx)) {
      categoryClean = "Idraulica & Termoidraulica";
    } else if (/(clean|puliz|sanific|disinfez|lavagg|vetri|multiserv|facility|sgomber|tsunami)/i.test(ctx)) {
      categoryClean = "Pulizie & Multiservizi";
    } else if (/(edil|costruzion|ristruttur|murator|cantiere|paviment|piastrell|tetto|tetti)/i.test(ctx)) {
      categoryClean = "Edilizia & Ristrutturazioni";
    } else if (/(elettric|elettro|impiant.*elettric|fotovoltaic|domotic)/i.test(ctx)) {
      categoryClean = "Elettricisti & Impianti Elettrici";
    } else if (/(falegnam|serrament|infiss|porte|finestr)/i.test(ctx)) {
      categoryClean = "Falegnameria & Serramenti";
    } else if (/(fabbr|carpenteri.*metallic|ringhier|cancell)/i.test(ctx)) {
      categoryClean = "Fabbri & Carpenteria Metallica";
    } else if (/(giardin|verde|potatur|alber|prat|paesaggist)/i.test(ctx)) {
      categoryClean = "Giardinaggio & Manutenzione Verde";
    } else if (/(climatizz|condizionat|aeraulic|ventilazion)/i.test(ctx)) {
      categoryClean = "Climatizzazione & Riscaldamento";
    } else if (/(auto|moto|officin|meccanic|carrozzer|gommist)/i.test(ctx)) {
      categoryClean = "Auto, Moto & Officine Meccaniche";
    } else if (/(architett|geometr|ingegner|progettazion|studio.*tecnic)/i.test(ctx)) {
      categoryClean = "Studi Tecnici, Architetti & Geometri";
    } else if (/(fiduciar|commercialist|contabil|tributar|avvocat|consulenz)/i.test(ctx)) {
      categoryClean = "Consulenza Aziendale, Fiscale & Fiduciaria";
    } else if (/(honey|miele|alpi|food|cibo|vino|wine|olio|pasta|dolci|cioccolat|gourmet|caffè|caffe|bio|alimentar)/i.test(ctx)) {
      categoryClean = "Alimentare & Enogastronomia";
    } else if (/(gioiell|jewel|bijoux|anelli|collane|orecchini|bracciali|preziosi|orolog)/i.test(ctx)) {
      categoryClean = "Gioielli, Orologi & Bijoux";
    } else if (/(\bart\b|wall\s*art|stampe|poster|quadri|dipint|illustrazion|grafic|foto|decorazion)/i.test(ctx)) {
      categoryClean = "Casa, Decorazioni & Arte";
    } else if (/(book|libri|editor|author|autore|guide|romanzo|kdp|racconti|fumetti)/i.test(ctx)) {
      categoryClean = "Editoria & Guide";
    } else if (/(fashion|moda|accessori|borse|bags|abbigliamento|vestiti|scarpe|tessuti|sartoria|pelletteria)/i.test(ctx)) {
      categoryClean = "Moda, Abbigliamento & Accessori";
    } else if (/(casa|home|arred|mobil|design|interior|lampade|candele|ceramica)/i.test(ctx)) {
      categoryClean = "Casa, Arredamento & Design";
    } else if (/(beauty|bellezza|cosmet|skincare|creme|saponi|make-?up|profum|benessere)/i.test(ctx)) {
      categoryClean = "Bellezza & Cosmetica";
    } else if (/(artigian|handmade|fatto\s*a\s*mano|cuoio|legno)/i.test(ctx)) {
      categoryClean = "Artigianato & Fatto a Mano";
    } else if (/(sport|fitness|outdoor|bici|trekking|montagna)/i.test(ctx)) {
      categoryClean = "Sport & Tempo Libero";
    } else if (config?.targetMerchandiseCategory) {
      categoryClean = config.targetMerchandiseCategory;
    } else {
      categoryClean = "Servizi & Imprese Locali";
    }
  }

  const pLower = (lead.platform || "").toLowerCase();
  const isServiceOrCraft = /(pittur|idraulic|puliz|multiserv|edil|elettric|falegnam|fabbr|giardin|climatizz|meccanic|artigian|consulenz|studi|architett)/i.test(categoryClean);
  let platformLabel = isServiceOrCraft ? "sito web e presenza sul territorio" : "store online";
  if (pLower.includes("etsy")) platformLabel = "shop Etsy";
  else if (pLower.includes("shopify")) platformLabel = "store Shopify";
  else if (pLower.includes("amazon") || pLower.includes("kdp")) platformLabel = "pubblicazioni Amazon KDP";
  else if (pLower.includes("instagram") || pLower.includes("ig")) platformLabel = "pagina Instagram";
  else if (pLower.includes("linkedin")) platformLabel = "profilo LinkedIn";
  else if (pLower.includes("web") || !pLower) {
    platformLabel = isServiceOrCraft ? "sito web e attività sul territorio" : "presenza online e sito web";
  }

  const isFirstContact = stage === "awareness";
  const includeLink = !isFirstContact || Boolean(config?.includeLinkInFirstContact);

  // Build FATTI USABILI with ONLY verified non-empty fields
  const fattiUsabili: string[] = [];
  if (lead.shopName?.trim()) {
    fattiUsabili.push(`Nome attività/insegna: "${lead.shopName.trim()}"`);
  }
  if (lead.contactName?.trim()) {
    fattiUsabili.push(`Nome referente: "${lead.contactName.trim()}"`);
  }
  if (categoryClean?.trim()) {
    fattiUsabili.push(`Settore o categoria merceologica: "${categoryClean.trim()}"`);
  }
  if (lead.platform?.trim()) {
    fattiUsabili.push(`Piattaforma/Canale principale: "${platformLabel} (${lead.platform.trim()})"`);
  }
  const resolvedCity = isCountryOrEmpty(lead.city) ? "" : lead.city.trim();
  if (resolvedCity || lead.canton?.trim()) {
    const loc = [resolvedCity, lead.canton?.trim()].filter(Boolean).join(", ");
    fattiUsabili.push(`Località: "${loc}"`);
  }
  if (lead.shortNotes?.trim()) {
    fattiUsabili.push(`Note specifiche verificate: "${lead.shortNotes.trim()}"`);
  }
  if (lead.businessSignals) {
    const bs = lead.businessSignals;
    if (typeof bs.numProducts === "number" && bs.numProducts > 0) {
      fattiUsabili.push(`Numero prodotti a catalogo: ${bs.numProducts}`);
    }
    if (typeof bs.numReviews === "number" && bs.numReviews > 0) {
      fattiUsabili.push(`Numero recensioni clienti: ${bs.numReviews}`);
    }
    if (typeof bs.monthsActive === "number" && bs.monthsActive > 0) {
      fattiUsabili.push(`Mesi di attività: ${bs.monthsActive}`);
    }
    if (bs.estimatedRevenue && typeof bs.estimatedRevenue === "string" && bs.estimatedRevenue.trim()) {
      fattiUsabili.push(`Fatturato stimato: "${bs.estimatedRevenue.trim()}"`);
    }
  }
  if (fattiUsabili.length === 0) {
    fattiUsabili.push(`Settore: "${categoryClean || "Attività locale"}"`);
    if (platformLabel) fattiUsabili.push(`Canale: "${platformLabel}"`);
    if (resolvedCity) fattiUsabili.push(`Città: "${resolvedCity}"`);
  }

  const fattiUsabiliText = fattiUsabili.join(" ");

  const systemPrompt = stage === "awareness"
    ? `Sei un copywriter B2B senior specializzato in cold email outreach brevi, specifiche e ad altissima risposta.
Le tue email NON devono mai sembrare newsletter o brochure promozionali, ma comunicazioni personali dirette tra due professionisti.

STRUTTURA TASSATIVA PER L'EMAIL DI PRIMO CONTATTO (AWARENESS):
Scrivi esattamente in questo formato (no elenchi, no grassetto, no emoji):

[Saluto iniziale, es. Buongiorno o Ciao, seguito eventualmente dal nome del referente]

[Target] spesso riscontrano che [PainPoint].

[Nome Prodotto] [Beneficio in una frase].[Testo di prova gratuita se fornito, es. Offriamo una prova gratuita di 14 giorni.]

Registrarsi è semplice, basta questo link:
[URL Prodotto]

Cordiali saluti,
[Nome Mittente]
[Nome Prodotto]

Se non desiderate ricevere altre email, rispondete con STOP. (In inglese: If you do not wish to receive further emails, please reply with STOP. In tedesco/francese: Stop-line corrispondente)

VINCOLI TASSATIVI:
- Nessun punto interrogativo "?" nell'intera email (nessuna domanda o CTA a domanda per questo stage).
- L'URL del prodotto deve essere posizionato esattamente su una riga separata subito dopo la riga d'invito.
- La riga di disiscrizione con STOP è obbligatoria come ultima riga.
- Lunghezza massima del corpo: 90 parole.
- Oggetto dell'email: da 3 a 6 parole, tutto minuscolo, senza "gratis", senza esclamativi o maiuscole.
- Rispondi ESCLUSIVAMENTE con un JSON valido: {"subject": "...", "body": "..."}`
    : `Sei un copywriter B2B senior specializzato in cold email outreach brevi, specifiche e ad altissima risposta.
Le tue email NON devono mai sembrare newsletter, brochure o messaggi promozionali generici, ma comunicazioni personali dirette tra due professionisti.

STRUTTURA TASSATIVA DELL'EMAIL (EVALUATION / PURCHASE):
Scrivi in pura prosa (NO elenchi puntati o numerati, NO testo in grassetto, NO emoji), articolata esattamente in 4 blocchi consecutivi separati da riga vuota:
1. OSSERVAZIONE (esattamente 1 frase): un fatto reale del lead, ricavato solo ed esclusivamente dalla lista "FATTI USABILI". È severamente vietato inventare numeri, fatturati, dipendenti o problemi inesistenti.
2. PROBLEMA O COSTO (esattamente 1 frase): un problema reale o un costo nascosto specifico per la tipologia di attività del lead.
3. SOLUZIONE (1 o 2 frasi): espressa come beneficio concreto e tangibile per il lead, MAI come elenco di funzionalità.
4. CALL TO ACTION (CTA, esattamente 1 frase): una sola domanda sì/no a bassissima frizione per verificare l'interesse.
Se includi un link, posizionalo su una riga separata DOPO la domanda finale della CTA.

VINCOLI TASSATIVI:
- Esattamente un solo punto interrogativo ("?") in tutto il corpo del messaggio (nella domanda finale).
- L'URL del prodotto (se incluso) deve essere posizionato su una riga separata come ultima riga.
- Lunghezza massima del corpo: 90 parole.
- Oggetto dell'email: da 3 a 6 parole, tutto minuscolo, specifico e coerente col lead.
- Rispondi ESCLUSIVAMENTE con un JSON valido: {"subject": "...", "body": "..."}`;

  const contactGreetingRule = lead.contactName?.trim()
    ? `Usa "${tone === "Informale" ? `Ciao ${lead.contactName.trim()},` : `Buongiorno ${lead.contactName.trim()},`}"`
    : `Usa rigorosamente "${tone === "Informale" ? "Ciao," : "Buongiorno,"}" (non inventare nomi di persona!)`;

  const freeTrialTextParam = (config?.freeTrialText || "").trim();
  const toneDesc = shared?.tone || (tone === "Informale" ? "Informale e diretto" : "Professionale e consulenziale");

  const userPrompt = stage === "awareness"
    ? `FATTI USABILI DEL LEAD:
${fattiUsabili.map((f) => `- ${f}`).join("\n")}

CONTESTO PRODOTTO:
- Nome Prodotto: ${productName}
- Proposta di Valore (Beneficio): ${valueProp || "Ottimizzazione processi e conversione commerciale"}
- Problema specifico (Pain Point): ${config?.painPoint || "dispersione di tempo operativo nella gestione delle vendite"}
- Testo Prova/Gratuità (se presente): ${freeTrialTextParam || "(nessuno)"}
- Link/URL: ${targetUrl}
- Nome Mittente: ${emailFromName}

PARAMETRI EMAIL:
- Lingua da usare: ${language}
- Tono di voce: ${toneDesc}
- Saluto iniziale: ${contactGreetingRule}
`
    : `FATTI USABILI DEL LEAD:
${fattiUsabili.map((f) => `- ${f}`).join("\n")}

CONTESTO PRODOTTO:
- Nome Prodotto: ${productName}
- Proposta di Valore: ${valueProp}
- Link/URL: ${includeLink ? targetUrl : "NESSUN LINK (vietato nel primo contatto)"}

PARAMETRI EMAIL:
- Lingua: ${language}
- Tono: ${toneDesc}
- Saluto iniziale: ${contactGreetingRule}
`;

  // Server-side DEBUG log (solo in sviluppo, NON in produzione)
  if (process.env.NODE_ENV !== "production") {
    console.log("\n==================== [DEBUG DEV: FATTI USABILI] ====================");
    console.log(fattiUsabili.length > 0 ? fattiUsabili.map((f) => `- ${f}`).join("\n") : "(Nessun fatto usabile)");
    console.log("====================================================================");
    console.log("\n==================== [DEBUG DEV: USER PROMPT] ====================");
    console.log(userPrompt);
    console.log("==================================================================\n");
  }

  // Se l'opzione useFixedAwarenessTemplate è attiva nello stage awareness, saltiamo l'AI
  if (stage === "awareness" && config?.useFixedAwarenessTemplate) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[server.ts] Saltata generazione AI (useFixedAwarenessTemplate attivo)");
    }
    const fallbackMsg = generateLocalMessageFallback(lead, config || { productName: "Nostro Prodotto" }, stage);
    const fallbackBody = String(fallbackMsg.body || "").trim();
    const fallbackSubject = String(fallbackMsg.subject || "").trim();
    const wordCount = fallbackBody.split(/\s+/).filter(Boolean).length;
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      generatedBy: "fallback",
      wordCount,
    };
  }

  // 1. Try Gemini API first (available natively in AI Studio)
  const gemini = getGemini();
  if (gemini) {
    let currentPrompt = userPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const geminiRes = await withTimeout(
          gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: currentPrompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.5,
            },
          }),
          25000,
          "Gemini generateMessage"
        );
        const content = geminiRes.text || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.subject && parsed.body) {
            let candidateBody = stripModelSignature(String(parsed.body));
            candidateBody = sanitizeGreeting(candidateBody, tone === "Informale", lead.contactName);

            const validation = validateGeneratedMessage(
              { subject: String(parsed.subject).trim(), body: candidateBody },
              {
                stage,
                includeLink,
                allowedFactsText: fattiUsabiliText,
                productDataText,
                targetUrl: includeLink ? targetUrl : undefined,
                productName,
                emailFromName: config?.emailFromName || '',
              }
            );

            if (validation.valid) {
              let finalBody = stage === "awareness" ? candidateBody : appendProgrammaticSignature(candidateBody, config);
              
              // Appendi STOP line se non è già presente
              const stopKeywords = ["stop", "ricevere altre email", "no further emails", "wish to receive"];
              const hasStop = stopKeywords.some((keyword) => finalBody.toLowerCase().includes(keyword));
              if (!hasStop) {
                const lang = lead.language || "it";
                const isInformal = tone === "Informale";
                let stopLine = "";
                if (lang === "en") {
                  stopLine = "If you do not wish to receive further emails, please reply with STOP.";
                } else if (lang === "de") {
                  stopLine = "Wenn Sie keine weiteren E-Mails erhalten möchten, antworten Sie bitte mit STOP.";
                } else if (lang === "fr") {
                  stopLine = "Si vous ne souhaitez plus recevoir d'e-mails, répondez par STOP.";
                } else {
                  stopLine = isInformal 
                    ? "Se non desideri ricevere altre email, rispondi con STOP." 
                    : "Se non desiderate ricevere altre email, rispondete con STOP.";
                }
                finalBody = `${finalBody}\n\n${stopLine}`;
              }

              const wordCount = finalBody.split(/\s+/).filter(Boolean).length;
              return {
                subject: String(parsed.subject).trim(),
                body: finalBody,
                generatedBy: "gemini",
                wordCount,
              };
            } else {
              if (process.env.NODE_ENV !== "production") {
                console.warn(`[DEBUG DEV: VALIDATORE GEMINI TENTATIVO ${attempt + 1} FALLITO]:`, validation.errors);
              }
              currentPrompt = `${userPrompt}\n\nATTENZIONE - ERRORE DI VALIDAZIONE:\nCorreggi i seguenti punti tassativi:\n${validation.errors.map((e) => `- ${e}`).join("\n")}\n\nRiscrivi l'email rispettando rigorosamente tutte le regole.`;
            }
          }
        }
      } catch (geminiErr: any) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Gemini generateMessage] Non disponibile (${geminiErr?.message || geminiErr}), passaggio a provider successivo.`);
        }
        break;
      }
    }
  }

  // 2. Try OpenRouter if API key is provided
  if (openRouterApiKey) {
    let currentPrompt = userPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controllerOpenRouter = new AbortController();
      const timeoutOpenRouter = setTimeout(() => controllerOpenRouter.abort(), 10000);
      try {
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controllerOpenRouter.signal,
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://affiliate-sales-agent.local",
            "X-Title": "Affiliate Sales Agent",
          },
          body: JSON.stringify({
            model: modelOpenRouter,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: currentPrompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        });
        clearTimeout(timeoutOpenRouter);

        if (openRouterRes.ok) {
          const data = (await openRouterRes.json()) as any;
          const content = data.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.subject && parsed.body) {
              let candidateBody = stripModelSignature(String(parsed.body));
              candidateBody = sanitizeGreeting(candidateBody, tone === "Informale", lead.contactName);

              const validation = validateGeneratedMessage(
                { subject: String(parsed.subject).trim(), body: candidateBody },
                {
                  stage,
                  includeLink,
                  allowedFactsText: fattiUsabiliText,
                  productDataText,
                  targetUrl: includeLink ? targetUrl : undefined,
                  productName,
                  emailFromName: config?.emailFromName || '',
                }
              );

              if (validation.valid) {
                const finalBody = stage === "awareness" ? candidateBody : appendProgrammaticSignature(candidateBody, config, lead.language || 'it');
                const wordCount = finalBody.split(/\s+/).filter(Boolean).length;
                return {
                  subject: String(parsed.subject).trim(),
                  body: finalBody,
                  generatedBy: "openrouter",
                  wordCount,
                };
              } else {
                if (process.env.NODE_ENV !== "production") {
                  console.warn(`[DEBUG DEV: VALIDATORE OPENROUTER TENTATIVO ${attempt + 1} FALLITO]:`, validation.errors);
                }
                currentPrompt = `${userPrompt}\n\nATTENZIONE - ERRORE DI VALIDAZIONE:\nCorreggi i seguenti punti tassativi:\n${validation.errors.map((e) => `- ${e}`).join("\n")}\n\nRiscrivi l'email rispettando rigorosamente tutte le regole.`;
              }
            }
          }
        }
      } catch (aiErr) {
        clearTimeout(timeoutOpenRouter);
        if (process.env.NODE_ENV !== "production") {
          console.warn("Chiamata OpenRouter fallita in generateMessageInternal, fallback:", aiErr);
        }
        break;
      }
    }
  }

  // 3. Fallback (guaranteed compliant)
  const fallbackMsg = generateLocalMessageFallback(lead, config || { productName: "Nostro Prodotto" }, stage);
  const fallbackBody = String(fallbackMsg.body || "").trim();
  const fallbackSubject = String(fallbackMsg.subject || "").trim();
  const wordCount = fallbackBody.split(/\s+/).filter(Boolean).length;
  return {
    subject: fallbackSubject,
    body: fallbackBody,
    generatedBy: "fallback",
    wordCount,
  };
}

// Single helper for dispatching email via Resend or Simulation
async function sendEmailInternal(
  to: string,
  subject: string,
  body: string,
  config?: any
): Promise<{ success: boolean; simulated: boolean; messageId?: string; error?: string }> {
  const cleanKey = (key: any) =>
    (typeof key === "string" ? key : "")
      .replace(/^["']|["']$/g, "")
      .replace(/^Bearer\s+/i, "")
      .trim();

  const serverKey = cleanKey(process.env.RESEND_API_KEY);
  const apiKey = serverKey;

  const cleanString = (val: any) =>
    (typeof val === "string" ? val : "")
      .replace(/^["']|["']$/g, "")
      .trim();

  const fromName = cleanString(config?.emailFromName || process.env.EMAIL_FROM_NAME || "Commerciale");
  
  // Resolve fromAddress: prefer config.emailFromAddress, fallback to env unless it's a webmail like gmail, default to commerciale@sititicino.ch
  let fromAddress = cleanString(config?.emailFromAddress);
  if (!fromAddress) {
    const envFrom = cleanString(process.env.EMAIL_FROM_ADDRESS);
    if (envFrom && !/@(gmail|googlemail|yahoo|hotmail|outlook)\.com$/i.test(envFrom)) {
      fromAddress = envFrom;
    } else {
      fromAddress = "commerciale@sititicino.ch";
    }
  }
  fromAddress = fromAddress.replace(/^mailto:\s*/i, "").replace(/^["']|["']$/g, "").trim() || "commerciale@sititicino.ch";
  const formattedFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  // Resolve replyTo: strip any "mailto:" prefix and quotes, guaranteed pure email address
  let rawReplyTo = cleanString(
    config?.emailReplyTo ||
    process.env.EMAIL_REPLY_TO ||
    process.env.EMAIL_REPLY_TO_ADDRESS ||
    "risposte@inbound.sititicino.ch"
  );
  const cleanReplyTo = rawReplyTo
    .replace(/^mailto:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim() || "risposte@inbound.sititicino.ch";

  // If no API key is found on client nor on server, do NOT silently fake a send; return clear error
  if (!apiKey) {
    return {
      success: false,
      simulated: false,
      error: "Nessuna chiave Resend API trovata. Inserisci la tua API Key (team 'sale.autoagent') nel tab 'Prodotto & Setup' o configurala nelle variabili d'ambiente (RESEND_API_KEY) su Vercel.",
    };
  }

  try {
    const payload: any = {
      from: formattedFrom,
      to: [to],
      reply_to: cleanReplyTo,
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${body.replace(/\n/g, "<br>")}</div>`,
      headers: {
        "List-Unsubscribe": `<mailto:${cleanReplyTo}?subject=STOP>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };

    // Direct POST /emails without any preliminary GET /domains
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resData = (await resendRes.json().catch(() => ({}))) as any;

    if (resendRes.ok) {
      return {
        success: true,
        simulated: false,
        messageId: resData?.id,
      };
    } else {
      let exactErrorMsg =
        resData?.message ||
        resData?.error ||
        (typeof resData === "string" ? resData : "") ||
        `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText || ""}`;

      if (exactErrorMsg.includes("is not verified") || exactErrorMsg.includes("domain")) {
        exactErrorMsg += " (Verifica che la chiave API appartenga al team 'sale.autoagent' su resend.com/api-keys e non al tuo account personale)";
      }

      return {
        success: false,
        simulated: false,
        error: exactErrorMsg,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      simulated: false,
      error: err?.message || "Errore di connessione a Resend",
    };
  }
}

const app = express();
const PORT = 3000;

// Middleware per catturare il body grezzo dei webhook PRIMA del parser JSON globale
app.post(["/api/webhooks/resend-inbound", "/webhooks/resend-inbound"], express.raw({ type: 'application/json' }));

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object" && !(req.body instanceof Buffer)) {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Restricted CORS headers for API requests
app.use((req, res, next) => {
  const appUrl = process.env.APP_URL || "*";
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Auth and Rate Limit middleware
app.use("/api", authMiddleware);
app.use("/api/send-email", rateLimitMiddleware);
app.use("/api/generate-message", rateLimitMiddleware);
app.use("/api/autopilot/run", rateLimitMiddleware);

// Helper to extract structured analysis from HTML directly as fallback or primary
function extractProductAnalysisFromHtml(htmlText: string, cleanedText: string, url: string) {
  const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
  const title = rawTitle.replace(/\s*[|\-—–].*$/, "").trim() || rawTitle;

  const metaDescMatch = htmlText.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)
    || htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const h1 = Array.from(htmlText.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(t => t.length > 5);

  const h2 = Array.from(htmlText.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(t => t.length > 5 && !t.toLowerCase().includes("cookie") && !t.toLowerCase().includes("privacy"));

  const liMatches = Array.from(htmlText.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(t => t.length > 10 && t.length < 150 && !t.toLowerCase().includes("cookie") && !t.toLowerCase().includes("privacy"));

  let derivedName = title;
  if (!derivedName || derivedName.toLowerCase().includes("home") || derivedName.length < 3) {
    try {
      const parsedUrl = new URL(url);
      derivedName = parsedUrl.hostname.replace(/^www\./, "").split(".")[0];
      derivedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
    } catch {
      derivedName = h1[0] || "Prodotto Online";
    }
  }

  const valueProposition = metaDescription || h1[0] || (title ? `${title} — Soluzione innovativa per professionisti e aziende.` : "Piattaforma e servizio dedicato.");

  const candidateFeatures = h2.length >= 3 ? h2.slice(0, 5) : (liMatches.length >= 3 ? liMatches.slice(0, 5) : [...h2, ...liMatches].slice(0, 5));
  const keyFeatures = candidateFeatures.length > 0 ? candidateFeatures : [
    "Creazione rapida e gestione automatizzata",
    "Piattaforma cloud accessibile da desktop e mobile",
    "Funzionalità conformi alle normative e standard di settore",
    "Supporto e onboarding dedicato"
  ];

  let targetAudience = "Aziende, professionisti e attività commerciali";
  const lowerText = cleanedText.toLowerCase();
  if (lowerText.includes("artigian") || lowerText.includes("idraulic") || lowerText.includes("elettricist")) {
    targetAudience = "Artigiani, professionisti e ditte individuali (Svizzera e Ticino)";
  } else if (lowerText.includes("e-commerce") || lowerText.includes("negozi online") || lowerText.includes("shopify")) {
    targetAudience = "Brand e-commerce e negozi online";
  } else if (lowerText.includes("creator") || lowerText.includes("influencer")) {
    targetAudience = "Content creator e influencer digitali";
  } else if (lowerText.includes("b2b") || lowerText.includes("pmi")) {
    targetAudience = "PMI e aziende B2B";
  }

  let offerType: "software" | "digital_product" | "affiliate" | "collab" | "sponsorship" = "digital_product";
  if (lowerText.includes("software") || lowerText.includes("saas") || lowerText.includes("app") || lowerText.includes("piattaforma") || lowerText.includes("cloud")) {
    offerType = "software";
  } else if (lowerText.includes("affiliazione") || lowerText.includes("affiliate") || lowerText.includes("provvigione") || lowerText.includes("commission")) {
    offerType = "affiliate";
  }

  const priceMatch = cleanedText.match(/(?:CHF|€|\$)\s*\d+[\.,]?\d*(?:\s*\/\s*(?:mese|anno|month|year))?/i)
    || (lowerText.includes("gratis") || lowerText.includes("free") ? "Versione di prova gratuita disponibile" : null);
  const pricingHint = typeof priceMatch === "string" ? priceMatch : (priceMatch ? priceMatch[0] : null);

  const feat1 = keyFeatures[0] || "funzionalità avanzate";
  const feat2 = keyFeatures[1] || "gestione centralizzata";

  const funnelAssets = {
    awareness: [
      `Guida introduttiva: come ottimizzare i processi e superare le criticità con ${derivedName}`,
      `Report di approfondimento sulle potenzialità di ${derivedName} per ${feat1.toLowerCase()}`,
    ],
    evaluation: [
      `Panoramica interattiva e demo delle funzionalità chiave di ${derivedName} (${feat1} e ${feat2})`,
      pricingHint
        ? `Analisi del ritorno sull'investimento (ROI) e proposta economica di ${derivedName} (${pricingHint})`
        : `Scheda tecnica comparativa e analisi dell'impatto aziendale di ${derivedName}`,
    ],
    purchase: [
      pricingHint
        ? `Attivazione immediata dell'offerta dedicata a ${derivedName} (${pricingHint}) su: ${url}`
        : `Attivazione immediata e onboarding prioritario per ${derivedName}: ${url}`,
      `Consulenza personalizzata e supporto all'avvio su misura per ${derivedName}`,
    ],
  };

  return {
    productName: derivedName,
    valueProposition,
    keyFeatures,
    targetAudience,
    tone: "Professionale",
    pricingHint,
    offerType,
    sourceUrl: url,
    funnelAssets,
  };
}

// Helper to validate that each funnel stage is an array of non-empty strings, falling back if not
function sanitizeFunnelAssets(
  candidate: any,
  fallback: { awareness?: string[]; evaluation?: string[]; purchase?: string[] }
): { awareness: string[]; evaluation: string[]; purchase: string[] } {
  const stages = ["awareness", "evaluation", "purchase"] as const;
  const safeFallback = {
    awareness: Array.isArray(fallback?.awareness) ? fallback.awareness : [],
    evaluation: Array.isArray(fallback?.evaluation) ? fallback.evaluation : [],
    purchase: Array.isArray(fallback?.purchase) ? fallback.purchase : [],
  };

  if (!candidate || typeof candidate !== "object") {
    return safeFallback;
  }

  const result: { awareness: string[]; evaluation: string[]; purchase: string[] } = {
    awareness: safeFallback.awareness,
    evaluation: safeFallback.evaluation,
    purchase: safeFallback.purchase,
  };

  for (const stage of stages) {
    const candidateStage = candidate[stage];
    if (
      Array.isArray(candidateStage) &&
      candidateStage.length > 0 &&
      candidateStage.every((item: any) => typeof item === "string" && item.trim().length > 0)
    ) {
      result[stage] = candidateStage.map((item: string) => item.trim());
    } else {
      result[stage] = safeFallback[stage];
    }
  }

  return result;
}

// Normalize request URL if routed through Vercel rewrites or catch-all functions
app.use((req, _res, next) => {
  const forwardedUri = (req.headers["x-forwarded-uri"] || req.headers["x-invoke-path"]) as string;
  const matchedPath = req.headers["x-matched-path"] as string;

  if (forwardedUri && typeof forwardedUri === "string" && forwardedUri.startsWith("/api")) {
    req.url = forwardedUri;
  } else if (matchedPath && typeof matchedPath === "string" && !matchedPath.includes("[") && matchedPath !== "/api" && matchedPath !== "/") {
    req.url = matchedPath;
  }

  if (req.query && typeof req.query.all !== "undefined") {
    const segments = Array.isArray(req.query.all) ? req.query.all : [req.query.all];
    req.url = "/api/" + segments.join("/");
  } else if (req.query && typeof req.query.path === "string") {
    req.url = "/" + req.query.path.replace(/^\//, "");
  }
  next();
});

app.get(["/api", "/api/"], (req, res) => {
  res.json({ status: "ok", service: "Affiliate Sales Agent API" });
});

app.get(["/api/health", "/health"], async (req, res) => {
  let inboundEventsCount = inMemoryInboundEvents.length;
  if (supabase && (await checkSupabaseInboundAvailability())) {
    try {
      const { count, error } = await supabase
        .from("inbound_events")
        .select("*", { count: "exact", head: true });
      if (!error && count !== null) {
        inboundEventsCount = count;
      }
    } catch {
      // Fallback to in-memory count
    }
  }
  res.json({
    status: "ok",
    inboundEventsCount,
  });
});

// Endpoint to check server-side configuration status (booleans and public info only)
app.get(["/api/config-status", "/config-status"], async (req, res) => {
    const dailySent = await getDailySentCountServer();
    const rawOpenRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
    const openRouterConfigured = Boolean(rawOpenRouterKey !== "");
    const openRouterKeyMasked = openRouterConfigured
      ? `${rawOpenRouterKey.slice(0, 7)}...${rawOpenRouterKey.slice(-4)}`
      : null;

    const rawResendKey = (process.env.RESEND_API_KEY || "").replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
    const resendConfigured = Boolean(rawResendKey !== "");
    const resendKeyMasked = resendConfigured
      ? `${rawResendKey.slice(0, 7)}...${rawResendKey.slice(-4)}`
      : null;

    const rawFrom = (process.env.EMAIL_FROM_ADDRESS || "").trim();
    const isWebmail = /@(gmail|googlemail|yahoo|hotmail|outlook)\.com$/i.test(rawFrom);
    const resolvedFrom = !rawFrom || isWebmail ? "commerciale@sititicino.ch" : rawFrom;
    const emailFromConfigured = Boolean(rawFrom && !isWebmail);

    const rawReplyTo = (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "").trim();
    const cleanReplyTo = rawReplyTo.replace(/^mailto:\s*/i, "").trim();
    const emailReplyToConfigured = Boolean(cleanReplyTo !== "");

    res.json({
      openRouterConfigured,
      openRouterKeyMasked,
      resendConfigured,
      resendKeyMasked,
      emailFromConfigured,
      emailFromAddress: resolvedFrom,
      emailFromDisplay: process.env.EMAIL_FROM_NAME
        ? `${process.env.EMAIL_FROM_NAME} <${resolvedFrom}>`
        : resolvedFrom,
      emailReplyToConfigured,
      emailReplyToAddress: cleanReplyTo || "risposte@inbound.sititicino.ch",
      dailySent,
    });
  });

  app.get("/api/knowledge/shared", (req, res) => {
    const shared = loadSharedKnowledge();
    res.json(shared || {});
  });

  app.get("/api/knowledge/products", (req, res) => {
    const products = loadProductKnowledge();
    res.json({ products });
  });

  // Dedicated Resend Diagnostic Endpoint
  app.all(["/api/debug-resend", "/debug-resend"], async (req, res) => {
    try {
      const body = req.body || {};
      const query = req.query || {};

      const rawKey = (
        body.apiKey ||
        query.apiKey ||
        body.config?.resendApiKey ||
        process.env.RESEND_API_KEY ||
        ""
      ).toString();

      const cleanKey = rawKey.replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
      const isFromClient = Boolean(body.apiKey || query.apiKey || body.config?.resendApiKey);

      if (!cleanKey) {
        return res.status(200).json({
          success: false,
          hasKey: false,
          error: "Nessuna API Key Resend configurata nelle variabili d'ambiente (RESEND_API_KEY) né passata nella richiesta.",
          suggestion: "Aggiungi la chiave API generata nel team 'sale.autoagent' su Resend.",
        });
      }

      const maskedKey = cleanKey.length > 8
        ? `${cleanKey.slice(0, 7)}...${cleanKey.slice(-4)}`
        : `${cleanKey.slice(0, 3)}...`;

      let domainsList: any[] = [];
      let domainsFetchOk = false;
      let domainsFetchError: string | null = null;
      let domainsHttpStatus = 0;

      try {
        const domainsRes = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
          },
        });

        domainsHttpStatus = domainsRes.status;

        if (domainsRes.ok) {
          const domainsData = (await domainsRes.json().catch(() => ({}))) as any;
          domainsList = Array.isArray(domainsData?.data) ? domainsData.data : [];
          domainsFetchOk = true;
        } else {
          const errJson = (await domainsRes.json().catch(() => ({}))) as any;
          domainsFetchError = errJson?.message || errJson?.error || `HTTP ${domainsRes.status} ${domainsRes.statusText}`;
        }
      } catch (dErr: any) {
        domainsFetchError = dErr?.message || "Errore di connessione a api.resend.com";
      }

      const sititicinoDomain = domainsList.find(
        (d) => (d.name || "").toLowerCase() === "sititicino.ch"
      );
      const inboundDomain = domainsList.find(
        (d) => (d.name || "").toLowerCase() === "inbound.sititicino.ch"
      );

      let diagnosticStatus: "ok" | "team_mismatch" | "invalid_key" | "restricted_key" | "unverified_domain" = "ok";
      let diagnosisMessage = "";
      let actionSteps: string[] = [];

      const isSendingOnly = domainsFetchError && domainsFetchError.toLowerCase().includes("restricted to only send emails");

      if (isSendingOnly) {
        diagnosticStatus = "restricted_key";
        diagnosisMessage = `La chiave API (${maskedKey}) ha permessi "Sending access" (può inviare email, ma non può visualizzare l'elenco dei domini via API). Se è stata creata nel team 'sale.autoagent', l'invio email funzionerà regolarmente.`;
        actionSteps = [
          "Se desideri verificare la lista completa dei domini via API, genera una chiave con permission 'Full access' su resend.com",
          "Assicurati che la chiave appartenga al team 'sale.autoagent' dove 'sititicino.ch' è verificato",
        ];
      } else if (domainsHttpStatus === 401) {
        diagnosticStatus = "invalid_key";
        diagnosisMessage = `La chiave API (${maskedKey}) non è valida o è stata revocata su Resend.`;
        actionSteps = [
          "Accedi a resend.com",
          "Assicurati di selezionare il team 'sale.autoagent' nel menu in alto a sinistra",
          "Vai su 'API keys' nel menu laterale e clicca su '+ Add API Key'",
          "Seleziona Permission 'Full access' e copia la chiave generata",
          "Incollala qui o imposta RESEND_API_KEY su Vercel",
        ];
      } else if (domainsHttpStatus === 403) {
        diagnosticStatus = "restricted_key";
        diagnosisMessage = `La chiave API (${maskedKey}) ha permessi limitati e non può accedere ai domini.`;
        actionSteps = [
          "In Resend (team sale.autoagent), vai su 'API keys'",
          "Crea una nuova API key con 'Full access' per consentire sia l'ispezione dei domini che l'invio email da sititicino.ch",
        ];
      } else if (domainsFetchOk) {
        if (!sititicinoDomain) {
          diagnosticStatus = "team_mismatch";
          const foundNames = domainsList.map((d) => d.name).join(", ") || "nessun dominio registrato";
          diagnosisMessage = `TEAM MISMATCH RILEVATO: La chiave API (${maskedKey}) è valida ma NON appartiene al team 'sale.autoagent'! Su questo account sono visibili solo i domini: [${foundNames}].`;
          actionSteps = [
            "Nel tuo screenshot di Resend si vede che 'sititicino.ch' è verificato nel team 'sale.autoagent'",
            "La chiave API attualmente in uso è stata generata in un altro account/team (probabilmente il tuo 'Personal Account' o un altro progetto)",
            "Su resend.com, controlla il menu a tendina in alto a sinistra: assicurati che sia selezionato 'sale.autoagent'",
            "Clicca sulla voce 'API keys' nel menu laterale (sotto Domains)",
            "Clicca sul pulsante '+ Create API Key' o 'Add API Key', nominala (es. 'autosalesagent-sale') e seleziona 'Full access'",
            "Copia la nuova chiave 're_...' e salvala nella configurazione o aggiorna RESEND_API_KEY su Vercel",
          ];
        } else if (sititicinoDomain.status !== "verified") {
          diagnosticStatus = "unverified_domain";
          diagnosisMessage = `Il dominio 'sititicino.ch' è presente ma il suo stato è '${sititicinoDomain.status}' (non ancora 'verified').`;
          actionSteps = [
            "Vai su https://resend.com/domains e verifica lo stato dei record DNS per sititicino.ch",
          ];
        } else {
          diagnosticStatus = "ok";
          diagnosisMessage = `Configurazione perfetta! Il dominio 'sititicino.ch' è verificato (${sititicinoDomain.status}) e accessibile dalla chiave API (${maskedKey}).`;
        }
      }

      let testEmailResult: any = null;
      const testRecipient = (body.testEmailTo || query.testEmailTo || "").toString().trim();
      if (testRecipient && testRecipient.includes("@")) {
        const fromAddress = "commerciale@sititicino.ch";
        const fromName = body.fromName || "Commerciale";
        const replyTo = "risposte@inbound.sititicino.ch";

        try {
          const sendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cleanKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromAddress}>`,
              to: [testRecipient],
              reply_to: replyTo,
              subject: "Test Invio Resend • Verifica Dominio sititicino.ch",
              html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #059669; margin-top: 0;">Test di Connessione Riuscito!</h2>
                <p>Questa email conferma che il dominio <strong>sititicino.ch</strong> e la chiave API Resend sono configurati correttamente.</p>
                <ul>
                  <li><strong>Mittente:</strong> ${fromName} &lt;${fromAddress}&gt;</li>
                  <li><strong>Destinatario:</strong> ${testRecipient}</li>
                  <li><strong>Reply-To:</strong> ${replyTo}</li>
                  <li><strong>Data invio:</strong> ${new Date().toISOString()}</li>
                </ul>
              </div>`,
            }),
          });

          const sendData = (await sendRes.json().catch(() => ({}))) as any;
          if (sendRes.ok) {
            testEmailResult = {
              success: true,
              messageId: sendData?.id,
              details: "Email di test inviata con successo via Resend API!",
            };
            diagnosticStatus = "ok";
            diagnosisMessage = `Invio email dal dominio sititicino.ch verificato e funzionante con successo via Resend API (Message ID: ${sendData?.id})!`;
          } else {
            testEmailResult = {
              success: false,
              error: sendData?.message || sendData?.error || `HTTP ${sendRes.status}`,
            };
          }
        } catch (sendErr: any) {
          testEmailResult = {
            success: false,
            error: sendErr?.message || "Errore durante l'invio dell'email di test",
          };
        }
      }

      return res.status(200).json({
        success: diagnosticStatus === "ok",
        diagnosticStatus,
        diagnosisMessage,
        keySource: isFromClient ? "client_override" : "server_env",
        maskedKey,
        keyLength: cleanKey.length,
        startsWithRe: cleanKey.startsWith("re_"),
        domainsHttpStatus,
        domainsFetchOk,
        domainsFetchError,
        domainsList: domainsList.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          region: d.region,
          created_at: d.created_at,
        })),
        hasSititicino: Boolean(sititicinoDomain),
        sititicinoStatus: sititicinoDomain ? sititicinoDomain.status : null,
        hasInbound: Boolean(inboundDomain),
        inboundStatus: inboundDomain ? inboundDomain.status : null,
        actionSteps,
        testEmailResult,
      });
    } catch (err: any) {
      console.error("[api/debug-resend] Errore:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Errore durante la diagnostica Resend",
      });
    }
  });

  // 0. Analyze Product URL via AI
  app.post(["/api/analyze-product", "/analyze-product"], async (req, res) => {
    try {
      const { url: rawUrl } = req.body || {};
      if (!rawUrl || typeof rawUrl !== "string") {
        return res.status(400).json({ error: "URL non valido o mancante" });
      }

      const trimmedUrl = rawUrl.trim();
      const url = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ error: "Formato URL non valido (usa http:// o https://)" });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: "Protocollo non supportato. Sono ammessi solo http e https." });
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.') ||
        hostname === '[::1]' ||
        hostname.endsWith('.local')
      ) {
        return res.status(403).json({ error: "Accesso a indirizzi locali o privati non consentito per motivi di sicurezza." });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let htmlText = "";
      let cleanedText = "";

      try {
        const htmlRes = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        clearTimeout(timeoutId);

        if (htmlRes.ok) {
          const raw = await htmlRes.text();
          if (raw.length <= 3 * 1024 * 1024) {
            htmlText = raw;
            cleanedText = htmlText
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
              .replace(/<!--[\s\S]*?-->/g, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/\s+/g, ' ')
              .trim();
          }
        } else {
          console.warn(`Sito remoto ha restituito HTTP ${htmlRes.status} (${htmlRes.statusText}), proseguo con estrazione dal dominio`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(`Impossibile raggiungere l'URL direttamente (${err.message}), proseguo con estrazione dal dominio`);
      }

      const truncatedText = cleanedText ? cleanedText.slice(0, 6000) : `Dominio analizzato: ${url}`;
      const heuristicAnalysis = extractProductAnalysisFromHtml(htmlText, cleanedText, url);

      const analysisPrompt = `Sei un esperto analista di marketing e product manager specializzato in B2B outreach. Analizza il seguente contenuto o indirizzo del sito prodotto (URL: ${url}, Nome rilevato: ${heuristicAnalysis.productName}) ed estrai informazioni strutturate in formato JSON per personalizzare email di vendita e partnership.

${cleanedText ? `Contenuto estratto dalla pagina:\n"""\n${truncatedText}\n"""` : `Nota: La pagina non è accessibile direttamente online (es. protezione bot). Deduci e struttura il profilo del prodotto a partire dall'URL (${url}), dal dominio e dal settore correlato.`}

Regole per la generazione dei funnelAssets:
- Ogni asset deve essere SPECIFICO per il prodotto analizzato: usa nome reale, feature reali, pricing reale estratti dalla pagina. Vietato testo generico o placeholder validi per qualsiasi prodotto.
- awareness: contenuto educativo/gratuito, nessuna pressione d'acquisto.
- evaluation: dimostrazione di valore concreto (demo, case study, confronto), citando feature/pricing reali quando disponibili.
- purchase: CTA di chiusura; almeno UNO dei due asset deve includere per intero l'URL del prodotto analizzato (${url}).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido nel formato esatto:
{
  "productName": "string (Nome reale e specifico del prodotto/brand/servizio estratto dalla pagina o dominio)",
  "valueProposition": "string (1-2 frasi chiare che descrivono il valore unico e principale del prodotto)",
  "keyFeatures": ["string", "string", "string"] (3-5 feature o punti di forza chiave concreti ed esclusivi di questo prodotto),
  "targetAudience": "string (chi è il cliente ideale o target di riferimento)",
  "tone": "string (es. Professionale, Informale, Innovativo, Tecnico)",
  "pricingHint": "string o null (informazioni su prezzi, abbonamenti, prova gratuita o sconti se presenti)",
  "offerType": "software" | "digital_product" | "affiliate" | "collab" | "sponsorship",
  "funnelAssets": {
    "awareness": ["string", "string"],
    "evaluation": ["string", "string"],
    "purchase": ["string", "string"]
  }
}`;


      // 1. Try Gemini API first (available in AI Studio environment)
      const gemini = getGemini();
      if (gemini) {
        try {
          const geminiRes = await withTimeout(
            gemini.models.generateContent({
              model: "gemini-2.5-flash",
              contents: analysisPrompt,
              config: {
                responseMimeType: "application/json",
              },
            }),
            25000,
            "Gemini analyzeProduct"
          );
          const text = geminiRes.text || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedAnalysis = JSON.parse(jsonMatch[0]);
            return res.json({
              success: true,
              analysis: {
                ...heuristicAnalysis,
                ...parsedAnalysis,
                sourceUrl: url,
                analyzedAt: new Date().toISOString(),
                funnelAssets: sanitizeFunnelAssets(parsedAnalysis.funnelAssets, heuristicAnalysis.funnelAssets),
              },
            });
          }
        } catch (geminiErr: any) {
          console.log(`[Gemini analyzeProduct] Non disponibile (${geminiErr?.message || geminiErr}), passaggio a fallback.`);
        }
      }

      const apiKey = (
        req.body?.openRouterApiKey ||
        req.body?.openRouterKey ||
        req.body?.apiKey ||
        process.env.OPENROUTER_API_KEY ||
        ""
      ).trim();

      const model = (
        req.body?.openRouterModel ||
        req.body?.model ||
        process.env.OPENROUTER_DEFAULT_MODEL ||
        "openai/gpt-4o-mini"
      ).trim();

      // 2. If OpenRouter API key is provided, attempt OpenRouter AI analysis
      if (apiKey) {
        try {

          const controllerAI = new AbortController();
          const aiTimeout = setTimeout(() => controllerAI.abort(), 4000);

          const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            signal: controllerAI.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://affiliate-sales-agent.local",
              "X-Title": "Affiliate Sales Agent",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: analysisPrompt }],
              temperature: 0.2,
            }),
          });
          clearTimeout(aiTimeout);

          if (aiRes.ok) {
            const aiData = (await aiRes.json()) as any;
            const aiContent = aiData.choices?.[0]?.message?.content || "";
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedAnalysis = JSON.parse(jsonMatch[0]);
              return res.json({
                success: true,
                analysis: {
                  ...heuristicAnalysis,
                  ...parsedAnalysis,
                  analyzedAt: new Date().toISOString(),
                  sourceUrl: url,
                  funnelAssets: sanitizeFunnelAssets(parsedAnalysis.funnelAssets, heuristicAnalysis.funnelAssets),
                },
              });
            }
          } else {
            console.warn(`OpenRouter ha restituito status ${aiRes.status}, utilizzo estrazione intelligente della pagina`);
          }
        } catch (aiErr) {
          console.warn("Chiamata AI fallita o timeout, utilizzo analisi euristica estratta dalla pagina:", aiErr);
        }
      }

      // Seamless fallback to heuristic analysis extracted directly from the live HTML page
      return res.json({
        success: true,
        analysis: {
          ...heuristicAnalysis,
          analyzedAt: new Date().toISOString(),
          sourceUrl: url,
        },
      });

    } catch (err: any) {
      console.error("Errore analisi prodotto:", err);
      res.status(500).json({ error: err.message || "Errore interno durante l'analisi del prodotto." });
    }
  });

  // 1. Generate Outreach Message with Funnel Stage awareness
  app.post(["/api/generate-message", "/generate-message"], async (req, res) => {
    try {
      const { lead, config, stage } = req.body || {};
      if (!lead) {
        return res.status(400).json({ error: "Dati del lead mancanti" });
      }
      const productName = (config?.productName || "").trim();
      const emailFromName = (config?.emailFromName || "").trim();
      if (!productName || !emailFromName) {
        return res.status(400).json({ error: "Configura nome prodotto e mittente prima di generare le email" });
      }
      const message = await generateMessageInternal(lead, config, stage || "awareness");
      return res.json(message);
    } catch (outerErr: any) {
      console.error("Errore in /api/generate-message:", outerErr);
      return res.status(500).json({ error: outerErr?.message || "Errore nella generazione del messaggio" });
    }
  });

  // 2. Classify response intent via AI or heuristic
  app.post(["/api/classify-response", "/classify-response"], async (req, res) => {
    try {
      const { text, config } = req.body || {};
      if (!text) {
        return res.status(400).json({ error: "Testo mancante per la classificazione" });
      }

      const result = await classifyTextWithAI(text);

      return res.json(result);
    } catch (err: any) {
      console.error("Errore in /api/classify-response:", err);
      const fallback = classifyTextLocally(req.body?.text || "");
      return res.json(fallback);
    }
  });

  // 3. Send Transactional Email via Resend (or Mock Simulation)
  app.post(["/api/send-email", "/send-email"], async (req, res) => {
    try {
      const { to, subject, body, config } = req.body || {};
      if (!to || !subject || !body) {
        return res.status(400).json({
          success: false,
          simulated: false,
          error: "Parametri obbligatori mancanti (to, subject, body)",
        });
      }

      // Verifica suppression list
      if (await isEmailSuppressed(to)) {
        return res.json({
          success: false,
          simulated: false,
          error: "Invio bloccato: indirizzo email in suppression list (opt-out).",
          reason: "suppressed"
        });
      }

      // Verifica dati societari per conformità (solo se non è DRY_RUN)
      const isDryRun = process.env.DRY_RUN !== "false"; // Default true
      const legalName = (config?.legal_name || config?.company_name || 'N/A').trim();
      const postalAddress = (config?.postal_address || 'N/A').trim();
      
      if (!isDryRun && (legalName === 'N/A' || postalAddress === 'N/A')) {
        return res.status(400).json({
          success: false,
          simulated: false,
          error: "Invio reale bloccato: mancano ragione sociale o indirizzo postale nella configurazione (obbligatori per conformità legale UWG)."
        });
      }

      const result = await sendEmailInternal(to, subject, body, config);
      return res.json(result);
    } catch (err: any) {
      return res.json({
        success: false,
        simulated: false,
        error: err?.message || "Errore durante l'invio email",
      });
    }
  });

  // 4. Autopilot Endpoint (/api/autopilot/run)
  app.post(["/api/autopilot/run", "/autopilot/run"], async (req, res) => {
    try {
      const { leads, config, dailySentCount, forceRun } = req.body || {};

      if (!config) {
        return res.status(400).json({ error: "Configurazione prodotto mancante" });
      }

      if (!config.autoOutreach && !forceRun) {
        return res.json({
          status: "skipped",
          message: "Autopilot disattivato nelle impostazioni.",
          processedCount: 0,
          updatedLeads: [],
          runAt: new Date().toISOString(),
        });
      }

      const minScore = typeof config.minLeadScore === "number" ? config.minLeadScore : 65;
      const dailyLimit = typeof config.dailyOutreachLimit === "number" ? config.dailyOutreachLimit : 100;
      const alreadySentToday = typeof dailySentCount === "number" ? dailySentCount : 0;
      const availableSlots = Math.max(0, dailyLimit - alreadySentToday);

      if (availableSlots <= 0) {
        return res.json({
          status: "noop",
          message: `Quota giornaliera di outreach già esaurita (${alreadySentToday}/${dailyLimit} email inviate oggi).`,
          processedCount: 0,
          updatedLeads: [],
          runAt: new Date().toISOString(),
        });
      }

      // Filter leads: status === 'discovered' and leadScore >= minLeadScore and has valid email
      const eligibleLeads = (leads || []).filter(
        (l: any) =>
          l &&
          l.status === "discovered" &&
          (typeof l.leadScore === "number" ? l.leadScore : 0) >= minScore &&
          Boolean(l.email && l.email.trim())
      );

      if (eligibleLeads.length === 0) {
        return res.json({
          status: "noop",
          message: `Nessun lead scoperto con punteggio ≥ ${minScore} e indirizzo email valido trovato.`,
          processedCount: 0,
          updatedLeads: [],
          runAt: new Date().toISOString(),
        });
      }

      // Sort by highest leadScore first
      eligibleLeads.sort((a: any, b: any) => (b.leadScore || 0) - (a.leadScore || 0));

      const batchToProcess = eligibleLeads.slice(0, availableSlots);
      const updatedLeads: any[] = [];
      let isSimulated = false;

      for (let i = 0; i < batchToProcess.length; i++) {
        const lead = batchToProcess[i];

        // Verifica suppression list
        if (await isEmailSuppressed(lead.email)) {
          console.log(`Autopilot: Saltato ${lead.email} perché in suppression list.`);
          continue;
        }

        // 1. Generate awareness stage message
        const message = await generateMessageInternal(lead, config, "awareness");

        // 2. Dispatch email
        const sendResult = await sendEmailInternal(lead.email, message.subject, message.body, config);

        if (sendResult.success) {
          if (sendResult.simulated) isSimulated = true;
          const updatedLead = {
            ...lead,
            status: "contacted",
            message: {
              subject: message.subject,
              body: message.body,
              sentAt: new Date().toISOString(),
              generatedBy: message.generatedBy,
              wordCount: message.wordCount,
            },
          };
          updatedLeads.push(updatedLead);
        } else {
          console.warn(`Autopilot: Invio fallito per ${lead.shopName} (${lead.email}):`, sendResult.error);
        }

        // Brief delay between sends
        if (i < batchToProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      return res.json({
        status: "success",
        message: `Autopilot ha contattato con successo ${updatedLeads.length} lead in fase Awareness${
          isSimulated ? " (in modalità test simulata)" : " (via Resend)"
        }.`,
        processedCount: updatedLeads.length,
        updatedLeads,
        simulated: isSimulated,
        runAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Errore in /api/autopilot/run:", err);
      return res.status(500).json({ error: err?.message || "Errore durante l'esecuzione dell'autopilot" });
    }
  });

  // 4b. Leads Persistence Endpoints
  app.get("/api/leads", async (req, res) => {
    if (!supabase) return res.status(501).json({ error: "Supabase non configurato" });
    try {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      // Mappiamo i dati nel formato atteso dal client
      const leads = (data || []).map(row => ({
        ...(row.data || {}),
        id: row.id,
        status: row.status,
        leadScore: row.lead_score,
      }));
      return res.json({ leads });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/leads/upsert", async (req, res) => {
    if (!supabase) return res.status(501).json({ error: "Supabase non configurato" });
    try {
      const { leads } = req.body || {};
      if (!Array.isArray(leads)) return res.status(400).json({ error: "Payload non valido: attesa lista di lead" });
      
      const rows = leads.map(l => ({
        id: l.id,
        data: l,
        status: l.status,
        lead_score: typeof l.leadScore === 'number' ? l.leadScore : 0,
        product_id: l.product_id || "legacy",
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("leads").upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      
      return res.json({ success: true, count: rows.length });
    } catch (err: any) {
      console.error("Errore upsert leads:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 4c. Lead Routing Orchestrator
  app.post("/api/route-lead", async (req, res) => {
    try {
      const { lead } = req.body || {};
      if (!lead) return res.status(400).json({ error: "Lead mancante" });

      const genAI = getGemini();
      const modelName = process.env.GEMINI_ORCHESTRATOR_MODEL || "gemini-2.0-flash-exp";
      
      if (!genAI) {
        return res.status(503).json({ error: "Servizio AI non disponibile" });
      }

      const products = loadProductKnowledge();
      const productsText = products.map(p => `- ${p.product_id}: ${p.product_name}. ${p.description}`).join('\n');

      const prompt = `Analizza il lead e usa route_lead per assegnarlo.
Prodotti:
${productsText}

Lead:
${JSON.stringify(lead, null, 2)}`;

      const result = await withTimeout(genAI.models.generateContent({
        model: modelName === "gemini-2.0-flash-exp" ? "gemini-flash-latest" : modelName,
        contents: prompt,
        config: {
          systemInstruction: "Sei un orchestratore che assegna i lead ai prodotti più pertinenti.",
          tools: [{
            functionDeclarations: [{
              name: "route_lead",
              description: "Assegna un lead al prodotto più pertinente o a 'none'.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  product_id: { type: Type.STRING, description: "ID del prodotto scelto o 'none'." },
                  confidence: { type: Type.NUMBER, description: "Confidenza 0-1." },
                  reason: { type: Type.STRING, description: "Spiegazione." }
                },
                required: ["product_id", "confidence", "reason"]
              }
            }]
          }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } } as any
        }
      }), 10000, "Gemini Routing");

      const call = result.functionCalls?.[0];
      
      if (call && call.name === "route_lead") {
        return res.json(call.args);
      }
      
      // Fallback if no function call
      return res.status(500).json({ error: "L'AI non ha invocato la funzione di routing." });
    } catch (err: any) {
      console.error("Errore routing lead:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Inbound Webhook for Resend (/api/webhooks/resend-inbound)
  app.post(["/api/webhooks/resend-inbound", "/webhooks/resend-inbound"], async (req, res) => {
    try {
      // 1. Verifica Firma Svix
      const secret = process.env.RESEND_WEBHOOK_SECRET;
      const svixId = req.headers["svix-id"] as string;
      const svixTimestamp = req.headers["svix-timestamp"] as string;
      const svixSignature = req.headers["svix-signature"] as string;

      if (!secret || !svixId || !svixTimestamp || !svixSignature) {
        return res.status(401).json({ error: "Firma webhook mancante o incompleta" });
      }

      const now = Math.floor(Date.now() / 1000);
      const timestamp = parseInt(svixTimestamp, 10);
      if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
        return res.status(401).json({ error: "Timestamp webhook fuori tolleranza (5 min)" });
      }

      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      
      const secretKey = secret.startsWith("whsec_") ? secret.replace("whsec_", "") : secret;
      const secretBuffer = Buffer.from(secretKey, "base64");
      
      const expectedSignature = crypto
        .createHmac("sha256", secretBuffer)
        .update(signedContent)
        .digest("base64");

      const signatures = svixSignature.split(" ");
      const isValid = signatures.some(s => {
        const [version, signature] = s.split(",");
        return version === "v1" && signature === expectedSignature;
      });

      if (!isValid) {
        return res.status(401).json({ error: "Firma webhook non valida" });
      }

      const payload = JSON.parse(rawBody);
      const data = payload.data || payload;

      // Extract sender, recipient (to), subject, body, in-reply-to
      const fromRaw = data.from || data.sender || data.from_email || "";
      const emailMatch = typeof fromRaw === "string" ? fromRaw.match(/<([^>]+)>/) : null;
      const senderEmail = (emailMatch ? emailMatch[1] : fromRaw).trim().toLowerCase();

      const toRaw = data.to || data.recipient || "";
      const toEmail = typeof toRaw === "string" ? toRaw.trim().toLowerCase() : "";
      const inReplyTo = data.headers?.["in-reply-to"] || data.in_reply_to || data.headers?.["In-Reply-To"] || "";

      const subject = data.subject || "(Nessun oggetto)";
      const text = data.text || data.html || data.body || "(Nessun contenuto)";

      if (!senderEmail) {
        return res.status(400).json({ error: "Indirizzo mittente 'from' non trovato nel payload webhook" });
      }

      // 2. Idempotenza: Verifica se l'evento è già stato elaborato (in-memory)
      if (inMemoryInboundEvents.some(ev => ev.id === svixId)) {
        return res.status(200).json({ success: true, message: "Evento già elaborato (idempotenza)" });
      }

      // Classify the response intent
      const classification = await classifyTextWithAI(text);

      // 3. Se l'intento è unsubscribe, aggiungi alla suppression list
      if (classification.intent === "unsubscribe") {
        await addToSuppressionList(senderEmail, "Richiesta via email (unsubscribe)");
      }

      const event: InboundEmailEvent = {
        id: svixId,
        from: fromRaw,
        senderEmail,
        to: toEmail,
        inReplyTo: typeof inReplyTo === "string" ? inReplyTo : "",
        subject,
        text: typeof text === "string" ? text.replace(/<[^>]+>/g, " ").trim() : String(text),
        intent: classification.intent,
        reason: classification.reason,
        receivedAt: new Date().toISOString(),
      };

      // Always store in in-memory buffer first
      inMemoryInboundEvents.unshift(event);
      if (inMemoryInboundEvents.length > 200) {
        inMemoryInboundEvents = inMemoryInboundEvents.slice(0, 200);
      }

      if (supabase && (await checkSupabaseInboundAvailability())) {
        try {
          const { error } = await supabase.from("inbound_events").upsert([
            {
              id: event.id,
              from: event.from,
              senderEmail: event.senderEmail,
              to: event.to,
              inReplyTo: event.inReplyTo,
              subject: event.subject,
              text: event.text,
              intent: event.intent,
              reason: event.reason,
              receivedAt: event.receivedAt,
            },
          ], { onConflict: 'id' });
          if (error) {
            console.warn("[Supabase Inbound] Upsert non riuscito, evento memorizzato in locale:", error.message || error);
          }
        } catch (dbErr: any) {
          console.warn("[Supabase Inbound] Connessione DB fallita, evento memorizzato in locale:", dbErr?.message || dbErr);
        }
      }

      console.log(`[Resend Inbound Webhook] Ricevuta email da ${senderEmail} - Intento: ${classification.intent}`);

      return res.status(200).json({
        success: true,
        message: "Email in entrata ricevuta e classificata",
        event,
      });
    } catch (err: any) {
      console.error("Errore nel webhook Resend:", err);
      return res.status(500).json({ error: err?.message || "Errore elaborazione webhook" });
    }
  });

  // 6. Query pending inbound events (for frontend sync)
  app.get(["/api/webhooks/inbound-events", "/webhooks/inbound-events"], async (req, res) => {
    let events: InboundEmailEvent[] = [...inMemoryInboundEvents];
    if (supabase && (await checkSupabaseInboundAvailability())) {
      try {
        const { data, error } = await supabase
          .from("inbound_events")
          .select("*")
          .order("receivedAt", { ascending: false });
        if (!error && data) {
          events = data as InboundEmailEvent[];
        }
      } catch {
        // Fallback to in-memory events
      }
    }
    res.json({ events });
  });

  // 7. Clear or acknowledge inbound events
  app.post(["/api/webhooks/clear-inbound-events", "/webhooks/clear-inbound-events"], async (req, res) => {
    const { ids } = req.body || {};
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      inMemoryInboundEvents = inMemoryInboundEvents.filter((ev) => !idSet.has(ev.id));
    } else {
      inMemoryInboundEvents = [];
    }

    let remaining = inMemoryInboundEvents.length;
    if (supabase && (await checkSupabaseInboundAvailability())) {
      try {
        if (Array.isArray(ids) && ids.length > 0) {
          await supabase.from("inbound_events").delete().in("id", ids);
        } else {
          await supabase.from("inbound_events").delete().neq("id", "");
        }
        const { data } = await supabase.from("inbound_events").select("*");
        if (data) {
          remaining = data.length;
        }
      } catch {
        // Fallback to in-memory count
      }
    }
    res.json({ success: true, remaining });
  });

  // Vite dev middleware or static serving for standalone server execution (disabled in Vercel serverless)
  const isDirectlyExecuted = (() => {
    if (
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
    ) {
      return false;
    }
    const mainFile = process.argv[1] || "";
    return mainFile.endsWith("server.ts") || mainFile.endsWith("server.cjs") || mainFile.endsWith("server.js");
  })();

  async function setupViteAndListen() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  if (isDirectlyExecuted) {
    setupViteAndListen().catch((err) => {
      console.error("Failed to start Vite / server listener:", err);
    });
  }

  export default app;
  export { app };

