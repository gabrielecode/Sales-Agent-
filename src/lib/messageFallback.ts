import { Lead, ProductConfig, FunnelStage, OfferType } from '../types';
import { getFunnelStage } from './funnelStage';
import { detectSectorSmart, isLocalOrServiceSector } from './categories';

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

function getPlatformPhrasing(platform: string, category: string, city: string = '', isInformal: boolean): string {
  const p = (platform || '').toLowerCase();
  if (p.includes('etsy')) return isInformal ? 'su Etsy' : 'sul vostro shop Etsy';
  if (p.includes('shopify')) return isInformal ? 'su Shopify' : 'sul vostro store Shopify';
  if (p.includes('amazon') || p.includes('kdp')) return isInformal ? 'su Amazon KDP' : 'con le vostre pubblicazioni su Amazon KDP';
  if (p.includes('instagram') || p.includes('ig')) return isInformal ? 'su Instagram' : 'sulla vostra pagina Instagram';
  if (p.includes('linkedin')) return isInformal ? 'su LinkedIn' : 'sul vostro profilo LinkedIn';

  if (isLocalOrServiceSector(category)) {
    if (city) {
      return isInformal ? `nella vostra attività a ${city}` : `con la vostra attività a ${city}`;
    }
    return isInformal ? 'nella vostra attività' : 'con la vostra realtà aziendale';
  }

  return isInformal ? 'online' : 'sul vostro sito web';
}

function getEnglishPlatformPhrasing(platform: string, category: string, city: string = ''): string {
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

export function generateLocalMessageFallback(
  lead: Partial<Lead> & { shopName: string; platform: string; language: string; industry?: string; shortNotes?: string },
  config: Partial<ProductConfig> & {
    productName: string;
    commissionRate?: string;
    productDescription?: string;
    targetMerchandiseCategory?: string;
    funnelAssets?: { awareness: string[]; evaluation: string[]; purchase: string[] };
    offerType?: OfferType;
  },
  forcedStage?: FunnelStage
): { subject: string; body: string } {
  const stage: FunnelStage = forcedStage || (lead.status ? getFunnelStage(lead as Lead) : 'awareness');
  const tone = lead.toneOfVoice || 'Formale';
  const isInformal = tone === 'Informale';
  const productName = config.productName || (config as any).productAnalysis?.productName || 'Nostro Prodotto';
  const commissionRate = config.commissionRate || '20%';
  const keyFeatures = (config as any).productAnalysis?.keyFeatures || [];
  const primaryFeature = keyFeatures.length > 0 ? keyFeatures[0] : '';
  const secondaryFeature = keyFeatures.length > 1 ? keyFeatures[1] : '';
  const featureHighlight = primaryFeature ? ` (focus: ${primaryFeature}${secondaryFeature ? `, ${secondaryFeature}` : ''})` : '';
  const valueProp = (config as any).productAnalysis?.valueProposition || config.productDescription || 'Soluzione dedicata per aumentare i risultati';
  const productDesc = `${valueProp}${featureHighlight}`;
  const offerType = config.offerType || (config as any).productAnalysis?.offerType || 'affiliate';
  const isDigitalOrSoftware = offerType === 'digital_product' || offerType === 'software';
  const targetUrl = (config as any).productUrl || (config as any).productAnalysis?.sourceUrl || 'https://swissaffiliatebooster.ch';

  const category = getCleanMerchandiseCategory(lead.industry, lead.shortNotes, lead.shopName, config);
  const platformPhrase = getPlatformPhrasing(lead.platform, category, lead.city, isInformal);

  const awarenessAsset = config.funnelAssets?.awareness?.[0] || `la guida e analisi approfondita su ${productName}`;
  const evaluationAsset = config.funnelAssets?.evaluation?.[0] || `la demo interattiva e le specifiche di ${productName}`;
  const purchaseAsset = config.funnelAssets?.purchase?.[0] || `il link di attivazione immediata di ${productName}`;

  if (lead.language === 'en') {
    const enPlatform = getEnglishPlatformPhrasing(lead.platform, category, lead.city);
    const hook = isInformal
      ? `Hi team at ${lead.shopName}, I've been closely analyzing your presence in the ${category} space ${enPlatform}—your curation is top tier.`
      : `Dear ${lead.shopName} team, I have been following your established achievements in the ${category} sector ${enPlatform}.`;

    let body = '';
    let cta = '';
    let subject = '';

    if (stage === 'awareness') {
      subject = `Free insights & ${productName} resource for ${lead.shopName}`;
      body = isInformal
        ? `We recently put together an actionable resource centered on ${productName} (${valueProp}) for brands in ${category} ${enPlatform}. The material covers "${awarenessAsset}"${primaryFeature ? ` with a focus on ${primaryFeature}` : ''}. No sales pitch—just practical takeaways.`
        : `We prepared a curated research report regarding ${productName} (${valueProp}) for established brands in ${category} ${enPlatform}: "${awarenessAsset}". We examine concrete efficiency gains${primaryFeature ? ` including ${primaryFeature}` : ''} for your market in ${lead.city || 'Europe'}.`;
      cta = isInformal
        ? `You can access the complimentary guide and overview directly here: ${targetUrl}. Let me know what you think!`
        : `You may review the complimentary guide and research report directly here: ${targetUrl}. We remain at your disposal for any further questions.`;
    } else if (stage === 'evaluation') {
      subject = `Evaluation details & case study • ${lead.shopName} & ${productName}`;
      body = isInformal
        ? (isDigitalOrSoftware
            ? `Following up on our exchange, ${productName} (${productDesc}) offers a free trial and launch discount (${commissionRate}). Here is our dedicated evaluation material: ${evaluationAsset}.`
            : `Following up on our exchange, ${productName} (${productDesc}) provides a ${commissionRate} revenue share. Here is our dedicated evaluation material: ${evaluationAsset}.`)
        : (isDigitalOrSoftware
            ? `Following up on our discussions, ${productName} (${productDesc}) is structured with subscription plans and launch discounts (${commissionRate}). We have prepared ${evaluationAsset} for your evaluation.`
            : `Following up on our discussions, ${productName} (${productDesc}) is structured to maximize partner margins (${commissionRate}). We have prepared ${evaluationAsset} for your evaluation.`);
      cta = isInformal
        ? `Explore the product specifications and live demo directly here: ${targetUrl} — would you be open to a 10-minute walkthrough?`
        : `You can access the complete product overview and commercial terms here: ${targetUrl}. Would you be available for a brief 10-minute walkthrough?`;
    } else {
      // purchase
      subject = isDigitalOrSoftware
        ? `Ready to activate your account & free trial • ${lead.shopName}`
        : `Ready to activate your partner agreement • ${lead.shopName}`;
      body = isInformal
        ? (isDigitalOrSoftware
            ? `Great connecting with you! We're ready to set up ${lead.shopName} with account activation and launch discount (${commissionRate}). You can start right away with: ${purchaseAsset}.`
            : `Great connecting with you! We're ready to onboard ${lead.shopName} with ${commissionRate} commission and dedicated priority support. You can start right away with: ${purchaseAsset}.`)
        : (isDigitalOrSoftware
            ? `Thank you for your interest. We have prepared your account activation and subscription details (${commissionRate} launch discount structure): ${purchaseAsset}.`
            : `Thank you for your partnership interest. We have prepared your dedicated onboarding agreement (${commissionRate} commission structure) and access details: ${purchaseAsset}.`);
      cta = isInformal
        ? (isDigitalOrSoftware
            ? `You can activate your free trial directly via this onboarding link: ${targetUrl} — let me know if you are ready to get started!`
            : `You can activate your partnership and tracking link directly here: ${targetUrl} — let me know if you are ready to get started!`)
        : `You may finalize your account setup and access the commercial agreement directly here: ${targetUrl}.`;
    }

    return {
      subject,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBest regards,\nPartnerships Team • ${productName}`,
    };
  }

  // Italian default (HOOK + BODY + CTA)
  const hook = isInformal
    ? `Ciao team di ${lead.shopName}, ho notato con molto interesse il vostro lavoro nel settore ${category} ${platformPhrase} e la cura con cui curate l'offerta.`
    : `Gentile team di ${lead.shopName}, seguo con vivo interesse l'eccellenza della vostra attività nel settore ${category} ${platformPhrase}.`;

  let body = '';
  let cta = '';
  let subject = '';

  if (stage === 'awareness') {
    subject = `Risorsa gratuita e approfondimento ${productName} per ${lead.shopName}`;
    body = isInformal
      ? `Abbiamo recentemente elaborato un approfondimento pratico incentrato su ${productName} (${valueProp}), pensato per realtà specializzate nel settore ${category} ${platformPhrase}. Il materiale include "${awarenessAsset}"${primaryFeature ? ` ed esplora come valorizzare ${primaryFeature}` : ''}, senza alcuna proposta commerciale o vincolo d'acquisto.`
      : `In relazione alle evoluzioni e alle opportunità nel settore ${category} ${platformPhrase}, abbiamo redatto un approfondimento pratico dedicato a ${productName} (${valueProp}): "${awarenessAsset}". Il documento analizza soluzioni concrete${primaryFeature ? ` (in particolare ${primaryFeature})` : ''} per attività come la vostra a ${lead.city || 'in Svizzera'}.`;
    cta = isInformal
      ? `Puoi consultare la risorsa, l'analisi e tutti i dettagli su ${productName} direttamente a questo link: ${targetUrl} — facci sapere cosa ne pensi!`
      : `Può consultare la guida e l'approfondimento gratuito direttamente a questo link: ${targetUrl}. Restiamo a completa disposizione per qualsiasi confronto.`;
  } else if (stage === 'evaluation') {
    subject = `Approfondimento e demo • ${lead.shopName} & ${productName}`;
    body = isInformal
      ? (isDigitalOrSoftware
          ? `In merito al nostro contatto, ${productName} (${productDesc}) offre una prova gratuita e uno sconto lancio (${commissionRate}). Per darti subito piena visibilità sui risultati reali, abbiamo predisposto: "${evaluationAsset}".`
          : `In merito al nostro contatto, ${productName} (${productDesc}) offre una provvigione del ${commissionRate}. Per darti subito piena visibilità sui risultati reali, abbiamo predisposto: "${evaluationAsset}".`)
      : (isDigitalOrSoftware
          ? `Facendo seguito al nostro scambio, confermiamo che la soluzione ${productName} (${productDesc}) prevede un abbonamento con condizioni di sconto lancio (${commissionRate}). Abbiamo preparato un dossier di valutazione completo: "${evaluationAsset}".`
          : `Facendo seguito al nostro scambio, confermiamo che la soluzione ${productName} (${productDesc}) prevede una remunerazione partner del ${commissionRate}. Abbiamo preparato un dossier di valutazione completo: "${evaluationAsset}".`);
    cta = isInformal
      ? `Trovi la presentazione completa del prodotto e la demo a questo link: ${targetUrl} — ti andrebbe un rapido confronto di 10 minuti?`
      : `Può visionare la scheda completa della soluzione e la proposta a questo link: ${targetUrl}. Sarebbe disponibile per un breve approfondimento di 10 minuti?`;
  } else {
    // purchase
    subject = isDigitalOrSoftware
      ? `Attivazione account & prova gratuita • ${lead.shopName}`
      : `Attivazione partnership & condizioni riservate • ${lead.shopName}`;
    body = isInformal
      ? (isDigitalOrSoftware
          ? `Siamo entusiasti di accogliere ${lead.shopName}! Abbiamo predisposto l'attivazione dell'account e lo sconto lancio concordato (${commissionRate}) e il materiale di avvio: "${purchaseAsset}".`
          : `Siamo entusiasti di collaborare con ${lead.shopName}! Abbiamo predisposto le condizioni partner concordate (${commissionRate} di provvigione) e il materiale di avvio: "${purchaseAsset}".`)
      : (isDigitalOrSoftware
          ? `Siamo lieti di confermare l'attivazione dell'account per ${lead.shopName} con abbonamento dedicato e condizioni di sconto lancio (${commissionRate}). Abbiamo predisposto: "${purchaseAsset}".`
          : `Siamo lieti di confermare i termini della collaborazione per ${lead.shopName} con remunerazione del ${commissionRate} e supporto dedicato. Abbiamo predisposto: "${purchaseAsset}".`);
    cta = isInformal
      ? (isDigitalOrSoftware
          ? `Puoi completare l'attivazione della prova gratuita direttamente qui: ${targetUrl} — confermi che possiamo procedere?`
          : `Puoi attivare il tuo codice/link partner direttamente qui: ${targetUrl} — confermi che possiamo procedere?`)
      : `Può accedere alla proposta commerciale e completare l'attivazione ufficiale tramite questo link: ${targetUrl}.`;
  }

  return {
    subject,
    body: `${hook}\n\n${body}\n\n${cta}\n\nCordiali saluti,\nTeam Partnership • ${productName}`,
  };
}
