import { Lead, ProductConfig } from '../types';

export function calculateLeadScore(lead: Partial<Lead>, config: ProductConfig): number {
  let score = 50;

  // Review & traction weight
  const reviews = lead.businessSignals?.numReviews || 0;
  if (reviews > 100) score += 20;
  else if (reviews > 30) score += 15;
  else if (reviews > 5) score += 10;

  // Active presence
  const months = lead.businessSignals?.monthsActive || 0;
  if (months >= 12) score += 10;
  else if (months >= 6) score += 5;

  // High need signal
  if (lead.hasNeedSignal) score += 15;

  // Platform match
  if (lead.platform && config.platforms.includes(lead.platform)) {
    score += 10;
  }

  // Language match
  if (lead.language && config.languages.includes(lead.language)) {
    score += 5;
  }

  // Email present bonus
  if (lead.email) {
    score += 5;
  }

  return Math.min(Math.max(score, 20), 99);
}
