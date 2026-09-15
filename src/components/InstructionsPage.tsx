import React from 'react';
import { BookOpen, Sparkles, FileSpreadsheet, Settings, Users, Send, CheckCircle2, ShieldAlert, Key, HelpCircle } from 'lucide-react';

interface InstructionsPageProps {
  onStartTour: () => void;
  onGoToConfig: () => void;
}

export const InstructionsPage: React.FC<InstructionsPageProps> = ({ onStartTour, onGoToConfig }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/80 via-slate-900 to-slate-900 border border-indigo-800/60 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10">
          <BookOpen className="w-36 h-36 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 text-xs font-semibold border border-indigo-800">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Guida Ufficiale & Manuale Utente
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Manuale di Utilizzo: Affiliate Sales Agent
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Scopri come configurare il tuo agente di vendita autonomo, caricare liste di lead locali (Svizzera e mercati internazionali), generare messaggi personalizzati tramite OpenRouter e chiudere contratti e partnership.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onStartTour}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Avvia Guida Interattiva / Tour Guidato
            </button>
            <button
              onClick={onGoToConfig}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              Inizia la Configurazione Prodotto
            </button>
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Configurazione */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800/80 font-bold">
            1
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Configurazione del Prodotto & Obiettivo
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            L'agente è completamente <strong>product-agnostic</strong>. Inserisci qualsiasi URL di prodotto, SaaS, tool o programma di affiliazione.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>URL & Nome:</strong> Il link di destinazione e il nome commerciale del prodotto.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>4 Obiettivi Nativi:</strong> Vendita diretta, servizio done-for-you, reclutamento affiliati, vendita lead.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Soglia Lead Score:</strong> Filtra automaticamente i lead con punteggio inferiore al valore scelto (es. 70/100).</span>
            </li>
          </ul>
        </div>

        {/* Step 2: Caricamento CSV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/80 font-bold">
            2
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Caricamento Lead da CSV (SwissLeadFinder)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Puoi caricare file CSV con aziende o contatti. Il sistema mappa automaticamente le colonne e applica la logica di mercato locale svizzero.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
            company_name,website,email,city,canton,industry,notes<br />
            "Alpine Tech SA","https://alpinetech.ch","info@alpinetech.ch","Zürich","ZH","Software","AI tools"
          </div>
          <p className="text-[11px] text-emerald-400">
            🇨🇭 <strong>Logica Cantoni:</strong> ZH/BE/BS impostano la lingua in tedesco (DE), GE/VD in francese (FR), TI in italiano (IT).
          </p>
        </div>

        {/* Step 3: OpenRouter LLM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800/80 font-bold">
            3
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            Integrazione LLM con OpenRouter
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            L'app supporta chiamate reali a OpenRouter (es. Llama 3, Claude 3.5 Sonnet). Inserisci la tua API Key in configurazione per abilitare la generazione di copie personalizzate.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Se non inserisci una chiave, l'app utilizza un motore di simulazione intelligente basato su template multilingua.</span>
            </li>
          </ul>
        </div>

        {/* Step 4: Pipeline & ROI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/80 font-bold">
            4
          </div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Pipeline di Conversione & Dashboard ROI
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitora ogni fase dell'outreach: dall'invio dei messaggi alle risposte classificate dall'IA (Interessato, Da curare, Non interessato), fino alla chiusura dell'affare e calcolo ricavi.
          </p>
        </div>
      </div>

      {/* Deployment Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white">Pronto per il deploy su Vercel & Lovable</h4>
          <p className="text-xs text-slate-400 mt-1">
            Il codice è scritto in TypeScript rigoroso con Next.js (App Router) e Tailwind CSS, pronto per essere esportato su qualsiasi No-Code builder o container cloud.
          </p>
        </div>
        <button
          onClick={onGoToConfig}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition shrink-0"
        >
          Inizia Subito
        </button>
      </div>
    </div>
  );
};
