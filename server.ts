import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateLocalMessageFallback } from "./src/lib/messageFallback";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Generate Outreach Message via OpenRouter (with local fallback)
  app.post("/api/generate-message", async (req, res) => {
    try {
      const { lead, config } = req.body || {};
      if (!lead) {
        return res.status(400).json({ error: "Dati del lead mancanti" });
      }

      const apiKey = (config?.openRouterApiKey || process.env.OPENROUTER_API_KEY || "").trim();
      const model = (config?.openRouterModel || "meta-llama/llama-3-8b-instruct:free").trim();
      const tone = lead.toneOfVoice || "Formale";

      if (apiKey) {
        try {
          const systemPrompt = `Sei un Senior Copywriter B2B specializzato in Conversion Rate Optimization (CRO) e deliverability email.
Devi seguire RIGOROSAMENTE la formula di Copywriting: HOOK + BODY + CTA.

Regole tassative per la redazione dell'email:
1. TONO DI VOCE: Scrivi l'email usando il tono di voce indicato (${tone}):
   - Se 'Informale': usa un tono diretto e cordiale tra pari del settore (Tu / Ciao).
   - Se 'Formale': usa un registro professionale e rispettoso (Lei / Buongiorno / Gentile).
2. HOOK (GANCIO): Inizia SEMPRE con un Hook (Gancio) iper-personalizzato basato sul settore o sulle note del cliente per catturare subito l'attenzione.
3. BODY (CORPO): Continua con il Corpo del testo incentrato sul problema/soluzione (Search Intent B2B) e sui vantaggi concreti della partnership.
4. CTA (CALL TO ACTION): Chiudi SEMPRE con una CTA chiara, semplice e a basso attrito (es. disponibilità per un rapido feedback o anteprima riservata).
5. ANTI-SPAM & DELIVERABILITY: Evita parole da spam come 'Gratis', 'Compra ora', 'Sconto', punti esclamativi multipli o formule aggressive di vendita.

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
- Modello / Tipo Offerta: ${config?.offerType || "affiliate"} (Commissione: ${config?.commissionRate || "20%"})
- Descrizione Prodotto: ${config?.productDescription || ""}
- Target: ${config?.targetAudience || "B2B Partners"}`;

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
              return res.json({
                subject: parsed.subject || `Opportunità di partnership per ${lead.shopName}`,
                body: parsed.body || content,
              });
            } else if (content.trim()) {
              return res.json({
                subject: `Opportunità di partnership per ${lead.shopName}`,
                body: content,
              });
            }
          } else {
            const errText = await openRouterRes.text().catch(() => "");
            console.warn("OpenRouter API non-ok status:", openRouterRes.status, errText);
          }
        } catch (aiErr) {
          console.warn("Errore chiamata OpenRouter, fallback a template locale:", aiErr);
        }
      }

      // Fallback locale robusto
      const fallback = generateLocalMessageFallback(lead, config || { productName: "Nostro Prodotto" });
      return res.json(fallback);
    } catch (outerErr: any) {
      console.error("Errore in /api/generate-message:", outerErr);
      return res.status(500).json({ error: outerErr?.message || "Errore nella generazione del messaggio" });
    }
  });

  // 2. Send Transactional Email via Resend (or Mock Simulation)
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

      const apiKey = (config?.resendApiKey || process.env.RESEND_API_KEY || "").trim();
      const fromAddress = (config?.emailFromAddress || process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev").trim();

      // If no API key configured, run safe simulation
      if (!apiKey) {
        return res.json({
          success: true,
          simulated: true,
          messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        });
      }

      // Real sending via Resend API
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          text: body,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${body.replace(/\n/g, "<br>")}</div>`,
        }),
      });

      if (resendRes.ok) {
        const data = (await resendRes.json()) as any;
        return res.json({
          success: true,
          simulated: false,
          messageId: data?.id,
        });
      } else {
        const errData = (await resendRes.json().catch(() => ({}))) as any;
        const errorMsg = errData?.message || `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText}`;
        return res.json({
          success: false,
          simulated: false,
          error: errorMsg,
        });
      }
    } catch (err: any) {
      return res.json({
        success: false,
        simulated: false,
        error: err?.message || "Errore di connessione al server per invio email",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
