import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalLeadsCount: number;
  selectedLeadsCount: number;
  onClearAll: () => void;
  onClearSelected: () => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  totalLeadsCount,
  selectedLeadsCount,
  onClearAll,
  onClearSelected,
}) => {
  const [actionType, setActionType] = useState<'all' | 'selected'>(
    selectedLeadsCount > 0 ? 'selected' : 'all'
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (actionType === 'all') {
      onClearAll();
    } else if (actionType === 'selected') {
      onClearSelected();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Cancella Dati & Lead</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Scegli quali contatti desideri rimuovere dall’applicazione
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Options */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {selectedLeadsCount > 0 && (
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                actionType === 'selected'
                  ? 'border-rose-500 bg-rose-50/30'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="clear_choice"
                checked={actionType === 'selected'}
                onChange={() => setActionType('selected')}
                className="mt-1 text-rose-600 focus:ring-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Cancella solo i lead selezionati
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {selectedLeadsCount} selezionati
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rimuove soltanto i contatti attualmente contrassegnati con il checkbox nella tabella.
                </p>
              </div>
            </label>
          )}

          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
              actionType === 'all'
                ? 'border-rose-500 bg-rose-50/30'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="clear_choice"
              checked={actionType === 'all'}
              onChange={() => setActionType('all')}
              className="mt-1 text-rose-600 focus:ring-0"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Svuota tutti i contatti (Tabella vuota)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                  Tutti ({totalLeadsCount})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Azzera completamente l’elenco contatti per iniziare da zero e caricare un nuovo file CSV dal tuo computer.
              </p>
            </div>
          </label>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Questa operazione non potrà essere annullata, ma potrai sempre caricare un nuovo file CSV.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition text-center cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Conferma Eliminazione
          </button>
        </div>

      </div>
    </div>
  );
};
