import { Lead, ProductConfig, ProductKnowledge } from '../types';

export interface ScoreResult {
  score: number;
  reasoning: string;
  product_match: string;
}

export function calculateLeadScore(
  lead: Partial<Lead>, 
  config: ProductConfig,
  productKnowledge?: ProductKnowledge
): ScoreResult {
  
  // Se il prodotto è "legacy" (Etsy/Affiliazione), usiamo il vecchio sistema
  if (!productKnowledge || config.product_id === 'legacy') {
    return calculateLegacyScore(lead, config);
  }

  // Nuovo sistema basato sulla Knowledge Base (es. Vicini)
  let score = 0;
  const reasons: string[] = [];
  const rules = productKnowledge.scoring_rules;

  // 1. Ruolo coerente (+40)
  if (lead.contactRole && lead.language) {
    const targetRoles = productKnowledge.target_roles[lead.language] || [];
    const roleMatch = targetRoles.some(role => 
      lead.contactRole!.toLowerCase().includes(role.toLowerCase()) || 
      role.toLowerCase().includes(lead.contactRole!.toLowerCase())
    );
    if (roleMatch) {
      score += rules.role_match || 40;
      reasons.push(`Ruolo coerente (${lead.contactRole})`);
    }
  }

  // 2. Località Svizzera (+20)
  const isSwiss = ['ZH', 'BE', 'BS', 'BL', 'LU', 'SG', 'AG', 'SO', 'SH', 'TG', 'ZG', 'GR', 'AR', 'AI', 'GL', 'NW', 'OW', 'SZ', 'UR', 'GE', 'VD', 'VS', 'NE', 'JU', 'FR', 'TI', 'CH', 'SVIZZERA'].includes((lead.canton || '').toUpperCase()) || 
                  ['SVIZZERA', 'SCHWEIZ', 'SUISSE', 'SWITZERLAND'].includes((lead.city || '').toUpperCase());
  if (isSwiss) {
    score += rules.swiss_location || 20;
    reasons.push('Località Svizzera');
  }

  // 3. Parole chiave nelle note (+20)
  if (lead.shortNotes && rules.relevant_keywords) {
    const hasKeyword = rules.relevant_keywords.some(kw => 
      lead.shortNotes!.toLowerCase().includes(kw.toLowerCase())
    );
    if (hasKeyword) {
      score += rules.keyword_match || 20;
      reasons.push('Parole chiave rilevanti nelle note');
    }
  }

  // 4. Email valida non generica (+20)
  if (lead.emailQuality === 'Valida') {
    score += rules.valid_email || 20;
    reasons.push('Email professionale/valida');
  } else if (lead.emailQuality === 'Sospetta') {
    score += 5; // Bonus minimo per email generica ma formattata bene
    reasons.push('Email generica');
  }

  return {
    score: Math.min(Math.max(score, 0), 100),
    reasoning: reasons.length > 0 ? reasons.join(', ') : 'Nessun match specifico trovato',
    product_match: productKnowledge.product_id
  };
}

function calculateLegacyScore(lead: Partial<Lead>, config: ProductConfig): ScoreResult {
  let score = 50;
  const reasons: string[] = ['Base score 50'];

  // Review & traction weight
  const reviews = lead.businessSignals?.numReviews || 0;
  if (reviews > 100) { score += 20; reasons.push('Ottima traction (>100 recensioni)'); }
  else if (reviews > 30) { score += 15; reasons.push('Buona traction (>30 recensioni)'); }
  else if (reviews > 5) { score += 10; reasons.push('Presenza avviata (>5 recensioni)'); }

  // Active presence
  const months = lead.businessSignals?.monthsActive || 0;
  if (months >= 12) { score += 10; reasons.push('Attivo da >1 anno'); }
  else if (months >= 6) { score += 5; reasons.push('Attivo da >6 mesi'); }

  // High need signal
  if (lead.hasNeedSignal) { score += 15; reasons.push('Segnale di bisogno rilevato'); }

  // Platform match
  if (lead.platform && config.platforms?.includes(lead.platform)) {
    score += 10;
    reasons.push(`Piattaforma target (${lead.platform})`);
  }

  // Language match
  if (lead.language && config.languages?.includes(lead.language)) {
    score += 5;
    reasons.push(`Lingua target (${lead.language})`);
  }

  // Email present bonus
  if (lead.email) {
    score += 5;
    reasons.push('Email presente');
  }

  return {
    score: Math.min(Math.max(score, 20), 99),
    reasoning: reasons.join(', '),
    product_match: 'legacy'
  };
}
