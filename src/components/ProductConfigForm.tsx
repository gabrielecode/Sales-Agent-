import React, { useState, useEffect } from 'react';
import { ProductConfig, OfferType, TargetCategory, Platform, Language } from '../types';
import { DEFAULT_CONFIG, SAMPLE_CSV_DATA } from '../utils/mockData';
import { Globe, Package, Settings, Target, Layers, Languages, Sliders, CheckCircle, Sparkles, FileSpreadsheet, Upload, FileText, Key, ArrowRight, ArrowLeft } from 'lucide-react';

interface ProductConfigFormProps {
  config: ProductConfig;
  onSaveConfig: (config: ProductConfig) => void;
  onGenerateLeads: () => void;
  onUploadCSV?: (csvText: string, replace?: boolean) => void;
  leadsCount: number;
}

const ALL_OFFER_TYPES: OfferType[] = [
  'Direct Sale (Subscription / License)',
  'Done-For-You Service based on product',
  'Programma di affiliazione (Seeking partners)',
  'Vendita lead ad agenzie/affiliati',
];

const ALL_TARGETS: TargetCategory[] = [
  'Etsy sellers',
  'Amazon KDP authors',
  'eBay sellers',
  'Shopify store owners',
  'SaaS founders',
  'eCommerce owners',
  'Creator / influencer',
  'Marketing agencies',
  'Aziende svizzere (da CSV)',
  'Others',
];

const ALL_PLATFORMS: Platform[] = [
  'Etsy',
  'Amazon KDP',
  'eBay',
  'Shopify',
  'Reddit',
  'Facebook',
  'LinkedIn',
  'X',
  'Blog',
  'Newsletter',
  'Email (da CSV)',
  'Swiss Company',
];

const ALL_LANGUAGES: Language[] = ['en', 'de', 'it', 'fr'];

export const ProductConfigForm: React.FC<ProductConfigFormProps> = ({
  config,
  onSaveConfig,
  onGenerateLeads,
  onUploadCSV,
  leadsCount,
}) => {
  const [formData, setFormData] = useState<ProductConfig>(config);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [csvText, setCsvText] = useState(SAMPLE_CSV_DATA);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('OPENROUTER_API_KEY');
    if (stored) setOpenRouterKey(stored);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('OPENROUTER_API_KEY', openRouterKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleChange = <K extends keyof ProductConfig>(field: K, value: ProductConfig[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleToggleTarget = (target: TargetCategory) => {
    setFormData((prev) => {
      const exists = prev.targetCategories.includes(target);
      return {
        ...prev,
        targetCategories: exists
          ? prev.targetCategories.filter((t) => t !== target)
          : [...prev.targetCategories, target],
      };
    });
    setSavedSuccess(false);
  };

  const handleToggleChannel = (channel: Platform) => {
    setFormData((prev) => {
      const exists = prev.channels.includes(channel);
      return {
        ...prev,
        channels: exists
          ? prev.channels.filter((c) => c !== channel)
          : [...prev.channels, channel],
      };
    });
    setSavedSuccess(false);
  };

  const handleToggleLang = (lang: Language) => {
    setFormData((prev) => {
      const exists = prev.targetLanguages.includes(lang);
      return {
        ...prev,
        targetLanguages: exists
          ? prev.targetLanguages.filter((l) => l !== lang)
          : [...prev.targetLanguages, lang],
      };
    });
    setSavedSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLoadDemo = () => {
    setFormData(DEFAULT_CONFIG);
    onSaveConfig(DEFAULT_CONFIG);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessCSV = () => {
    if (onUploadCSV && csvText) {
      onUploadCSV(csvText, false);
      setCsvUploadSuccess(true);
      setTimeout(() => setCsvUploadSuccess(false), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header & Preset Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-400" />
              Configurazione Guidata (Wizard)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configura l'agente in 3 passaggi semplici per ridurre il carico cognitivo e definire l'offerta perfetta.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Carica Preset Demo
            </button>
            <button
              type="button"
              onClick={onGenerateLeads}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {leadsCount > 0 ? 'Aggiorna Lead' : 'Genera Lead Ora'}
            </button>
          </div>
        </div>

        {/* Wizard Step Indicator */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              currentStep === 1
                ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              1
            </div>
            <div>
              <div className="text-xs font-semibold">Prodotto & Offerta</div>
              <div className="text-[10px] text-slate-400">URL, nome e descrizione</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              currentStep === 2
                ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              2
            </div>
            <div>
              <div className="text-xs font-semibold">Target & Canali</div>
              <div className="text-[10px] text-slate-400">Categorie e score soglia</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
              currentStep === 3
                ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              3
            </div>
            <div>
              <div className="text-xs font-semibold">CSV & OpenRouter</div>
              <div className="text-[10px] text-slate-400">Lead svizzeri e API LLM</div>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {savedSuccess && (
            <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Configurazione salvata con successo! Pronto per la scoperta lead.
            </div>
          )}

          {/* STEP 1: Prodotto & Offerta */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-xl text-xs text-indigo-300">
                <strong>Passo 1 di 3:</strong> Inserisci le informazioni principali sul prodotto, SaaS o servizio che l'agente promuoverà.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL Prodotto / Landing Page <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Globe className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      required
                      value={formData.productUrl}
                      onChange={(e) => handleChange('productUrl', e.target.value)}
                      placeholder="https://example.com/offer"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Prodotto <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Package className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.productName}
                      onChange={(e) => handleChange('productName', e.target.value)}
                      placeholder="es., ListingBoost AI"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Breve Descrizione Offerta (1-2 frasi) <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.productDescription}
                  onChange={(e) => handleChange('productDescription', e.target.value)}
                  placeholder="es., Tool di ottimizzazione e SEO potenziato da IA che aumenta le conversioni sui marketplace del 34%."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo di Offerta
                </label>
                <select
                  value={formData.offerType}
                  onChange={(e) => handleChange('offerType', e.target.value as OfferType)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  {ALL_OFFER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition text-sm flex items-center gap-2"
                >
                  Successivo: Target & Canali
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Target, Canali & Lead Score */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-xl text-xs text-indigo-300">
                <strong>Passo 2 di 3:</strong> Seleziona le categorie target, i canali di outreach e imposta la soglia di qualità per i lead.
              </div>

              {/* Target Categories */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  Categorie Target (Seleziona almeno una)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ALL_TARGETS.map((target) => {
                    const isSelected = formData.targetCategories.includes(target);
                    return (
                      <button
                        key={target}
                        type="button"
                        onClick={() => handleToggleTarget(target)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{target}</span>
                        <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-400 bg-indigo-600' : 'border-slate-700'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Canali di Outreach
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((platform) => {
                    const isSelected = formData.channels.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handleToggleChannel(platform)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Languages & Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-indigo-400" />
                    Lingue Target
                  </label>
                  <div className="flex gap-2">
                    {ALL_LANGUAGES.map((lang) => {
                      const isSelected = formData.targetLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleToggleLang(lang)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase border transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      Score Minimo Lead
                    </span>
                    <span className="text-indigo-400 font-bold">{formData.minLeadScore}</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    step="5"
                    value={formData.minLeadScore}
                    onChange={(e) => handleChange('minLeadScore', Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 cursor-pointer h-2 rounded-lg"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">I lead sotto questo punteggio non sono selezionati</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Lead / Sessione
                  </label>
                  <select
                    value={formData.maxLeadsPerSession}
                    onChange={(e) => handleChange('maxLeadsPerSession', Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value={15}>15 lead</option>
                    <option value={25}>25 lead (Consigliato)</option>
                    <option value={50}>50 lead</option>
                    <option value={100}>100 lead</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Indietro
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition text-sm flex items-center gap-2"
                >
                  Successivo: CSV & OpenRouter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Lead CSV & OpenRouter API */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-xl text-xs text-indigo-300">
                <strong>Passo 3 di 3:</strong> Opzionalmente carica lead CSV (es. SwissLeadFinder) e configura la chiave API OpenRouter per la produzione.
              </div>

              {/* OpenRouter API Key Integration Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      Integrazione LLM (OpenRouter API Key)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Inserisci la tua API Key di OpenRouter (es. <code className="text-indigo-300">sk-or-...</code>) per generare messaggi reali. Se vuota, l'app usa il generatore intelligente simulato.
                    </p>
                  </div>
                </div>

                {keySaved && (
                  <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    OpenRouter API Key salvata con successo in localStorage!
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Salva API Key
                  </button>
                </div>
              </div>

              {/* CSV Lead Upload Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Caricamento Lead CSV (es. SwissLeadFinder)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Colonne: company_name, website, email, city, canton, industry, notes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCsvText(SAMPLE_CSV_DATA)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Dati di Esempio (CH)
                  </button>
                </div>

                {csvUploadSuccess && (
                  <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Lead CSV importati con successo! Vai alla scheda "Scopri Lead".
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-medium text-slate-300">Contenuto CSV</label>
                    <textarea
                      rows={4}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Carica file .csv</label>
                      <label className="border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-900 transition text-center">
                        <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                        <span className="text-[11px] text-slate-300 font-medium">Scegli file</span>
                        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleProcessCSV}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Importa Lead CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition text-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Salva Configurazione Finale
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
