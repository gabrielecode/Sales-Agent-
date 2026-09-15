import React from 'react';
import { Platform, Language } from '../types';
import { Search, Filter, CheckSquare, Square, RefreshCw } from 'lucide-react';

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
  onRefreshLeads,
  totalLeads,
  selectedCount,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search shops, companies or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={onSelectAllAboveThreshold}
            className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            Select Above Threshold ({selectedCount})
          </button>

          <button
            onClick={onDeselectAll}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            Deselect All
          </button>

          <button
            onClick={onRefreshLeads}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Generate New Batch ({totalLeads})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Source Filter</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="mock">Mock Leads (eCommerce)</option>
            <option value="csv">CSV Leads (Swiss / Custom)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter by Channel / Platform</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Platforms / Channels</option>
            <option value="Etsy">Etsy</option>
            <option value="Shopify">Shopify</option>
            <option value="Amazon KDP">Amazon KDP</option>
            <option value="eBay">eBay</option>
            <option value="Reddit">Reddit</option>
            <option value="Email (da CSV)">Email (da CSV)</option>
            <option value="Swiss Company">Swiss Company</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter by Language</label>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Languages</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
            <option value="it">IT</option>
            <option value="fr">FR</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex justify-between">
            <span>Min Lead Score Filter</span>
            <span className="text-indigo-400 font-semibold">{minScoreFilter} pts</span>
          </label>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(Number(e.target.value))}
            className="w-full accent-indigo-500 bg-slate-950 cursor-pointer h-1.5 rounded-lg mt-1"
          />
        </div>
      </div>
    </div>
  );
};
