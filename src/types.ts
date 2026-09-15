export type OfferType = 
  | 'Direct Sale (Subscription / License)' 
  | 'Done-For-You Service based on product' 
  | 'Programma di affiliazione (Seeking partners)' 
  | 'Vendita lead ad agenzie/affiliati';

export type TargetCategory = 
  | 'Etsy sellers' 
  | 'Amazon KDP authors' 
  | 'eBay sellers' 
  | 'Shopify store owners' 
  | 'SaaS founders' 
  | 'eCommerce owners' 
  | 'Creator / influencer' 
  | 'Marketing agencies' 
  | 'Aziende svizzere (da CSV)'
  | 'Others';

export type Platform = 
  | 'Etsy' 
  | 'Amazon KDP' 
  | 'eBay' 
  | 'Shopify' 
  | 'Reddit' 
  | 'Facebook' 
  | 'LinkedIn' 
  | 'X' 
  | 'Blog' 
  | 'Newsletter'
  | 'Email (da CSV)'
  | 'Swiss Company';

export type Language = 'en' | 'de' | 'it' | 'fr';

export interface ProductConfig {
  productUrl: string;
  productName: string;
  productDescription: string;
  offerType: OfferType;
  targetCategories: TargetCategory[];
  channels: Platform[];
  targetLanguages: Language[];
  minLeadScore: number;
  maxLeadsPerSession: number;
  leadSourceMode: 'mock' | 'csv' | 'both';
}

export interface BusinessSignals {
  numProducts: number;
  numReviews: number;
  monthsActive: number;
  estimatedRevenue: string; // e.g., "$3,400/mo"
}

export type LeadStatus = 
  | 'discovered' 
  | 'selected' 
  | 'contacted' 
  | 'awaiting_reply' 
  | 'replied' 
  | 'in_negotiation' 
  | 'won' 
  | 'not_interested';

export type IntentClassification = 'Interested' | 'Needs Nurturing' | 'Not Interested';

export interface Lead {
  id: string;
  source: 'mock' | 'csv';
  platform: Platform;
  shopName: string; // company name for CSV
  shopUrl: string; // website for CSV
  email?: string;
  city?: string;
  canton?: string;
  industry?: string;
  language: Language;
  businessSignals: BusinessSignals;
  hasNeedSignal: boolean;
  shortNotes: string;
  leadScore: number;
  scoreBreakdown: {
    productScore: number;
    reviewScore: number;
    tenureScore: number;
    needScore: number;
    keywordScore: number;
  };
  status: LeadStatus;
  selected: boolean;
  message?: {
    subject: string;
    body: string;
    generatedAt: string;
    sentAt?: string;
    followUpScheduled?: string;
  };
  response?: {
    text: string;
    receivedAt: string;
    intent: IntentClassification;
  };
  opportunity?: {
    actionTaken?: string;
    stage: 'In Negotiation' | 'Won' | 'Closed Lost';
    revenueValue: number;
    closedAt?: string;
  };
}

export type AppTab = 'config' | 'leads' | 'outreach' | 'responses' | 'dashboard' | 'instructions';

