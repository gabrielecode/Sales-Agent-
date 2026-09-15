import { Lead, ProductConfig, Platform, Language } from '../types';

const SHOP_PREFIXES: Record<Platform, string[]> = {
  Etsy: ['ArtisanCrafts', 'BohoVintage', 'LuxeJewelsCo', 'HandmadeHaven', 'CosyHomeDecors', 'NaturalGifts', 'VelvetCreations', 'EcoPrintables'],
  'Amazon KDP': ['Global Press', 'Apex Editions', 'Mindful Publishing', 'Starlight Books', 'Summit Guides', 'Bright Notebooks'],
  Shopify: ['NordicStyle Shop', 'UrbanGadgets', 'PureSkin Organics', 'FitPulse Gear', 'AuraLiving', 'GreenLeaf Goods', 'VelvetTrend', 'AlphaCommerce'],
  eBay: ['MegaDeals 247', 'DirectOutlet', 'CollectorHub', 'PrimeFinds', 'ValueTraders'],
  Reddit: ['u/crafty_seller99', 'u/ecom_founder_x', 'u/etsy_guru_22', 'u/shopify_pro_dev', 'u/kdp_author_guy'],
  Facebook: ['Handmade Artisans Group', 'Shopify Masters Community', 'Etsy Sellers Network', 'KDP Passive Income Hub'],
  LinkedIn: ['E-Commerce Growth Network', 'D2C Founders Club', 'Marketplace Scaling Pros'],
  X: ['@ecom_hacker', '@etsy_tips', '@shopify_daily', '@kdp_hustle'],
  Blog: ['eCommerceInsight.net', 'MarketplaceMastery.blog', 'D2CWeekly.org', 'SellSmartOnline.io'],
  Newsletter: ['The E-Commerce Dispatch', 'Marketplace Trends Daily', 'Indie Founder Digest'],
  'Email (da CSV)': ['SwissDirect', 'HelvetiaLead'],
  'Swiss Company': ['Helvetia Corp', 'SwissGlobal'],
};

const NOTE_TEMPLATES = [
  'Store has strong traffic but stagnant conversion rates; tags could be optimized.',
  'Recent 1-star reviews mention shipping delays and poor title descriptions.',
  'Active seller posting frequently about low visibility in marketplace search.',
  'Looking for automated tools to scale listings across multiple channels.',
  'High catalog size (over 80 products) with generic descriptions.',
  'Launched 3 months ago, seeking ways to increase organic click-through rate.',
  'Asked in community forums for advice on SEO tools and keyword ranking.',
  'Experienced steady sales growth, now looking for conversion rate optimization.',
];

const SWISS_CITIES = [
  { city: 'Zürich', canton: 'ZH', lang: 'de' as Language },
  { city: 'Geneva', canton: 'GE', lang: 'fr' as Language },
  { city: 'Lugano', canton: 'TI', lang: 'it' as Language },
  { city: 'Basel', canton: 'BS', lang: 'de' as Language },
  { city: 'Bern', canton: 'BE', lang: 'de' as Language },
  { city: 'Lausanne', canton: 'VD', lang: 'fr' as Language },
];

export function generateMarketplaceLeads(config: ProductConfig): Lead[] {
  const count = config.maxLeadsPerSession || 25;
  const activePlatforms: Platform[] = config.channels.filter(c => c !== 'Email (da CSV)' && c !== 'Swiss Company');
  const platforms: Platform[] = activePlatforms.length > 0 
    ? activePlatforms 
    : ['Etsy', 'Shopify', 'Amazon KDP'];
  const languages: Language[] = config.targetLanguages.length > 0 ? config.targetLanguages : ['en', 'de', 'it', 'fr'];

  const leads: Lead[] = [];

  for (let i = 1; i <= count; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const prefixes = SHOP_PREFIXES[platform] || ['Shop', 'Store', 'Hub'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const shopName = `${prefix}_${Math.floor(100 + Math.random() * 900)}`;
    const language = languages[Math.floor(Math.random() * languages.length)];

    // Estimate email for ~65% of leads
    const hasEmail = Math.random() < 0.65;
    const email = hasEmail ? `contact@${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : undefined;

    // Swiss context if platform or target includes Swiss
    const isSwiss = platform === 'Swiss Company' || config.targetCategories.includes('Aziende svizzere (da CSV)') || Math.random() < 0.25;
    let city: string | undefined;
    let canton: string | undefined;
    let lang = language;

    if (isSwiss) {
      const swiss = SWISS_CITIES[Math.floor(Math.random() * SWISS_CITIES.length)];
      city = swiss.city;
      canton = swiss.canton;
      lang = swiss.lang;
    }

    const numProducts = Math.floor(5 + Math.random() * 120);
    const numReviews = Math.floor(2 + Math.random() * 250);
    const monthsActive = Math.floor(2 + Math.random() * 36);
    const estimatedRevenue = `$${Math.floor(1200 + Math.random() * 18500)}/mo`;

    const hasNeedSignal = Math.random() > 0.35;
    const shortNotes = NOTE_TEMPLATES[Math.floor(Math.random() * NOTE_TEMPLATES.length)];

    let productScore = numProducts >= 50 ? 30 : Math.floor((numProducts / 50) * 30);
    let reviewScore = numReviews >= 20 ? 20 : Math.floor((numReviews / 20) * 20);
    let tenureScore = monthsActive >= 6 ? 20 : Math.floor((monthsActive / 6) * 20);
    let needScore = hasNeedSignal ? 20 : 0;
    
    const lowerDesc = config.productDescription.toLowerCase();
    const hasKeyword = lowerDesc.includes('seo') || lowerDesc.includes('convert') || lowerDesc.includes('ai') || lowerDesc.includes('market') || lowerDesc.includes('email');
    let keywordScore = hasKeyword ? 10 : 5;

    const leadScore = Math.min(100, Math.max(15, productScore + reviewScore + tenureScore + needScore + keywordScore));

    leads.push({
      id: `mock_lead_${i}_${Date.now().toString().slice(-4)}`,
      source: 'mock',
      platform,
      shopName,
      shopUrl: `https://${platform.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/shop/${shopName.toLowerCase()}`,
      email,
      city,
      canton,
      industry: platform,
      language: lang,
      businessSignals: {
        numProducts,
        numReviews,
        monthsActive,
        estimatedRevenue,
      },
      hasNeedSignal,
      shortNotes,
      leadScore,
      scoreBreakdown: {
        productScore,
        reviewScore,
        tenureScore,
        needScore,
        keywordScore,
      },
      status: 'discovered',
      selected: leadScore >= config.minLeadScore,
    });
  }

  return leads.sort((a, b) => b.leadScore - a.leadScore);
}
