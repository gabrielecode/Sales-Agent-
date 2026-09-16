import { Lead, ProductConfig } from '../types';

export function generateLocalMessageFallback(
  lead: Partial<Lead> & { shopName: string; platform: string; language: string },
  config: Partial<ProductConfig> & { productName: string; commissionRate?: string; productDescription?: string }
): { subject: string; body: string } {
  const tone = lead.toneOfVoice || 'Formale';
  const isInformal = tone === 'Informale';
  const productName = config.productName || 'Nostro Prodotto';
  const commissionRate = config.commissionRate || '20%';
  const productDesc = config.productDescription || 'Soluzione dedicata per aumentare le vendite';

  if (lead.language === 'en') {
    const hook = isInformal
      ? `Hi team at ${lead.shopName}, I've been closely analyzing your presence on ${lead.platform} within the ${lead.industry || 'digital'} space—your curation is top tier.`
      : `Dear ${lead.shopName} team, I have been following your established achievements in the ${lead.industry || 'commerce'} sector on ${lead.platform}.`;

    const body = isInformal
      ? `We recently developed ${productName} (${productDesc}) to directly address high-intent customer demand. Given your audience in ${lead.city || 'Europe'}, combining our strengths offers a high-yield synergy. We provide a ${commissionRate} partner reward and dedicated technical support.`
      : `In response to evolving market needs, we introduced ${productName} (${productDesc}). Given your strategic position in ${lead.city || 'Europe'}, our solution seamlessly aligns with your clients' search intent. Our partnership structure provides an attractive ${commissionRate} commission with dedicated account assistance.`;

    const cta = isInformal
      ? `Would you be open to a quick 5-minute sync or receiving an exclusive preview?`
      : `Would you be available for a brief introductory conversation or an exploratory preview?`;

    return {
      subject: `Strategic partnership inquiry • ${lead.shopName} & ${productName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBest regards,\nPartnerships Team • ${productName}`,
    };
  } else if (lead.language === 'de') {
    const hook = isInformal
      ? `Hallo ${lead.shopName} Team, eure Arbeit im Bereich ${lead.industry || 'E-Commerce'} auf ${lead.platform} ist uns direkt positiv aufgefallen.`
      : `Sehr geehrtes Team von ${lead.shopName}, mit grossem Interesse verfolgen wir Ihre Positionierung im Bereich ${lead.industry || 'E-Commerce'} auf ${lead.platform}.`;

    const body = isInformal
      ? `Mit ${productName} (${productDesc}) haben wir eine Lösung geschaffen, die genau den Bedarf anspruchsvoller Kunden deckt. Für eure Zielgruppe in ${lead.city || 'der Schweiz'} sehen wir eine ideale Synergie. Wir bieten eine Partner-Provision von ${commissionRate} sowie persönliche Begleitung.`
      : `Mit ${productName} (${productDesc}) bieten wir eine gezielte Lösung für die Anforderungen moderner Unternehmen. Mit Blick auf Ihre Reichweite in ${lead.city || 'der Schweiz'} bietet eine Kooperation konkreten Mehrwert. Unser Programm umfasst eine Partnervergütung von ${commissionRate} und dedizierten Support.`;

    const cta = isInformal
      ? `Hättet ihr Zeit für einen kurzen 5-Minuten-Austausch oder einen exklusiven Vorab-Einblick?`
      : `Wären Sie offen für einen kurzen unverbindlichen Austausch oder einen exklusiven Einblick in unsere Unterlagen?`;

    return {
      subject: `Partnerschaft & Synergien • ${lead.shopName} & ${productName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBeste Grüsse,\nPartnership Team • ${productName}`,
    };
  } else if (lead.language === 'fr') {
    const hook = isInformal
      ? `Bonjour à l'équipe de ${lead.shopName}, votre positionnement dans le domaine ${lead.industry || 'digital'} sur ${lead.platform} est particulièrement inspirant.`
      : `Madame, Monsieur, l'équipe de ${lead.shopName}, nous suivons avec attention le développement de vos activités sur ${lead.platform} dans le secteur ${lead.industry || 'professionnel'}.`;

    const body = isInformal
      ? `Nous avons conçu ${productName} (${productDesc}) pour répondre directement aux attentes de votre audience à ${lead.city || 'en Suisse'}. Notre modèle de collaboration offre une commission de ${commissionRate} avec un accompagnement dédié pour chaque échange.`
      : `Nous avons développé ${productName} (${productDesc}) pour répondre aux besoins spécifiques de votre secteur. Au vu de votre présence à ${lead.city || 'en Suisse'}, nous identifions une synergie à forte valeur ajoutée. Notre accord de partenariat prévoit une commission de ${commissionRate} et un support personnalisé.`;

    const cta = isInformal
      ? `Seriez-vous disponibles pour un court échange de 5 minutes ou pour découvrir notre aperçu exclusif ?`
      : `Seriez-vous disposés à convenir d'un bref entretien d'introduction ou à recevoir une présentation personnalisée ?`;

    return {
      subject: `Proposition de synergie et partenariat • ${lead.shopName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBien cordialement,\nL'équipe Partenariats • ${productName}`,
    };
  }

  // Italian default (HOOK + BODY + CTA)
  const hook = isInformal
    ? `Ciao team di ${lead.shopName}, ho notato con molto interesse il vostro lavoro nel settore ${lead.industry || 'digitale'} su ${lead.platform} e la cura con cui gestite il vostro catalogo.`
    : `Gentile team di ${lead.shopName}, seguo con vivo interesse i vostri risultati nel settore ${lead.industry || 'aziendale'} su ${lead.platform}.`;

  const body = isInformal
    ? `Abbiamo sviluppato ${productName} (${productDesc}) per risolvere una criticità concreta sentita dal mercato. Considerando la vostra presenza a ${lead.city || 'in Svizzera'}, vedo una sinergia ad alto potenziale per la vostra community. Prevediamo una provvigione partner del ${commissionRate} e supporto dedicato per ogni conversione.`
    : `In relazione alle evoluzioni del vostro mercato di riferimento a ${lead.city || 'in Svizzera'}, abbiamo sviluppato ${productName} (${productDesc}). La nostra soluzione risponde puntualmente all'intento di ricerca dei clienti B2B, valorizzando l'offerta esistente con una remunerazione partner del ${commissionRate} e assistenza prioritaria.`;

  const cta = isInformal
    ? `Ti andrebbe di fare un rapido confronto di 5 minuti o ricevere un'anteprima riservata?`
    : `Sareste disponibili per un breve confronto esplorativo di 5 minuti o per esaminare un'anteprima riservata?`;

  return {
    subject: `Sinergia di partnership e collaborazione • ${lead.shopName}`,
    body: `${hook}\n\n${body}\n\n${cta}\n\nCordiali saluti,\nTeam Partnership • ${productName}`,
  };
}
