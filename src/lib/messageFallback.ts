import { Lead, ProductConfig, FunnelStage } from '../types';
import { getFunnelStage } from './funnelStage';

export function generateLocalMessageFallback(
  lead: Partial<Lead> & { shopName: string; platform: string; language: string },
  config: Partial<ProductConfig> & {
    productName: string;
    commissionRate?: string;
    productDescription?: string;
    funnelAssets?: { awareness: string[]; evaluation: string[]; purchase: string[] };
  },
  forcedStage?: FunnelStage
): { subject: string; body: string } {
  const stage: FunnelStage = forcedStage || (lead.status ? getFunnelStage(lead as Lead) : 'awareness');
  const tone = lead.toneOfVoice || 'Formale';
  const isInformal = tone === 'Informale';
  const productName = config.productName || 'Nostro Prodotto';
  const commissionRate = config.commissionRate || '20%';
  const productDesc = config.productDescription || 'Soluzione dedicata per aumentare le vendite';

  const awarenessAsset = config.funnelAssets?.awareness?.[0] || 'la nostra guida pratica introduttiva per creator ed e-commerce';
  const evaluationAsset = config.funnelAssets?.evaluation?.[0] || 'la demo video e il case study di approfondimento';
  const purchaseAsset = config.funnelAssets?.purchase?.[0] || 'il link per attivare subito il tuo account partner e la prova gratuita';

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
        ? `Following up on our exchange, ${productName} (${productDesc}) provides a ${commissionRate} revenue share. Here is our dedicated evaluation material: ${evaluationAsset}.`
        : `Following up on our discussions, ${productName} (${productDesc}) is structured to maximize partner margins (${commissionRate}). We have prepared ${evaluationAsset} for your evaluation.`;
      cta = isInformal
        ? `Would you like a 10-minute walkthrough or access to our staging sandbox?`
        : `Would you be open to an exploratory 10-minute review or receiving the detailed product specs?`;
    } else {
      // purchase
      subject = `Ready to activate your partner agreement • ${lead.shopName}`;
      body = isInformal
        ? `Great connecting with you! We're ready to onboard ${lead.shopName} with ${commissionRate} commission and dedicated priority support. You can start right away with: ${purchaseAsset}.`
        : `Thank you for your partnership interest. We have prepared your dedicated onboarding agreement (${commissionRate} commission structure) and access details: ${purchaseAsset}.`;
      cta = isInformal
        ? `Let me know if you'd like me to activate your referral tracking link today, or if you prefer a quick onboarding call.`
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
      ? `In merito al nostro contatto, ${productName} (${productDesc}) offre una provvigione del ${commissionRate}. Per darti subito piena visibilità sui risultati reali, abbiamo predisposto: "${evaluationAsset}".`
      : `Facendo seguito al nostro scambio, confermiamo che la soluzione ${productName} (${productDesc}) prevede una remunerazione partner del ${commissionRate}. Abbiamo preparato un dossier di valutazione completo: "${evaluationAsset}".`;
    cta = isInformal
      ? `Ti andrebbe di dare un'occhiata alla demo o fare un rapido confronto di 10 minuti?`
      : `Sareste disponibili per un breve approfondimento di 10 minuti o preferite ricevere la documentazione tecnica?`;
  } else {
    // purchase
    subject = `Attivazione partnership & condizioni riservate • ${lead.shopName}`;
    body = isInformal
      ? `Siamo entusiasti di collaborare con ${lead.shopName}! Abbiamo predisposto le condizioni partner concordate (${commissionRate} di provvigione) e il materiale di avvio: "${purchaseAsset}".`
      : `Siamo lieti di confermare i termini della collaborazione per ${lead.shopName} con remunerazione del ${commissionRate} e supporto dedicato. Abbiamo predisposto: "${purchaseAsset}".`;
    cta = isInformal
      ? `Confermi che possiamo attivare il tuo codice/link partner oggi stesso, o preferisci fare prima una call di 10 minuti?`
      : `Possiamo procedere con l'attivazione ufficiale dei link o gradite concordare una sessione breve di onboarding?`;
  }

  return {
    subject,
    body: `${hook}\n\n${body}\n\n${cta}\n\nCordiali saluti,\nTeam Partnership • ${productName}`,
  };
}
