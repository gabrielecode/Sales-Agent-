import React, { useState } from 'react';
import { Lead, ProductConfig } from '../types';
import { generateOutreachMessageWithAI } from '../lib/openrouter';
import { sendOutreachEmail } from '../lib/resendClient';
import { Sparkles, Send, CheckCircle2, RefreshCw, AlertCircle, Mail, Edit3 } from 'lucide-react';

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
  const [activeLeadIndex, setActiveLeadIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendStatus, setSendStatus] = useState<{ count: number; simulated: boolean } | null>(null);

  const currentLead = selectedLeads[activeLeadIndex] || selectedLeads[0];

  const handleGenerateMessageForCurrent = async () => {
    if (!currentLead) return;
    setIsGenerating(true);
    try {
      const msg = await generateOutreachMessageWithAI(currentLead, config);
      onUpdateLeadMessage(currentLead.id, msg.subject, msg.body);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllMessages = async () => {
    setIsGenerating(true);
    try {
      for (const lead of selectedLeads) {
        if (!lead.message?.body) {
          const msg = await generateOutreachMessageWithAI(lead, config);
          onUpdateLeadMessage(lead.id, msg.subject, msg.body);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAllSelected = async () => {
    setIsSending(true);
    setSendStatus(null);
    try {
      let simulated = true;
      for (const lead of selectedLeads) {
        if (lead.email) {
          const res = await sendOutreachEmail({
            to: lead.email,
            subject: lead.message?.subject || `Collaborazione con ${config.productName}`,
            body: lead.message?.body || 'Ciao...',
            config,
          });
          if (!res.simulated) simulated = false;
        }
      }
      onSendMessages(selectedLeads.map((l) => l.id));
      setSendStatus({ count: selectedLeads.length, simulated });
    } finally {
      setIsSending(false);
    }
  };

  if (selectedLeads.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
        <Mail className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-900 mb-1">Nessun lead selezionato per l'Outreach</h3>
        <p className="text-xs text-slate-500">Torna al tab "Contacts & Leads" e seleziona uno o più lead con la casella di spunta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-700" />
            Outreach AI & Invio Messaggi ({selectedLeads.length} Lead Selezionati)
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Genera messaggi ultra-personalizzati in base ai segnali di ogni negozio e inviali via email o canale partner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAllMessages}
            disabled={isGenerating}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Genera Testi per Tutti
          </button>
          <button
            onClick={handleSendAllSelected}
            disabled={isSending}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Invia Outreach ({selectedLeads.length})
          </button>
        </div>
      </div>

      {sendStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Outreach completato con successo per <b>{sendStatus.count} lead</b>!{' '}
              {sendStatus.simulated
                ? '(Modalità test simulata: configura Resend API Key per spedizione reale)'
                : '(Spedito realmente via Resend API)'}
            </span>
          </div>
        </div>
      )}

      {/* Editor & Lead Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Selected Leads List */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Coda Selezionati</span>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {selectedLeads.map((lead, idx) => (
              <button
                key={lead.id}
                onClick={() => setActiveLeadIndex(idx)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                  activeLeadIndex === idx
                    ? 'bg-slate-100 border-slate-300 font-semibold text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900">{lead.shopName}</div>
                  <div className="text-[10px] text-slate-500">{lead.platform} • {lead.city || 'CH'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold">
                    {lead.leadScore}/100
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{lead.status}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Active Lead Message Editor */}
        {currentLead && (
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{currentLead.shopName}</h4>
                <p className="text-xs text-slate-500">{currentLead.email ? `Destinatario: ${currentLead.email}` : 'Nessuna email salvata'}</p>
              </div>

              <button
                onClick={handleGenerateMessageForCurrent}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Rigenera con IA
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Oggetto Email</label>
              <input
                type="text"
                value={currentLead.message?.subject || ''}
                onChange={(e) => onUpdateLeadMessage(currentLead.id, e.target.value, currentLead.message?.body || '')}
                placeholder="Oggetto dell'email..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corpo del Messaggio</label>
              <textarea
                rows={10}
                value={currentLead.message?.body || ''}
                onChange={(e) => onUpdateLeadMessage(currentLead.id, currentLead.message?.subject || '', e.target.value)}
                placeholder="Clicca su 'Rigenera con IA' o scrivi qui il messaggio..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-sans text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
