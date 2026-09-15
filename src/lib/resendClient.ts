import { ProductConfig } from '../types';

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  body: string;
  config: ProductConfig;
}): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const apiKey = params.config.resendApiKey || process.env.RESEND_API_KEY;
  const from = params.config.emailFromAddress || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

  if (!apiKey) {
    // Graceful simulated sending
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from,
        to: [params.to],
        subject: params.subject,
        text: params.body,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${params.body.replace(/\n/g, '<br>')}</div>`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, simulated: false, messageId: data.id };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Errore Resend: ${res.statusText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Errore di connessione a Resend' };
  }
}
