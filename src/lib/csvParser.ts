import { Lead, ProductConfig, Language } from '../types';

export function parseCSVLeads(csvText: string, config: ProductConfig): Lead[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  // Parse header
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  
  const nameIdx = header.findIndex((h) => h.includes('company') || h.includes('name') || h.includes('azienda') || h.includes('shop'));
  const webIdx = header.findIndex((h) => h.includes('web') || h.includes('url') || h.includes('sito') || h.includes('link'));
  const emailIdx = header.findIndex((h) => h.includes('email') || h.includes('mail') || h.includes('contatto'));
  const cityIdx = header.findIndex((h) => h.includes('city') || h.includes('citt') || h.includes('ort'));
  const cantonIdx = header.findIndex((h) => h.includes('canton') || h.includes('cantone') || h.includes('state'));
  const industryIdx = header.findIndex((h) => h.includes('industry') || h.includes('settore') || h.includes('sector') || h.includes('categoria'));
  const notesIdx = header.findIndex((h) => h.includes('note') || h.includes('description') || h.includes('descrizione'));

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 1) continue;

    const shopName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Swiss Enterprise ${i}`;
    const shopUrl = webIdx >= 0 && cols[webIdx] ? cols[webIdx] : `https://${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch`;
    const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : undefined;
    const city = cityIdx >= 0 && cols[cityIdx] ? cols[cityIdx] : 'Zürich';
    const canton = cantonIdx >= 0 && cols[cantonIdx] ? cols[cantonIdx] : 'ZH';
    const industry = industryIdx >= 0 && cols[industryIdx] ? cols[industryIdx] : 'Services';
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : '';

    // Language logic for Switzerland
    let language: Language = 'de';
    const frCantons = ['GE', 'VD', 'FR', 'NE', 'JU', 'VS'];
    const itCantons = ['TI', 'GR'];
    const upperCanton = canton.toUpperCase();

    if (frCantons.includes(upperCanton)) {
      language = 'fr';
    } else if (itCantons.includes(upperCanton)) {
      language = 'it';
    } else {
      language = 'de';
    }

    const majorCities = ['zürich', 'zurich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'lugano', 'luzern', 'st. gallen'];
    const isMajorCity = majorCities.some((c) => city.toLowerCase().includes(c));
    const hasEmail = Boolean(email);
    
    const lowerProductDesc = (config.productDescription + ' ' + config.productName + ' ' + config.offerType).toLowerCase();
    const hasKeyword = (industry + ' ' + notes).toLowerCase().split(' ').some((w) => w.length > 3 && lowerProductDesc.includes(w));

    // Scoring logic for CSV Swiss lead
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
      language,
      businessSignals: {
        numProducts: Math.floor(15 + Math.random() * 60),
        numReviews: Math.floor(10 + Math.random() * 50),
        monthsActive: 12,
        estimatedRevenue: `CHF ${Math.floor(10000 + Math.random() * 50000)}/mo`,
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
