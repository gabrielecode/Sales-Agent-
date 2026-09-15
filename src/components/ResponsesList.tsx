import React, { useState } from 'react';
import { Lead, IntentClassification } from '../types';
import { simulateSimulatedResponses } from '../utils/mockData';
import { MessageSquareReply, CheckCircle, Clock, ArrowUpRight, Award, XCircle, Sparkles } from 'lucide-react';

interface ResponsesListProps {
  leads: Lead[];
  onSimulateIncomingResponses: () => void;
  onTakeAction: (leadId: string, actionName: string) => void;
  onCloseOpportunity: (leadId: string, revenue: number) => void;
}

export const ResponsesList: React.FC<ResponsesListProps> = ({
  leads,
  onSimulateIncomingResponses,
  onTakeAction,
  onCloseOpportunity,
}) => {
  const contactedLeads = leads.filter(
    (l) => l.status === 'contacted' || l.status === 'awaiting_reply' || l.status === 'replied' || l.status === 'in_negotiation' || l.status === 'won'
  );

  const [closingLeadId, setClosingLeadId] = useState<string | null>(null);
  const [customRevenue, setCustomRevenue] = useState<number>(49);

  const handleOpenCloseModal = (leadId: string) => {
    setClosingLeadId(leadId);
    setCustomRevenue(49);
  };

  const handleConfirmClose = (leadId: string) => {
    onCloseOpportunity(leadId, customRevenue);
    setClosingLeadId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquareReply className="w-6 h-6 text-indigo-400" />
              Responses, Pipeline & Closing
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Simulate incoming replies from leads, manage negotiations, and close deals into acquired clients.
            </p>
          </div>

          <button
            onClick={onSimulateIncomingResponses}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            Simulate Incoming Replies
          </button>
        </div>

        {contactedLeads.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <MessageSquareReply className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p className="text-base text-slate-300 font-medium">No active outreach or responses yet</p>
            <p className="text-sm mt-1">Send messages from the Outreach tab first, then simulate incoming replies here.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-6">
            {contactedLeads.map((lead) => {
              const intent = lead.response?.intent || 'Needs Nurturing';
              const isWon = lead.status === 'won';
              const isInNegotiation = lead.status === 'in_negotiation';

              return (
                <div
                  key={lead.id}
                  className={`border rounded-xl p-5 shadow-md transition ${
                    isWon
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : isInNegotiation
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{lead.shopName}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {lead.platform}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Score: {lead.leadScore} • {lead.businessSignals.estimatedRevenue}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {lead.response?.intent && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            intent === 'Interested'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : intent === 'Needs Nurturing'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          Intent: {intent}
                        </span>
                      )}

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                          isWon
                            ? 'bg-emerald-600 text-white'
                            : isInNegotiation
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        Status: {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Outreach Message Sent:</span>
                      <p className="text-xs text-slate-300 italic">"{lead.message?.body?.slice(0, 140)}..."</p>
                    </div>

                    <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Lead Response (Simulated):</span>
                      <p className="text-xs text-indigo-200 font-medium">
                        {lead.response?.text ? `"${lead.response.text}"` : '⏳ Awaiting reply (Simulated follow-up active)'}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Next Actions:</span>
                      <button
                        onClick={() => onTakeAction(lead.id, 'Send trial demo link')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                      >
                        Send Demo Link
                      </button>
                      <button
                        onClick={() => onTakeAction(lead.id, 'Propose 15 min call')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                      >
                        Propose 15m Call
                      </button>
                      <button
                        onClick={() => onTakeAction(lead.id, 'Send affiliate program info')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                      >
                        Affiliate Info
                      </button>
                    </div>

                    <div>
                      {!isWon ? (
                        <button
                          onClick={() => handleOpenCloseModal(lead.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow-md transition flex items-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Simulate Deal Won (Close)
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Won • CHF {lead.opportunity?.revenueValue || 49}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closing Modal */}
      {closingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Confirm Deal Won (Acquired Client / Partner)
            </h3>
            <p className="text-sm text-slate-400">
              Set the simulated revenue or commission value for this converted opportunity (in CHF).
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Simulated Revenue Value (CHF)</label>
              <input
                type="number"
                value={customRevenue}
                onChange={(e) => setCustomRevenue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setClosingLeadId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmClose(closingLeadId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-emerald-600/20"
              >
                Confirm & Add to Clients
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
