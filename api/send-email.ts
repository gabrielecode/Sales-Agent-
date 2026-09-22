export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Utilizza il metodo POST." });
  }

  try {
    const { to, subject, body, config } = req.body || {};

    if (!to || !subject || !body) {
      return res.status(200).json({
        success: false,
        simulated: false,
        error: "Parametri mancanti: 'to', 'subject' e 'body' sono obbligatori per l'invio.",
      });
    }

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

    // If no API key is found on client nor on server, do NOT silently fake an send; return clear error
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        simulated: false,
        error: "Nessuna chiave Resend API trovata. Inserisci la tua API Key (team 'sale.autoagent') nel tab 'Prodotto & Setup' o configurala nelle variabili d'ambiente (RESEND_API_KEY) su Vercel.",
      });
    }

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
      return res.status(200).json({
        success: true,
        simulated: false,
        messageId: resData?.id,
      });
    }

    let exactErrorMsg =
      resData?.message ||
      resData?.error ||
      (typeof resData === "string" ? resData : "") ||
      `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText || ""}`;

    if (exactErrorMsg.includes("is not verified") || exactErrorMsg.includes("domain")) {
      exactErrorMsg += " (Verifica che la chiave API appartenga al team 'sale.autoagent' su resend.com/api-keys e non al tuo account personale)";
    }

    return res.status(200).json({
      success: false,
      simulated: false,
      error: exactErrorMsg,
    });
  } catch (err: any) {
    console.error("[api/send-email] Errore imprevisto:", err);
    return res.status(200).json({
      success: false,
      simulated: false,
      error: err?.message || "Errore imprevisto durante l'invio via Resend",
    });
  }
}
