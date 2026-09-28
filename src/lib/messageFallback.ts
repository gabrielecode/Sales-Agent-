import { Lead, ProductConfig, FunnelStage, OfferType } from '../types';
import { getFunnelStage } from './funnelStage';
import { detectSectorSmart, isLocalOrServiceSector } from './categories';
import { validateGeneratedMessage } from './messageValidator';
import { appendProgrammaticSignature } from './emailSignature';
import { shouldIncludeLink } from './outreachLink';

function getDeterministicHash(str: string = '', modulo: number = 3): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

function getCleanMerchandiseCategory(
  industry?: string,
  shortNotes?: string,
  shopName?: string,
  config?: any
): string {
  return detectSectorSmart(
    shopName,
    shortNotes,
    industry,
    '',
    config?.targetMerchandiseCategory
  );
}

function translateCategory(category: string, lang: string): string {
  const catLower = (category || '').toLowerCase();
  if (lang === 'en') {
    if (catLower.includes('gioiell') || catLower.includes('jewel') || catLower.includes('bijoux')) return 'jewelry and accessories';
    if (catLower.includes('idraulic') || catLower.includes('plumb') || catLower.includes('termoidraulic')) return 'plumbing and heating';
    if (catLower.includes('artigian') || catLower.includes('handmade')) return 'handmade crafts';
    if (catLower.includes('casa') || catLower.includes('decor')) return 'home decor';
    if (catLower.includes('abbigli') || catLower.includes('moda') || catLower.includes('fashion')) return 'fashion and apparel';
    return 'your business sector';
  }
  if (lang === 'de') {
    if (catLower.includes('gioiell') || catLower.includes('jewel') || catLower.includes('bijoux')) return 'Schmuck und Accessoires';
    if (catLower.includes('idraulic') || catLower.includes('plumb')) return 'Sanitär und Heizung';
    if (catLower.includes('artigian') || catLower.includes('handmade')) return 'Handwerk und Manufaktur';
    return 'Ihrer Branche';
  }
  if (lang === 'fr') {
    if (catLower.includes('gioiell') || catLower.includes('jewel') || catLower.includes('bijoux')) return 'bijoux et accessoires';
    if (catLower.includes('idraulic') || catLower.includes('plumb')) return 'plomberie et chauffage';
    if (catLower.includes('artigian') || catLower.includes('handmade')) return 'artisanat et création';
    return 'votre secteur';
  }
  return category;
}

function getPlatformPhrasing(platform: string, category: string, city: string = '', isInformal: boolean): string {
  const p = (platform || '').toLowerCase();
  if (p.includes('etsy')) return 'su Etsy';
  if (p.includes('shopify')) return isInformal ? 'sul tuo store Shopify' : 'sul vostro store Shopify';
  if (p.includes('amazon') || p.includes('kdp')) return 'su Amazon KDP';
  if (p.includes('instagram') || p.includes('ig')) return isInformal ? 'sul tuo profilo Instagram' : 'sul vostro profilo Instagram';
  if (p.includes('linkedin')) return isInformal ? 'sul tuo profilo LinkedIn' : 'sul vostro profilo LinkedIn';

  if (isLocalOrServiceSector(category)) {
    if (city) {
      return isInformal ? `nella tua attività a ${city}` : `nella vostra attività a ${city}`;
    }
    return isInformal ? 'nella tua attività' : 'nella vostra attività';
  }

  return isInformal ? 'online' : 'sul vostro sito web';
}

function getEnglishPlatformPhrasing(platform: string, category: string, city: string = '', isInformal: boolean = true): string {
  const p = (platform || '').toLowerCase();
  if (p.includes('etsy')) return 'on Etsy';
  if (p.includes('shopify')) return 'on your Shopify store';
  if (p.includes('amazon') || p.includes('kdp')) return 'on Amazon KDP';
  if (p.includes('instagram') || p.includes('ig')) return 'on Instagram';
  if (p.includes('linkedin')) return 'on LinkedIn';
  if (isLocalOrServiceSector(category)) {
    return city ? `with your business in ${city}` : 'with your local operations';
  }
  return 'online';
}

function sanitizeSubject(sub: string): string {
  const words = sub
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 3 && words.length <= 6) {
    return words.join(' ');
  }
  if (words.length > 6) {
    return words.slice(0, 5).join(' ');
  }
  if (words.length === 2) return `${words.join(' ')} dedicata`;
  if (words.length === 1) return `opportunità per ${words[0]}`;
  return 'informazioni per la vostra attività';
}

function buildMinimalFallback(
  lang: string,
  stage: FunnelStage,
  isInformal: boolean,
  lead: any,
  category: string,
  productName: string,
  includeLink: boolean,
  targetUrl: string
): { subject: string; body: string } {
  const contactName = lead.contactName?.trim();
  const city = lead.city?.trim() || 'Ticino';

  if (lang === 'en') {
    const greeting = contactName ? (isInformal ? `Hi ${contactName},` : `Hello ${contactName},`) : (isInformal ? 'Hi,' : 'Hello,');
    const obs = `I noticed your business in the ${translateCategory(category, 'en')} sector in ${city}.`;
    const sol = `${productName} helps streamline commercial processes and free up productive time.`;
    const ctaQuestion = 'Would it make sense to send you a brief analysis with two practical takeaways?';
    const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;
    return {
      subject: sanitizeSubject(`insights for your business in ${city}`),
      body: `${greeting}\n\n${obs}\n\n${sol}\n\n${ctaBlock}`,
    };
  }

  // Italian default minimal
  const greeting = contactName
    ? (isInformal ? `Ciao ${contactName},` : `Buongiorno ${contactName},`)
    : (isInformal ? 'Ciao,' : 'Buongiorno,');
  const obs = isInformal
    ? `ho visto la tua presenza nel settore ${category} a ${city}.`
    : `ho notato la vostra presenza nel settore ${category} a ${city}.`;
  const sol = `${productName} aiuta a qualificare le opportunità e a semplificare la gestione operativa.`;
  const ctaQuestion = isInformal
    ? 'Ti andrebbe se ti mandassi una breve analisi con un paio di spunti pratici?'
    : 'Le andrebbe se le inviassi una breve analisi con un paio di spunti pratici?';
  const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;

  return {
    subject: sanitizeSubject(`ottimizzazione attività a ${city}`),
    body: `${greeting}\n\n${obs}\n\n${sol}\n\n${ctaBlock}`,
  };
}

export function generateLocalMessageFallback(
  lead: Partial<Lead> & { shopName: string; platform: string; language: string; industry?: string; shortNotes?: string },
  config: Partial<ProductConfig> & {
    productName: string;
    commissionRate?: string;
    productDescription?: string;
    painPoint?: string;
    targetMerchandiseCategory?: string;
    funnelAssets?: { awareness: string[]; evaluation: string[]; purchase: string[] };
    offerType?: OfferType;
  },
  forcedStage?: FunnelStage
): { subject: string; body: string } {
  const stage: FunnelStage = forcedStage || (lead.status ? getFunnelStage(lead as Lead) : 'awareness');
  const tone = lead.toneOfVoice || 'Formale';
  const isInformal = tone === 'Informale';
  const rawLang = (lead.language || 'it').toLowerCase();
  const supportedLangs = ['it', 'en', 'de', 'fr'];
  const lang = supportedLangs.includes(rawLang) ? rawLang : 'it';

  const productName = (config.productName || (config as any).productAnalysis?.productName || 'Swiss Affiliate Booster').trim();
  const offerType = config.offerType || (config as any).productAnalysis?.offerType || 'affiliate';
  const commissionRate = (config.commissionRate || '20%').trim();
  const targetUrl = ((config as any).productUrl || (config as any).productAnalysis?.sourceUrl || 'https://swissaffiliatebooster.ch').trim();

  // Link nel primo contatto: usa helper condiviso (rimosso config.autoOutreach)
  const includeLink = shouldIncludeLink(stage, config);

  const category = getCleanMerchandiseCategory(lead.industry, lead.shortNotes, lead.shopName, config);
  const contactName = lead.contactName?.trim();
  const city = lead.city?.trim() || '';
  const canton = lead.canton?.trim() || '';
  const location = [city, canton].filter(Boolean).join(', ') || 'Ticino';

  const keyFeatures = (config as any).productAnalysis?.keyFeatures || [];
  const rawFeature = keyFeatures.length > 0 ? String(keyFeatures[0]).trim() : '';
  // Se la lingua è italiana, possiamo usare la feature; per altre lingue omettila se non localizzata
  const primaryFeature = lang === 'it' && rawFeature ? rawFeature.toLowerCase() : '';
  const valueProp = ((config as any).productAnalysis?.valueProposition || config.productDescription || '').trim();

  // Gestione Pain Point specifico: se esiste, usa SOLO questo; altrimenti ometti il blocco problema
  const rawPain = (config.painPoint || '').trim();
  let painSentence = '';
  if (rawPain) {
    const cleanPain = rawPain.endsWith('.') ? rawPain.slice(0, -1) : rawPain;
    painSentence = `${cleanPain.charAt(0).toUpperCase() + cleanPain.slice(1)}.`;
  }

  // Costruzione fatti consentiti per validatore
  const factsList: string[] = [
    lead.shopName || '',
    category,
    location,
    city,
    canton,
    lead.platform || '',
    lead.shortNotes || '',
  ];
  if (lead.businessSignals) {
    if (typeof lead.businessSignals.numReviews === 'number' && lead.businessSignals.numReviews > 0) {
      factsList.push(`${lead.businessSignals.numReviews}`);
      factsList.push(`${lead.businessSignals.numReviews} recensioni`);
    }
    if (typeof lead.businessSignals.numProducts === 'number' && lead.businessSignals.numProducts > 0) {
      factsList.push(`${lead.businessSignals.numProducts}`);
      factsList.push(`${lead.businessSignals.numProducts} prodotti`);
    }
    if (typeof lead.businessSignals.monthsActive === 'number' && lead.businessSignals.monthsActive > 0) {
      factsList.push(`${lead.businessSignals.monthsActive}`);
      factsList.push(`${lead.businessSignals.monthsActive} mesi`);
    }
  }
  const allowedFactsText = factsList.filter(Boolean).join(' ');

  const productDataList: string[] = [
    productName,
    valueProp,
    config.productDescription || '',
    config.painPoint || '',
    primaryFeature,
  ];
  if (offerType === 'affiliate' && stage === 'evaluation') {
    productDataList.push(commissionRate);
  }
  if (includeLink && targetUrl) {
    productDataList.push(targetUrl);
  }
  const productDataText = productDataList.filter(Boolean).join(' ');

  const initialVariantIdx = getDeterministicHash(lead.id || lead.shopName || category, 3);
  let finalSubject = '';
  let candidateBody = '';

  for (let offset = 0; offset < 3; offset++) {
    const vIdx = (initialVariantIdx + offset) % 3;
    let variantSubject = '';
    let variantBody = '';

    if (lang === 'en') {
      const enPlatform = getEnglishPlatformPhrasing(lead.platform || 'Web', category, city, isInformal);
      const enCategory = translateCategory(category, 'en');
      const greeting = contactName ? (isInformal ? `Hi ${contactName},` : `Hello ${contactName},`) : (isInformal ? 'Hi,' : 'Hello,');

      // Observation
      let obs = '';
      if (vIdx === 0 && lead.businessSignals?.numReviews) {
        obs = `I noticed ${lead.shopName} and the ${lead.businessSignals.numReviews} reviews received ${enPlatform}.`;
      } else if (vIdx === 1 && city && lead.shopName) {
        obs = `I noticed ${lead.shopName} operating in the ${enCategory} sector in ${city}.`;
      } else if (lead.shopName) {
        obs = `I noticed ${lead.shopName} in the ${enCategory} field ${enPlatform}.`;
      } else {
        obs = `I noticed your presence in the ${enCategory} field in ${location}.`;
      }

      // Problem: SOLO se painPoint è fornito; altrimenti omesso
      const prob = painSentence || '';

      // Solution: riformulata senza testo tra parentesi
      let sol = `${productName} helps qualify commercial opportunities and free up operational time.`;
      if (stage === 'evaluation' && offerType === 'affiliate') {
        sol += ` We propose a commission rate of ${commissionRate} for each generated partner sale.`;
      }

      // CTA: domanda su riga separata, URL come ultima riga se includeLink
      let ctaQuestion = '';
      if (stage === 'awareness') {
        ctaQuestion = vIdx === 0
          ? 'Would it make sense to send you a brief analysis with two practical takeaways for your shop?'
          : vIdx === 1
          ? 'Would you be open to a brief 10-minute call this Thursday to explore if this fits?'
          : 'Could I share a short analysis highlighting a few relevant points for your business?';
      } else if (stage === 'evaluation') {
        ctaQuestion = 'Would it be helpful to review the details through the dedicated link?';
      } else {
        ctaQuestion = 'If you would like to proceed, can we complete the activation using this link?';
      }

      const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;

      const cleanShop = (lead.shopName || 'your business').toLowerCase().replace(/[^\w\s]/g, '').trim();
      const subVariants = [
        `insights for ${cleanShop}`,
        `growth for ${cleanShop}`,
        `steps for ${city.toLowerCase() || 'your team'}`,
      ];
      variantSubject = sanitizeSubject(subVariants[vIdx]);

      const blocks = [greeting, obs];
      if (prob) blocks.push(prob);
      blocks.push(sol);
      blocks.push(ctaBlock);
      variantBody = blocks.join('\n\n');
    } else if (lang === 'de') {
      const deCategory = translateCategory(category, 'de');
      const greeting = contactName ? `Guten Tag ${contactName},` : 'Guten Tag,';

      let obs = '';
      if (lead.businessSignals?.numReviews) {
        obs = `Ich habe ${lead.shopName} und die ${lead.businessSignals.numReviews} Bewertungen gesehen.`;
      } else if (lead.shopName) {
        obs = `Ich habe ${lead.shopName} im Bereich ${deCategory} bemerkt.`;
      } else {
        obs = `Ich habe Ihre Geschäftstätigkeit im Bereich ${deCategory} in ${location} bemerkt.`;
      }

      const prob = painSentence || '';
      const sol = `${productName} hilft dabei, Anfragen gezielt zu qualifizieren und Arbeitszeit freizusetzen.`;

      let ctaQuestion = '';
      if (stage === 'awareness') {
        ctaQuestion = vIdx === 0
          ? 'Dürfen wir Ihnen eine kurze Analyse mit nützlichen Hinweisen für Ihren Betrieb senden?'
          : 'Hätte ein kurzes 10-Minuten-Gespräch am Donnerstag Sinn, um die Machbarkeit zu prüfen?';
      } else {
        ctaQuestion = 'Dürfen wir Ihnen die weiteren Schritte über den Link zeigen?';
      }
      const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;

      variantSubject = sanitizeSubject(vIdx === 0 ? `optimierung für ${lead.shopName || 'betrieb'}` : `zusammenarbeit in ${city || 'der schweiz'}`);
      const blocks = [greeting, obs];
      if (prob) blocks.push(prob);
      blocks.push(sol);
      blocks.push(ctaBlock);
      variantBody = blocks.join('\n\n');
    } else if (lang === 'fr') {
      const frCategory = translateCategory(category, 'fr');
      const greeting = contactName ? `Bonjour ${contactName},` : 'Bonjour,';

      let obs = '';
      if (lead.businessSignals?.numReviews) {
        obs = `J'ai vu ${lead.shopName} et les ${lead.businessSignals.numReviews} avis reçus.`;
      } else if (lead.shopName) {
        obs = `J'ai remarqué la présence de ${lead.shopName} dans le secteur ${frCategory}.`;
      } else {
        obs = `J'ai remarqué votre activité dans le secteur ${frCategory} à ${location}.`;
      }

      const prob = painSentence || '';
      const sol = `${productName} permet de qualifier les opportunités et de libérer du temps opérationnel.`;

      let ctaQuestion = '';
      if (stage === 'awareness') {
        ctaQuestion = vIdx === 0
          ? 'Seriez-vous intéressé par une brève analyse avec quelques pistes pratiques pour votre activité?'
          : 'Seriez-vous disponible pour un court échange de 10 minutes ce jeudi?';
      } else {
        ctaQuestion = 'Seriez-vous intéressé pour consulter la suite via le lien dédié?';
      }
      const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;

      variantSubject = sanitizeSubject(vIdx === 0 ? `opportunités pour ${lead.shopName || 'votre activité'}` : `collaboration à ${city || 'suisse'}`);
      const blocks = [greeting, obs];
      if (prob) blocks.push(prob);
      blocks.push(sol);
      blocks.push(ctaBlock);
      variantBody = blocks.join('\n\n');
    } else {
      // Italian (coerenza rigorosa: Informale = Tu esclusivo; Formale = Lei esclusivo)
      const platformPhrase = getPlatformPhrasing(lead.platform || 'Web', category, city, isInformal);
      const greeting = contactName
        ? (isInformal ? `Ciao ${contactName},` : `Buongiorno ${contactName},`)
        : (isInformal ? 'Ciao,' : 'Buongiorno,');

      // Observation
      let obs = '';
      if (vIdx === 0 && lead.businessSignals?.numReviews) {
        obs = isInformal
          ? `ho visto la presenza di ${lead.shopName} e le ${lead.businessSignals.numReviews} recensioni ricevute ${platformPhrase}.`
          : `ho visto la presenza di ${lead.shopName} e le ${lead.businessSignals.numReviews} recensioni ricevute ${platformPhrase}.`;
      } else if (vIdx === 1 && city && lead.shopName) {
        obs = isInformal
          ? `ho notato la tua attività con ${lead.shopName} a ${city}.`
          : `ho notato la presenza di ${lead.shopName} a ${city}.`;
      } else if (lead.shopName) {
        obs = isInformal
          ? `ho visto la presenza di ${lead.shopName} nel settore ${category} ${platformPhrase}.`
          : `ho visto la presenza di ${lead.shopName} nel settore ${category} ${platformPhrase}.`;
      } else {
        obs = isInformal
          ? `ho notato la tua presenza nel settore ${category} a ${location}.`
          : `ho notato la presenza della vostra attività nel settore ${category} a ${location}.`;
      }

      // Problem: usa SOLO painPoint se presente; altrimenti omesso
      const prob = painSentence || '';

      // Solution: usa 'incentrato su' se c'è primaryFeature, senza preposizioni articolate errate
      let sol = '';
      if (primaryFeature) {
        sol = `${productName} aiuta le attività del comparto a qualificare le opportunità, con un modello incentrato su ${primaryFeature}.`;
      } else {
        sol = `${productName} consente di qualificare le opportunità commerciali e migliorare la gestione del tempo operativo.`;
      }

      if (stage === 'evaluation' && offerType === 'affiliate') {
        sol += ` Proponiamo una provvigione del ${commissionRate} per ciascuna vendita generata.`;
      }

      // CTA: domanda finisce con '?', link va su riga separata
      let ctaQuestion = '';
      if (stage === 'awareness') {
        if (vIdx === 0) {
          ctaQuestion = isInformal
            ? 'Ti andrebbe se ti mandassi una breve analisi con un paio di spunti pratici dedicati alla tua attività?'
            : 'Le andrebbe se le inviassi una breve analisi con un paio di spunti pratici dedicati alla sua attività?';
        } else if (vIdx === 1) {
          ctaQuestion = isInformal
            ? 'Ha senso inviarti una breve analisi per valutare insieme la fattibilità?'
            : 'Ha senso inviarle una breve analisi per valutare insieme la fattibilità?';
        } else {
          ctaQuestion = isInformal
            ? 'Saresti disponibile per una breve chiamata di 10 minuti giovedì per confrontarci?'
            : 'Sarebbe disponibile per una breve chiamata di 10 minuti giovedì per valutare insieme la fattibilità?';
        }
      } else if (stage === 'evaluation') {
        ctaQuestion = isInformal
          ? 'Possiamo dare uno sguardo alla panoramica operativa tramite il link dedicato?'
          : 'Possiamo dare uno sguardo alla panoramica operativa tramite il link dedicato?';
      } else {
        // purchase
        ctaQuestion = isInformal
          ? 'Se vuoi procedere con l\'avvio, possiamo verificare i passaggi operativi dal link dedicato?'
          : 'Se desidera procedere con l\'avvio, possiamo verificare i passaggi operativi dal link dedicato?';
      }

      const ctaBlock = includeLink && targetUrl ? `${ctaQuestion}\n${targetUrl}` : ctaQuestion;

      const cleanShop = (lead.shopName || 'attività').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      const subVariants = [
        `ottimizzazione per ${cleanShop}`,
        `opportunità per ${cleanShop}`,
        `sviluppo attività a ${city.toLowerCase() || 'ticino'}`,
      ];
      variantSubject = sanitizeSubject(subVariants[vIdx]);

      const blocks = [greeting, obs];
      if (prob) blocks.push(prob);
      blocks.push(sol);
      blocks.push(ctaBlock);
      variantBody = blocks.join('\n\n');
    }

    // Validazione preventiva
    const validation = validateGeneratedMessage(
      { subject: variantSubject, body: variantBody },
      {
        stage,
        includeLink,
        allowedFactsText,
        productDataText,
        targetUrl: includeLink ? targetUrl : undefined,
      }
    );

    if (validation.valid) {
      finalSubject = variantSubject;
      candidateBody = variantBody;
      break;
    }
  }

  // Se nessuna variante passa, fallback minimale garantito
  if (!candidateBody) {
    const minimal = buildMinimalFallback(
      lang,
      stage,
      isInformal,
      lead,
      category,
      productName,
      includeLink,
      targetUrl
    );
    finalSubject = minimal.subject;
    candidateBody = minimal.body;
  }

  // Aggiunta firma programmatica
  const finalBody = appendProgrammaticSignature(candidateBody, config);

  return {
    subject: finalSubject,
    body: finalBody,
  };
}
