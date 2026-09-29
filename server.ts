import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { generateLocalMessageFallback } from "./src/lib/messageFallback";
import { validateGeneratedMessage } from "./src/lib/messageValidator";
import { appendProgrammaticSignature } from "./src/lib/emailSignature";
import { shouldIncludeLink } from "./src/lib/outreachLink";
import { FunnelStage, IntentClassification } from "./src/types";

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


// Helper heuristic classification when AI is unavailable
function classifyTextLocally(text: string): { intent: IntentClassification; reason: string } {
  const lower = (text || "").toLowerCase();
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
    lower.includes("disiscrivimi") ||
    lower.includes("altre priorità") ||
    lower.includes("rifiuto") ||
    lower.includes("unsubscribe")
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
async function classifyTextWithOpenRouter(
  text: string,
  apiKey?: string,
  model?: string
): Promise<{ intent: IntentClassification; reason: string }> {
  const key = (process.env.OPENROUTER_API_KEY || apiKey || "").trim();
  const selectedModel = (model || "meta-llama/llama-3-8b-instruct:free").trim();

  if (!key) {
    return classifyTextLocally(text);
  }

  try {
    const prompt = `Sei un assistente commerciale B2B esperto. Classifica la seguente risposta ricevuta da un lead in una delle 4 categorie di intento:
- "interested": Mostra interesse, chiede di fissare una call o approfondire la collaborazione.
- "info_requested": Chiede specifiche su percentuali, modalità operative, requisiti o dettagli tecnici.
- "ready_to_close": Vuole procedere immediatamente (chiede link referral, contratto, coupon o onboarding immediato).
- "not_interested": Rifiuta l'offerta, dice di non essere interessato o chiede la disiscrizione.

Testo della risposta ricevuta:
"""
${text}
"""

Rispondi ESCLUSIVAMENTE con un JSON valido nel formato:
{"intent": "interested" | "info_requested" | "ready_to_close" | "not_interested", "reason": "breve motivazione in italiano"}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://affiliate-sales-agent.local",
        "X-Title": "Affiliate Sales Agent",
      },
      body: JSON.stringify({
        model: selectedModel,
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
        const validIntents: IntentClassification[] = [
          "interested",
          "info_requested",
          "ready_to_close",
          "not_interested",
        ];
        if (validIntents.includes(parsed.intent)) {
          return {
            intent: parsed.intent,
            reason: parsed.reason || "Classificato da modello AI",
          };
        }
      }
    }
  } catch (err) {
    console.warn("Classificazione AI fallita, utilizzo fallback euristico:", err);
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
  const apiKey = (process.env.OPENROUTER_API_KEY || config?.openRouterApiKey || "").trim();
  const model = (config?.openRouterModel || "meta-llama/llama-3-8b-instruct:free").trim();
  const tone = lead.toneOfVoice || "Formale";

  const targetUrl = (config?.productUrl || config?.productAnalysis?.sourceUrl || "").trim();
  const productName = (config?.productName || "").trim();
  const emailFromName = (config?.emailFromName || "").trim();

  if (!productName || !emailFromName) {
    throw new Error("Configura nome prodotto e mittente prima di generare le email");
  }

  const valueProp = (config?.productAnalysis?.valueProposition || config?.productDescription || "").trim();
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

Per molti [Target] [PainPoint].

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

  const freeTrialText = (config?.freeTrialText || "").trim();

  const userPrompt = stage === "awareness"
    ? `FATTI USABILI DEL LEAD:
${fattiUsabili.map((f) => `- ${f}`).join("\n")}

CONTESTO PRODOTTO:
- Nome Prodotto: ${productName}
- Proposta di Valore (Beneficio): ${valueProp || "Ottimizzazione processi e conversione commerciale"}
- Problema specifico (Pain Point): ${config?.painPoint || "dispersione di tempo operativo nella gestione delle vendite"}
- Testo Prova/Gratuità (se presente): ${freeTrialText || "(nessuno)"}
- Link/URL: ${targetUrl}
- Nome Mittente (da inserire in firma): ${config?.emailFromName || ""}

PARAMETRI EMAIL:
- Lingua da usare: ${lead.language || "it"}
- Tono di voce: ${tone} (${tone === "Informale" ? "dai del Tu, approccio diretto" : "dai del Lei, approccio professionale"})
- Saluto iniziale obbligatorio: ${contactGreetingRule}

VINCOLI TASSATIVI:
- STRUTTURA: Segui rigorosamente il template di primo contatto (saluto, problema/pain, beneficio/soluzione + prova se fornita, link su riga propria, firma Cordiali saluti, STOP line).
- Nessun punto interrogativo "?" (niente domande).
- Rispondi solo in formato JSON con le chiavi "subject" e "body".`
    : `FATTI USABILI DEL LEAD:
${fattiUsabili.map((f) => `- ${f}`).join("\n")}

CONTESTO PRODOTTO:
- Nome Prodotto: ${productName}
- Proposta di Valore: ${valueProp || "Ottimizzazione processi e conversione commerciale"}
- Link/URL: ${includeLink ? targetUrl : "NESSUN LINK (vietato nel primo contatto)"}

PARAMETRI EMAIL:
- Lingua da usare: ${lead.language || "it"}
- Tono di voce: ${tone} (${tone === "Informale" ? "dai del Tu, approccio diretto" : "dai del Lei, approccio professionale"})
- Stadio funnel: ${stage.toUpperCase()}
- Saluto iniziale obbligatorio: ${contactGreetingRule}

VINCOLI TASSATIVI:
- PRODOTTO: Il prodotto descritto deve essere solo quello di productName + valueProposition. Non aggiungere funzionalità o casi d'uso non presenti nell'analisi.
- OFFERTE E FATTI: Non inventare offerte, sconti o risultati. Se non sono nei dati, proponi solo di mandare un'analisi o di fare una chiamata di 10 minuti.
- SALUTO: Se lead.contactName manca, usa "Ciao," o "Buongiorno," senza inventare nomi.
- FIRMA: Il modello non deve mai scrivere firma, nome o ruolo. L'output deve terminare con la domanda di CTA finale. La firma verrà aggiunta via codice.
- STRUTTURA: 4 blocchi (Osservazione -> Problema -> Soluzione -> CTA con domanda singola), max 90 parole.
- Rispondi solo in formato JSON con le chiavi "subject" e "body".`;

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
              const finalBody = stage === "awareness" ? candidateBody : appendProgrammaticSignature(candidateBody, config);
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
  if (apiKey) {
    let currentPrompt = userPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controllerOpenRouter = new AbortController();
      const timeoutOpenRouter = setTimeout(() => controllerOpenRouter.abort(), 10000);
      try {
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controllerOpenRouter.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://affiliate-sales-agent.local",
            "X-Title": "Affiliate Sales Agent",
          },
          body: JSON.stringify({
            model,
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
                const finalBody = stage === "awareness" ? candidateBody : appendProgrammaticSignature(candidateBody, config);
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

  const clientKey = cleanKey(config?.resendApiKey);
  const serverKey = cleanKey(process.env.RESEND_API_KEY);
  const apiKey = clientKey || serverKey;

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

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Permissive CORS headers for API requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

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
app.get(["/api/config-status", "/config-status"], (req, res) => {
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
    });
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

      const result = await classifyTextWithOpenRouter(
        text,
        config?.openRouterApiKey,
        config?.openRouterModel
      );

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

  // 5. Inbound Webhook for Resend (/api/webhooks/resend-inbound)
  app.post(["/api/webhooks/resend-inbound", "/webhooks/resend-inbound"], async (req, res) => {
    try {
      const payload = req.body || {};
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

      // Classify the response intent
      const classification = await classifyTextWithOpenRouter(text);

      const event: InboundEmailEvent = {
        id: `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

      // Always store in in-memory buffer first so no inbound event is ever lost
      inMemoryInboundEvents.unshift(event);
      if (inMemoryInboundEvents.length > 200) {
        inMemoryInboundEvents = inMemoryInboundEvents.slice(0, 200);
      }

      if (supabase && (await checkSupabaseInboundAvailability())) {
        try {
          const { error } = await supabase.from("inbound_events").insert([
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
          ]);
          if (error) {
            console.warn("[Supabase Inbound] Inserimento non riuscito, evento memorizzato in locale:", error.message || error);
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

