export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawResendKey = (process.env.RESEND_API_KEY || "").replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
  const resendConfigured = Boolean(rawResendKey !== "");
  const resendKeyMasked = resendConfigured
    ? `${rawResendKey.slice(0, 7)}...${rawResendKey.slice(-4)}`
    : null;

  const rawOpenRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const openRouterConfigured = Boolean(rawOpenRouterKey !== "");
  const openRouterKeyMasked = openRouterConfigured
    ? `${rawOpenRouterKey.slice(0, 7)}...${rawOpenRouterKey.slice(-4)}`
    : null;

  const rawFrom = (process.env.EMAIL_FROM_ADDRESS || "").trim();
  const isWebmail = /@(gmail|googlemail|yahoo|hotmail|outlook)\.com$/i.test(rawFrom);
  const resolvedFrom = !rawFrom || isWebmail ? "commerciale@sititicino.ch" : rawFrom;
  const emailFromConfigured = Boolean(rawFrom && !isWebmail);

  const rawReplyTo = (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "").trim();
  const cleanReplyTo = rawReplyTo.replace(/^mailto:\s*/i, "").trim();
  const emailReplyToConfigured = Boolean(cleanReplyTo !== "");

  return res.status(200).json({
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
}
