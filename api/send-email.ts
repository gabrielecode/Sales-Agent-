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

    const apiKey = (process.env.RESEND_API_KEY || config?.resendApiKey || "").trim();
    const fromName = (config?.emailFromName || process.env.EMAIL_FROM_NAME || "Commerciale").trim();
    
    // Resolve fromAddress: prefer config.emailFromAddress, fallback to env unless it's a webmail like gmail, default to commerciale@sititicino.ch
    let fromAddress = (config?.emailFromAddress || "").trim();
    if (!fromAddress) {
      const envFrom = (process.env.EMAIL_FROM_ADDRESS || "").trim();
      if (envFrom && !/@(gmail|googlemail|yahoo|hotmail|outlook)\.com$/i.test(envFrom)) {
        fromAddress = envFrom;
      } else {
        fromAddress = "commerciale@sititicino.ch";
      }
    }
    const formattedFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    // Resolve replyTo: strip any "mailto:" prefix
    let rawReplyTo = (
      config?.emailReplyTo ||
      process.env.EMAIL_REPLY_TO ||
      process.env.EMAIL_REPLY_TO_ADDRESS ||
      "risposte@inbound.sititicino.ch"
    ).trim();
    const cleanReplyTo = rawReplyTo.replace(/^mailto:\s*/i, "").trim();

    // If no API key is provided, safely simulate
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        simulated: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
    }

    const payload: any = {
      from: formattedFrom,
      to: [to],
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${body.replace(/\n/g, "<br>")}</div>`,
    };
    if (cleanReplyTo) {
      payload.reply_to = cleanReplyTo;
    }

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

    // Return the exact error message from Resend without altering or hardcoding
    const exactErrorMsg =
      resData?.message ||
      resData?.error ||
      (typeof resData === "string" ? resData : "") ||
      `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText || ""}`;

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
