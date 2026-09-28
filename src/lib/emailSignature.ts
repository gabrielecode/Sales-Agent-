/**
 * Helper condiviso per la gestione programmatica della firma email.
 * Rimuove firme duplicate e appende la firma coerente in base alla configurazione.
 */
export function appendProgrammaticSignature(body: string, config: any): string {
  const rawFromName = (config?.emailFromName || '').trim();
  // Se emailFromName è vuoto o vale "Commerciale" (case-insensitive), non aggiungere firma
  if (!rawFromName || rawFromName.toLowerCase() === 'commerciale') {
    return body.trim();
  }

  const senderRole = (config?.emailSenderRole || config?.senderRole || '').trim();
  let signature = '';
  if (rawFromName && senderRole) {
    signature = `${rawFromName}\n${senderRole}`;
  } else if (rawFromName) {
    signature = rawFromName;
  }

  const cleanBody = body.trim();
  if (signature) {
    return `${cleanBody}\n\n${signature}`;
  }
  return cleanBody;
}
