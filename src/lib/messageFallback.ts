import { Lead, ProductConfig, FunnelStage, OfferType } from '../types';
import { getFunnelStage } from './funnelStage';

export function generateLocalMessageFallback(
  lead: Partial<Lead> & { shopName: string; platform: string; language: string },
  config: Partial<ProductConfig> & {
    productName: string;
    commissionRate?: string;
    productDescription?: string;
    funnelAssets?: { awareness: string[]; evaluation: string[]; purchase: string[] };
    offerType?: OfferType;
  },
  forcedStage?: FunnelStage
): { subject: string; body: string } {
  const stage: FunnelStage = forcedStage || (lead.status ? getFunnelStage(lead as Lead) : 'awareness');
  const tone = lead.toneOfVoice || 'Formale';
  const isInformal = tone === 'Informale';
  const productName = config.productName || 'Nostro Prodotto';
  const commissionRate = config.commissionRate || '20%';
  const keyFeatures = (config as any).productAnalysis?.keyFeatures || [];
  const selectedFeature = keyFeatures.length > 0 ? keyFeatures[0] : '';
  const productDesc = selectedFeature 
    ? `${config.productDescription || 'Soluzione dedicata'} (Punto di forza chiave: ${selectedFeature})`
    : (config.productDescription || 'Soluzione dedicata per aumentare le vendite');
  const offerType = config.offerType || 'affiliate';
  const isDigitalOrSoftware = offerType === 'digital_product' || offerType === 'software';

  const awarenessAsset = config.funnelAssets?.awareness?.[0] || 'la nostra guida pratica introduttiva per creator ed e-commerce';
  const evaluationAsset = config.funnelAssets?.evaluation?.[0] || 'la demo video e il case study di approfondimento';
  const purchaseAsset = config.funnelAssets?.purchase?.[0] || 'il link per attivare subito il tuo account e la prova gratuita';

  if (lead.language === 'en') {
    const hook = isInformal
      ? `Hi team at ${lead.shopName}, I've been closely analyzing your presence on ${lead.platform} within the ${lead.industry || 'digital'} space—your curation is top tier.`
      : `Dear ${lead.shopName} team, I have been following your established achievements in the ${lead.industry || 'commerce'} sector on ${lead.platform}.`;

    let body = '';
    let cta = '';
    let subject = '';

    if (stage === 'awareness') {
      subject = `Free resource & insights for ${lead.shopName}`;
      body = isInformal
        ? `We recently put together an actionable resource for businesses on ${lead.platform}: ${awarenessAsset}. No sales pitch—just practical takeaways to grow high-intent traffic.`
        : `We prepared a curated research report for top stores on ${lead.platform}: ${awarenessAsset}. We believe this insight provides valuable perspective for your market in ${lead.city || 'Europe'}.`;
      cta = isInformal
        ? `Would you like me to send you the direct PDF link? No strings attached.`
        : `May I send over a complimentary copy for your team to review?`;
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
        ? `Would you like a 10-minute walkthrough or access to our staging sandbox?`
        : `Would you be open to an exploratory 10-minute review or receiving the detailed product specs?`;
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
            ? `Let me know if you'd like me to activate your free trial or subscription today, or if you prefer a quick onboarding call.`
            : `Let me know if you'd like me to activate your referral tracking link today, or if you prefer a quick onboarding call.`)
        : `Please let us know if we may proceed with the account activation or schedule a brief onboarding session.`;
    }

    return {
      subject,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBest regards,\nPartnerships Team • ${productName}`,
    };
  }

  // Italian default (HOOK + BODY + CTA)
  const hook = isInformal
    ? `Ciao team di ${lead.shopName}, ho notato con molto interesse il vostro lavoro nel settore ${lead.industry || 'digitale'} su ${lead.platform} e la cura con cui gestite il vostro catalogo.`
    : `Gentile team di ${lead.shopName}, seguo con vivo interesse i vostri risultati nel settore ${lead.industry || 'aziendale'} su ${lead.platform}.`;

  let body = '';
  let cta = '';
  let subject = '';

  if (stage === 'awareness') {
    subject = `Risorsa gratuita & trend di settore per ${lead.shopName}`;
    body = isInformal
      ? `Abbiamo recentemente elaborato un contenuto pratico pensato per creator e store attivi su ${lead.platform}: "${awarenessAsset}". Nessuna proposta commerciale o vincolo, solo dati concreti e strategie per ottimizzare i ricavi a ${lead.city || 'livello locale'}.`
      : `In relazione alle evoluzioni del mercato su ${lead.platform}, abbiamo redatto un approfondimento pratico dedicato: "${awarenessAsset}". Si tratta di una risorsa divulgativa focalizzata su trend e ottimizzazione per realtà come la vostra a ${lead.city || 'in Svizzera'}.`;
    cta = isInformal
      ? `Ti andrebbe se ti inviassi il link per leggerla senza alcun impegno?`
      : `Possiamo inviarvi il documento in anteprima gratuita da condividere con il vostro team?`;
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
      ? `Ti andrebbe di dare un'occhiata alla demo o fare un rapido confronto di 10 minuti?`
      : `Sareste disponibili per un breve approfondimento di 10 minuti o preferite ricevere la documentazione tecnica?`;
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
          ? `Confermi che possiamo attivare la tua prova gratuita o l'abbonamento oggi stesso, o preferisci fare prima una call di 10 minuti?`
          : `Confermi che possiamo attivare il tuo codice/link partner oggi stesso, o preferisci fare prima una call di 10 minuti?`)
      : `Possiamo procedere con l'attivazione ufficiale dell'account o gradite concordare una sessione breve di onboarding?`;
  }

  return {
    subject,
    body: `${hook}\n\n${body}\n\n${cta}\n\nCordiali saluti,\nTeam Partnership • ${productName}`,
  };
}
