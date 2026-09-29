import { Lead, ProductConfig, FunnelStage, IntentClassification } from '../types';
import { generateLocalMessageFallback } from './messageFallback';
import { getFunnelStage } from './funnelStage';

export async function generateOutreachMessageWithAI(
  lead: Lead,
  config: ProductConfig,
  forcedStage?: FunnelStage
): Promise<{ subject: string; body: string; generatedBy?: 'gemini' | 'openrouter' | 'fallback'; wordCount?: number; error?: string }> {
  const stage = forcedStage || getFunnelStage(lead);

  const productName = (config?.productName || '').trim();
  const emailFromName = (config?.emailFromName || '').trim();

  if (!productName || !emailFromName) {
    return {
      subject: "Errore di configurazione",
      body: "Configura nome prodotto e mittente prima di generare le email",
      error: "Configura nome prodotto e mittente prima di generare le email",
      generatedBy: 'fallback',
      wordCount: 0
    };
  }

  try {
    const res = await fetch('/api/generate-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead, config, stage }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.subject && data.body) {
        const bodyStr = String(data.body).trim();
        return {
          subject: String(data.subject).trim(),
          body: bodyStr,
          generatedBy: data.generatedBy || 'openrouter',
          wordCount: typeof data.wordCount === 'number' ? data.wordCount : bodyStr.split(/\s+/).filter(Boolean).length,
        };
      }
    }
  } catch (err) {
    console.warn('Fallback a generatore locale per errore endpoint /api/generate-message:', err);
  }

  // Client-side fallback if network is interrupted or server returns invalid data
  const fallback = generateLocalMessageFallback(lead, config, stage);
  const fbBody = String(fallback.body || '').trim();
  return {
    subject: String(fallback.subject || '').trim(),
    body: fbBody,
    generatedBy: 'fallback',
    wordCount: fbBody.split(/\s+/).filter(Boolean).length,
  };
}

export async function classifyResponseWithAI(
  text: string,
  config?: ProductConfig
): Promise<{ intent: IntentClassification; reason?: string }> {
  try {
    const res = await fetch('/api/classify-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, config }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.intent) {
        return {
          intent: data.intent as IntentClassification,
          reason: data.reason,
        };
      }
    }
  } catch (err) {
    console.warn('Errore in /api/classify-response, uso classificazione locale:', err);
  }

  // Fallback heuristic classification
  const lower = text.toLowerCase();
  if (
    lower.includes('pronti') ||
    lower.includes('attivare') ||
    lower.includes('contratto') ||
    lower.includes('link referral') ||
    lower.includes('chiudere') ||
    lower.includes('codice referral') ||
    lower.includes('siamo dentro')
  ) {
    return { intent: 'ready_to_close', reason: 'Disponibilità immediata alla chiusura partnership' };
  }
  if (
    lower.includes('non siamo interessati') ||
    lower.includes('non accettiamo') ||
    lower.includes('no grazie') ||
    lower.includes('disiscrivimi') ||
    lower.includes('altre priorità') ||
    lower.includes('rifiuto')
  ) {
    return { intent: 'not_interested', reason: 'Rifiuto o disinteresse esplicito' };
  }
  if (
    lower.includes('quanto') ||
    lower.includes('percentuali') ||
    lower.includes('come funziona') ||
    lower.includes('dettagli') ||
    lower.includes('condizioni') ||
    lower.includes('minimo garantito') ||
    lower.includes('chiarimento')
  ) {
    return { intent: 'info_requested', reason: 'Richiesta di informazioni tecniche e commerciali' };
  }

  return { intent: 'interested', reason: 'Interesse generale o richiesta di incontro' };
}

