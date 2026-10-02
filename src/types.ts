export type Platform = 'Etsy' | 'Amazon KDP' | 'Shopify' | 'Instagram' | 'Web' | 'LinkedIn';
export type Language = 'it' | 'en' | 'de' | 'fr';
export type OfferType = 'affiliate' | 'sponsorship' | 'digital_product' | 'collab' | 'software';
export type TargetCategory = 'creators' | 'ecommerce' | 'authors' | 'influencers' | 'b2b' | 'handmade';
export type IntentClassification = 'interested' | 'info_requested' | 'not_interested' | 'ready_to_close' | 'unsubscribe' | 'out_of_office' | 'unknown';
export type FunnelStage = 'awareness' | 'evaluation' | 'purchase';

export type AppTab = 'config' | 'leads' | 'outreach' | 'responses' | 'dashboard' | 'instructions';

export type CTAMode = 'signup_link' | 'demo';

export interface ProductConfig {
  product_id?: string;
  cta_mode?: CTAMode;
  productName: string;
  productDescription: string;
  painPoint?: string;
  freeTrialText?: string;
  useFixedAwarenessTemplate?: boolean;
  targetAudience: string;
  targetMerchandiseCategory?: string;
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
  openRouterModel?: string;
  emailFromName?: string;
  emailSenderRole?: string;
  emailFromAddress?: string;
  emailReplyTo?: string;
  productUrl?: string;
  senderRole?: string;
  includeLinkInFirstContact?: boolean;
  followUpDays?: number[];
  productAnalysis?: {
    productName?: string;
    valueProposition: string;
    keyFeatures: string[];
    targetAudience: string;
    tone: string;
    pricingHint: string | null;
    offerType?: OfferType;
    analyzedAt: string;
    sourceUrl: string;
  };
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
  generatedBy?: 'gemini' | 'openrouter' | 'fallback';
  wordCount?: number;
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

export interface SharedKnowledge {
  tone: string;
  company_name: string;
  sender_name: string;
  legal_name: string;
  postal_address: string;
  contact_email: string;
  unsubscribe_lines: Record<Language, string>;
  common_objections: Array<{ objection: string; response: string }>;
}

export interface ProductKnowledge {
  product_id: string;
  product_name: string;
  description: string;
  ideal_customer: string;
  target_roles: Record<Language, string[]>;
  scoring_rules: {
    role_match: number;
    swiss_location: number;
    relevant_keywords: string[];
    keyword_match: number;
    valid_email: number;
  };
  case_studies: Array<{ name: string; result: string; verified: boolean }>;
  specific_objections: Array<{ objection: string; response: string }>;
}

export interface Lead {
  id: string;
  shopName: string;
  shopUrl: string;
  contactName?: string;
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
  product_id?: string;
  contactRole?: string;
  scoreReasoning?: string;
  source: 'csv' | 'custom';
  status: 'discovered' | 'contacted' | 'awaiting_reply' | 'replied' | 'in_negotiation' | 'won' | 'lost';
  selected: boolean;
  message?: LeadMessage;
  response?: LeadResponse;
  opportunity?: LeadOpportunity;
}
