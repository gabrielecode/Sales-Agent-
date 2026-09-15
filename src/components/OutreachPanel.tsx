import React, { useState } from 'react';
import { Lead, ProductConfig } from '../types';
import { callOpenRouter } from '../lib/openrouter';
import { Sparkles, Send, CheckCircle2, Mail, Clock, MessageSquare, Key } from 'lucide-react';

interface OutreachPanelProps {
  leads: Lead[];
  config: ProductConfig;
  onUpdateLeadMessage: (leadId: string, subject: string, body: string) => void;
  onSendMessages: (leadIds: string[]) => void;
}

export const OutreachPanel: React.FC<OutreachPanelProps> = ({
  leads,
  config,
  onUpdateLeadMessage,
  onSendMessages,
}) => {
  const selectedLeads = leads.filter((l) => l.selected);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const hasKey = Boolean(localStorage.getItem('OPENROUTER_API_KEY'));
      for (const lead of selectedLeads) {
        const msg = await callOpenRouter(lead, config);
        onUpdateLeadMessage(lead.id, msg.subject, msg.body);
      }
      setIsGenerating(false);
      setSuccessMessage(hasKey ? 'Successfully generated outreach via OpenRouter API!' : 'Generated personalized messages using intelligent AI agent template!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleSimulateSendAll = () => {
    if (selectedLeads.length === 0) return;
    setIsSending(true);
    setTimeout(() => {
      onSendMessages(selectedLeads.map((l) => l.id));
      setIsSending(false);
      setSuccessMessage(`Successfully simulated sending outreach to ${selectedLeads.length} leads with automated follow-ups scheduled!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Automated Outreach & AI Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Review and customize outreach messages tailored to each lead's platform, language, and product needs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateAll}
              disabled={selectedLeads.length === 0 || isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generating AI Messages...' : `Generate Messages (${selectedLeads.length})`}
            </button>

            <button
              onClick={handleSimulateSendAll}
              disabled={selectedLeads.length === 0 || isSending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Simulating Send...' : 'Simulate Send & Follow-ups'}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-6 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            {successMessage}
          </div>
        )}

        {selectedLeads.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p className="text-base text-slate-300 font-medium">No leads currently selected for outreach</p>
            <p className="text-sm mt-1">Go to the "Discover Leads" tab and select leads or use "Select Above Threshold".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
            {selectedLeads.map((lead) => {
              const hasMessage = !!lead.message?.body;

              return (
                <div
                  key={lead.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{lead.shopName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {lead.platform}
                        </span>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-mono">
                          {lead.language}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-900/50">
                        Score: {lead.leadScore}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                      <span className="text-slate-300 font-medium block mb-0.5">Context & Need:</span>
                      {lead.shortNotes}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-400" />
                          Generated Outreach Message
                        </label>
                        {hasMessage && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={lead.message?.subject || ''}
                        onChange={(e) => onUpdateLeadMessage(lead.id, e.target.value, lead.message?.body || '')}
                        placeholder="Subject line..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs mb-2 focus:outline-none focus:border-indigo-500"
                      />
                      <textarea
                        rows={4}
                        value={lead.message?.body || ''}
                        onChange={(e) => onUpdateLeadMessage(lead.id, lead.message?.subject || '', e.target.value)}
                        placeholder="Click 'Generate Messages' above to let the AI agent write personalized copy..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lead.message?.sentAt ? `Sent at ${lead.message.sentAt}` : 'Follow-up: 2 & 5 days (Scheduled)'}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-medium capitalize ${
                        lead.status === 'contacted' || lead.status === 'awaiting_reply'
                          ? 'bg-blue-950 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
