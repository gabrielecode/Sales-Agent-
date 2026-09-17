import React, { useEffect } from 'react';
import { Lead, IntentClassification } from '../types';
import { MessageSquareReply, CheckCircle2, DollarSign, Clock, ArrowRight, Zap, Trophy, ShieldAlert, Radio } from 'lucide-react';

interface ResponsesListProps {
  leads: Lead[];
  onSimulateIncomingResponses: () => void;
  onTakeAction: (leadId: string, actionName: string) => void;
  onCloseOpportunity: (leadId: string, revenue: number) => void;
  onLeadReplied: (leadId: string, responseData: { text: string; receivedAt: string; intent: IntentClassification }) => void;
}

export const ResponsesList: React.FC<ResponsesListProps> = ({
  leads,
  onSimulateIncomingResponses,
  onTakeAction,
  onCloseOpportunity,
  onLeadReplied,
}) => {
  useEffect(() => {
    let isMounted = true;

    async function pollInboundEvents() {
      try {
        const res = await fetch('/api/webhooks/inbound-events');
        if (!res.ok) return;
        const data = await res.json();
        const events: any[] = data.events || [];
        if (events.length === 0 || !isMounted) return;

        const processedIds: string[] = [];

        events.forEach((event) => {
          const senderEmail = (event.senderEmail || '').trim().toLowerCase();
          const targetLead = leads.find(
            (l) => (l.email || '').trim().toLowerCase() === senderEmail
          );

          if (targetLead && targetLead.status !== 'replied' && targetLead.status !== 'won' && targetLead.status !== 'lost') {
            processedIds.push(event.id);
            const responseData = {
              text: event.text,
              receivedAt: new Date(event.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              intent: event.intent || 'interested',
            };
            onLeadReplied(targetLead.id, responseData);
          }
        });

        if (processedIds.length > 0) {
          await fetch('/api/webhooks/clear-inbound-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: processedIds }),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Errore polling eventi webhook inbound:', err);
      }
    }

    pollInboundEvents();
    const interval = setInterval(pollInboundEvents, 18000); // Poll every 18 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [leads, onLeadReplied]);

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
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              <Radio className="w-3 h-3 animate-pulse text-emerald-500" /> Webhook Live Polling Attivo
            </span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Ricevi automaticamente le risposte dai partner via webhook Resend in tempo reale, gestisci le trattative e chiudi i deal.
          </p>
        </div>

        <button
          type="button"
          onClick={onSimulateIncomingResponses}
          className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          title="Funzione di collaudo separata per testare l'interfaccia"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Simula Risposte Ricevute (Solo Test)
        </button>
      </div>

      {contactedLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center text-slate-500 shadow-xs max-w-lg mx-auto">
          <Clock className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Nessun lead ancora contattato</h3>
          <p className="text-xs text-slate-500">Invia prima alcuni messaggi dal tab "Workflow Automation" per ricevere risposte via webhook o simulazione.</p>
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
                      type="button"
                      onClick={() => onTakeAction(lead.id, 'Invio Link & Condizioni')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Avanza a Negoziazione
                    </button>
                  )}

                  {(lead.status === 'in_negotiation' || lead.status === 'replied') && (
                    <button
                      type="button"
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
