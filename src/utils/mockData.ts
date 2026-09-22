import { ProductConfig, IntentClassification, OfferType } from '../types';

export function getFunnelAssetsForOfferType(offerType?: OfferType) {
  if (offerType === 'digital_product' || offerType === 'software') {
    return {
      awareness: [
        'Guida PDF: Come ottimizzare i processi con il nostro prodotto digitale',
        'Checklist: I 5 criteri fondamentali per scegliere la soluzione software ideale',
      ],
      evaluation: [
        'Video demo prodotto e panoramica funzionalità chiave',
        'Pagina prezzi e confronto piani / ROI stimato',
      ],
      purchase: [
        'Prova gratuita 14 giorni senza carta di credito',
        'Prenotazione call di setup guidato con il nostro product specialist (15 min)',
      ],
    };
  }
  return {
    awareness: [
      'Guida PDF: Come scalare le vendite con affiliazioni ed e-commerce',
      'Checklist: I 5 errori da evitare nelle collaborazioni digitali',
    ],
    evaluation: [
      'Demo video interattiva della piattaforma partner',
      'Case study: +42% di margine medio per creator e shop partner',
    ],
    purchase: [
      'Link di attivazione immediata programma partner con bonus benvenuto',
      'Prenotazione call di onboarding 1-a-1 gratuita (15 min)',
    ],
  };
}

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
  dailyOutreachLimit: 100,
  autoOutreach: false,
  emailFromName: 'Commerciale',
  emailFromAddress: 'commerciale@sititicino.ch',
  emailReplyTo: 'risposte@inbound.sititicino.ch',
  funnelAssets: getFunnelAssetsForOfferType('affiliate'),
  openRouterModel: 'openai/gpt-4o-mini',
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
