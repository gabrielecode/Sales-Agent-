import React, { useState, useEffect } from 'react';
import { ProductConfig, OfferType } from '../types';
import { getFunnelAssetsForOfferType } from '../utils/mockData';
import { Settings, Save, Upload, Zap, CheckCircle2, Bot, Play, Layers, Sparkles, Clock, BookOpen, FileCheck, Award } from 'lucide-react';

interface ProductConfigFormProps {
  config: ProductConfig;
  onSaveConfig: (config: ProductConfig) => void;
  onUploadCSV: (csvText: string, replace?: boolean) => void;
  leadsCount: number;
  onOpenCSVModal?: () => void;
  onTriggerAutopilot?: () => Promise<void>;
  isAutopilotRunning?: boolean;
  autopilotMessage?: string | null;
  onNavigateToOutreach?: () => void;
  onRegenerateAllLeadsWithConfig?: (newConfig: ProductConfig) => void;
}

export const ProductConfigForm: React.FC<ProductConfigFormProps> = ({
  config,
  onSaveConfig,
  onUploadCSV,
  leadsCount: _leadsCount,
  onOpenCSVModal,
  onTriggerAutopilot,
  isAutopilotRunning = false,
  autopilotMessage = null,
  onNavigateToOutreach,
  onRegenerateAllLeadsWithConfig,
}) => {
  const [formData, setFormData] = useState<ProductConfig>({
    ...config,
    funnelAssets: config.funnelAssets || getFunnelAssetsForOfferType(config.offerType),
  });
  const [csvInput, setCsvInput] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<any | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    openRouterConfigured: boolean;
    resendConfigured: boolean;
    emailFromConfigured: boolean;
    emailFromAddress: string;
    emailFromDisplay: string;
    emailReplyToConfigured: boolean;
    emailReplyToAddress: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/config-status')
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCsvSubmit = () => {
    if (csvInput.trim()) {
      onUploadCSV(csvInput, false);
      setCsvInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onUploadCSV(text, false);
      };
      reader.readAsText(file);
    }
  };

  const updateFunnelStageAssets = (stage: 'awareness' | 'evaluation' | 'purchase', textValue: string) => {
    const lines = textValue
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      funnelAssets: {
        awareness: prev.funnelAssets?.awareness || [],
        evaluation: prev.funnelAssets?.evaluation || [],
        purchase: prev.funnelAssets?.purchase || [],
        [stage]: lines,
      },
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Configurazione Prodotto & Parametri di Outreach
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Definisci le caratteristiche del prodotto affiliato, commissioni, automazione autopilot e funnel di contenuti.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Product Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dettagli Offerta</h4>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome Prodotto / Offerta</label>
              <input
                type="text"
                required
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            {/* URL AI Product Analyzer */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Analisi Automatica URL Prodotto (AI)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://tuosito.com/landing-page"
                  value={formData.productUrl || ''}
                  onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isAnalyzing || !formData.productUrl}
                  onClick={async () => {
                    if (!formData.productUrl) return;
                    setIsAnalyzing(true);
                    setAnalysisError(null);

                    const rawUrl = formData.productUrl.trim();
                    const effectiveUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                    const apiKey = formData.openRouterApiKey || config.openRouterApiKey;
                    const model = formData.openRouterModel || config.openRouterModel || 'openai/gpt-4o-mini';

                    let analysis: any = null;
                    let usedFallback = false;

                    try {
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 25000);
                      const res = await fetch('/api/analyze-product', {
                        method: 'POST',
                        signal: controller.signal,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          url: effectiveUrl,
                          openRouterApiKey: apiKey,
                          openRouterModel: model,
                        }),
                      });
                      clearTimeout(timeoutId);
                      const contentType = res.headers.get("content-type");
                      let data: any = {};
                      if (contentType && contentType.includes("application/json")) {
                        data = await res.json();
                      } else {
                        const text = await res.text();
                        try {
                          data = JSON.parse(text);
                        } catch {
                          data = { error: `Server error: ${text.slice(0, 100)}` };
                        }
                      }

                      if (res.ok && data.analysis) {
                        analysis = data.analysis;
                      }
                    } catch (serverErr) {
                      console.warn("Chiamata API /api/analyze-product fallita o timeout, tentativo fallback:", serverErr);
                    }

                    // Client-side fallback if server fails or returns error
                    if (!analysis && apiKey) {
                      try {
                        const prompt = `Analizza questo URL/prodotto: ${effectiveUrl}. Estrai in formato JSON: productName, valueProposition (1-2 frasi), keyFeatures (array di 3 stringhe), targetAudience, offerType (software | digital_product | affiliate | collab | sponsorship), tone. Rispondi solo in JSON.`;
                        const aiController = new AbortController();
                        const aiTimeoutId = setTimeout(() => aiController.abort(), 8000);
                        const directRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                          method: 'POST',
                          signal: aiController.signal,
                          headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'Affiliate Sales Agent',
                          },
                          body: JSON.stringify({
                            model,
                            messages: [{ role: 'user', content: prompt }],
                            temperature: 0.2,
                          }),
                        });
                        clearTimeout(aiTimeoutId);
                        if (directRes.ok) {
                          const directData = await directRes.json();
                          const content = directData.choices?.[0]?.message?.content || '';
                          const jsonMatch = content.match(/\{[\s\S]*\}/);
                          if (jsonMatch) {
                            analysis = JSON.parse(jsonMatch[0]);
                          }
                        }
                      } catch (aiErr) {
                        console.warn("Fallback AI diretto fallito:", aiErr);
                      }
                    }

                    // Domain heuristic fallback if still no analysis
                    if (!analysis) {
                      usedFallback = true;
                      try {
                        const parsed = new URL(effectiveUrl.startsWith('http') ? effectiveUrl : `https://${effectiveUrl}`);
                        const host = parsed.hostname.replace(/^www\./, '');
                        const namePart = host.split('.')[0];
                        const cleanName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                        const isSwiss = host.endsWith('.ch');
                        analysis = {
                          productName: cleanName,
                          valueProposition: `${cleanName} — Piattaforma e soluzione ${isSwiss ? 'svizzera ' : ''}dedicata a professionisti e imprese.`,
                          keyFeatures: [
                            'Accesso rapido e gestione centralizzata dei flussi',
                            'Piattaforma moderna, scalabile e sicura',
                            'Assistenza clienti e supporto dedicato',
                          ],
                          targetAudience: isSwiss ? 'PMI, aziende e professionisti in Svizzera' : 'PMI e professionisti',
                          offerType: 'software',
                          tone: 'Professionale e orientato al valore',
                        };
                      } catch {
                        analysis = {
                          productName: formData.productName || 'Prodotto Digitale',
                          valueProposition: formData.productDescription || 'Soluzione specializzata per ottimizzare i flussi di business.',
                          keyFeatures: ['Efficienza operativa', 'Flessibilità', 'Supporto dedicato'],
                          targetAudience: formData.targetAudience || 'PMI e professionisti',
                          offerType: 'software',
                          tone: 'Professionale',
                        };
                      }
                    }

                    try {
                      const derivedName = analysis.productName || formData.productName || 'Nuovo Prodotto';
                      const derivedValProp = analysis.valueProposition || formData.productDescription;
                      const derivedTarget = analysis.targetAudience || formData.targetAudience;
                      const derivedOffer = analysis.offerType || formData.offerType || 'digital_product';

                      const hasValidFunnelAssets =
                        analysis?.funnelAssets &&
                        Array.isArray(analysis.funnelAssets.awareness) &&
                        analysis.funnelAssets.awareness.length > 0 &&
                        Array.isArray(analysis.funnelAssets.evaluation) &&
                        analysis.funnelAssets.evaluation.length > 0 &&
                        Array.isArray(analysis.funnelAssets.purchase) &&
                        analysis.funnelAssets.purchase.length > 0;

                      const newAssets = hasValidFunnelAssets
                        ? analysis.funnelAssets
                        : {
                            awareness: [
                              `Guida introduttiva e best practice per ${derivedName}`,
                              `Report e analisi: come ${derivedName} risolve le criticità di settore`,
                            ],
                            evaluation: [
                              `Demo video interattiva e panoramica delle feature di ${derivedName}`,
                              `Confronto ROI, scheda tecnica e casi studio per ${derivedName}`,
                            ],
                            purchase: [
                              `Link di attivazione e onboarding prioritario per ${derivedName}: ${effectiveUrl}`,
                              `Consulenza personalizzata e configurazione guidata per ${derivedName}`,
                            ],
                          };

                      const updatedConfig: ProductConfig = {
                        ...formData,
                        productName: derivedName,
                        productDescription: derivedValProp,
                        targetAudience: derivedTarget,
                        offerType: derivedOffer,
                        productUrl: effectiveUrl,
                        productAnalysis: {
                          ...analysis,
                          productName: derivedName,
                          sourceUrl: effectiveUrl,
                        },
                        funnelAssets: newAssets,
                      };

                      setFormData(updatedConfig);
                      onSaveConfig(updatedConfig);
                      setPendingAnalysis(analysis);
                      setSaveSuccess(true);
                      if (usedFallback) {
                        setAnalysisError("Analisi completata estraendo i dati chiave dal dominio. Puoi verificare e modificare i dettagli generati sotto.");
                      } else {
                        setAnalysisError(null);
                      }
                      setTimeout(() => setSaveSuccess(false), 4000);
                    } catch (err: any) {
                      setAnalysisError(err.message || 'Errore durante il salvataggio dei dati');
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analizzando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Analizza URL
                    </>
                  )}
                </button>
              </div>
              {analysisError && (
                <p className={`text-[11px] font-medium ${analysisError.startsWith("Analisi completata") ? "text-amber-700 bg-amber-50 border border-amber-200/80 p-2 rounded-lg" : "text-rose-600"}`}>
                  {analysisError}
                </p>
              )}

              {pendingAnalysis && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-950 border-b border-emerald-200/70 pb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Dati Estratti & Applicati alla Configurazione!
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full">
                      Attivo per generazione email
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Prodotto Rilevato:</span>
                    <p className="text-slate-900 font-semibold mt-0.5">{formData.productName}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Proposta di Valore:</span>
                    <p className="text-slate-700 mt-0.5">{formData.productDescription}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Feature Chiave da includere nelle email:</span>
                    <ul className="list-disc list-inside text-slate-700 mt-0.5 space-y-0.5">
                      {pendingAnalysis.keyFeatures?.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div><span className="font-semibold text-slate-700">Target:</span> {formData.targetAudience}</div>
                    <div><span className="font-semibold text-slate-700">Tono:</span> {pendingAnalysis.tone || 'Professionale'}</div>
                    {pendingAnalysis.pricingHint && (
                      <div className="col-span-2 text-indigo-800 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                        <span className="font-semibold">Info Prezzo / Offerta:</span> {pendingAnalysis.pricingHint}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Shortcuts to Outreach */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-emerald-200/70">
                    {onRegenerateAllLeadsWithConfig && (
                      <button
                        type="button"
                        onClick={() => onRegenerateAllLeadsWithConfig(formData)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Rigenera Email di Tutti i Lead con questo Prodotto
                      </button>
                    )}
                    {onNavigateToOutreach && (
                      <button
                        type="button"
                        onClick={onNavigateToOutreach}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition flex items-center gap-1.5"
                      >
                        Vai all'Outreach
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingAnalysis(null)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Chiudi Scheda
                    </button>
                  </div>
                </div>
              )}

              {formData.productAnalysis && !pendingAnalysis && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Analisi attiva per <strong>{formData.productName}</strong> ({formData.productAnalysis.keyFeatures?.length || 0} feature chiave registrate)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAnalysis(formData.productAnalysis)}
                      className="text-emerald-800 hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Visualizza
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, productAnalysis: undefined })}
                      className="text-slate-400 hover:text-rose-600 underline text-[10px] cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Descrizione & Proposta di Valore</label>
              <textarea
                rows={3}
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo Offerta</label>
                <select
                  value={formData.offerType}
                  onChange={(e) => {
                    const newType = e.target.value as OfferType;
                    setFormData({
                      ...formData,
                      offerType: newType,
                      funnelAssets: getFunnelAssetsForOfferType(newType),
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="affiliate">Affiliazione (% sulle vendite)</option>
                  <option value="digital_product">Prodotto Digitale / Corso</option>
                  <option value="sponsorship">Sponsorship / Post Sponsorizzato</option>
                  <option value="software">SaaS / Tool Software</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {(formData.offerType === 'digital_product' || formData.offerType === 'software')
                    ? 'Prezzo/Piano (opzionale)'
                    : 'Commissione / Payout'}
                </label>
                <input
                  type="text"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pubblico Target</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Categoria Merceologica / Settore Predefinito
                </label>
                <span className="text-[10px] text-indigo-600 font-medium">Personalizza l'Hook dell'Email</span>
              </div>
              <input
                type="text"
                placeholder="es. Alimentare & Enogastronomia, Moda & Accessori, Casa & Arredamento, Artigianato..."
                value={formData.targetMerchandiseCategory || ''}
                onChange={(e) => setFormData({ ...formData, targetMerchandiseCategory: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Pittura & Imbiancatura',
                  'Idraulica & Termoidraulica',
                  'Pulizie & Multiservizi',
                  'Edilizia & Ristrutturazioni',
                  'Elettricisti & Impianti Elettrici',
                  'Falegnameria & Serramenti',
                  'Giardinaggio & Manutenzione Verde',
                  'Alimentare & Enogastronomia',
                  'Moda & Accessori',
                  'Casa & Arredamento',
                  'Bellezza & Cosmetica',
                  'Artigianato & Fatto a Mano',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, targetMerchandiseCategory: cat })}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      formData.targetMerchandiseCategory === cat
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Utilizzata per personalizzare l'Hook di apertura email per i contatti privi di categoria esplicita, eliminando formule generiche o fisse.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Limite Giornaliero Invii</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={formData.dailyOutreachLimit || 25}
                  onChange={(e) => setFormData({ ...formData, dailyOutreachLimit: Math.max(1, parseInt(e.target.value) || 25) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Blocca l'invio al superamento della quota odierna.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Score Minimo Lead</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.minLeadScore || 65}
                  onChange={(e) => setFormData({ ...formData, minLeadScore: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Soglia per identificare profili idonei ad Autopilot.</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI & Integrations */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Integrazioni API & Provider</h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                OpenRouter API Key (per generazione testi con LLM reali)
              </label>
              {serverStatus?.openRouterConfigured ? (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-semibold">✅ Configurata su Vercel (server-side)</span>
                  <span className="text-[10px] text-emerald-600 font-mono">OPENROUTER_API_KEY attiva</span>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={formData.openRouterApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, openRouterApiKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-[10px] text-amber-600 mt-0.5 block">
                    ⚠️ Chiave inserita qui verrà salvata solo nel tuo browser (localStorage), usala solo per test locali. In produzione configura le variabili d'ambiente su Vercel.
                  </span>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Modello LLM OpenRouter</label>
              <input
                type="text"
                value={formData.openRouterModel || 'meta-llama/llama-3-8b-instruct:free'}
                onChange={(e) => setFormData({ ...formData, openRouterModel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resend API Key (per invio reale email)
              </label>
              {serverStatus?.resendConfigured ? (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-semibold">✅ Configurata su Vercel (server-side)</span>
                  <span className="text-[10px] text-emerald-600 font-mono">RESEND_API_KEY attiva</span>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder="re_..."
                    value={formData.resendApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, resendApiKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-[10px] text-amber-600 mt-0.5 block">
                    ⚠️ Chiave inserita qui verrà salvata solo nel tuo browser (localStorage), usala solo per test locali. In produzione configura le variabili d'ambiente su Vercel.
                  </span>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mittente Email (From)
              </label>
              {serverStatus?.emailFromConfigured ? (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-medium">Mittente: {serverStatus.emailFromDisplay || serverStatus.emailFromAddress} — configurato su Vercel</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nome Mittente (es. Sales Agent)"
                    value={formData.emailFromName || ''}
                    onChange={(e) => setFormData({ ...formData, emailFromName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 mb-1"
                  />
                  <input
                    type="text"
                    placeholder="noreply@sititicino.ch"
                    value={formData.emailFromAddress || ''}
                    onChange={(e) => setFormData({ ...formData, emailFromAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Usa EMAIL_FROM_ADDRESS o onboarding@resend.dev come fallback se vuoto.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Indirizzo di Risposta (Reply-To)
              </label>
              {serverStatus?.emailReplyToConfigured ? (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-medium">Reply-To: {serverStatus.emailReplyToAddress} — configurato su Vercel</span>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="risposte@inbound.sititicino.ch"
                    value={formData.emailReplyTo || ''}
                    onChange={(e) => setFormData({ ...formData, emailReplyTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Indirizzo dove arrivano le risposte dei lead (dominio dedicato alla ricezione, diverso dal mittente).</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PARTE A: Autopilot Section */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  Autopilot Outbound (Invio Automatico Proattivo)
                  {formData.autoOutreach ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ATTIVO
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-white/10 text-slate-300">
                      DISATTIVO
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  L'agent analizza i lead scoperti con punteggio ≥ {formData.minLeadScore}, genera messaggi in fase Awareness e invia automaticamente rispettando la quota giornaliera.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.autoOutreach || false}
                onChange={(e) => setFormData({ ...formData, autoOutreach: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {formData.lastAutoRunAt
                  ? `Ultimo ciclo eseguito: ${new Date(formData.lastAutoRunAt).toLocaleString('it-IT')}`
                  : 'Nessun ciclo autopilot ancora eseguito'}
              </span>
            </div>

            {onTriggerAutopilot && (
              <button
                type="button"
                onClick={onTriggerAutopilot}
                disabled={isAutopilotRunning}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg font-medium transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                <Play className={`w-3 h-3 ${isAutopilotRunning ? 'animate-spin' : ''}`} />
                {isAutopilotRunning ? 'Esecuzione Autopilot...' : 'Esegui Ciclo Autopilot Ora'}
              </button>
            )}
          </div>

          {autopilotMessage && (
            <div className="p-2.5 bg-white/10 rounded-xl text-xs text-indigo-200 border border-white/10">
              {autopilotMessage}
            </div>
          )}
        </div>

        {/* PARTE C: 3-Stage Content Funnel Assets */}
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Funnel di Contenuti a 3 Stadi (Asset Dedicati)
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h4>
              <p className="text-xs text-slate-500">
                Inserisci gli asset reali (uno per riga) da citare nei messaggi AI per guidare il lead da primo contatto fino all'accordo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Awareness */}
            <div className="p-3.5 rounded-xl border border-pink-200 bg-pink-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-pink-600" />
                  1. Awareness (Soft & Free)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                  Primo contatto
                </span>
              </div>
              <p className="text-[11px] text-pink-800/80">
                Guide gratuite, blog post, checklist e report. Nessuna richiesta di acquisto o vincolo.
              </p>
              <textarea
                rows={3}
                value={(formData.funnelAssets?.awareness || []).join('\n')}
                onChange={(e) => updateFunnelStageAssets('awareness', e.target.value)}
                placeholder="Guida PDF: Come scalare le vendite&#10;Checklist: 5 errori e-commerce"
                className="w-full p-2 bg-white border border-pink-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500 font-sans"
              />
            </div>

            {/* 2. Evaluation */}
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-rose-600" />
                  2. Evaluation (Considerazione)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  Risposta & FAQ
                </span>
              </div>
              <p className="text-[11px] text-rose-800/80">
                Case study con metriche reali, demo interattiva, video walk-through, schede tecniche.
              </p>
              <textarea
                rows={3}
                value={(formData.funnelAssets?.evaluation || []).join('\n')}
                onChange={(e) => updateFunnelStageAssets('evaluation', e.target.value)}
                placeholder="Demo video interattiva piattaforma&#10;Case study: +42% margine medio"
                className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            {/* 3. Purchase */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  3. Purchase (Conversione)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Chiusura & Accordi
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80">
                Attivazione referral link immediata, bonus partner, prova gratuita, onboarding 1-a-1.
              </p>
              <textarea
                rows={3}
                value={(formData.funnelAssets?.purchase || []).join('\n')}
                onChange={(e) => updateFunnelStageAssets('purchase', e.target.value)}
                placeholder="Link attivazione account partner&#10;Prenotazione call di onboarding (15 min)"
                className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Salva Configurazione
            </button>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configurazione salvata!
              </span>
            )}
          </div>
        </div>
      </form>

      {/* CSV Import Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-700 shrink-0" />
          Importazione Lead Reali via File CSV
        </h4>
        <p className="text-xs text-slate-500">
          Puoi importare lead reali esportati da Google Sheets, Hunter.io o CRM. Colonne supportate: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">name, email, platform, city, canton, url, notes</code>.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {onOpenCSVModal ? (
            <button
              type="button"
              onClick={onOpenCSVModal}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Apri Strumento Caricamento CSV da PC
            </button>
          ) : (
            <label className="w-full sm:w-auto text-center px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs">
              Seleziona File CSV da Computer
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
          <span className="text-xs text-slate-400 text-center sm:text-left">oppure incolla il testo CSV sotto:</span>
        </div>

        <textarea
          rows={3}
          placeholder="name,email,platform,city,canton,notes&#10;Ticino Boutique,info@ticinoboutique.ch,Etsy,Lugano,TI,Negozio borse fatte a mano"
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-900"
        />

        {csvInput.trim() && (
          <button
            type="button"
            onClick={handleCsvSubmit}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Carica CSV
          </button>
        )}
      </div>
    </div>
  );
};

