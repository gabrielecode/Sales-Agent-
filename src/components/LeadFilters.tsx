import React from 'react';
import { Platform, Language } from '../types';
import { Search, CheckSquare, Square, Upload, Trash2, FileSpreadsheet } from 'lucide-react';

interface LeadFiltersProps {
  platformFilter: string;
  setPlatformFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  languageFilter: string;
  setLanguageFilter: (val: string) => void;
  minScoreFilter: number;
  setMinScoreFilter: (val: number) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSelectAllAboveThreshold: () => void;
  onDeselectAll: () => void;
  onRefreshLeads: () => void;
  totalLeads: number;
  selectedCount: number;
  mockLeadsCount: number;
  onOpenCSVModal: () => void;
  onOpenClearModal: () => void;
  onDeleteSelected: () => void;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  platformFilter,
  setPlatformFilter,
  sourceFilter,
  setSourceFilter,
  languageFilter,
  setLanguageFilter,
  minScoreFilter,
  setMinScoreFilter,
  searchQuery,
  setSearchQuery,
  onSelectAllAboveThreshold,
  onDeselectAll,
  totalLeads,
  selectedCount,
  mockLeadsCount,
  onOpenCSVModal,
  onOpenClearModal,
  onDeleteSelected,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Top action row: Search, Upload CSV, Clear/Delete Data, and selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cerca per nome negozio, email, parole chiave o note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload CSV from PC */}
          <button
            type="button"
            onClick={onOpenCSVModal}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Importa file CSV direttamente dal tuo computer"
          >
            <Upload className="w-3.5 h-3.5" />
            Carica CSV dal PC
          </button>

          {/* Delete fake/mock data or clear table */}
          <button
            type="button"
            onClick={onOpenClearModal}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Cancella dati finti simulati o svuota tabella"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {mockLeadsCount > 0 ? `Cancella Dati Finti (${mockLeadsCount})` : 'Svuota Contatti'}
          </button>

          {/* If items are selected, offer direct delete */}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Elimina contatti selezionati"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Elimina Selezionati ({selectedCount})
            </button>
          )}

          {/* Quick select buttons */}
          <button
            onClick={onSelectAllAboveThreshold}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            title="Seleziona lead con score elevato"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
            Seleziona Score &ge; Soglia
          </button>
          {selectedCount > 0 && (
            <button
              onClick={onDeselectAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 text-slate-600" />
              Deseleziona ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Piattaforma</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full h-9 pl-3 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
          >
            <option value="all">Tutte le Piattaforme</option>
            <option value="Etsy">Etsy</option>
            <option value="Amazon KDP">Amazon KDP</option>
            <option value="Shopify">Shopify</option>
            <option value="Instagram">Instagram</option>
            <option value="Web">Siti Web / Blog</option>
            <option value="LinkedIn">LinkedIn</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Origine Dati</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full h-9 pl-3 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
          >
            <option value="all">Tutte le Fonti</option>
            <option value="csv">Importati da CSV (PC)</option>
            <option value="auto">Generati / Finti (Demo)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Lingua Mercato</label>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="w-full h-9 pl-3 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
          >
            <option value="all">Tutte le Lingue</option>
            <option value="it">Italiano (TI / IT)</option>
            <option value="de">Tedesco (ZH / BE / DE)</option>
            <option value="fr">Francese (GE / VD / FR)</option>
            <option value="en">Inglese (Globale)</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-500">Minimo Score</label>
            <span className="text-[11px] font-bold text-slate-700">{minScoreFilter}+</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(parseInt(e.target.value, 10))}
            className="w-full accent-slate-900 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
