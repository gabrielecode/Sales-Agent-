import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.startsWith('re_')) {
      resendClient = new Resend(apiKey);
    }
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
}

export async function sendOutreachEmail(params: SendEmailParams) {
  const client = getResendClient();
  const fromName = params.fromName || process.env.EMAIL_FROM_NAME || 'Sales Agent';
  const fromAddress = params.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'noreply@salesagent.ch';
  const from = `${fromName} <${fromAddress}>`;

  if (!client) {
    // Mock mode
    console.log(`[RESEND MOCK] Sending email to ${params.to} from ${from} | Subject: ${params.subject}`);
    return {
      success: true,
      mock: true,
      message: 'Email simulata (Modalità Mock - Nessuna RESEND_API_KEY configurata)',
      messageId: `mock_id_${Date.now()}`,
    };
  }

  try {
    const data = await client.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">${params.body.replace(/\n/g, '<br>')}</div>`,
      replyTo: params.replyTo,
    });

    return {
      success: true,
      mock: false,
      messageId: data.data?.id,
      message: 'Email inviata realmente tramite Resend',
    };
  } catch (error: any) {
    console.error('Resend API error:', error);
    return {
      success: false,
      mock: false,
      error: error.message || 'Errore durante l’invio con Resend',
    };
  }
}
