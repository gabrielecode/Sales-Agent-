export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "");
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");
  const rawFrom = (process.env.EMAIL_FROM_ADDRESS || "").trim();
  const isWebmail = /@(gmail|googlemail|yahoo|hotmail|outlook)\.com$/i.test(rawFrom);
  const resolvedFrom = !rawFrom || isWebmail ? "commerciale@sititicino.ch" : rawFrom;
  const emailFromConfigured = Boolean(rawFrom && !isWebmail);

  const rawReplyTo = (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "").trim();
  const cleanReplyTo = rawReplyTo.replace(/^mailto:\s*/i, "").trim();
  const emailReplyToConfigured = Boolean(cleanReplyTo !== "");

  return res.status(200).json({
    openRouterConfigured,
    resendConfigured,
    emailFromConfigured,
    emailFromAddress: resolvedFrom,
    emailFromDisplay: process.env.EMAIL_FROM_NAME
      ? `${process.env.EMAIL_FROM_NAME} <${resolvedFrom}>`
      : resolvedFrom,
    emailReplyToConfigured,
    emailReplyToAddress: cleanReplyTo || "risposte@inbound.sititicino.ch",
  });
}
