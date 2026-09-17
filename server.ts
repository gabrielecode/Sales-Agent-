import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateLocalMessageFallback } from "./src/lib/messageFallback";
import { FunnelStage, IntentClassification } from "./src/types";

dotenv.config();

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

// Single helper for generating messages with FunnelStage awareness
async function generateMessageInternal(
  lead: any,
  config: any,
  stage: FunnelStage = "awareness"
): Promise<{ subject: string; body: string }> {
  const apiKey = (process.env.OPENROUTER_API_KEY || config?.openRouterApiKey || "").trim();
  const model = (config?.openRouterModel || "meta-llama/llama-3-8b-instruct:free").trim();
  const tone = lead.toneOfVoice || "Formale";

  if (apiKey) {
    try {
      const stageAssets = config?.funnelAssets?.[stage] || [];
      const stageAssetsText =
        stageAssets.length > 0
          ? `Asset reali disponibili per lo stadio ${stage.toUpperCase()}:\n- ` + stageAssets.join("\n- ")
          : "Nessun asset personalizzato registrato (cita una risorsa autorevole e specifica per questo settore).";

      const offerType = config?.offerType || "affiliate";
      const isDigitalOrSoftware = offerType === "digital_product" || offerType === "software";

      let stageGuideline = "";
      if (stage === "awareness") {
        if (isDigitalOrSoftware) {
          stageGuideline = `STADIO DEL FUNNEL: AWARENESS (Primo Contatto & Sensibilizzazione - Prodotto Digitale/Software).
- Obiettivo: Condividere valore, educare e catturare l'attenzione sul problema risolto dal software/prodotto digitale, senza alcuna pressione d'acquisto.
- CTA: Invita a leggere o ricevere una risorsa gratuita (whitepaper, case study, checklist o report di settore). Nessun cenno a commissioni o partner.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        } else {
          stageGuideline = `STADIO DEL FUNNEL: AWARENESS (Primo Contatto & Sensibilizzazione).
- Obiettivo: Condividere valore, educare e catturare l'attenzione senza NESSUNA pressione di acquisto o chiusura immediata.
- CTA: Invita a leggere o ricevere una risorsa gratuita (guida pratica, checklist, report sui trend). Non richiedere acquisti o vincoli.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        }
      } else if (stage === "evaluation") {
        if (isDigitalOrSoftware) {
          stageGuideline = `STADIO DEL FUNNEL: EVALUATION (Fase di Valutazione e Considerazione - Prodotto Digitale/Software).
- Obiettivo: Dimostrare ROI concreto, efficienza, funzionalità chiave e affidabilità della soluzione software/digitale.
- CTA: Invita a guardare una demo video interattiva, esplorare un case study o prenotare una demo personalizzata.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        } else {
          stageGuideline = `STADIO DEL FUNNEL: EVALUATION (Fase di Valutazione e Considerazione).
- Obiettivo: Dimostrare ROI concreto, percentuali di conversione e affidabilità della soluzione.
- CTA: Invita a guardare una demo video interattiva, esplorare un case study o consultare la scheda tecnica dettagliata.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        }
      } else {
        if (isDigitalOrSoftware) {
          stageGuideline = `STADIO DEL FUNNEL: PURCHASE (Fase di Chiusura & Attivazione - Prodotto Digitale/Software).
- Obiettivo: Agevolare la transizione finale all'acquisto o alla prova gratuita con condizioni vantaggiose.
- CTA: Proponi la prova gratuita, l'acquisto diretto o una demo 1-a-1. Evita assolutamente qualsiasi riferimento a link referral, codici partner o commissioni.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        } else {
          stageGuideline = `STADIO DEL FUNNEL: PURCHASE (Fase di Chiusura & Attivazione Partnership).
- Obiettivo: Agevolare la transizione finale e l'onboarding con condizioni riservate e vantaggiose.
- CTA: Proponi l'attivazione immediata del link referral/codice partner, una prova gratuita o una breve call di onboarding 1-a-1.
${stageAssetsText}
Se opportuno, cita direttamente l'asset sopra nel messaggio.`;
        }
      }

      const systemPrompt = `Sei un Senior Copywriter B2B specializzato in Conversion Rate Optimization (CRO) e deliverability email.
Devi seguire RIGOROSAMENTE la formula di Copywriting: HOOK + BODY + CTA.

Regole tassative per la redazione dell'email:
1. TONO DI VOCE: Scrivi l'email usando il tono di voce indicato (${tone}):
   - Se 'Informale': usa un tono diretto e cordiale tra pari del settore (Tu / Ciao).
   - Se 'Formale': usa un registro professionale e rispettoso (Lei / Buongiorno / Gentile).
2. HOOK (GANCIO): Inizia SEMPRE con un Hook (Gancio) iper-personalizzato basato sul settore o sulle caratteristiche del partner per catturare subito l'attenzione.
3. BODY (CORPO): Continua con il Corpo del testo incentrato sul problema/soluzione e sui vantaggi concreti, allineato allo stadio del funnel.
4. CTA (CALL TO ACTION): Chiudi SEMPRE con una CTA chiara, coerente con lo stadio del funnel:
${stageGuideline}
5. ANTI-SPAM & DELIVERABILITY: Evita parole da spam come 'Compra ora', 'Offertissima', punti esclamativi multipli o formule aggressive di vendita.

Rispondi ESCLUSIVAMENTE in formato JSON puro:
{"subject": "...", "body": "..."}`;

      const userPrompt = `Genera un'email di outreach altamente personalizzata per il seguente lead:
- Destinatario: ${lead.shopName}
- Piattaforma: ${lead.platform}
- Settore / Nicchia: ${lead.industry || "Non specificato"}
- Tono di voce: ${tone}
- Lingua: ${lead.language || "it"}
- Località: ${lead.city || "Svizzera"} (${lead.canton || "CH"})
- Note profilo: ${lead.shortNotes || ""}

Dati dell'offerta:
- Prodotto da promuovere: ${config?.productName || "Nostro Prodotto"}
- Modello / Tipo Offerta: ${offerType}${isDigitalOrSoftware ? "" : ` (Commissione: ${config?.commissionRate || "20%"})`}
- Descrizione Prodotto: ${config?.productDescription || ""}
- Target: ${config?.targetAudience || (isDigitalOrSoftware ? "Clienti / Utenti finali" : "B2B Partners")}`;

      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (openRouterRes.ok) {
        const data = (await openRouterRes.json()) as any;
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            subject: parsed.subject || `Opportunità per ${lead.shopName}`,
            body: parsed.body || content,
          };
        } else if (content.trim()) {
          return {
            subject: `Opportunità per ${lead.shopName}`,
            body: content,
          };
        }
      }
    } catch (aiErr) {
      console.warn("Chiamata OpenRouter fallita in generateMessageInternal, fallback:", aiErr);
    }
  }

  return generateLocalMessageFallback(lead, config || { productName: "Nostro Prodotto" }, stage);
}

// Single helper for dispatching email via Resend or Simulation
async function sendEmailInternal(
  to: string,
  subject: string,
  body: string,
  config?: any
): Promise<{ success: boolean; simulated: boolean; messageId?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || config?.resendApiKey || "").trim();
  const fromName = (process.env.EMAIL_FROM_NAME || config?.emailFromName || "Sales Agent").trim();
  const fromAddress = (process.env.EMAIL_FROM_ADDRESS || config?.emailFromAddress || "onboarding@resend.dev").trim();
  const formattedFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  const replyToAddress = (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || config?.emailReplyTo || "rispondi@inbound.sititicino.ch").trim();

  if (!apiKey) {
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const payload: any = {
      from: formattedFrom,
      to: [to],
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${body.replace(/\n/g, "<br>")}</div>`,
    };
    if (replyToAddress) {
      payload.reply_to = replyToAddress;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resendRes.ok) {
      const data = (await resendRes.json()) as any;
      return {
        success: true,
        simulated: false,
        messageId: data?.id,
      };
    } else {
      const errData = (await resendRes.json().catch(() => ({}))) as any;
      const errorMsg = errData?.message || `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText}`;
      return {
        success: false,
        simulated: false,
        error: errorMsg,
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", async (req, res) => {
    let inboundEventsCount = 0;
    if (supabase) {
      const { count, error } = await supabase
        .from("inbound_events")
        .select("*", { count: "exact", head: true });
      if (!error && count !== null) {
        inboundEventsCount = count;
      }
    }
    res.json({
      status: "ok",
      inboundEventsCount,
    });
  });

  // Endpoint to check server-side configuration status (booleans and public info only)
  app.get("/api/config-status", (req, res) => {
    const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "");
    const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");
    const emailFromConfigured = Boolean(process.env.EMAIL_FROM_ADDRESS && process.env.EMAIL_FROM_ADDRESS.trim() !== "");
    const emailReplyToConfigured = Boolean((process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS) && (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "").trim() !== "");

    res.json({
      openRouterConfigured,
      resendConfigured,
      emailFromConfigured,
      emailFromAddress: process.env.EMAIL_FROM_ADDRESS || "",
      emailFromDisplay: process.env.EMAIL_FROM_NAME ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}>` : (process.env.EMAIL_FROM_ADDRESS || ""),
      emailReplyToConfigured,
      emailReplyToAddress: process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "",
    });
  });

  // 1. Generate Outreach Message with Funnel Stage awareness
  app.post("/api/generate-message", async (req, res) => {
    try {
      const { lead, config, stage } = req.body || {};
      if (!lead) {
        return res.status(400).json({ error: "Dati del lead mancanti" });
      }
      const message = await generateMessageInternal(lead, config, stage || "awareness");
      return res.json(message);
    } catch (outerErr: any) {
      console.error("Errore in /api/generate-message:", outerErr);
      return res.status(500).json({ error: outerErr?.message || "Errore nella generazione del messaggio" });
    }
  });

  // 2. Classify response intent via AI or heuristic
  app.post("/api/classify-response", async (req, res) => {
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
  app.post("/api/send-email", async (req, res) => {
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
  app.post("/api/autopilot/run", async (req, res) => {
    try {
      const { leads, config, dailySentCount } = req.body || {};

      if (!config) {
        return res.status(400).json({ error: "Configurazione prodotto mancante" });
      }

      if (!config.autoOutreach) {
        return res.json({
          status: "skipped",
          message: "Autopilot disattivato nelle impostazioni.",
          processedCount: 0,
          updatedLeads: [],
          runAt: new Date().toISOString(),
        });
      }

      const minScore = typeof config.minLeadScore === "number" ? config.minLeadScore : 65;
      const dailyLimit = typeof config.dailyOutreachLimit === "number" ? config.dailyOutreachLimit : 25;
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
  app.post("/api/webhooks/resend-inbound", async (req, res) => {
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

      if (supabase) {
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
          console.error("Errore inserimento Supabase inbound_events:", error);
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
  app.get("/api/webhooks/inbound-events", async (req, res) => {
    let events: InboundEmailEvent[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from("inbound_events")
        .select("*")
        .order("receivedAt", { ascending: false });
      if (!error && data) {
        events = data as InboundEmailEvent[];
      } else if (error) {
        console.error("Errore lettura Supabase inbound_events:", error);
      }
    }
    res.json({ events });
  });

  // 7. Clear or acknowledge inbound events
  app.post("/api/webhooks/clear-inbound-events", async (req, res) => {
    const { ids } = req.body || {};
    let remaining = 0;
    if (supabase) {
      if (Array.isArray(ids) && ids.length > 0) {
        await supabase.from("inbound_events").delete().in("id", ids);
      } else {
        await supabase.from("inbound_events").delete().neq("id", "");
      }
      const { data } = await supabase.from("inbound_events").select("*");
      remaining = data ? data.length : 0;
    }
    res.json({ success: true, remaining });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

startServer();

