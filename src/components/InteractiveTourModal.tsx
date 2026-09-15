import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, X } from 'lucide-react';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveTourModal: React.FC<InteractiveTourModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Benvenuto in Affiliate Sales Agent',
      desc: 'La tua piattaforma intelligente per scoprire creator e venditori su Etsy, Amazon KDP e Shopify, automatizzare l’outreach e monitorare le conversioni dei partner.',
    },
    {
      title: '1. Tabella Lead con Scoring Intelligente',
      desc: 'Ogni lead riceve un punteggio da 1 a 100 in base a recensioni, anzianità e affinità con il tuo prodotto. Seleziona i contatti migliori per avviare il flusso.',
    },
    {
      title: '2. Outreach AI & Invio Email',
      desc: 'Genera email altamente personalizzate con l’AI e spediscile con un click tramite Resend o in modalità test.',
    },
    {
      title: '3. Gestione Risposte & Pipeline',
      desc: 'Segui le risposte dei creator, fai follow-up e chiudi partnership ad alto rendimento!',
    },
  ];

  const current = tourSteps[step];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">PASSO {step + 1} DI {tourSteps.length}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">{current.title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{current.desc}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition ${idx === step ? 'bg-slate-900' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Indietro
              </button>
            )}
            {step < tourSteps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                Avanti <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                Inizia a Esplorare <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
