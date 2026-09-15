import { Lead, ProductConfig } from '../types';

export async function callOpenRouter(lead: Lead, config: ProductConfig): Promise<{ subject: string; body: string }> {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('OPENROUTER_API_KEY') : '';
  
  const systemPrompt = "Sei un assistente di vendita esperto B2B. Scrivi email di outreach brevi, personalizzate e non spammy per promuovere il prodotto indicato dall’utente.";
  
  const userPrompt = `
Prodotto: ${config.productName}
URL: ${config.productUrl}
Descrizione: ${config.productDescription}
Tipo offerta: ${config.offerType}

Lead Details:
- Nome/Shop: ${lead.shopName}
- Piattaforma/Fonte: ${lead.platform} (${lead.source})
- Città/Cantone: ${lead.city || 'N/A'}, ${lead.canton || 'CH'}
- Settore: ${lead.industry || 'E-commerce'}
- Lingua: ${lead.language.toUpperCase()}
- Note: ${lead.shortNotes}

Scrivi un'email di outreach di 3-5 frasi in lingua ${lead.language.toUpperCase()}, menzionando il contesto locale svizzero se disponibile, con una CTA chiara coerente con il tipo di offerta (${config.offerType}). 
Formatta la risposta esattamente come:
SUBJECT: [oggetto]
BODY: [corpo del messaggio]
  `;

  // If API key is available, attempt real OpenRouter call (production ready)
  if (apiKey && apiKey.startsWith('sk-or-')) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Affiliate Sales Agent',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const subjectMatch = content.match(/SUBJECT:\s*(.*)/i);
        const bodyMatch = content.match(/BODY:\s*([\s\S]*)/i);
        
        if (subjectMatch && bodyMatch) {
          return {
            subject: subjectMatch[1].trim(),
            body: bodyMatch[1].trim(),
          };
        }
      }
    } catch (err) {
      console.warn('OpenRouter API call failed, falling back to intelligent simulation generator:', err);
    }
  }

  // Fallback intelligent simulation matching prompt requirements
  const shop = lead.shopName;
  const product = config.productName;
  const url = config.productUrl;
  const city = lead.city ? ` a ${lead.city} (${lead.canton})` : '';

  let subject = `Opportunità di crescita per ${shop}`;
  let body = `Buongiorno,\n\nHo notato ${shop}${city} nel settore ${lead.industry || 'digitale'}. Molte aziende svizzere simili affrontano sfide nell'acquisizione clienti e nella scalabilità dei processi.\n\nIl nostro tool ${product} è progettato specificamente per risolvere questo problema automatizzando i flussi di vendita.\n\nVorreste testarlo gratuitamente? Ecco il link: ${url}`;

  if (lead.language === 'de') {
    subject = `Partnerschaft & Wachstum für ${shop}`;
    body = `Guten Tag,\n\nIch habe Ihr Unternehmen ${shop}${city} im Bereich ${lead.industry || 'Services'} gesehen. Viele Schweizer Firmen optimieren aktuell ihre digitale Akquise.\n\nUnser Tool ${product} hilft Ihnen dabei, diesen Prozess zu automatisieren.\n\nMöchten Sie es unverbindlich testen? ${url}`;
  } else if (lead.language === 'fr') {
    subject = `Opportunité de croissance pour ${shop}`;
    body = `Bonjour,\n\nJ'ai découvert ${shop}${city} dans le secteur ${lead.industry || 'services'}.\n\nNotre solution ${product} permet d'optimiser et d'automatiser l'acquisition client pour les entreprises en Suisse.\n\nSouhaitez-vous un test gratuit ? ${url}`;
  } else if (lead.language === 'it') {
    subject = `Proposta di collaborazione per ${shop}`;
    body = `Buongiorno,\n\nSeguo ${shop}${city} nel settore ${lead.industry || 'mercato'}. Con ${product} aiutiamo le aziende svizzere a incrementare conversioni e vendite in modo mirato.\n\nTi andrebbe di visionare i dettagli? ${url}`;
  }

  return { subject, body };
}
