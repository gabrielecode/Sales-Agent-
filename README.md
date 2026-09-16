# Affiliate Sales Agent (Sales Agent)

Agente di vendita autonomo e multi-canale (Web App Full-Stack con React, Vite, Express, OpenRouter e Resend).

## ⚠️ Avviso Importante: Natura dei Lead Dimostrativi
I contatti generati automaticamente tramite la funzione "Genera Dati Demo" (`generateMarketplaceLeads()`) sono **dati sintetici e fittizi generati localmente** a puro scopo illustrativo (per testare lo scoring, l'editor messaggi e il flusso di invio).
- **NON rappresentano uno scraping reale** di negozi o venditori su marketplace terzi (Etsy, Amazon, Shopify, ecc.).
- Gli indirizzi email associati ai lead demo **non sono verificati**: **NON devono essere utilizzati per campagne di outreach reale**.
- Per avviare una campagna commerciale reale, esporta contatti dal tuo CRM/marketplace e caricali nell'applicazione utilizzando la funzione **"Carica CSV dal PC"**.

---

## 🚀 Panoramica delle Funzionalità
- **Architettura Full-Stack Protetta**: Tutte le chiamate verso OpenRouter e Resend passano dal backend Express (`/api/generate-message` e `/api/send-email`), proteggendo le chiavi segrete ed eliminando problemi di CORS.
- **App Product-Agnostic**: Promuove qualsiasi prodotto, SaaS, agenzia o programma di affiliazione con personalizzazione avanzata (Tono formale/informale, HOOK + BODY + CTA).
- **Gestione Lead Flessibile**: Supporta sia l'importazione di file CSV reali dal computer sia dati demo per test immediati.
- **Deliverability & Protezione Spam**: Identificazione qualità email (Sicura vs Sospetta), esclusione automatica dei contatti a rischio e tracciamento puntuale degli errori di invio per singolo destinatario.
- **Limite Giornaliero di Invio**: Contatore persistente salvato in `localStorage` con reset automatico ogni 24 ore per evitare superamento quote o penalizzazioni.
- **Integrazione OpenRouter con Fallback**: Generazione AI con modelli LLM remoti o template euristico locale ad alta conversione in caso di indisponibilità rete o assenza credenziali.
- **Integrazione Resend**: Invio email transazionali reali via API o simulazione in sandbox di collaudo.

---

## 🛠️ Configurazione Ambiente (`.env`)

Crea un file `.env` basato su `.env.example`:

```env
# OPENROUTER_API_KEY: Chiave per generazione messaggi IA via OpenRouter
OPENROUTER_API_KEY="sk-or-..."

# RESEND_API_KEY: Chiave per invio email transazionali reali via Resend
RESEND_API_KEY="re_..."
EMAIL_FROM_NAME="Sales Agent"
EMAIL_FROM_ADDRESS="noreply@sititicino.ch"
EMAIL_REPLY_TO="rispondi@inbound.sititicino.ch"

# URL di hosting
APP_URL="https://tuo-dominio.vercel.app"
```

---

## 📡 Endpoint API del Server

- **`POST /api/generate-message`**:
  - Riceve `{ lead, config }`
  - Utilizza la chiave OpenRouter da `config.openRouterApiKey` o `process.env.OPENROUTER_API_KEY`
  - Restituisce `{ subject, body }` con fallback locale automatico se la chiamata fallisce.
- **`POST /api/send-email`**:
  - Riceve `{ to, subject, body, config }`
  - Invia l'email tramite Resend (`config.resendApiKey` o `process.env.RESEND_API_KEY`) impostando un mittente dedicato (`noreply@sititicino.ch`) e un indirizzo di risposta separato per il webhook (`rispondi@inbound.sititicino.ch`).
  - Restituisce `{ success, simulated, messageId, error }`.

---

## 📨 Come Configurare Resend (Invio Reale vs Mock)

1. **Modalità Mock (Default / Sviluppo)**:
   - Se non imposti `RESEND_API_KEY`, l'applicazione attiva automaticamente la **Modalità Mock**: le email vengono simulate con log in console e restituiscono esito positivo senza richiedere credenziali.

2. **Modalità Reale (Produzione & DNS)**:
   - Registrati su [Resend](https://resend.com).
   - Genera una **API Key** (`re_...`).
   - Verifica il tuo dominio principale su Resend (`sititicino.ch`) per l'invio e configura `EMAIL_FROM_ADDRESS` con `noreply@sititicino.ch`.
   - Configura il sottodominio di ricezione (`inbound.sititicino.ch`) con i record DNS dedicati per i webhook Inbound di Resend e imposta `EMAIL_REPLY_TO` su `rispondi@inbound.sititicino.ch`.
   - In fase di test puoi usare l'indirizzo sandbox fornito da Resend (`onboarding@resend.dev`).

---

## 📦 Installazione e Avvio in Locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```

2. Avvia il server di sviluppo (Express + Vite):
   ```bash
   npm run dev
   ```

3. Apri il browser su `http://localhost:3000`.

---

## 🚢 Deploy su Vercel

1. Fai il push della repository su GitHub.
2. Importa il progetto su [Vercel](https://vercel.com).
3. Nelle impostazioni del progetto su Vercel, aggiungi le variabili d'ambiente:
   - `OPENROUTER_API_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM_NAME`
   - `EMAIL_FROM_ADDRESS`
4. Esegui il deploy con i comandi standard:
   - Build Command: `npm run build`
   - Start Command: `npm start`
