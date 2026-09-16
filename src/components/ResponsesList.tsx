import React from 'react';
import { Lead, IntentClassification } from '../types';
import { MessageSquareReply, CheckCircle2, DollarSign, Clock, ArrowRight, Zap, Trophy, ShieldAlert } from 'lucide-react';

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

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareReply className="w-5 h-5 text-slate-700 shrink-0" />
            Inbound, Risposte & Pipeline di Vendita
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Gestisci le risposte ricevute, le trattative attive e la chiusura dei deal affiliati.
          </p>
        </div>

        <button
          onClick={onSimulateIncomingResponses}
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Simula Risposte Ricevute
        </button>
      </div>

      {contactedLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center text-slate-500 shadow-xs max-w-lg mx-auto">
          <Clock className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Nessun lead ancora contattato</h3>
          <p className="text-xs text-slate-500">Invia prima alcuni messaggi dal tab "Workflow Automation" per vedere qui le risposte e lo stato della pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {contactedLeads.map((lead) => (
            <div
              key={lead.id}
              className={`p-4 sm:p-5 rounded-xl border transition shadow-xs ${
                lead.status === 'won'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : lead.status === 'replied'
                  ? 'bg-purple-50/40 border-purple-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{lead.shopName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {lead.platform}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-blue-50 text-blue-700">
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {lead.email} • {lead.city || 'Svizzera'} ({lead.canton || 'CH'})
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                  {lead.status === 'replied' && (
                    <button
                      onClick={() => onTakeAction(lead.id, 'Invio Link & Condizioni')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Avanza a Negoziazione
                    </button>
                  )}

                  {(lead.status === 'in_negotiation' || lead.status === 'replied') && (
                    <button
                      onClick={() => onCloseOpportunity(lead.id, 75)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Chiudi Affiliazione Vinta (+CHF 75)
                    </button>
                  )}

                  {lead.status === 'won' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Affiliato Attivo (CHF {lead.opportunity?.revenueValue || 75})
                    </span>
                  )}
                </div>
              </div>

              {/* Response text box if replied */}
              {lead.response && (
                <div className="mt-3 bg-white/90 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Risposta ricevuta alle {lead.response.receivedAt}</span>
                    <span className="font-semibold text-purple-600 uppercase">Intento: {lead.response.intent}</span>
                  </div>
                  <p className="italic font-serif">"{lead.response.text}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

  );
};
