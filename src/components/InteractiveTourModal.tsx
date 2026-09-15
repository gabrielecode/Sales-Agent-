import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Settings, FileSpreadsheet, Users, Send, BarChart3 } from 'lucide-react';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTestConfig: () => void;
}

const TOUR_STEPS = [
  {
    title: "Benvenuto in Affiliate Sales Agent",
    icon: Sparkles,
    color: "text-indigo-400 bg-indigo-950 border-indigo-800",
    description: "Questo agente di vendita autonomo trova attivamente potenziali clienti, li qualifica, genera messaggi di outreach personalizzati tramite OpenRouter e traccia l'intero funnel di conversione.",
    tip: "Funziona con qualsiasi prodotto, SaaS, agenzia o programma di affiliazione in qualsiasi lingua."
  },
  {
    title: "1. Configurazione del Prodotto",
    icon: Settings,
    color: "text-amber-400 bg-amber-950 border-amber-800",
    description: "Nella scheda 'Configuration', inserisci l'URL del tuo prodotto, il nome, una breve descrizione e seleziona il tipo di offerta (vendita diretta, servizio done-for-you, affiliati o lead).",
    tip: "Puoi anche inserire la tua OpenRouter API Key per abilitare la generazione LLM in produzione."
  },
  {
    title: "2. Caricamento Lead CSV (Svizzera)",
    icon: FileSpreadsheet,
    color: "text-emerald-400 bg-emerald-950 border-emerald-800",
    description: "Carica file CSV (es. estratti da SwissLeadFinder) con aziende svizzere. Il sistema riconosce automaticamente cantoni (ZH, GE, TI) e assegna la lingua corretta (DE, FR, IT).",
    tip: "Puoi usare sia lead mock generati automaticamente che lead CSV reali."
  },
  {
    title: "3. Scoperta & Lead Scoring",
    icon: Users,
    color: "text-purple-400 bg-purple-950 border-purple-800",
    description: "La tabella lead valuta ogni prospect assegnando un punteggio da 0 a 100 basato su segnali di business, dimensione del catalogo, recensioni e coerenza di settore.",
    tip: "Usa i filtri per visualizzare solo i lead sopra la soglia minima e selezionalur con un click."
  },
  {
    title: "4. Outreach & Dashboard ROI",
    icon: BarChart3,
    color: "text-blue-400 bg-blue-950 border-blue-800",
    description: "Genera messaggi di outreach personalizzati, simula l'invio con follow-up programmati e traccia le risposte e il fatturato chiuso nella dashboard finale.",
    tip: "Clicca su 'Carica Dati di Esempio' in configurazione per testare subito l'intera app!"
  }
];

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({
  isOpen,
  onClose,
  onLoadTestConfig,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const IconComponent = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onLoadTestConfig();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 pt-2">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition ${
                i <= currentStep ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4 text-center">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${step.color} shadow-lg`}>
            <IconComponent className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Passo {currentStep + 1} di {TOUR_STEPS.length}
            </span>
            <h3 className="text-xl font-bold text-white">{step.title}</h3>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed px-2">
            {step.description}
          </p>

          <div className="bg-indigo-950/50 border border-indigo-900/50 rounded-xl p-3 text-xs text-indigo-300 text-left flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span><strong>💡 Consiglio Pro:</strong> {step.tip}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Indietro
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            {currentStep === TOUR_STEPS.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Carica Dati di Test & Inizia
              </>
            ) : (
              <>
                Avanti
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
