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
    const fromName = (process.env.EMAIL_FROM_NAME || config?.emailFromName || "Sales Agent").trim();
    const fromAddress = (process.env.EMAIL_FROM_ADDRESS || config?.emailFromAddress || "onboarding@resend.dev").trim();
    const formattedFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const replyToAddress = (
      process.env.EMAIL_REPLY_TO ||
      process.env.EMAIL_REPLY_TO_ADDRESS ||
      config?.emailReplyTo ||
      "rispondi@inbound.sititicino.ch"
    ).trim();

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

    const resData = (await resendRes.json().catch(() => ({}))) as any;

    if (resendRes.ok) {
      return res.status(200).json({
        success: true,
        simulated: false,
        messageId: resData?.id,
      });
    }

    // Resend returned an error (e.g. 401 invalid key, 403 onboarding restriction, 422 domain not verified)
    let errorMsg = resData?.message || `Errore Resend HTTP ${resendRes.status}: ${resendRes.statusText || ""}`;

    if (fromAddress === "onboarding@resend.dev" && (resendRes.status === 403 || errorMsg.toLowerCase().includes("testing email"))) {
      errorMsg = `Resend: con l'indirizzo gratuito di test 'onboarding@resend.dev' puoi inviare solo all'indirizzo email con cui ti sei registrato su Resend. Per inviare a contatti esterni (come ${to}), verifica un dominio su https://resend.com/domains e configuralo in 'Configurazione'.`;
    } else if (resendRes.status === 401) {
      errorMsg = "Resend API Key non valida o revocata. Verifica la chiave inserita in 'Configurazione'.";
    }

    return res.status(200).json({
      success: false,
      simulated: false,
      error: errorMsg,
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
