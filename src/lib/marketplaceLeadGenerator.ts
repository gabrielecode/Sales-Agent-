import { Lead, ProductConfig, Platform, Language } from '../types';
import { calculateLeadScore } from './leadScoring';
import { validateEmailQuality, determineToneOfVoice } from './csvParser';

const SWISS_CITIES = [
  { city: 'Zurigo', canton: 'ZH', lang: 'de' as Language },
  { city: 'Ginevra', canton: 'GE', lang: 'fr' as Language },
  { city: 'Lugano', canton: 'TI', lang: 'it' as Language },
  { city: 'Basilea', canton: 'BS', lang: 'de' as Language },
  { city: 'Losanna', canton: 'VD', lang: 'fr' as Language },
  { city: 'Berna', canton: 'BE', lang: 'de' as Language },
  { city: 'Bellinzona', canton: 'TI', lang: 'it' as Language },
  { city: 'Lucerna', canton: 'LU', lang: 'de' as Language },
  { city: 'San Gallo', canton: 'SG', lang: 'de' as Language },
  { city: 'Locarno', canton: 'TI', lang: 'it' as Language },
];

const SHOP_TEMPLATES = [
  { name: 'SwissCraft Atelier', platform: 'Etsy' as Platform, industry: 'Artigianato & Accessori', notes: 'Negozio affermato con oltre 350 vendite, cerca partnership per canali di monetizzazione secondari.' },
  { name: 'Alpine Digital Studio', platform: 'Shopify' as Platform, industry: 'Digital Downloads & Planner', notes: 'Vende template Notion e planner digitali. Ottima compatibilità per affiliazione bundle.' },
  { name: 'Helvetia Publisher KDP', platform: 'Amazon KDP' as Platform, industry: 'Editoria & Libri Low Content', notes: 'Autore attivo con 18 titoli pubblicati negli ultimi 12 mesi. Cerca strumenti di automazione e marketing.' },
  { name: 'Ticino Tech Reviews', platform: 'Web' as Platform, industry: 'Media & Blog Tecnologico', notes: 'Blog con 25k visualizzazioni/mese in lingua italiana/tedesca focalizzato su tool e SaaS.' },
  { name: 'Geneva Luxury Prints', platform: 'Etsy' as Platform, industry: 'Poster & Wall Art', notes: 'Stampe personalizzate con recensioni entusiastiche. Nessun programma di affiliazione attivo.' },
  { name: 'Zurich Mindset Books', platform: 'Amazon KDP' as Platform, industry: 'Self-help & Mindfulness', notes: 'Bestseller di nicchia KDP. Possibile ambassador per offerta digitale e sponsorship.' },
  { name: 'Vaud Organics Store', platform: 'Shopify' as Platform, industry: 'Benessere & Lifestyle', notes: 'Brand D2C in rapida crescita. Molto attento a collaborazioni con creator e referral.' },
  { name: 'Matterhorn Design Co.', platform: 'Etsy' as Platform, industry: 'Decorazioni & Legno', notes: 'Prodotti sostenibili fatti a mano in Svizzera. Cerca visibilità internazionale.' },
  { name: 'Leman Creator Hub', platform: 'Instagram' as Platform, industry: 'Creator Economy & Corsi', notes: 'Community di 40k follower su IG / YouTube. Promuove attivamente tool in affiliazione.' },
  { name: 'Bern Handmade Goods', platform: 'Etsy' as Platform, industry: 'Ceramica & Accessori Casa', notes: 'Negozio attivo da 2 anni. Segnale di bisogno: tempo limitato per il marketing.' },
  { name: 'Basel E-Learning KDP', platform: 'Amazon KDP' as Platform, industry: 'Manuali & Guide Pratiche', notes: 'Serie di manuali per freelance. Alto potenziale di affiliazione formativa.' },
  { name: 'Gotthard Digital Tools', platform: 'Web' as Platform, industry: 'SaaS Directory & Risorse', notes: 'Directory specializzata in software europei con audience B2B e agenzie.' }
];

export function generateMarketplaceLeads(config: ProductConfig): Lead[] {
  return SHOP_TEMPLATES.map((tmpl, idx) => {
    const geo = SWISS_CITIES[idx % SWISS_CITIES.length];
    const reviews = Math.floor(Math.random() * 200) + 12;
    const products = Math.floor(Math.random() * 80) + 5;
    const months = Math.floor(Math.random() * 36) + 4;
    const revenueTier = reviews > 100 ? '€3.5k - €8k/mese' : reviews > 40 ? '€1.2k - €3k/mese' : '< €1k/mese';

    const baseLead: Partial<Lead> = {
      id: `lead_${idx + 1}_${Date.now()}`,
      shopName: tmpl.name,
      shopUrl: `https://${tmpl.platform.toLowerCase().replace(/\s+/g, '')}.com/shop/${tmpl.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      platform: tmpl.platform,
      language: geo.lang,
      city: geo.city,
      canton: geo.canton,
      industry: tmpl.industry,
      email: `contact@${tmpl.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch`,
      emailQuality: 'Valida',
      toneOfVoice: determineToneOfVoice(tmpl.industry),
      businessSignals: {
        numProducts: products,
        numReviews: reviews,
        monthsActive: months,
        estimatedRevenue: revenueTier,
      },
      hasNeedSignal: idx % 2 === 0,
      shortNotes: tmpl.notes,
      source: 'auto',
      status: idx === 0 ? 'contacted' : idx === 1 ? 'replied' : 'discovered',
      selected: idx < 4,
    };

    const leadScore = calculateLeadScore(baseLead, config);

    return {
      ...baseLead,
      leadScore,
    } as Lead;
  });
}
