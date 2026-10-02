/**
 * Helper condiviso per la gestione programmatica della firma email.
 * Rimuove firme duplicate e appende la firma coerente in base alla configurazione.
 */
export function appendProgrammaticSignature(body: string, config: any, language: string = 'it'): string {
  const rawFromName = (config?.emailFromName || '').trim();
  const senderRole = (config?.emailSenderRole || config?.senderRole || '').trim();
  const companyName = (config?.legal_name || config?.company_name || 'N/A').trim();
  const postalAddress = (config?.postal_address || 'N/A').trim();

  // Opt-out line based on language
  const unsubscribeLines: Record<string, string> = {
    it: "Se non desiderate ricevere altre email, rispondete con STOP.",
    de: "Wenn Sie keine weiteren E-Mails erhalten möchten, antworten Sie bitte mit STOP.",
    fr: "Si vous ne souhaitez plus ricevere d'e-mails, répondez par STOP.",
    en: "If you do not wish to receive further emails, please reply with STOP."
  };
  const unsubscribeLine = unsubscribeLines[language] || unsubscribeLines.it;

  let signature = '';
  if (rawFromName && rawFromName.toLowerCase() !== 'commerciale') {
    if (senderRole) {
      signature = `${rawFromName}\n${senderRole}`;
    } else {
      signature = rawFromName;
    }
  }

  const cleanBody = body.trim();
  let finalFooter = '';
  
  if (signature) {
    finalFooter += signature + '\n\n';
  }

  // Legal compliance info
  if (companyName !== 'N/A' || postalAddress !== 'N/A') {
    finalFooter += `${companyName}\n${postalAddress}\n`;
  }

  // Opt-out line
  finalFooter += `\n---\n${unsubscribeLine}`;

  return `${cleanBody}\n\n${finalFooter.trim()}`;
}
