import { ProductConfig, Lead, Platform, Language, IntentClassification } from '../types';

export const DEFAULT_CONFIG: ProductConfig = {
  productUrl: 'https://listingboost-ai.io/offer',
  productName: 'ListingBoost AI',
  productDescription: 'AI-powered listing optimizer and SEO tool that boosts marketplace conversion rates by up to 34%.',
  offerType: 'Direct Sale (Subscription / License)',
  targetCategories: ['Etsy sellers', 'Shopify store owners', 'Aziende svizzere (da CSV)'],
  channels: ['Etsy', 'Shopify', 'Email (da CSV)', 'Swiss Company'],
  targetLanguages: ['en', 'de', 'it', 'fr'],
  minLeadScore: 60,
  maxLeadsPerSession: 25,
  leadSourceMode: 'both',
};

export const SAMPLE_CSV_DATA = `company_name,website,email,city,canton,industry,notes
"Alpine Tech SA","https://alpinetech.ch","contact@alpinetech.ch","Zürich","ZH","Software & SaaS","Looking for automation and SEO tools"
"Leman Digital","https://lemandigital.ch","info@lemandigital.ch","Geneva","GE","Marketing","High traffic digital agency, needs conversion optimization"
"Ticino Web Agency","https://ticinoweb.ch","hello@ticinoweb.ch","Lugano","TI","Digital Agency","Seeking partner tools for e-commerce clients"
"Basel Pharma Services","https://baselpharma.ch","","Basel","BS","Services","Enterprise client, manual listing management across marketplaces"
"Bern Craft Shop","https://berncraft.ch","shop@berncraft.ch","Bern","BE","E-Commerce","Local artisan store scaling online sales"`;

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

export function generateMockLeads(config: ProductConfig): Lead[] {
  const count = config.maxLeadsPerSession || 25;
  const platforms: Platform[] = config.channels.filter(c => c !== 'Email (da CSV)' && c !== 'Swiss Company').length > 0 
    ? config.channels.filter(c => c !== 'Email (da CSV)' && c !== 'Swiss Company') 
    : ['Etsy', 'Shopify', 'Amazon KDP'];
  const languages: Language[] = config.targetLanguages.length > 0 ? config.targetLanguages : ['en'];

  const leads: Lead[] = [];

  for (let i = 1; i <= count; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const prefixes = SHOP_PREFIXES[platform] || ['Shop', 'Store', 'Hub'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const shopName = `${prefix}_${Math.floor(100 + Math.random() * 900)}`;
    const language = languages[Math.floor(Math.random() * languages.length)];

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
      language,
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

export function parseCSVLeads(csvText: string, config: ProductConfig): Lead[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  
  const nameIdx = header.findIndex((h) => h.includes('company') || h.includes('name') || h.includes('azienda'));
  const webIdx = header.findIndex((h) => h.includes('web') || h.includes('url') || h.includes('sito'));
  const emailIdx = header.findIndex((h) => h.includes('email') || h.includes('mail'));
  const cityIdx = header.findIndex((h) => h.includes('city') || h.includes('citt'));
  const cantonIdx = header.findIndex((h) => h.includes('canton') || h.includes('cantone'));
  const industryIdx = header.findIndex((h) => h.includes('industry') || h.includes('settore') || h.includes('sector'));
  const notesIdx = header.findIndex((h) => h.includes('note') || h.includes('description'));

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV row splitter respecting quotes if possible or standard split
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 1) continue;

    const shopName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Swiss Company ${i}`;
    const shopUrl = webIdx >= 0 && cols[webIdx] ? cols[webIdx] : `https://${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch`;
    const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : undefined;
    const city = cityIdx >= 0 && cols[cityIdx] ? cols[cityIdx] : 'Zürich';
    const canton = cantonIdx >= 0 && cols[cantonIdx] ? cols[cantonIdx] : 'ZH';
    const industry = industryIdx >= 0 && cols[industryIdx] ? cols[industryIdx] : 'Services';
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : '';

    let lang: Language = 'de';
    const frCantons = ['GE', 'VD', 'FR', 'NE', 'JU', 'VS'];
    const itCantons = ['TI', 'GR'];
    if (frCantons.includes(canton.toUpperCase())) lang = 'fr';
    else if (itCantons.includes(canton.toUpperCase())) lang = 'it';
    else lang = 'de';

    const majorCities = ['zürich', 'zurich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'lugano'];
    const isMajorCity = majorCities.some((c) => city.toLowerCase().includes(c));
    const hasEmail = Boolean(email);
    const lowerProduct = (config.productDescription + ' ' + config.productName).toLowerCase();
    const hasKeyword = (industry + ' ' + notes).toLowerCase().split(' ').some((w) => w.length > 3 && lowerProduct.includes(w));

    let industryScore = 20;
    let cityScore = isMajorCity ? 20 : 10;
    let emailScore = hasEmail ? 20 : 0;
    let keywordScore = hasKeyword ? 20 : 10;
    let baseScore = 20;

    const leadScore = Math.min(100, industryScore + cityScore + emailScore + keywordScore + baseScore);

    leads.push({
      id: `csv_lead_${i}_${Date.now().toString().slice(-4)}`,
      source: 'csv',
      platform: email ? 'Email (da CSV)' : 'Swiss Company',
      shopName,
      shopUrl,
      email,
      city,
      canton,
      industry,
      language: lang,
      businessSignals: {
        numProducts: Math.floor(10 + Math.random() * 50),
        numReviews: Math.floor(5 + Math.random() * 40),
        monthsActive: 12,
        estimatedRevenue: `$${Math.floor(5000 + Math.random() * 35000)}/mo`,
      },
      hasNeedSignal: hasKeyword || isMajorCity,
      shortNotes: `${industry} in ${city} (${canton})${notes ? ' - ' + notes : ''}`,
      leadScore,
      scoreBreakdown: {
        productScore: industryScore,
        reviewScore: cityScore,
        tenureScore: emailScore,
        needScore: keywordScore,
        keywordScore: baseScore,
      },
      status: 'discovered',
      selected: leadScore >= config.minLeadScore,
    });
  }

  return leads.sort((a, b) => b.leadScore - a.leadScore);
}

export function generateOutreachMessage(lead: Lead, config: ProductConfig): { subject: string; body: string } {
  const productName = config.productName || 'our solution';
  const productUrl = config.productUrl || 'https://example.com';
  const shop = lead.shopName;

  let greeting = 'Hi there';
  let intro = `I noticed ${shop} based in ${lead.city || 'Switzerland'} operating in the ${lead.industry || 'market'}.`;
  if (lead.language === 'it') {
    greeting = 'Buongiorno';
    intro = `Ho notato ${shop} a ${lead.city || 'Lugano'} attiva nel settore ${lead.industry || 'servizi'}.`;
  } else if (lead.language === 'de') {
    greeting = 'Guten Tag';
    intro = `Ich habe Ihr Unternehmen ${shop} in ${lead.city || 'Zürich'} (${lead.industry || 'Services'}) entdeckt.`;
  } else if (lead.language === 'fr') {
    greeting = 'Bonjour';
    intro = `J'ai découvert votre entreprise ${shop} à ${lead.city || 'Genève'} dans le secteur ${lead.industry || 'services'}.`;
  }

  let ctaText = `Would you like to try ${productName} for your team free of charge? Check it out here: ${productUrl}`;
  if (config.offerType.includes('Done-For-You')) {
    ctaText = `We can show you how we use ${productName} to drive growth for companies like yours. Want a free consultation? ${productUrl}`;
  } else if (config.offerType.includes('affiliazione') || config.offerType.includes('Affiliate')) {
    ctaText = `We are selecting top Swiss partners for ${productName} with recurring commissions. Would you like to review the details? ${productUrl}`;
  }

  let body = `${intro} Many companies in your sector hit growth bottlenecks regarding lead conversion and digital scaling.\n\nOur tool, ${productName}, is designed specifically to solve this by automating high-impact acquisition workflows.\n\n${ctaText}`;

  if (lead.language === 'it') {
    body = `${intro} Molte aziende nel vostro settore affrontano sfide nella scalabilità digitale e nell'acquisizione clienti.\n\n${productName} è progettato per ottimizzare esattamente questi processi.\n\n${ctaText}`;
  } else if (lead.language === 'de') {
    body = `${intro} Viele Unternehmen in Ihrer Branche stehen vor Herausforderungen bei der digitalen Kundengewinnung.\n\n${productName} hilft Ihnen dabei, Prozesse zu automatisieren und zu skalieren.\n\n${ctaText}`;
  } else if (lead.language === 'fr') {
    body = `${intro} De nombreuses entreprises de votre secteur cherchent à optimiser leur acquisition.\n\n${productName} est conçu pour automatiser ces processus.\n\n${ctaText}`;
  }

  const subject = lead.language === 'it' 
    ? `Opportunità di crescita per ${shop}` 
    : lead.language === 'de'
    ? `Partnerschaft / Anfrage für ${shop}`
    : `Collaboration inquiry regarding ${shop}`;

  return { subject, body };
}

export function simulateSimulatedResponses(): { text: string; intent: IntentClassification }[] {
  const options: { text: string; intent: IntentClassification }[] = [
    { text: 'YES, very interested! Can we schedule a 15-min call this week?', intent: 'Interested' },
    { text: 'Please send pricing details and enterprise terms.', intent: 'Interested' },
    { text: 'Send over the details for the partnership program, thanks.', intent: 'Interested' },
    { text: 'We might look into this next quarter, please follow up in May.', intent: 'Needs Nurturing' },
    { text: 'Interesting solution, but we already have an internal tool.', intent: 'Not Interested' },
    { text: 'Please remove us from your list.', intent: 'Not Interested' },
  ];
  return options;
}

