import { Lead, ProductConfig } from '../types';

export async function generateOutreachMessageWithAI(
  lead: Lead,
  config: ProductConfig
): Promise<{ subject: string; body: string }> {
  const tone = lead.toneOfVoice || 'Formale';

  // If user provided OpenRouter API Key
  if (config.openRouterApiKey && config.openRouterApiKey.trim() !== '') {
    try {
      const systemPrompt = `Sei un Senior Copywriter B2B specializzato in Conversion Rate Optimization (CRO) e deliverability email.
Devi seguire RIGOROSAMENTE la formula di Copywriting: HOOK + BODY + CTA.

Regole tassative per la redazione dell'email:
1. TONO DI VOCE: Scrivi l'email usando il tono di voce indicato (${tone}):
   - Se 'Informale': usa un tono diretto e cordiale tra pari del settore (Tu / Ciao).
   - Se 'Formale': usa un registro professionale e rispettoso (Lei / Buongiorno / Gentile).
2. HOOK (GANCIO): Inizia SEMPRE con un Hook (Gancio) iper-personalizzato basato sul settore o sulle note del cliente per catturare subito l'attenzione.
3. BODY (CORPO): Continua con il Corpo del testo incentrato sul problema/soluzione (Search Intent B2B) e sui vantaggi concreti della partnership.
4. CTA (CALL TO ACTION): Chiudi SEMPRE con una CTA chiara, semplice e a basso attrito (es. disponibilità per un rapido feedback o anteprima riservata).
5. ANTI-SPAM & DELIVERABILITY: Evita parole da spam come 'Gratis', 'Compra ora', 'Sconto', punti esclamativi multipli o formule aggressive di vendita.

Rispondi ESCLUSIVAMENTE in formato JSON puro:
{"subject": "...", "body": "..."}`;

      const userPrompt = `Genera un'email di outreach altamente personalizzata per il seguente lead:
- Destinatario: ${lead.shopName}
- Piattaforma: ${lead.platform}
- Settore / Nicchia: ${lead.industry || 'Non specificato'}
- Tono di voce: ${tone}
- Lingua: ${lead.language}
- Località: ${lead.city || 'Svizzera'} (${lead.canton || 'CH'})
- Note profilo: ${lead.shortNotes}

Dati dell'offerta:
- Prodotto da promuovere: ${config.productName}
- Modello / Tipo Offerta: ${config.offerType} (Commissione: ${config.commissionRate})
- Descrizione Prodotto: ${config.productDescription}
- Target: ${config.targetAudience || 'B2B Partners'}`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openRouterApiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://affiliate-sales-agent.local',
          'X-Title': 'Affiliate Sales Agent',
        },
        body: JSON.stringify({
          model: config.openRouterModel || 'meta-llama/llama-3-8b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            subject: parsed.subject || `Opportunità di partnership per ${lead.shopName}`,
            body: parsed.body || content,
          };
        }
      }
    } catch (err) {
      console.warn('Fallback a generatore locale per errore OpenRouter:', err);
    }
  }

  // High quality local template fallback following HOOK + BODY + CTA (no spam words)
  const isInformal = tone === 'Informale';

  if (lead.language === 'en') {
    const hook = isInformal
      ? `Hi team at ${lead.shopName}, I've been closely analyzing your presence on ${lead.platform} within the ${lead.industry || 'digital'} space—your curation is top tier.`
      : `Dear ${lead.shopName} team, I have been following your established achievements in the ${lead.industry || 'commerce'} sector on ${lead.platform}.`;

    const body = isInformal
      ? `We recently developed ${config.productName} (${config.productDescription}) to directly address high-intent customer demand. Given your audience in ${lead.city || 'Europe'}, combining our strengths offers a high-yield synergy. We provide a ${config.commissionRate} partner reward and dedicated technical support.`
      : `In response to evolving market needs, we introduced ${config.productName} (${config.productDescription}). Given your strategic position in ${lead.city || 'Europe'}, our solution seamlessly aligns with your clients' search intent. Our partnership structure provides an attractive ${config.commissionRate} commission with dedicated account assistance.`;

    const cta = isInformal
      ? `Would you be open to a quick 5-minute sync or receiving an exclusive preview?`
      : `Would you be available for a brief introductory conversation or an exploratory preview?`;

    return {
      subject: `Strategic partnership inquiry • ${lead.shopName} & ${config.productName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBest regards,\nPartnerships Team • ${config.productName}`,
    };
  } else if (lead.language === 'de') {
    const hook = isInformal
      ? `Hallo ${lead.shopName} Team, eure Arbeit im Bereich ${lead.industry || 'E-Commerce'} auf ${lead.platform} ist uns direkt positiv aufgefallen.`
      : `Sehr geehrtes Team von ${lead.shopName}, mit grossem Interesse verfolgen wir Ihre Positionierung im Bereich ${lead.industry || 'E-Commerce'} auf ${lead.platform}.`;

    const body = isInformal
      ? `Mit ${config.productName} (${config.productDescription}) haben wir eine Lösung geschaffen, die genau den Bedarf anspruchsvoller Kunden deckt. Für eure Zielgruppe in ${lead.city || 'der Schweiz'} sehen wir eine ideale Synergie. Wir bieten eine Partner-Provision von ${config.commissionRate} sowie persönliche Begleitung.`
      : `Mit ${config.productName} (${config.productDescription}) bieten wir eine gezielte Lösung für die Anforderungen moderner Unternehmen. Mit Blick auf Ihre Reichweite in ${lead.city || 'der Schweiz'} bietet eine Kooperation konkreten Mehrwert. Unser Programm umfasst eine Partnervergütung von ${config.commissionRate} und dedizierten Support.`;

    const cta = isInformal
      ? `Hättet ihr Zeit für einen kurzen 5-Minuten-Austausch oder einen exklusiven Vorab-Einblick?`
      : `Wären Sie offen für einen kurzen unverbindlichen Austausch oder einen exklusiven Einblick in unsere Unterlagen?`;

    return {
      subject: `Partnerschaft & Synergien • ${lead.shopName} & ${config.productName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBeste Grüsse,\nPartnership Team • ${config.productName}`,
    };
  } else if (lead.language === 'fr') {
    const hook = isInformal
      ? `Bonjour à l'équipe de ${lead.shopName}, votre positionnement dans le domaine ${lead.industry || 'digital'} sur ${lead.platform} est particulièrement inspirant.`
      : `Madame, Monsieur, l'équipe de ${lead.shopName}, nous suivons avec attention le développement de vos activités sur ${lead.platform} dans le secteur ${lead.industry || 'professionnel'}.`;

    const body = isInformal
      ? `Nous avons conçu ${config.productName} (${config.productDescription}) pour répondre directement aux attentes de votre audience à ${lead.city || 'en Suisse'}. Notre modèle de collaboration offre une commission de ${config.commissionRate} avec un accompagnement dédié pour chaque échange.`
      : `Nous avons développé ${config.productName} (${config.productDescription}) pour répondre aux besoins spécifiques de votre secteur. Au vu de votre présence à ${lead.city || 'en Suisse'}, nous identifions une synergie à forte valeur ajoutée. Notre accord de partenariat prévoit une commission de ${config.commissionRate} et un support personnalisé.`;

    const cta = isInformal
      ? `Seriez-vous disponibles pour un court échange de 5 minutes ou pour découvrir notre aperçu exclusif ?`
      : `Seriez-vous disposés à convenir d'un bref entretien d'introduction ou à recevoir une présentation personnalisée ?`;

    return {
      subject: `Proposition de synergie et partenariat • ${lead.shopName}`,
      body: `${hook}\n\n${body}\n\n${cta}\n\nBien cordialement,\nL'équipe Partenariats • ${config.productName}`,
    };
  }

  // Italian default (HOOK + BODY + CTA)
  const hook = isInformal
    ? `Ciao team di ${lead.shopName}, ho notato con molto interesse il vostro lavoro nel settore ${lead.industry || 'digitale'} su ${lead.platform} e la cura con cui gestite il vostro catalogo.`
    : `Gentile team di ${lead.shopName}, seguo con vivo interesse i vostri risultati nel settore ${lead.industry || 'aziendale'} su ${lead.platform}.`;

  const body = isInformal
    ? `Abbiamo sviluppato ${config.productName} (${config.productDescription}) per risolvere una criticità concreta sentita dal mercato. Considerando la vostra presenza a ${lead.city || 'in Svizzera'}, vedo una sinergia ad alto potenziale per la vostra community. Prevediamo una provvigione partner del ${config.commissionRate} e supporto dedicato per ogni conversione.`
    : `In relazione alle evoluzioni del vostro mercato di riferimento a ${lead.city || 'in Svizzera'}, abbiamo sviluppato ${config.productName} (${config.productDescription}). La nostra soluzione risponde puntualmente all'intento di ricerca dei clienti B2B, valorizzando l'offerta esistente con una remunerazione partner del ${config.commissionRate} e assistenza prioritaria.`;

  const cta = isInformal
    ? `Ti andrebbe di fare un rapido confronto di 5 minuti o ricevere un'anteprima riservata?`
    : `Sareste disponibili per un breve confronto esplorativo di 5 minuti o per esaminare un'anteprima riservata?`;

  return {
    subject: `Sinergia di partnership e collaborazione • ${lead.shopName}`,
    body: `${hook}\n\n${body}\n\n${cta}\n\nCordiali saluti,\nTeam Partnership • ${config.productName}`,
  };
}
