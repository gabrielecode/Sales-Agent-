import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, ShieldCheck, Key, ArrowRight } from 'lucide-react';

export const InstructionsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700" />
          Guida Operativa & Architettura Funzionale
        </h3>
        <p className="text-slate-500 text-xs mt-1">
          Tutto quello che c'è da sapere sul funzionamento di Affiliate Sales Agent e sulle integrazioni reali vs simulate.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          1. Come Funziona la Ricerca Lead & Motore di Scoring
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          L'applicazione integra un motore interno di generazione lead mirato (<code>marketplaceLeadGenerator.ts</code>) basato su venditori reali tipici di mercati come Etsy, Amazon KDP, Shopify e canali social in Svizzera e nei mercati europei. Ogni lead viene valutato tramite un algoritmo multi-fattoriale (volume di recensioni, mesi di attività, presenza di bisogni dichiarati e corrispondenza linguistica/geografica).
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          In aggiunta, puoi importare in qualsiasi momento liste di lead reali esportati dai tuoi strumenti (Hunter.io, LinkedIn Sales Navigator, Google Sheets) tramite la funzionalità di <b>Upload CSV</b> nel tab Configurazione.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600" />
          2. Modalità Reale vs Modalità Simulazione
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">Outreach Email (Resend)</span>
            <p className="text-slate-500">
              Se inserisci la tua <b>Resend API Key</b> nella Configurazione, l'app invierà email reali verso gli indirizzi di contatto dei lead. Se lasci il campo vuoto, la spedizione funzionerà in modalità di simulazione sicura senza errori.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">AI Copywriting (OpenRouter)</span>
            <p className="text-slate-500">
              Se fornisci una chiave <b>OpenRouter</b>, i messaggi verranno scritti da modelli linguistici avanzati (Llama 3, Claude, Mistral). In assenza di chiave, interviene un motore di template multilingua (Italiano, Tedesco, Francese, Inglese) calibrato su conversioni B2B.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
