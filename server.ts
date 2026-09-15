import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for OpenRouter message generation
  app.post("/api/generate-message", async (req, res) => {
    try {
      const { lead, config } = req.body;
      const authHeader = req.headers.authorization;
      const apiKey = authHeader ? authHeader.replace('Bearer ', '') : process.env.OPENROUTER_API_KEY;

      if (!apiKey || !apiKey.startsWith('sk-or-')) {
        return res.status(400).json({ error: "OpenRouter API Key not provided or invalid" });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
          'X-Title': 'Sales Agent',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct',
          messages: [
            { role: 'system', content: 'Sei un assistente di vendita esperto B2B. Scrivi email di outreach brevi, personalizzate e non spammy per promuovere il prodotto indicato dall’utente.' },
            { 
              role: 'user', 
              content: `Prodotto: ${config.productName}\nURL: ${config.productUrl}\nDescrizione: ${config.productDescription}\nTipo offerta: ${config.offerType}\n\nLead:\n- Nome: ${lead.shopName}\n- Piattaforma: ${lead.platform} (${lead.source})\n- Località: ${lead.city || 'N/A'}, ${lead.canton || 'CH'}\n- Email: ${lead.email || 'Nessuna email'}\n- Note: ${lead.shortNotes}\n\nScrivi un'email di 3-5 frasi in ${lead.language.toUpperCase()}, con CTA coerente.\nFORMAT:\nSUBJECT: [oggetto]\nBODY: [corpo]` 
            }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: errText });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const subjectMatch = content.match(/SUBJECT:\s*(.*)/i);
      const bodyMatch = content.match(/BODY:\s*([\s\S]*)/i);

      if (subjectMatch && bodyMatch) {
        return res.json({
          subject: subjectMatch[1].trim(),
          body: bodyMatch[1].trim(),
        });
      }

      return res.status(500).json({ error: "Failed to parse OpenRouter response format" });
    } catch (error: any) {
      console.error("OpenRouter API error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
