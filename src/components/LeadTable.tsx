import React, { useState } from 'react';
import { Lead } from '../types';
import { ExternalLink, Info, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onToggleSelectLead: (leadId: string) => void;
  productName: string;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onToggleSelectLead,
  productName,
}) => {
  const [activeScoreDetailLeadId, setActiveScoreDetailLeadId] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
        <ShieldAlert className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-900 mb-1">Nessun lead corrisponde ai filtri attuali</h3>
        <p className="text-xs text-slate-500">Prova a modificare i filtri di ricerca o genera una nuova batch di lead.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">Seleziona</th>
              <th className="py-3 px-4">Negozio / Profilo</th>
              <th className="py-3 px-4">Piattaforma</th>
              <th className="py-3 px-4">Segnali Business</th>
              <th className="py-3 px-4">Esigenze / Note</th>
              <th className="py-3 px-4 text-center">Lead Score</th>
              <th className="py-3 px-4 text-center">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {leads.map((lead) => {
              const isDetailsOpen = activeScoreDetailLeadId === lead.id;
              const isHigh = lead.leadScore >= 75;
              const isMid = lead.leadScore >= 50 && lead.leadScore < 75;

              return (
                <React.Fragment key={lead.id}>
                  <tr className={`hover:bg-slate-50/80 transition ${lead.selected ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={lead.selected}
                        onChange={() => onToggleSelectLead(lead.id)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{lead.shopName}</span>
                        <a
                          href={lead.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-900 transition"
                          title="Apri link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-medium ${lead.source === 'csv' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                          {lead.source === 'csv' ? `CSV • ${lead.canton || 'CH'}` : lead.language}
                        </span>
                      </div>
                      {lead.email && (
                        <div className="text-[11px] text-blue-600 font-mono mt-0.5">✉️ {lead.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {lead.platform}
                        </span>
                        {lead.city && (
                          <div className="text-[10px] text-slate-500">📍 {lead.city} ({lead.canton})</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.source === 'csv' ? (
                        <div>🏢 {lead.industry || 'Enterprise'} • 📍 {lead.city || 'Svizzera'}</div>
                      ) : (
                        <div>📦 {lead.businessSignals.numProducts} prodotti • ⭐ {lead.businessSignals.numReviews} rev</div>
                      )}
                      <div className="text-slate-400 text-[10px] mt-0.5">{lead.source === 'csv' ? `✉️ ${lead.email ? lead.email : 'Nessuna email'}` : `⏱️ ${lead.businessSignals.monthsActive} mesi • 💰 ${lead.businessSignals.estimatedRevenue}`}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">
                      {lead.hasNeedSignal && (
                        <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold mr-1 mb-1">
                          🔥 Alto Segnale
                        </span>
                      )}
                      <p className="truncate" title={lead.shortNotes}>{lead.shortNotes}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            isHigh
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isMid
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {lead.leadScore}/100
                        </span>
                        <button
                          onClick={() => setActiveScoreDetailLeadId(isDetailsOpen ? null : lead.id)}
                          className="text-slate-400 hover:text-slate-700 transition p-1"
                          title="Dettaglio Score"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-block capitalize ${
                          lead.status === 'discovered'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : lead.status === 'contacted' || lead.status === 'awaiting_reply'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : lead.status === 'replied'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : lead.status === 'in_negotiation'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : lead.status === 'won'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lead.status === 'discovered' ? 'Inactive' : lead.status === 'contacted' ? 'Active' : lead.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable Score Breakdown Panel */}
                  {isDetailsOpen && (
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={7} className="py-3 px-6">
                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-xs">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-blue-600" />
                              Analisi Scoring per {lead.shopName} ({productName})
                            </h4>
                            <button
                              onClick={() => setActiveScoreDetailLeadId(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                            >
                              Chiudi
                            </button>
                          </div>
                          <p className="text-xs text-slate-600">
                            Punteggio calcolato in base alla pertinenza della categoria, recensioni attive, traffico stimato e coerenza geografica (Svizzera/Europa).
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
