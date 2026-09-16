export type Platform = 'Etsy' | 'Amazon KDP' | 'Shopify' | 'Instagram' | 'Web' | 'LinkedIn';
export type Language = 'it' | 'en' | 'de' | 'fr';
export type OfferType = 'affiliate' | 'sponsorship' | 'digital_product' | 'collab' | 'software';
export type TargetCategory = 'creators' | 'ecommerce' | 'authors' | 'influencers' | 'b2b' | 'handmade';
export type IntentClassification = 'interested' | 'info_requested' | 'not_interested' | 'ready_to_close';
export type FunnelStage = 'awareness' | 'evaluation' | 'purchase';

export type AppTab = 'config' | 'leads' | 'outreach' | 'responses' | 'dashboard' | 'instructions';

export interface ProductConfig {
  productName: string;
  productDescription: string;
  targetAudience: string;
  offerType: OfferType;
  commissionRate: string;
  targetCategory: TargetCategory;
  platforms: Platform[];
  languages: Language[];
  minLeadScore: number;
  dailyOutreachLimit: number;
  autoOutreach?: boolean;
  lastAutoRunAt?: string;
  funnelAssets?: {
    awareness: string[];
    evaluation: string[];
    purchase: string[];
  };
  openRouterApiKey?: string;
  openRouterModel?: string;
  resendApiKey?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  emailReplyTo?: string;
}

export interface BusinessSignals {
  numProducts: number;
  numReviews: number;
  monthsActive: number;
  estimatedRevenue: string;
}

export interface LeadMessage {
  subject: string;
  body: string;
  generatedAt?: string;
  sentAt?: string;
  followUpScheduled?: string;
}

export interface LeadResponse {
  text: string;
  receivedAt: string;
  intent: IntentClassification;
}

export interface LeadOpportunity {
  stage: 'Discovered' | 'Contacted' | 'In Negotiation' | 'Won' | 'Lost';
  actionTaken: string;
  revenueValue: number;
  closedAt?: string;
}

export interface Lead {
  id: string;
  shopName: string;
  shopUrl: string;
  platform: Platform;
  language: Language;
  email?: string;
  city?: string;
  canton?: string;
  industry?: string;
  toneOfVoice?: 'Formale' | 'Informale';
  emailQuality: 'Valida' | 'Sospetta' | 'Mancante';
  businessSignals: BusinessSignals;
  hasNeedSignal: boolean;
  shortNotes: string;
  leadScore: number;
  source: 'csv' | 'custom';
  status: 'discovered' | 'contacted' | 'awaiting_reply' | 'replied' | 'in_negotiation' | 'won' | 'lost';
  selected: boolean;
  message?: LeadMessage;
  response?: LeadResponse;
  opportunity?: LeadOpportunity;
}
