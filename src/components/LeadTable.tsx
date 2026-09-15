import React from 'react';
import { Lead } from '../types';
import { ExternalLink, Mail, Sparkles, MapPin, Trash2, Upload, RefreshCw, FileSpreadsheet } from 'lucide-react';

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
  const allSelected = leads.length > 0 && leads.every((l) => l.selected);

  if (leads.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
          <FileSpreadsheet className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Nessun contatto presente</h4>
          <p className="text-xs text-slate-500 mt-1">
            La tabella contatti è vuota. Puoi caricare un file CSV dal tuo computer con i tuoi contatti reali, oppure generare una lista di esempio per testare il sistema.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {onOpenCSVModal && (
            <button
              type="button"
              onClick={onOpenCSVModal}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Carica CSV dal PC
            </button>
          )}
          {onRegenerateMock && (
            <button
              type="button"
              onClick={onRegenerateMock}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
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
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4">Negozio / Creator</th>
            <th className="py-3 px-4">Piattaforma & Origine</th>
            <th className="py-3 px-4">Località</th>
            <th className="py-3 px-4">Segnali di Business</th>
            <th className="py-3 px-4 text-center">Lead Score</th>
            <th className="py-3 px-4 text-center">Stato</th>
            <th className="py-3 px-4 text-right">Azioni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => {
            const isHighScore = lead.leadScore >= 75;
            const isMediumScore = lead.leadScore >= 50 && lead.leadScore < 75;

            return (
              <tr
                key={lead.id}
                className={`hover:bg-slate-50/80 transition-colors ${
                  lead.selected ? 'bg-slate-50/50' : ''
                }`}
              >
                <td className="py-3.5 px-4">
                  <input
                    type="checkbox"
                    checked={lead.selected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {lead.shopName}
                      {lead.shopUrl && (
                        <a
                          href={lead.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-600"
                          title="Apri link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {lead.email && (
                      <span className="text-[11px] text-slate-600 font-mono">{lead.email}</span>
                    )}
                    <span className="text-[11px] text-slate-500 truncate max-w-xs">{lead.shortNotes}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
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

                <td className="py-3.5 px-4 text-slate-600">
                  <div className="flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{lead.city || 'Svizzera'} ({lead.canton || 'CH'})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{lead.language}</span>
                </td>

                <td className="py-3.5 px-4 text-[11px] text-slate-600">
                  <div>{lead.businessSignals.numReviews} recensioni • {lead.businessSignals.numProducts} prodotti</div>
                  <div className="text-[10px] text-slate-400 font-mono">{lead.businessSignals.estimatedRevenue}</div>
                </td>

                <td className="py-3.5 px-4 text-center">
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

                <td className="py-3.5 px-4 text-center">
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
                    {lead.status === 'won' ? 'Active Partner' : lead.status}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenOutreachForLead(lead.id)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1"
                      title="Apri pannello outreach"
                    >
                      <Mail className="w-3 h-3" />
                      Outreach
                    </button>
                    {onDeleteLead && (
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
  );
};
