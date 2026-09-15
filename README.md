# Affiliate Sales Agent (Sales Agent)

Agente di vendita autonomo e multi-canale (Web App Full-Stack con React, Vite, Express, OpenRouter e Resend).

## 🚀 Panoramica delle Funzionalità
- **App Product-Agnostic**: Promuove qualsiasi prodotto, SaaS, agenzia o programma di affiliazione.
- **CSV Opzionale & Ricerca Autonoma**: Genera lead mock da marketplace (Etsy, Amazon KDP, Shopify, eBay, ecc.) anche senza caricare CSV, con stima di email di contatto o indicazione "Nessuna email".
- **4 Obiettivi Nativi**: Vendita diretta, servizio done-for-you, reclutamento affiliati, vendita lead.
- **Integrazione OpenRouter**: Generazione di copie di outreach personalizzate tramite LLM.
- **Integrazione Resend**: Invio di email transazionali reali o in modalità mock (simulata) quando manca la chiave API.
- **Interfaccia in Italiano**: Con tour interattivo e pagina istruzioni.

---

## 🛠️ Configurazione Ambiente (`.env`)

Crea un file `.env` basato su `.env.example`:

```env
# OPENROUTER_API_KEY: Chiave per generazione messaggi IA via OpenRouter
OPENROUTER_API_KEY="sk-or-..."

# RESEND_API_KEY: Chiave per invio email transazionali reali via Resend
RESEND_API_KEY="re_..."
EMAIL_FROM_NAME="Sales Agent"
EMAIL_FROM_ADDRESS="noreply@tuodominio.ch"

# URL di hosting
APP_URL="https://tuo-dominio.vercel.app"
```

---

## 📨 Come Configurare Resend (Invio Reale vs Mock)

1. **Modalità Mock (Default / Sviluppo)**:
   - Se non imposti `RESEND_API_KEY`, l'applicazione attiva automaticamente la **Modalità Mock**: le email vengono simulate con log in console e restituiscono esito positivo senza richiedere credenziali.

2. **Modalità Reale (Produzione)**:
   - Registrati su [Resend](https://resend.com).
   - Genera una **API Key** (`re_...`).
   - Verifica un tuo dominio su Resend (consigliato per evitare filtri antispam) e configura `EMAIL_FROM_ADDRESS` con un indirizzo del dominio verificato (es. `noreply@tuodominio.ch`).
   - In fase di test puoi usare l'indirizzo sandbox fornito da Resend.

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
