# Affiliate Sales Agent (Sales Agent)

Agente di vendita autonomo e multi-canale (Web App Full-Stack con React, Vite, Express, OpenRouter e Resend) basato esclusivamente su contatti importati via CSV.

## 🚀 Panoramica delle Funzionalità
- **Architettura Full-Stack Protetta**: Tutte le chiamate verso OpenRouter e Resend passano dal backend Express (`/api/generate-message` e `/api/send-email`), proteggendo le chiavi segrete ed eliminando problemi di CORS.
- **App Product-Agnostic**: Promuove qualsiasi prodotto, SaaS, agenzia o programma di affiliazione con personalizzazione avanzata (Tono formale/informale, HOOK + BODY + CTA).
- **Importazione CSV Dedicata**: I lead vengono caricati direttamente da file CSV dal computer dell'utente, senza generazioni automatiche o dati fittizi.
- **Deliverability & Protezione Spam**: Identificazione qualità email (Sicura vs Sospetta), esclusione automatica dei contatti a rischio e tracciamento puntuale degli invii.
- **Limite Giornaliero di Invio**: Contatore persistente salvato in `localStorage` con reset automatico ogni 24 ore.
- **Integrazione OpenRouter con Fallback**: Generazione AI con modelli LLM remoti o template euristico locale ad alta conversione.
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

# Supabase configuration for persistent inbound webhook events
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# URL di hosting
APP_URL="https://tuo-dominio.vercel.app"
```

---

## 📡 Inbound Webhooks & Persistenza con Supabase
- **Storage Persistente Supabase (`inbound_events`)**: Gli eventi webhook in entrata ricevuti da Resend (`/api/webhooks/resend-inbound`) vengono salvati direttamente su una tabella PostgreSQL **Supabase** (`inbound_events`), garantendo la persistenza scalabile compatibile con ambienti serverless e distribuiti.
- **Schema Tabella Supabase (`inbound_events`)**:
  ```sql
  create table inbound_events (
    id text primary key,
    "from" text,
    "senderEmail" text,
    "to" text,
    "inReplyTo" text,
    subject text,
    text text,
    intent text,
    reason text,
    "receivedAt" text
  );
  ```
- **Polling Client-Side & Automazione Periodica**: Il tab "Inbound & Risposte" effettua il polling periodico degli eventi in entrata ogni 18 secondi, abbinandoli automaticamente ai lead per indirizzo email (`senderEmail`). L'autopilot periodico esegue l'analisi e l'invio automatizzato ogni 30 minuti mentre l'applicazione è aperta e attiva nel browser.

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
