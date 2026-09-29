export interface ValidationOptions {
  stage?: string;
  includeLink?: boolean;
  allowedFactsText: string;
  productDataText: string;
  targetUrl?: string;
  productName?: string;
  emailFromName?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Funzione pura di validazione per email di outreach generate da IA o fallback.
 */
export function validateGeneratedMessage(
  message: { subject: string; body: string },
  options: ValidationOptions
): ValidationResult {
  const errors: string[] = [];
  const subject = (message?.subject || '').trim();
  const rawBody = (message?.body || '').trim();

  if (!subject) {
    errors.push("L'oggetto dell'email non può essere vuoto.");
  }
  if (!rawBody) {
    errors.push('Il corpo del messaggio non può essere vuoto.');
    return { valid: false, errors };
  }

  const isAwareness = options?.stage === 'awareness';

  // 1. Estrazione e rimozione URL prima dei controlli
  const urlPattern = /https?:\/\/\S+/gi;
  const urlsInBody = rawBody.match(urlPattern) || [];
  const bodyWithoutUrls = rawBody.replace(urlPattern, '').trim();

  const subjectLower = subject.toLowerCase();
  const bodyWithoutUrlsLower = bodyWithoutUrls.toLowerCase();
  const allowedFactsLower = (options?.allowedFactsText || '').toLowerCase();
  const productDataLower = (options?.productDataText || '').toLowerCase();
  const includeLink = isAwareness ? true : Boolean(options?.includeLink);
  const targetUrl = (options?.targetUrl || '').trim();

  // 2. Controllo Link e Posizionamento
  if (isAwareness) {
    // Stage awareness: il link deve essere sempre presente
    if (urlsInBody.length === 0) {
      errors.push(`Il messaggio deve contenere il link al prodotto (${targetUrl || 'URL'}).`);
    } else {
      // Deve esserci l'URL su una riga propria
      const lines = rawBody.split('\n').map((l) => l.trim()).filter(Boolean);
      const hasLinkLine = lines.some((line) => /^https?:\/\/\S+$/i.test(line));
      if (!hasLinkLine) {
        errors.push("Nello stage awareness, l'URL deve essere presente su una riga a sé stante.");
      }

      if (targetUrl && !rawBody.includes(targetUrl)) {
        errors.push(`Il link presente non corrisponde all'URL del prodotto (${targetUrl}).`);
      }
    }

    // Firma e STOP line obbligatori per awareness
    const fromName = (options?.emailFromName || '').trim();
    const prodName = (options?.productName || '').trim();
    if (fromName && !rawBody.toLowerCase().includes(fromName.toLowerCase())) {
      errors.push(`La firma deve includere il nome del mittente "${fromName}".`);
    }
    if (!prodName) {
      errors.push("Il nome del prodotto è obbligatorio per la validazione.");
    } else if (!rawBody.toLowerCase().includes(prodName.toLowerCase())) {
      errors.push(`La firma deve includere il nome del prodotto "${prodName}".`);
    }

    const stopKeywords = ['stop', 'ricevere altre email', 'no further emails', 'wish to receive'];
    const hasStop = stopKeywords.some((keyword) => rawBody.toLowerCase().includes(keyword));
    if (!hasStop) {
      errors.push("Deve essere presente la riga di disiscrizione (es. 'rispondete con STOP').");
    }

  } else {
    // Stage evaluation/purchase
    if (!includeLink) {
      if (urlsInBody.length > 0 || /https?:\/\/|www\./i.test(rawBody) || /https?:\/\/|www\./i.test(subject)) {
        errors.push('Nello stage a freddo non sono ammessi link o URL (trovato indirizzo web nel testo).');
      }
    } else {
      if (urlsInBody.length === 0) {
        errors.push(`Il messaggio deve contenere il link al prodotto (${targetUrl || 'URL'}).`);
      } else {
        // Verifica che l'URL sia presente come ultima riga separata
        const lines = rawBody.split('\n').map((l) => l.trim()).filter(Boolean);
        const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
        const isUrlLastLine = /^https?:\/\/\S+$/i.test(lastLine);

        if (!isUrlLastLine) {
          errors.push("Quando il link è incluso, l'URL deve trovarsi su una riga separata come ultima riga del messaggio dopo la domanda.");
        }

        // Mai "url?" attaccato
        for (const u of urlsInBody) {
          if (u.endsWith('?') || rawBody.includes(`${u}?`)) {
            errors.push('Il link non deve terminare con un punto interrogativo attaccato ("url?"). Metti la domanda e poi il link su una riga a parte.');
          }
        }

        if (targetUrl && !rawBody.includes(targetUrl)) {
          errors.push(`Il link presente non corrisponde all'URL del prodotto (${targetUrl}).`);
        }
      }
    }
  }

  // 3. Lunghezza
  // Body: target ≤ 90 parole, soglia dura massima 110 parole (senza URL)
  const bodyWords = bodyWithoutUrls.split(/\s+/).filter(Boolean);
  if (bodyWords.length > 110) {
    errors.push(
      `Il corpo del messaggio supera la soglia massima consentita di 110 parole (attuali: ${bodyWords.length} parole; target consigliato ≤ 90).`
    );
  }

  // Oggetto: da 3 a 6 parole
  const subjectWords = subject.split(/\s+/).filter(Boolean);
  if (subjectWords.length < 3 || subjectWords.length > 6) {
    errors.push(
      `L'oggetto dell'email deve contenere da 3 a 6 parole (attuali: ${subjectWords.length} parole).`
    );
  }

  // 4. Punto interrogativo ("?") calcolato sul body SENZA URL (solo per evaluation/purchase)
  if (!isAwareness) {
    const questionMarks = (bodyWithoutUrls.match(/\?/g) || []).length;
    if (questionMarks !== 1) {
      errors.push(
        `Il corpo del messaggio deve contenere esattamente un solo punto interrogativo "?" nella CTA finale (trovati: ${questionMarks}).`
      );
    }
    if (!bodyWithoutUrls.endsWith('?')) {
      errors.push('Il corpo del testo (escluso eventuale URL successivo) deve terminare esattamente con il punto interrogativo "?" della CTA finale.');
    }
  }

  // 5. Frasi e formule vietate
  const forbiddenPhrases = [
    'seguo con vivo interesse',
    'eccellenza',
    'siamo lieti',
    'siamo entusiasti',
    'ho il piacere di',
    'soluzione innovativa',
    'a completa disposizione',
    'approfondimento',
    'compra ora',
    'offertissima',
    'guadagni facili',
    'condizioni concordate',
    'gentile titolare',
  ];

  for (const phrase of forbiddenPhrases) {
    if (bodyWithoutUrlsLower.includes(phrase) || subjectLower.includes(phrase)) {
      errors.push(`Presenza di formula o espressione vietata: "${phrase}".`);
    }
  }

  // 5b. Parole vietate nell'oggetto dell'email
  const forbiddenSubjectWords = [
    'opportunità',
    'opportunita',
    'offerta',
    'occasione',
    'opportunites',
    'opportunities',
    'opportunity',
  ];
  for (const word of forbiddenSubjectWords) {
    if (subjectLower.includes(word)) {
      errors.push(`L'oggetto dell'email contiene una parola non consentita: "${word}".`);
    }
  }

  // 6. Punti esclamativi multipli ("!!") e parole in maiuscolo > 3 lettere (escluse query params)
  if (rawBody.includes('!!') || subject.includes('!!')) {
    errors.push('Uso non consentito di punti esclamativi multipli ("!!").');
  }

  const allowedUppercase = new Set(['SEO', 'CH', 'IT', 'KDP', 'STOP']);
  const uppercaseMatches = `${subject} ${bodyWithoutUrls}`.match(/\b[A-ZÀ-ÖØ-Þ]{4,}\b/g) || [];
  for (const word of uppercaseMatches) {
    if (!allowedUppercase.has(word)) {
      errors.push(
        `Trovata parola tutta in maiuscolo di più di 3 lettere non consentita: "${word}".`
      );
    }
  }

  // 7. Controllo numeri nel body (escluse cifre negli URL): confronto come token interi con \b
  const numberMatches = Array.from(bodyWithoutUrls.matchAll(/\b(\d+[\.,]?\d*)\b/g));
  for (const m of numberMatches) {
    const numStr = m[1];
    const fullMatchIndex = m.index ?? 0;

    // Consentito "10" se seguito da minuti/min (standard CTA)
    const following = bodyWithoutUrls
      .slice(fullMatchIndex + numStr.length, fullMatchIndex + numStr.length + 15)
      .toLowerCase()
      .trim();
    if (numStr === '10' && /^minut/i.test(following)) {
      continue;
    }

    // Confronto come token intero con confini di parola (\b)
    const escaped = numStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    const inFatti = tokenRegex.test(allowedFactsLower);
    const inProduct = tokenRegex.test(productDataLower);

    if (!inFatti && !inProduct) {
      errors.push(
        `Il numero "${numStr}" citato nel testo non compare né nei FATTI USABILI del lead né nei dati del prodotto.`
      );
    }
  }

  // 8. Termini promozionali con confini di parola (\b)
  const promotionalWordRules: { regex: RegExp; label: string }[] = [
    { regex: /\b(?:prova|prove)\b/i, label: 'prova/prove' },
    { regex: /\bgratis\b/i, label: 'gratis' },
    { regex: /\bgratuit[aoie]?\b/i, label: 'gratuito/a' },
    { regex: /\bscont[oia]\b/i, label: 'sconto/i' },
    { regex: /\bgaranzi[ae]\b/i, label: 'garanzia/e' },
  ];

  for (const rule of promotionalWordRules) {
    const match = bodyWithoutUrls.match(rule.regex);
    if (match) {
      const foundWord = match[0].toLowerCase();
      const escaped = foundWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (!tokenRegex.test(productDataLower)) {
        errors.push(
          `Il termine promozionale "${foundWord}" non è consentito perché non compare espressamente nei dati del prodotto.`
        );
      }
    }
  }

  // 9. Nessuna sequenza letterale "\n" e nessuna firma nel candidate body
  if (rawBody.includes('\\n')) {
    errors.push('Il corpo del messaggio contiene la sequenza letterale "\\n" anziché un ritorno a capo reale.');
  }

  if (!isAwareness) {
    const trailingClosingPattern = /\b(?:cordiali saluti|distinti saluti|un caro saluto|a presto|buona giornata|cordialmente)\b/i;
    if (trailingClosingPattern.test(bodyWithoutUrls)) {
      errors.push('Il corpo del messaggio non deve contenere formule di firma o saluti finali (la firma viene gestita a valle).');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
