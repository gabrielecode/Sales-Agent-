import { Lead, ProductConfig } from '../types';
import { generateLocalMessageFallback } from './messageFallback';

export async function generateOutreachMessageWithAI(
  lead: Lead,
  config: ProductConfig
): Promise<{ subject: string; body: string }> {
  try {
    const res = await fetch('/api/generate-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead, config }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.subject && data.body) {
        return {
          subject: data.subject,
          body: data.body,
        };
      }
    }
  } catch (err) {
    console.warn('Fallback a generatore locale per errore endpoint /api/generate-message:', err);
  }

  // Client-side fallback if network is interrupted or server returns invalid data
  return generateLocalMessageFallback(lead, config);
}
