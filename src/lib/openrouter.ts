import { Lead, ProductConfig } from '../types';

export async function callOpenRouter(lead: Lead, config: ProductConfig): Promise<{ subject: string; body: string }> {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('OPENROUTER_API_KEY') : '';

  // If API key is available, attempt real OpenRouter call via backend or direct fetch
  if (apiKey && apiKey.startsWith('sk-or-')) {
    try {
      const response = await fetch('/api/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ lead, config }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subject && data.body) {
          return {
            subject: data.subject,
            body: data.body,
          };
        }
      }

      // Direct client fallback if API route fails
      const directResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Sales Agent',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct',
          messages: [
            { role: 'system', content: 'Sei un assistente di vendita esperto B2B. Scrivi email di outreach brevi, personalizzate e non spammy per promuovere il prodotto indicato dall’utente.' },
            { 
              role: 'user', 
              content: `Prodotto: ${config.productName}\nURL: ${config.productUrl}\nDescrizione: ${config.productDescription}\nTipo offerta: ${config.offerType}\n\nLead:\n- Nome: ${lead.shopName}\n- Piattaforma: ${lead.platform} (${lead.source})\n- Località: ${lead.city || 'N/A'}, ${lead.canton || 'CH'}\n- Email: ${lead.email || 'Nessuna email'}\n- Note: ${lead.shortNotes}\n\nScrivi un'email di 3-5 frasi in ${lead.language.toUpperCase()}, con CTA coerente.\nFORMAT:\nSUBJECT: [oggetto]\nBODY: [corpo]` 
            }
          ],
          temperature: 0.7,
        }),
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
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
  const product = config.productName || 'il nostro prodotto';
  const url = config.productUrl || 'https://example.com';
  const city = lead.city ? ` a ${lead.city} (${lead.canton})` : '';
  const emailNotice = lead.email ? ` (Contatto diretto: ${lead.email})` : ' (Tramite form o DM)';

  let subject = `Opportunità di crescita per ${shop}`;
  let body = `Buongiorno,\n\nHo notato ${shop}${city} nel settore ${lead.industry || 'digitale'}${emailNotice}. Molte aziende simili affrontano sfide nell'acquisizione clienti e nella scalabilità dei processi.\n\nIl nostro tool ${product} è progettato specificamente per risolvere questo problema automatizzando i flussi di vendita.\n\nVorreste testarlo gratuitamente? Ecco il link: ${url}`;

  if (config.offerType.includes('Done-For-You')) {
    body = `Buongiorno,\n\nSeguo ${shop}${city}${emailNotice}. Posso mostrarti come usiamo ${product} per ottenere risultati concreti per aziende come la tua nel settore ${lead.industry || 'mercato'}.\n\nTi andrebbe una consulenza gratuita di 15 minuti? ${url}`;
  } else if (config.offerType.includes('affiliazione') || config.offerType.includes('Affiliate')) {
    body = `Buongiorno,\n\nStiamo selezionando partner e affiliati in Svizzera per promuovere ${product}.\n\nVisto il vostro posizionamento a ${lead.city || 'Zurigo'}${emailNotice}, potreste generare commissioni ricorrenti eccellenti.\n\nVuoi visionare i dettagli del programma? ${url}`;
  }

  if (lead.language === 'de') {
    subject = `Partnerschaft & Wachstum für ${shop}`;
    body = `Guten Tag,\n\nIch habe Ihr Unternehmen ${shop}${city}${emailNotice} im Bereich ${lead.industry || 'Services'} gesehen. Viele Firmen optimieren aktuell ihre digitale Akquise.\n\nUnser Tool ${product} hilft Ihnen dabei, diesen Prozess zu automatisieren.\n\nMöchten Sie es unverbindlich testen? ${url}`;
  } else if (lead.language === 'fr') {
    subject = `Opportunité de croissance pour ${shop}`;
    body = `Bonjour,\n\nJ'ai découvert ${shop}${city}${emailNotice} dans le secteur ${lead.industry || 'services'}.\n\nNotre solution ${product} permet d'optimiser et d'automatiser l'acquisition client.\n\nSouhaitez-vous un test gratuit ? ${url}`;
  } else if (lead.language === 'it') {
    subject = `Proposta di collaborazione per ${shop}`;
    body = `Buongiorno,\n\nSeguo ${shop}${city}${emailNotice} nel settore ${lead.industry || 'mercato'}. Con ${product} aiutiamo le aziende a incrementare conversioni e vendite in modo mirato.\n\nTi andrebbe di visionare i dettagli? ${url}`;
  }

  return { subject, body };
}
