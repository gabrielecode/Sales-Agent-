import { Lead, ProductConfig, Platform, Language } from '../types';
import { calculateLeadScore } from './leadScoring';

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

export function parseCSVLeads(csvText: string, config: ProductConfig): Lead[] {
  // Strip UTF-8 BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '_')
  );

  const leads: Lead[] = [];

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
        // check partial keys
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

    const email = getVal('email', 'e-mail', 'mail', 'pec', 'indirizzo_email');
    const platformRaw = getVal('platform', 'piattaforma', 'canale', 'channel', 'fonte', 'source') || 'Web';

    let platform: Platform = 'Web';
    const pLower = platformRaw.toLowerCase();
    if (pLower.includes('etsy')) platform = 'Etsy';
    else if (pLower.includes('amazon') || pLower.includes('kdp')) platform = 'Amazon KDP';
    else if (pLower.includes('shopify')) platform = 'Shopify';
    else if (pLower.includes('instagram') || pLower.includes('ig')) platform = 'Instagram';
    else if (pLower.includes('linkedin')) platform = 'LinkedIn';

    const langRaw = getVal('language', 'lingua', 'lang').toLowerCase();
    let language: Language = 'it';
    if (langRaw.includes('en') || langRaw.includes('ingl')) language = 'en';
    else if (langRaw.includes('de') || langRaw.includes('ted')) language = 'de';
    else if (langRaw.includes('fr') || langRaw.includes('fran')) language = 'fr';

    const city = getVal('city', 'citta', 'città', 'comune', 'luogo', 'location') || 'Svizzera';
    const canton = getVal('canton', 'cantone', 'provincia', 'regione', 'paese', 'country') || 'CH';
    const industry = getVal('industry', 'settore', 'categoria', 'category', 'nicchia') || 'E-Commerce';
    const notes = getVal('notes', 'note', 'descrizione', 'description', 'bio', 'dettagli') || 'Importato da CSV';
    const url = getVal('url', 'website', 'sito', 'link', 'shopurl', 'profilo') || '';

    const productsCount = parseInt(getVal('products', 'prodotti', 'articoli', 'items') || '10', 10) || 10;
    const reviewsCount = parseInt(getVal('reviews', 'recensioni', 'feedback') || '15', 10) || 15;
    const monthsCount = parseInt(getVal('months', 'mesi', 'attivita') || '12', 10) || 12;
    const revenueEst = getVal('revenue', 'fatturato', 'vendite') || 'Non specificato';

    const baseLead: Partial<Lead> = {
      id: `csv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      shopName,
      shopUrl: url || `https://${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      platform,
      language,
      email,
      city,
      canton,
      industry,
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

    const leadScore = calculateLeadScore(baseLead, config);

    leads.push({
      ...baseLead,
      leadScore,
    } as Lead);
  }

  return leads;
}

/**
 * Returns a ready-to-download sample CSV template string
 */
export function getSampleCSVTemplate(): string {
  return `Nome Negozio,Email,Piattaforma,Città,Cantone,Sito Web,Settore,Note
Swiss Alps Honey,info@swissalpshoney.ch,Shopify,Lugano,TI,https://swissalpshoney.ch,Alimentare & Bio,Prodotti naturali artigianali
Zurich Wall Art,contact@zurichwallart.com,Etsy,Zurigo,ZH,https://etsy.com/shop/zurichwallart,Decorazioni Casa,Stampe grafiche d'autore
Helvetia Indie Books,author@helvetiabooks.ch,Amazon KDP,Berna,BE,https://amazon.com/dp/example,Editoria & Guide,Libri fotografici e guide escursionistiche
Milano Fashion Crafts,hello@milanocrafts.it,Instagram,Milano,IT,https://instagram.com/milanocrafts,Moda & Accessori,Community attiva oltre 25k followers`;
}
