export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const query = req.query || {};

    // Get provided key or server key
    const rawKey = (
      body.apiKey ||
      query.apiKey ||
      body.config?.resendApiKey ||
      process.env.RESEND_API_KEY ||
      ""
    ).toString();

    const cleanKey = rawKey.replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
    const isFromClient = Boolean(body.apiKey || query.apiKey || body.config?.resendApiKey);

    if (!cleanKey) {
      return res.status(200).json({
        success: false,
        hasKey: false,
        error: "Nessuna API Key Resend configurata nelle variabili d'ambiente (RESEND_API_KEY) né passata nella richiesta.",
        suggestion: "Aggiungi la chiave API generata nel team 'sale.autoagent' su Resend.",
      });
    }

    const maskedKey = cleanKey.length > 8
      ? `${cleanKey.slice(0, 7)}...${cleanKey.slice(-4)}`
      : `${cleanKey.slice(0, 3)}...`;

    // 1. Query Resend /domains
    let domainsList: any[] = [];
    let domainsFetchOk = false;
    let domainsFetchError: string | null = null;
    let domainsHttpStatus = 0;

    try {
      const domainsRes = await fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
      });

      domainsHttpStatus = domainsRes.status;

      if (domainsRes.ok) {
        const domainsData = (await domainsRes.json().catch(() => ({}))) as any;
        domainsList = Array.isArray(domainsData?.data) ? domainsData.data : [];
        domainsFetchOk = true;
      } else {
        const errJson = (await domainsRes.json().catch(() => ({}))) as any;
        domainsFetchError = errJson?.message || errJson?.error || `HTTP ${domainsRes.status} ${domainsRes.statusText}`;
      }
    } catch (dErr: any) {
      domainsFetchError = dErr?.message || "Errore di connessione a api.resend.com";
    }

    // 2. Analyze domains result
    const sititicinoDomain = domainsList.find(
      (d) => (d.name || "").toLowerCase() === "sititicino.ch"
    );
    const inboundDomain = domainsList.find(
      (d) => (d.name || "").toLowerCase() === "inbound.sititicino.ch"
    );

    let diagnosticStatus: "ok" | "team_mismatch" | "invalid_key" | "restricted_key" | "unverified_domain" = "ok";
    let diagnosisMessage = "";
    let actionSteps: string[] = [];

    const isSendingOnly = domainsFetchError && domainsFetchError.toLowerCase().includes("restricted to only send emails");

    if (isSendingOnly) {
      diagnosticStatus = "restricted_key";
      diagnosisMessage = `La chiave API (${maskedKey}) ha permessi "Sending access" (può inviare email, ma non può visualizzare l'elenco dei domini via API). Se è stata creata nel team 'sale.autoagent', l'invio email funzionerà regolarmente.`;
      actionSteps = [
        "Se desideri verificare la lista completa dei domini via API, genera una chiave con permission 'Full access' su resend.com",
        "Assicurati che la chiave appartenga al team 'sale.autoagent' dove 'sititicino.ch' è verificato",
      ];
    } else if (domainsHttpStatus === 401) {
      diagnosticStatus = "invalid_key";
      diagnosisMessage = `La chiave API (${maskedKey}) non è valida o è stata revocata su Resend.`;
      actionSteps = [
        "Accedi a resend.com",
        "Assicurati di selezionare il team 'sale.autoagent' nel menu in alto a sinistra",
        "Vai su 'API keys' nel menu laterale e clicca su '+ Add API Key'",
        "Seleziona Permission 'Full access' e copia la chiave generata",
        "Incollala qui o imposta RESEND_API_KEY su Vercel",
      ];
    } else if (domainsHttpStatus === 403) {
      diagnosticStatus = "restricted_key";
      diagnosisMessage = `La chiave API (${maskedKey}) ha permessi limitati e non può accedere ai domini.`;
      actionSteps = [
        "In Resend (team sale.autoagent), vai su 'API keys'",
        "Crea una nuova API key con 'Full access' per consentire sia l'ispezione dei domini che l'invio email da sititicino.ch",
      ];
    } else if (domainsFetchOk) {
      if (!sititicinoDomain) {
        diagnosticStatus = "team_mismatch";
        const foundNames = domainsList.map((d) => d.name).join(", ") || "nessun dominio registrato";
        diagnosisMessage = `TEAM MISMATCH RILEVATO: La chiave API (${maskedKey}) è valida ma NON appartiene al team 'sale.autoagent'! Su questo account sono visibili solo i domini: [${foundNames}].`;
        actionSteps = [
          "Nel tuo screenshot di Resend si vede che 'sititicino.ch' è verificato nel team 'sale.autoagent'",
          "La chiave API attualmente in uso è stata generata in un altro account/team (probabilmente il tuo 'Personal Account' o un altro progetto)",
          "Su resend.com, controlla il menu a tendina in alto a sinistra: assicurati che sia selezionato 'sale.autoagent'",
          "Clicca sulla voce 'API keys' nel menu laterale (sotto Domains)",
          "Clicca sul pulsante '+ Create API Key' o 'Add API Key', nominala (es. 'autosalesagent-sale') e seleziona 'Full access'",
          "Copia la nuova chiave 're_...' e salvala nella configurazione o aggiorna RESEND_API_KEY su Vercel",
        ];
      } else if (sititicinoDomain.status !== "verified") {
        diagnosticStatus = "unverified_domain";
        diagnosisMessage = `Il dominio 'sititicino.ch' è presente ma il suo stato è '${sititicinoDomain.status}' (non ancora 'verified').`;
        actionSteps = [
          "Vai su https://resend.com/domains e verifica lo stato dei record DNS per sititicino.ch",
        ];
      } else {
        diagnosticStatus = "ok";
        diagnosisMessage = `Configurazione perfetta! Il dominio 'sititicino.ch' è verificato (${sititicinoDomain.status}) e accessibile dalla chiave API (${maskedKey}).`;
      }
    }

    // 3. Optional: Test sending an actual email if testRecipient is requested
    let testEmailResult: any = null;
    const testRecipient = (body.testEmailTo || query.testEmailTo || "").toString().trim();
    if (testRecipient && testRecipient.includes("@")) {
      const fromAddress = "commerciale@sititicino.ch";
      const fromName = body.fromName || "Commerciale";
      const replyTo = "risposte@inbound.sititicino.ch";

      try {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [testRecipient],
            reply_to: replyTo,
            subject: "Test Invio Resend • Verifica Dominio sititicino.ch",
            html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #059669; margin-top: 0;">Test di Connessione Riuscito!</h2>
              <p>Questa email conferma che il dominio <strong>sititicino.ch</strong> e la chiave API Resend sono configurati correttamente.</p>
              <ul>
                <li><strong>Mittente:</strong> ${fromName} &lt;${fromAddress}&gt;</li>
                <li><strong>Destinatario:</strong> ${testRecipient}</li>
                <li><strong>Reply-To:</strong> ${replyTo}</li>
                <li><strong>Data invio:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>`,
          }),
        });

        const sendData = (await sendRes.json().catch(() => ({}))) as any;
        if (sendRes.ok) {
          testEmailResult = {
            success: true,
            messageId: sendData?.id,
            details: "Email di test inviata con successo via Resend API!",
          };
          diagnosticStatus = "ok";
          diagnosisMessage = `Invio email dal dominio sititicino.ch verificato e funzionante con successo via Resend API (Message ID: ${sendData?.id})!`;
        } else {
          testEmailResult = {
            success: false,
            error: sendData?.message || sendData?.error || `HTTP ${sendRes.status}`,
          };
        }
      } catch (sendErr: any) {
        testEmailResult = {
          success: false,
          error: sendErr?.message || "Errore durante l'invio dell'email di test",
        };
      }
    }

    return res.status(200).json({
      success: diagnosticStatus === "ok",
      diagnosticStatus,
      diagnosisMessage,
      keySource: isFromClient ? "client_override" : "server_env",
      maskedKey,
      keyLength: cleanKey.length,
      startsWithRe: cleanKey.startsWith("re_"),
      domainsHttpStatus,
      domainsFetchOk,
      domainsList: domainsList.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        region: d.region,
        created_at: d.created_at,
      })),
      hasSititicino: Boolean(sititicinoDomain),
      sititicinoStatus: sititicinoDomain ? sititicinoDomain.status : null,
      hasInbound: Boolean(inboundDomain),
      inboundStatus: inboundDomain ? inboundDomain.status : null,
      actionSteps,
      testEmailResult,
    });
  } catch (err: any) {
    console.error("[api/debug-resend] Errore imprevisto:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Errore imprevisto durante la diagnostica Resend",
    });
  }
}
