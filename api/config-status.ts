export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "");
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");
  const emailFromConfigured = Boolean(process.env.EMAIL_FROM_ADDRESS && process.env.EMAIL_FROM_ADDRESS.trim() !== "");
  const emailReplyToConfigured = Boolean(
    (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS) &&
    (process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "").trim() !== ""
  );

  return res.status(200).json({
    openRouterConfigured,
    resendConfigured,
    emailFromConfigured,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || "",
    emailFromDisplay: process.env.EMAIL_FROM_NAME
      ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev"}>`
      : (process.env.EMAIL_FROM_ADDRESS || ""),
    emailReplyToConfigured,
    emailReplyToAddress: process.env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO_ADDRESS || "",
  });
}
