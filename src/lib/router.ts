import { Lead, ProductKnowledge } from '../types';
import { authenticatedFetch } from './api';

export interface RouteResult {
  product_id: string | 'none';
  confidence: number;
  reason: string;
}

/**
 * Ruota un lead verso il prodotto più adatto usando l'AI (Gemini)
 * o un fallback deterministico basato sui target_roles della KB.
 */
export async function routeLeadSmart(
  lead: Lead, 
  availableProducts: ProductKnowledge[]
): Promise<RouteResult> {
  
  // 1. Tentativo AI via server
  try {
    const res = await authenticatedFetch('/api/route-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.product_id) {
        return data as RouteResult;
      }
    }
  } catch (err) {
    console.warn("Routing AI fallito, utilizzo fallback deterministico:", err);
  }

  // 2. Fallback Deterministico
  return routeLeadDeterministic(lead, availableProducts);
}

/**
 * Fallback deterministico basato su parole chiave nei ruoli e note
 */
export function routeLeadDeterministic(
  lead: Lead,
  availableProducts: ProductKnowledge[]
): RouteResult {
  
  for (const product of availableProducts) {
    const lang = lead.language || 'it';
    const roles = product.target_roles[lang] || product.target_roles['it'] || [];
    
    // Match su ruolo
    if (lead.contactRole) {
      const match = roles.some(r => 
        lead.contactRole!.toLowerCase().includes(r.toLowerCase()) ||
        r.toLowerCase().includes(lead.contactRole!.toLowerCase())
      );
      if (match) {
        return {
          product_id: product.product_id,
          confidence: 0.8,
          reason: `Match deterministico su ruolo: ${lead.contactRole}`
        };
      }
    }
    
    // Match su note/industry
    const textToSearch = `${lead.industry || ''} ${lead.shortNotes || ''}`.toLowerCase();
    const keywords = product.scoring_rules.relevant_keywords || [];
    const hasKeyword = keywords.some(kw => textToSearch.includes(kw.toLowerCase()));
    
    if (hasKeyword) {
      return {
        product_id: product.product_id,
        confidence: 0.6,
        reason: `Match deterministico su parole chiave rilevate`
      };
    }
  }

  return {
    product_id: 'none',
    confidence: 1,
    reason: 'Nessun prodotto corrispondente trovato nei criteri definiti'
  };
}
