import { ProductConfig } from '../types';

export interface SendEmailResponse {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  body: string;
  config: ProductConfig;
}): Promise<SendEmailResponse> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        body: params.body,
        config: params.config,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: Boolean(data.success),
        simulated: Boolean(data.simulated),
        messageId: data.messageId,
        error: data.error,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      let msg = errData?.error || errData?.message;
      if (!msg) {
        if (res.status === 500) {
          msg = "Errore interno server (HTTP 500).";
        } else if (res.status === 404) {
          msg = "Endpoint /api/send-email non trovato (HTTP 404).";
        } else {
          msg = `Errore HTTP ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`;
        }
      }
      return {
        success: false,
        simulated: false,
        error: msg,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      simulated: false,
      error: err?.message || 'Errore di connessione al server',
    };
  }
}
