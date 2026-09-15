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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <ShieldAlert className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No leads match your current filter</h3>
        <p className="text-sm text-slate-500">Try adjusting your filters or generate a new batch of leads from the Configuration tab.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-12 text-center">Select</th>
              <th className="py-3.5 px-4">Shop / Profile</th>
              <th className="py-3.5 px-4">Platform</th>
              <th className="py-3.5 px-4">Business Signals</th>
              <th className="py-3.5 px-4">Need / Notes</th>
              <th className="py-3.5 px-4 text-center">Lead Score</th>
              <th className="py-3.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {leads.map((lead) => {
              const isDetailsOpen = activeScoreDetailLeadId === lead.id;
              const isHigh = lead.leadScore >= 75;
              const isMid = lead.leadScore >= 50 && lead.leadScore < 75;

              return (
                <React.Fragment key={lead.id}>
                  <tr className={`hover:bg-slate-800/40 transition ${lead.selected ? 'bg-indigo-950/20' : ''}`}>
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={lead.selected}
                        onChange={() => onToggleSelectLead(lead.id)}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>{lead.shopName}</span>
                        <a
                          href={lead.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-indigo-400 transition"
                          title="Open link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-semibold ${lead.source === 'csv' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                          {lead.source === 'csv' ? `CSV • ${lead.canton || 'CH'}` : lead.language}
                        </span>
                      </div>
                      {lead.email && (
                        <div className="text-[11px] text-indigo-300 font-mono mt-0.5">✉️ {lead.email}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          {lead.platform}
                        </span>
                        {lead.city && (
                          <div className="text-[11px] text-slate-400">📍 {lead.city} ({lead.canton})</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      {lead.source === 'csv' ? (
                        <div>🏢 {lead.industry || 'Enterprise'} • 📍 {lead.city || 'Switzerland'}</div>
                      ) : (
                        <div>📦 {lead.businessSignals.numProducts} products • ⭐ {lead.businessSignals.numReviews} rev</div>
                      )}
                      <div className="text-slate-500 mt-0.5">{lead.source === 'csv' ? `✉️ ${lead.email ? lead.email : 'No email listed'}` : `⏱️ ${lead.businessSignals.monthsActive} mos • 💰 ${lead.businessSignals.estimatedRevenue}`}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400 max-w-xs">
                      {lead.hasNeedSignal && (
                        <span className="inline-block px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded text-[10px] font-semibold mr-1 mb-1">
                          🔥 High Need Signal
                        </span>
                      )}
                      <p className="truncate" title={lead.shortNotes}>{lead.shortNotes}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                            isHigh
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : isMid
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {lead.leadScore}/100
                        </span>
                        <button
                          onClick={() => setActiveScoreDetailLeadId(isDetailsOpen ? null : lead.id)}
                          className="text-slate-500 hover:text-indigo-400 transition p-1"
                          title="Why this score?"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block capitalize ${
                          lead.status === 'discovered'
                            ? 'bg-slate-800 text-slate-300'
                            : lead.status === 'contacted' || lead.status === 'awaiting_reply'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                            : lead.status === 'replied'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                            : lead.status === 'in_negotiation'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            : lead.status === 'won'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable Score Breakdown Panel */}
                  {isDetailsOpen && (
                    <tr className="bg-slate-950/60 border-b border-slate-800">
                      <td colSpan={7} className="py-4 px-6">
                        <div className="bg-slate-900 border border-indigo-900/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <Info className="w-4 h-4 text-indigo-400" />
                              Scoring Breakdown for {lead.shopName} ({productName})
                            </h4>
                            <button
                              onClick={() => setActiveScoreDetailLeadId(null)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Close
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-400 block">Catalog Size ({lead.businessSignals.numProducts} items)</span>
                              <span className="text-white font-bold text-sm">+{lead.scoreBreakdown.productScore} pts</span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-400 block">Reviews ({lead.businessSignals.numReviews} revs)</span>
                              <span className="text-white font-bold text-sm">+{lead.scoreBreakdown.reviewScore} pts</span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-400 block">Tenure ({lead.businessSignals.monthsActive} mos)</span>
                              <span className="text-white font-bold text-sm">+{lead.scoreBreakdown.tenureScore} pts</span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-400 block">Need Signal ({lead.hasNeedSignal ? 'Yes' : 'No'})</span>
                              <span className="text-white font-bold text-sm">+{lead.scoreBreakdown.needScore} pts</span>
                            </div>
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-400 block">Keyword / Fit Match</span>
                              <span className="text-white font-bold text-sm">+{lead.scoreBreakdown.keywordScore} pts</span>
                            </div>
                          </div>
                          <p className="text-xs text-indigo-300/80 italic">
                            💡 Why it fits: {lead.shopName} has strong catalog activity and is a prime candidate for {productName} because of estimated revenue potential and search visibility needs.
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
