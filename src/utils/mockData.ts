import { ProductConfig, IntentClassification } from '../types';

export const DEFAULT_CONFIG: ProductConfig = {
  productName: 'Swiss Affiliate Booster',
  productDescription: 'Piattaforma di affiliazione e monetizzazione per creator ed e-commerce in Svizzera e nei mercati DACH / Europa.',
  targetAudience: 'Creator Etsy, venditori Amazon KDP, e-commerce Shopify e digital store',
  offerType: 'affiliate',
  commissionRate: '30%',
  targetCategory: 'creators',
  platforms: ['Etsy', 'Amazon KDP', 'Shopify', 'Web'],
  languages: ['it', 'de', 'fr', 'en'],
  minLeadScore: 65,
  autoOutreach: false,
  dailyOutreachLimit: 25,
  openRouterModel: 'meta-llama/llama-3-8b-instruct:free',
};

export function simulateSimulatedResponses(): { text: string; intent: IntentClassification }[] {
  return [
    {
      text: 'Ciao! Grazie per il messaggio. La proposta sembra davvero interessante per il nostro target. Potete inviarci maggiori dettagli o un link per registrarci?',
      intent: 'interested',
    },
    {
      text: 'Buongiorno, vorrei capire meglio quali sono le percentuali di conversione media e se c’è un minimo garantito per i partner.',
      intent: 'info_requested',
    },
    {
      text: 'Siamo pronti a provare! Inviami il contratto di affiliazione o il codice referral dedicato per il nostro store.',
      intent: 'ready_to_close',
    },
    {
      text: 'Grazie per averci contattato, ma al momento siamo concentrati su altre priorità e non accettiamo nuove partnership.',
      intent: 'not_interested',
    },
    {
      text: 'Ci piacerebbe fare una call di 10 minuti giovedì per approfondire la collaborazione.',
      intent: 'interested',
    },
  ];
}
export { parseCSVLeads } from '../lib/csvParser';
