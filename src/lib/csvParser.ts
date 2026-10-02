import { Lead, ProductConfig, Platform, Language } from '../types';
import { calculateLeadScore } from './leadScoring';
import { detectSectorSmart } from './categories';

/**
 * Autodetects whether the delimiter is comma, semicolon, or tab.
 */
function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons >= commas) return ';';
  return ',';
}

/**
 * Splits a CSV line into cells respecting quotes.
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let insideQuote = false;
  let currentVal = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      values.push(currentVal.trim().replace(/^"|"$/g, ''));
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  values.push(currentVal.trim().replace(/^"|"$/g, ''));
  return values;
}

/**
 * Email Anti-Spam validator regex
 * Checks if the email format is strictly valid, missing or suspicious.
 */
export function validateEmailQuality(email?: string): 'Valida' | 'Sospetta' | 'Mancante' {
  if (!email || !email.trim()) {
    return 'Mancante';
  }
  const clean = email.trim().toLowerCase();
  
  // Valid email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return 'Sospetta';
  }

  // Generic/Business email check
  const genericPrefixes = ['info@', 'office@', 'admin@', 'hello@', 'contact@', 'support@', 'sales@', 'marketing@'];
  if (genericPrefixes.some(prefix => clean.startsWith(prefix))) {
    return 'Sospetta';
  }

  return 'Valida';
}

/**
 * Tone of voice cultural adaptation:
 * - 'Informale' (Tu / Ciao) for Software, Marketing, SaaS.
 * - 'Formale' (Lei / Buongiorno) for Servizi, Enterprise or empty fields.
 */
export function determineToneOfVoice(industry?: string): 'Formale' | 'Informale' {
  if (!industry || !industry.trim()) {
    return 'Formale';
  }
  const ind = industry.toLowerCase();
  if (ind.includes('software') || ind.includes('marketing') || ind.includes('saas')) {
    return 'Informale';
  }
  return 'Formale';
}

/**
 * Intelligently detects and cleans the merchandise category (categoria merceologica).
 * Prevents generic fallback "E-Commerce" which causes repetitive, robotic outreach.
 */
export function detectMerchandiseCategory(
  shopName: string = '',
  notes: string = '',
  rawIndustry: string = '',
  url: string = '',
  configDefault?: string
): string {
  return detectSectorSmart(shopName, notes, rawIndustry, url, configDefault);
}

export interface CSVParseResult {
  leads: Lead[];
  discarded: { row: number; email: string; reason: string }[];
}

export function parseCSVLeads(csvText: string, config: ProductConfig, availableProducts: any[] = []): CSVParseResult {
  // Strip UTF-8 BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return { leads: [], discarded: [] };

  const productKnowledge = availableProducts.find(p => p.product_id === config.product_id);

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { leads: [], discarded: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '_')
  );

  const leads: Lead[] = [];
  const discarded: { row: number; email: string; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });

    // Flexible key matcher
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
        const foundKey = Object.keys(row).find(
          (rk) => rk === k || rk.includes(k) || k.includes(rk)
        );
        if (foundKey && row[foundKey]) return row[foundKey];
      }
      return '';
    };

    const shopName =
      getVal('name', 'nome', 'shop', 'store', 'azienda', 'company', 'creator', 'brand', 'titolo', 'contatto') ||
      `Contatto #${i}`;

    const email = getVal('email', 'e-mail', 'mail', 'pec', 'indirizzo_email').toLowerCase().trim();
    const contactRole = getVal('ruolo', 'role', 'posizione', 'qualifica', 'titolo', 'job');
    
    // Validazione immediata per scartaggio se email non valida
    const emailQuality = validateEmailQuality(email);
    if (emailQuality === 'Mancante' || (emailQuality === 'Sospetta' && !email.includes('@'))) {
       discarded.push({ row: i + 1, email: email || 'N/A', reason: 'Email non valida o mancante' });
       continue;
    }

    const platformRaw = getVal('platform', 'piattaforma', 'canale', 'channel', 'fonte', 'source') || 'Web';
    let platform: Platform = 'Web';
    const pLower = platformRaw.toLowerCase();
    if (pLower.includes('etsy')) platform = 'Etsy';
    else if (pLower.includes('amazon') || pLower.includes('kdp')) platform = 'Amazon KDP';
    else if (pLower.includes('shopify')) platform = 'Shopify';
    else if (pLower.includes('instagram') || pLower.includes('ig')) platform = 'Instagram';
    else if (pLower.includes('linkedin')) platform = 'LinkedIn';

    const city = getVal('city', 'citta', 'città', 'comune', 'luogo', 'location') || 'Svizzera';
    const canton = getVal('canton', 'cantone', 'provincia', 'regione', 'paese', 'country') || 'CH';
    const notes = getVal('notes', 'note', 'descrizione', 'description', 'bio', 'dettagli') || 'Importato da CSV';
    const url = getVal('url', 'website', 'sito', 'link', 'shopurl', 'profilo') || '';

    const rawIndustry = getVal(
      'categoria_merceologica', 'categoria merceologica', 'settore_merceologico', 'settore merceologico',
      'merceologia', 'categoria', 'category', 'settore', 'industry', 'nicchia', 'niche', 'ramo',
      'verticale', 'prodotti', 'products', 'tipo_merce', 'tipologia', 'mercato', 'attività', 'attivita'
    );

    const industry = detectMerchandiseCategory(shopName, notes, rawIndustry, url, config?.targetMerchandiseCategory);

    const langRaw = getVal('language', 'lingua', 'lang').toLowerCase();
    let language: Language = 'it';
    if (langRaw.includes('en') || langRaw.includes('ingl')) {
      language = 'en';
    } else if (langRaw.includes('de') || langRaw.includes('ted')) {
      language = 'de';
    } else if (langRaw.includes('fr') || langRaw.includes('fran')) {
      language = 'fr';
    } else {
      const cUpper = canton.toUpperCase().trim();
      if (['ZH', 'BE', 'BS', 'BL', 'LU', 'SG', 'AG', 'SO', 'SH', 'TG', 'ZG', 'GR', 'AR', 'AI', 'GL', 'NW', 'OW', 'SZ', 'UR'].includes(cUpper)) {
        language = 'de';
      } else if (['GE', 'VD', 'VS', 'NE', 'JU', 'FR'].includes(cUpper)) {
        language = 'fr';
      } else if (['TI', 'IT'].includes(cUpper)) {
        language = 'it';
      }
    }

    const toneOfVoice = determineToneOfVoice(industry);
    
    // Mock signal generation if not in CSV
    const reviewsCount = parseInt(getVal('reviews', 'recensioni', 'feedback') || '0', 10) || (Math.floor(Math.random() * 100) + 5);
    const productsCount = parseInt(getVal('products', 'prodotti', 'articoli', 'items') || '0', 10) || (Math.floor(Math.random() * 20));
    const monthsCount = parseInt(getVal('months', 'mesi', 'attivita') || '12', 10) || 12;
    const revenueEst = getVal('revenue', 'fatturato', 'vendite') || 'Non specificato';

    const baseLead: Partial<Lead> = {
      id: `csv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      shopName,
      shopUrl: url || `https://${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      platform,
      language,
      email,
      emailQuality,
      toneOfVoice,
      city,
      canton,
      industry,
      contactRole,
      product_id: config.product_id || 'legacy',
      businessSignals: {
        numProducts: productsCount,
        numReviews: reviewsCount,
        monthsActive: monthsCount,
        estimatedRevenue: revenueEst,
      },
      hasNeedSignal: true,
      shortNotes: notes,
      source: 'csv',
      status: 'discovered',
      selected: true,
    };

    const scoreResult = calculateLeadScore(baseLead, config, productKnowledge);
    leads.push({ 
      ...baseLead, 
      leadScore: scoreResult.score,
      scoreReasoning: scoreResult.reasoning 
    } as Lead);
  }

  // Deduplica per email
  const uniqueLeads = new Map<string, Lead>();
  leads.forEach(l => {
    if (!uniqueLeads.has(l.email!)) {
      uniqueLeads.set(l.email!, l);
    } else {
      discarded.push({ row: 0, email: l.email!, reason: 'Duplicato' });
    }
  });

  return {
    leads: Array.from(uniqueLeads.values()),
    discarded
  };
}

/**
 * Returns a ready-to-download sample CSV template string
 */
export function getSampleCSVTemplate(): string {
  return `Nome Negozio,Email,Piattaforma,Città,Cantone,Sito Web,Categoria Merceologica,Note
Swiss Alps Honey,info@swissalpshoney.ch,Shopify,Lugano,TI,https://swissalpshoney.ch,Alimentare & Bio,Prodotti naturali artigianali
Zurich Wall Art,contact@zurichwallart.com,Etsy,Zurigo,ZH,https://etsy.com/shop/zurichwallart,Casa & Decorazioni,Stampe grafiche d'autore
Helvetia Indie Books,author@helvetiabooks.ch,Amazon KDP,Berna,BE,https://amazon.com/dp/example,Editoria & Guide,Libri fotografici e guide escursionistiche
Milano Fashion Crafts,hello@milanocrafts.it,Instagram,Milano,IT,https://instagram.com/milanocrafts,Moda & Accessori,Community attiva oltre 25k followers`;
}
