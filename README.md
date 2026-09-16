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

# URL di hosting
APP_URL="https://tuo-dominio.vercel.app"
```

---

## 📡 Endpoint API del Server

- **`POST /api/generate-message`**:
  - Riceve `{ lead, config }`
  - Utilizza la chiave OpenRouter da `config.openRouterApiKey` o `process.env.OPENROUTER_API_KEY`
  - Restituisce `{ subject, body }` con fallback locale automatico.
- **`POST /api/send-email`**:
  - Riceve `{ to, subject, body, config }`
  - Invia l'email tramite Resend (`config.resendApiKey` o `process.env.RESEND_API_KEY`).
  - Restituisce `{ success, simulated, messageId, error }`.

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
