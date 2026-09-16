import React, { useState } from 'react';
import { Lead } from '../types';
import {
  ExternalLink,
  Mail,
  Sparkles,
  MapPin,
  Trash2,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onOpenOutreachForLead: (id: string) => void;
  onDeleteLead?: (id: string) => void;
  onOpenCSVModal?: () => void;
  onRegenerateMock?: () => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onToggleSelect,
  onSelectAll,
  onOpenOutreachForLead,
  onDeleteLead,
  onOpenCSVModal,
  onRegenerateMock,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const allSelected = leads.length > 0 && leads.every((l) => l.selected);

  if (leads.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
          <FileSpreadsheet className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Nessun contatto presente</h4>
          <p className="text-xs text-slate-500 mt-1">
            La tabella contatti è vuota. Puoi caricare un file CSV dal tuo computer con i tuoi contatti reali, oppure generare una lista di esempio per testare il sistema.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full sm:w-auto">
          {onOpenCSVModal && (
            <button
              type="button"
              onClick={onOpenCSVModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Carica CSV dal PC
            </button>
          )}
          {onRegenerateMock && (
            <button
              type="button"
              onClick={onRegenerateMock}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Genera dati di prova
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {/* Mobile View Mode Switcher (< md) */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 text-xs">
        <span className="text-[11px] font-medium text-slate-500">
          Visualizzazione mobile:
        </span>
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            Schede
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3 h-3" />
            Tabella
          </button>
        </div>
      </div>

      {/* Compliance / Demo Data Notice */}
      {leads.some((l) => l.isMock) && (
        <div className="mx-4 my-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Avviso Dati Dimostrativi:</span> I profili contrassegnati con badge{' '}
            <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">demo</span>{' '}
            sono lead fittizi generati localmente per testare il flusso di scoring ed email. Non provengono da ricerche reali su marketplace e non devono essere usati per invii di massa reali prima di essere verificati o sostituiti con un file CSV.
          </div>
        </div>
      )}

      {/* 1. Mobile Cards View (Visible on < md when viewMode === 'cards') */}
      {viewMode === 'cards' && (
        <div className="md:hidden divide-y divide-slate-100">
          {leads.map((lead) => {
            const isHighScore = lead.leadScore >= 75;
            const isMediumScore = lead.leadScore >= 50 && lead.leadScore < 75;

            return (
              <div
                key={lead.id}
                className={`p-4 transition flex flex-col gap-3 ${
                  lead.selected ? 'bg-blue-50/30' : 'bg-white'
                }`}
              >
                {/* Header row: Checkbox, Name, Score */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <label className="p-1 -m-1 cursor-pointer flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={lead.selected}
                        onChange={() => onToggleSelect(lead.id)}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {lead.shopName}
                        </span>
                        {lead.shopUrl && (
                          <a
                            href={lead.shopUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Apri link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {lead.platform}
                        </span>
                        {lead.source === 'csv' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            CSV PC
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Simulato
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {lead.city || 'Svizzera'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs shadow-2xs ${
                      isHighScore
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isMediumScore
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {isHighScore && <Sparkles className="w-3 h-3 text-emerald-500" />}
                    {lead.leadScore}
                  </span>
                </div>

                {/* Email & Details */}
                <div className="text-xs space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  {lead.email ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-700 font-mono break-all">{lead.email}</span>
                      {lead.emailQuality === 'Valida' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Email Sicura
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Nessuna email registrata</span>
                  )}
                  {lead.shortNotes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">{lead.shortNotes}</p>
                  )}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span>{lead.businessSignals.numReviews} recensioni • {lead.businessSignals.numProducts} prodotti</span>
                    <span className="font-mono">{lead.businessSignals.estimatedRevenue}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      lead.status === 'won'
                        ? 'bg-emerald-100 text-emerald-800'
                        : lead.status === 'replied'
                        ? 'bg-purple-100 text-purple-800'
                        : lead.status === 'contacted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {lead.status === 'won' ? 'Partner Attivo' : lead.status}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenOutreachForLead(lead.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Outreach
                    </button>
                    {onDeleteLead && (
                      <button
                        type="button"
                        onClick={() => onDeleteLead(lead.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Desktop Table View (Always on md+, or on mobile when viewMode === 'table') */}
      <div className={`${viewMode === 'cards' ? 'hidden md:block' : 'block'} w-full overflow-x-auto custom-scrollbar`}>
        {viewMode === 'table' && (
          <div className="md:hidden px-4 py-1.5 bg-slate-100 text-[10px] text-slate-500 flex items-center justify-center">
            👉 Scorri orizzontalmente per vedere tutte le colonne
          </div>
        )}
        <table className="w-full text-left border-collapse text-xs min-w-[750px]">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                  title="Seleziona tutti"
                />
              </th>
              <th className="py-3 px-4 min-w-[200px]">Negozio / Creator</th>
              <th className="py-3 px-4 min-w-[140px]">Piattaforma & Origine</th>
              <th className="py-3 px-4 min-w-[120px]">Località</th>
              <th className="py-3 px-4 min-w-[160px]">Segnali di Business</th>
              <th className="py-3 px-4 text-center min-w-[90px]">Lead Score</th>
              <th className="py-3 px-4 text-center min-w-[100px]">Stato</th>
              <th className="py-3 px-4 text-right min-w-[120px]">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {leads.map((lead) => {
              const isHighScore = lead.leadScore >= 75;
              const isMediumScore = lead.leadScore >= 50 && lead.leadScore < 75;

              return (
                <tr
                  key={lead.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    lead.selected ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={lead.selected}
                      onChange={() => onToggleSelect(lead.id)}
                      className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">{lead.shopName}</span>
                        {lead.shopUrl && (
                          <a
                            href={lead.shopUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-600 shrink-0"
                            title="Apri link"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 flex-wrap my-0.5">
                          <span className="text-[11px] text-slate-600 font-mono truncate max-w-[180px]">
                            {lead.email}
                          </span>
                          {lead.emailQuality === 'Valida' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></span>
                              Sicura
                            </span>
                          )}
                          {lead.emailQuality === 'Sospetta' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0"></span>
                              Spam
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Nessuna email</span>
                      )}
                      <span className="text-[11px] text-slate-500 truncate max-w-[200px]">{lead.shortNotes}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {lead.platform}
                      </span>
                      {lead.source === 'csv' ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          CSV PC
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Simulato
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{lead.city || 'Svizzera'} ({lead.canton || 'CH'})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{lead.language}</span>
                  </td>

                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    <div className="truncate">{lead.businessSignals.numReviews} recensioni • {lead.businessSignals.numProducts} prodotti</div>
                    <div className="text-[10px] text-slate-400 font-mono">{lead.businessSignals.estimatedRevenue}</div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                        isHighScore
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isMediumScore
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isHighScore && <Sparkles className="w-3 h-3 text-emerald-500" />}
                      {lead.leadScore}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        lead.status === 'won'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lead.status === 'replied'
                          ? 'bg-purple-100 text-purple-800'
                          : lead.status === 'contacted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lead.status === 'won' ? 'Partner' : lead.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenOutreachForLead(lead.id)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1 cursor-pointer"
                        title="Apri pannello outreach"
                      >
                        <Mail className="w-3 h-3" />
                        Outreach
                      </button>
                      {onDeleteLead && (
                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Elimina questo contatto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

