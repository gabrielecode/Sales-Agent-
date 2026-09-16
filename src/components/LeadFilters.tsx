import React, { useState } from 'react';
import { Platform, Language } from '../types';
import {
  Search,
  CheckSquare,
  Square,
  Upload,
  Trash2,
  SlidersHorizontal,
  RotateCcw,
  X,
} from 'lucide-react';

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
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  const activeFiltersCount =
    (platformFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0) +
    (languageFilter !== 'all' ? 1 : 0) +
    (minScoreFilter > 0 ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setPlatformFilter('all');
    setSourceFilter('all');
    setLanguageFilter('all');
    setMinScoreFilter(0);
    setSearchQuery('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs space-y-3 w-full">
      {/* Search Bar + Mobile Filter Toggle */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cerca negozio, email, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle button on mobile */}
        <button
          type="button"
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className={`sm:hidden p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition ${
            activeFiltersCount > 0 || showFiltersMobile
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
          aria-label="Filtri"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Selection buttons */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onSelectAllAboveThreshold}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] sm:text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            title="Seleziona contatti con score elevato"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xs:inline">Seleziona</span> Score &ge; Soglia
          </button>

          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] sm:text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 text-slate-600" />
              Deseleziona ({selectedCount})
            </button>
          ) : null}

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Elimina contatti selezionati"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Elimina ({selectedCount})
            </button>
          )}
        </div>

        {/* Data Management Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenCSVModal}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] sm:text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Importa file CSV direttamente dal tuo computer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carica CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenClearModal}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Cancella dati finti simulati o svuota tabella"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">
              {mockLeadsCount > 0 ? `Dati Finti (${mockLeadsCount})` : 'Svuota'}
            </span>
            <span className="sm:hidden">Cancella</span>
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-medium transition flex items-center gap-1"
              title="Azzera tutti i filtri"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Azzera filtri</span>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters Grid (Always visible on sm+, toggleable on mobile) */}
      <div
        className={`${
          showFiltersMobile ? 'grid' : 'hidden sm:grid'
        } grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 text-xs`}
      >
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Piattaforma</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full h-9 pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
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
            className="w-full h-9 pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
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
            className="w-full h-9 pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat shadow-2xs"
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
            <label className="text-[11px] font-medium text-slate-600">Minimo Score</label>
            <span className="text-[11px] font-bold text-slate-800 font-mono">{minScoreFilter}+</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(parseInt(e.target.value, 10))}
            className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

