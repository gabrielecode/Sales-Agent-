import React, { useState, useEffect } from 'react';
import { Lead, ProductConfig, FunnelStage } from '../types';
import { generateOutreachMessageWithAI } from '../lib/openrouter';
import { sendOutreachEmail } from '../lib/resendClient';
import { getFunnelStage, FUNNEL_STAGE_LABELS, FUNNEL_STAGE_COLORS, getFunnelStageDescription } from '../lib/funnelStage';
import {
  getDailySentCount,
  recordDailySentCount,
  getRemainingDailyQuota,
} from '../lib/quotaManager';
import {
  Sparkles,
  Send,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Mail,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface OutreachPanelProps {
  leads: Lead[];
  config: ProductConfig;
  onUpdateLeadMessage: (leadId: string, subject: string, body: string) => void;
  onSendMessages: (leadIds: string[]) => void;
}

interface SendReport {
  totalAttempted: number;
  succeeded: number;
  failed: number;
  simulated: boolean;
  errors: { shopName: string; email: string; error: string }[];
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
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendReport, setSendReport] = useState<SendReport | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [includeSuspiciousEmails, setIncludeSuspiciousEmails] = useState<boolean>(false);
  const [dailySent, setDailySent] = useState<number>(() => getDailySentCount());
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setDailySent(getDailySentCount());
  }, []);

  const dailyLimit = config.dailyOutreachLimit || 25;
  const remainingQuota = Math.max(0, dailyLimit - dailySent);

  // Filter out candidates
  const suspiciousLeads = selectedLeads.filter((l) => l.emailQuality === 'Sospetta');
  const alreadyContactedLeads = selectedLeads.filter((l) => l.status === 'contacted');
  const missingEmailLeads = selectedLeads.filter((l) => !l.email);

  const eligibleLeads = selectedLeads.filter((l) => {
    if (!l.email) return false;
    if (l.status === 'contacted') return false;
    if (!includeSuspiciousEmails && l.emailQuality === 'Sospetta') return false;
    return true;
  });

  const currentLead = selectedLeads[activeLeadIndex] || selectedLeads[0];

  const handleGenerateMessageForCurrent = async () => {
    if (!currentLead || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await generateOutreachMessageWithAI(currentLead, config);
      onUpdateLeadMessage(currentLead.id, res.subject, res.body);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllMessages = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      for (let i = 0; i < selectedLeads.length; i++) {
        const lead = selectedLeads[i];
        if (!lead.message?.body) {
          const res = await generateOutreachMessageWithAI(lead, config);
          onUpdateLeadMessage(lead.id, res.subject, res.body);
          // 350ms delay between sequential calls to prevent 429 rate limiting
          if (i < selectedLeads.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = () => {
    if (!currentLead?.message) return;
    const text = `Oggetto: ${currentLead.message.subject}\n\n${currentLead.message.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAllSelected = async () => {
    if (isSending) return; // Prevent double-clicks
    setQuotaError(null);
    setSendReport(null);

    const currentRemaining = getRemainingDailyQuota(dailyLimit);
    if (currentRemaining <= 0) {
      setQuotaError(`Hai raggiunto il limite massimo giornaliero di ${dailyLimit} email. Riprova domani o modifica il limite nelle impostazioni.`);
      return;
    }

    if (eligibleLeads.length === 0) {
      if (alreadyContactedLeads.length === selectedLeads.length && selectedLeads.length > 0) {
        setQuotaError('Tutti i contatti selezionati risultano già contattati.');
      } else if (!includeSuspiciousEmails && suspiciousLeads.length === selectedLeads.length) {
        setQuotaError('I contatti selezionati hanno indirizzi email con qualità Sospetta. Abilita la casella per inviare comunque.');
      } else {
        setQuotaError('Nessun contatto valido da inviare (verifica la presenza di indirizzi email).');
      }
      return;
    }

    // Limit batch size to available daily quota
    const batchToSend = eligibleLeads.slice(0, currentRemaining);

    setIsSending(true);
    setSendProgress({ current: 0, total: batchToSend.length });

    const succeededIds: string[] = [];
    const errors: { shopName: string; email: string; error: string }[] = [];
    let isAllSimulated = true;

    try {
      for (let i = 0; i < batchToSend.length; i++) {
        const lead = batchToSend[i];
        setSendProgress({ current: i + 1, total: batchToSend.length });

        const res = await sendOutreachEmail({
          to: lead.email!,
          subject: lead.message?.subject || `Collaborazione con ${config.productName}`,
          body: lead.message?.body || `Buongiorno ${lead.shopName}, vorremmo proporre una collaborazione commerciale.`,
          config,
        });

        if (res.success) {
          succeededIds.push(lead.id);
          if (!res.simulated) {
            isAllSimulated = false;
          }
        } else {
          errors.push({
            shopName: lead.shopName,
            email: lead.email!,
            error: res.error || 'Errore durante la trasmissione email',
          });
        }

        // Small pause between emails to avoid provider spikes
        if (i < batchToSend.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Update quota count in localStorage and state for successful sends only
      if (succeededIds.length > 0) {
        const newTotal = recordDailySentCount(succeededIds.length);
        setDailySent(newTotal);
        // Only mark successfully sent leads as contacted!
        onSendMessages(succeededIds);
      }

      setSendReport({
        totalAttempted: batchToSend.length,
        succeeded: succeededIds.length,
        failed: errors.length,
        simulated: isAllSimulated,
        errors,
      });

      if (batchToSend.length < eligibleLeads.length) {
        setQuotaError(`Nota: sono stati inviati solo ${batchToSend.length} messaggi perché la quota giornaliera rimanente era di ${currentRemaining}.`);
      }
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  if (selectedLeads.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center text-slate-500 shadow-xs max-w-lg mx-auto">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Nessun lead selezionato per l'Outreach</h3>
        <p className="text-xs text-slate-500">
          Torna al tab "Contacts & Leads" e seleziona uno o più lead con la casella di spunta per generare ed inviare messaggi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* Header with responsive actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-700 shrink-0" />
            Outreach AI & Invio Messaggi
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
              {selectedLeads.length} Selezionati
            </span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Genera messaggi personalizzati con formula HOOK + BODY + CTA e inviali proteggendo deliverability e quote.
          </p>
        </div>

        {/* Quota indicator and Buttons */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGenerateAllMessages}
            disabled={isGenerating || isSending}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generazione in corso...' : 'Genera per Tutti'}
          </button>
          <button
            type="button"
            onClick={handleSendAllSelected}
            disabled={isSending || isGenerating || eligibleLeads.length === 0 || remainingQuota <= 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            title={remainingQuota <= 0 ? 'Quota giornaliera esaurita' : `Invia a ${eligibleLeads.length} contatti idonei`}
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
            {isSending
              ? `Invio (${sendProgress?.current || 0}/${sendProgress?.total || eligibleLeads.length})...`
              : `Invia (${eligibleLeads.length})`}
          </button>
        </div>
      </div>

      {/* Quota and Deliverability Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Quota Giornaliera:{' '}
            <strong className="font-mono text-slate-900">{dailySent}</strong> /{' '}
            <span className="font-mono">{dailyLimit}</span> inviate oggi{' '}
            <span
              className={`font-semibold ${
                remainingQuota === 0
                  ? 'text-rose-600'
                  : remainingQuota < 5
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              ({remainingQuota} disponibili)
            </span>
          </span>
        </div>

        {/* Suspicious Email Toggle */}
        {suspiciousLeads.length > 0 && (
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
            <input
              type="checkbox"
              checked={includeSuspiciousEmails}
              onChange={(e) => setIncludeSuspiciousEmails(e.target.checked)}
              className="rounded text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Includi {suspiciousLeads.length} email con qualità 'Sospetta'
            </span>
          </label>
        )}
      </div>

      {/* Quota or Warning Banner */}
      {quotaError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>{quotaError}</div>
        </div>
      )}

      {/* Send Report Banner */}
      {sendReport && (
        <div
          className={`rounded-xl p-3.5 text-xs border ${
            sendReport.failed === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : sendReport.succeeded > 0
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {sendReport.failed === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold">
                  {sendReport.failed === 0
                    ? `Tutti i messaggi inviati con successo (${sendReport.succeeded} su ${sendReport.totalAttempted})!`
                    : `${sendReport.succeeded} inviate, ${sendReport.failed} fallite`}
                </span>
                <span className="ml-1.5 text-slate-600">
                  {sendReport.simulated
                    ? '(Modalità test simulata: configura Resend API Key per spedizione reale)'
                    : '(Spedito realmente via Resend API)'}
                </span>
                {sendReport.failed > 0 && (
                  <p className="mt-1 text-slate-600">
                    I contatti falliti non sono stati contrassegnati come inviati e rimangono pronti per un nuovo tentativo.
                  </p>
                )}
              </div>
            </div>

            {sendReport.errors.length > 0 && (
              <button
                type="button"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="font-medium underline hover:text-slate-900 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>{showErrorDetails ? 'Nascondi dettagli' : 'Vedi errori'}</span>
                {showErrorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {showErrorDetails && sendReport.errors.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 space-y-1.5 font-mono text-[11px]">
              {sendReport.errors.map((err, idx) => (
                <div key={idx} className="bg-white/80 p-2 rounded-lg border border-amber-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-semibold text-slate-800">{err.shopName} ({err.email}):</span>
                  <span className="text-rose-700">{err.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Horizontal Leads Selector (< lg) */}
      <div className="lg:hidden space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Seleziona contatto ({activeLeadIndex + 1}/{selectedLeads.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">Scorri per altri 👉</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
          {selectedLeads.map((lead, idx) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setActiveLeadIndex(idx)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-xs text-left transition flex items-center gap-2 cursor-pointer ${
                activeLeadIndex === idx
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="truncate max-w-[130px]">
                <div className="font-bold truncate">{lead.shopName}</div>
                <div className={`text-[10px] ${activeLeadIndex === idx ? 'text-slate-300' : 'text-slate-400'}`}>
                  {lead.platform}
                </div>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  activeLeadIndex === idx
                    ? 'bg-slate-800 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {lead.leadScore}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Lead Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Selected Leads List (Desktop lg+) */}
        <div className="hidden lg:block space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Coda Selezionati ({selectedLeads.length})
          </span>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
            {selectedLeads.map((lead, idx) => {
              const isEligible = eligibleLeads.some((el) => el.id === lead.id);
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setActiveLeadIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                    activeLeadIndex === idx
                      ? 'bg-slate-100 border-slate-300 font-semibold text-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{lead.shopName}</span>
                      {lead.status === 'contacted' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-normal">
                          Inviata
                        </span>
                      )}
                      {!lead.email && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-normal">
                          No email
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {lead.platform} • {lead.city || 'CH'}
                      {lead.emailQuality === 'Sospetta' && ' • (Email Sospetta)'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold">
                      {lead.leadScore}/100
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{lead.status}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Lead Message Editor */}
        {currentLead && (
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{currentLead.shopName}</h4>
                  {currentLead.toneOfVoice && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Tono: {currentLead.toneOfVoice} ({currentLead.toneOfVoice === 'Informale' ? 'Tu' : 'Lei'})
                    </span>
                  )}
                  {currentLead.emailQuality === 'Valida' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Email Sicura
                    </span>
                  )}
                  {currentLead.emailQuality === 'Sospetta' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Rischio Deliverability
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {currentLead.email ? `Destinatario: ${currentLead.email}` : 'Nessuna email salvata'} • Settore: {currentLead.industry || 'Non specificato'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Copia messaggio negli appunti"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copiato!' : 'Copia'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateMessageForCurrent}
                  disabled={isGenerating || isSending}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Rigenera con IA
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Oggetto Email</label>
              <input
                type="text"
                value={currentLead.message?.subject || ''}
                onChange={(e) => onUpdateLeadMessage(currentLead.id, e.target.value, currentLead.message?.body || '')}
                placeholder="Oggetto dell'email..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Corpo del Messaggio</label>
              <textarea
                rows={9}
                value={currentLead.message?.body || ''}
                onChange={(e) => onUpdateLeadMessage(currentLead.id, currentLead.message?.subject || '', e.target.value)}
                placeholder="Clicca su 'Rigenera con IA' o scrivi qui il messaggio..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-sans text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs resize-y min-h-[200px]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
