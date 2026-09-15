import { Lead, ProductConfig } from '../types';

export async function generateOutreachMessageWithAI(
  lead: Lead,
  config: ProductConfig
): Promise<{ subject: string; body: string }> {
  // If user provided OpenRouter API Key
  if (config.openRouterApiKey && config.openRouterApiKey.trim() !== '') {
    try {
      const prompt = `Sei un esperto copywriter B2B specializzato in partnership e affiliazioni.
Scrivi un messaggio di primo contatto personalizzato in lingua '${lead.language}'.
Destinatario: ${lead.shopName} (${lead.platform})
Note sul profilo: ${lead.shortNotes}
Città/Regione: ${lead.city || 'Svizzera'}
Prodotto da promuovere: ${config.productName}
Tipo Offerta: ${config.offerType} (Commissione: ${config.commissionRate})
Descrizione: ${config.productDescription}

Regole fondamentali:
1. Tono professionale, caldo, rispettoso e focalizzato sul valore per il creator/venditore.
2. Max 4 paragrafi concisi.
3. Call to action chiara e a basso attrito (es. invio gratuito di un campione/licenza o breve scambio di idee).
4. Rispondi in formato JSON puro: {"subject": "...", "body": "..."}`;

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
          messages: [{ role: 'user', content: prompt }],
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

  // High quality local template fallback (multilingual)
  if (lead.language === 'en') {
    return {
      subject: `Collaboration & Partnership proposal for ${lead.shopName}`,
      body: `Hi team at ${lead.shopName},

I’ve been following your store on ${lead.platform} and love the focus you put into your products!

We recently launched ${config.productName} (${config.productDescription}), and seeing your audience in ${lead.city || 'Europe'}, I believe there is an exceptional synergy.

We offer a generous ${config.commissionRate} partner commission, plus free dedicated access to test it out.

Would you be open to a quick 5-minute chat or receiving a demo preview?

Best regards,
Partnerships Team • ${config.productName}`,
    };
  } else if (lead.language === 'de') {
    return {
      subject: `Kooperationsanfrage & Partnerschaft für ${lead.shopName}`,
      body: `Hallo ${lead.shopName} Team,

wir verfolgen eure Produkte auf ${lead.platform} schon seit einiger Zeit mit Begeisterung.

Mit unserem Produkt ${config.productName} (${config.productDescription}) bieten wir Partnern in ${lead.city || 'der Schweiz'} attraktive Provisionen (${config.commissionRate}) und erstklassigen Mehrwert für ihre Kunden.

Hättet ihr Interesse an einem unverbindlichen Austausch oder einem kostenlosen Testzugang?

Beste Grüsse,
Partnership Team • ${config.productName}`,
    };
  } else if (lead.language === 'fr') {
    return {
      subject: `Proposition de partenariat pour ${lead.shopName}`,
      body: `Bonjour à toute l'équipe de ${lead.shopName},

Nous apprécions particulièrement vos créations et votre présence sur ${lead.platform}.

Nous développons actuellement ${config.productName} (${config.productDescription}) et nous serions ravis de collaborer avec vous (commission de ${config.commissionRate}).

Seriez-vous disponibles pour un bref échange ou pour recevoir un accès gratuit ?

Bien cordialement,
L'équipe Partenariats • ${config.productName}`,
    };
  }

  // Italian default
  return {
    subject: `Proposta di partnership e collaborazione per ${lead.shopName}`,
    body: `Gentile team di ${lead.shopName},

seguo con molto interesse il vostro catalogo su ${lead.platform} e la cura con cui curate la vostra presenza online.

Abbiamo recentemente sviluppato ${config.productName} (${config.productDescription}). Considerando il vostro target a ${lead.city || 'in Svizzera'}, sono certo che i vostri follower o clienti apprezzerebbero molto questa risorsa.

Prevediamo una commissione partner del ${config.commissionRate} e supporto dedicato per ogni vendita o referral.

Vi andrebbe di ricevere una prova gratuita o fare un brevissimo scambio senza impegno?

Un cordiale saluto,
Team Partnership • ${config.productName}`,
  };
}
