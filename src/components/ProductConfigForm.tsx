import React, { useState, useEffect } from 'react';
import { ProductConfig, OfferType, TargetCategory, Platform, Language } from '../types';
import { DEFAULT_CONFIG, SAMPLE_CSV_DATA } from '../utils/mockData';
import { Globe, Package, Settings, Target, Layers, Languages, Sliders, CheckCircle, Sparkles, FileSpreadsheet, Upload, FileText, Key } from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-400" />
              Configurazione Prodotto & Offerta
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configura la tua offerta e il target. L'agente autonomo userà questi parametri per scoprire e qualificare i lead.
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

        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {savedSuccess && (
            <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Configurazione salvata con successo! Pronto per la scoperta lead.
            </div>
          )}

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
              rows={2}
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

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition text-xs"
            >
              Ripristina Demo
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition text-sm"
            >
              Salva Configurazione
            </button>
          </div>
        </form>
      </div>

      {/* OpenRouter API Key Integration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              Integrazione LLM (OpenRouter API Key)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inserisci la tua API Key di OpenRouter (es. <code className="text-indigo-300">sk-or-...</code>) per generare messaggi reali tramite Llama-3 o Claude. Se vuota, l'app usa il generatore intelligente simulato.
            </p>
          </div>
        </div>

        {keySaved && (
          <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            OpenRouter API Key salvata con successo in localStorage!
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            placeholder="sk-or-v1-..."
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs shadow transition flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Key className="w-4 h-4" />
            Salva API Key
          </button>
        </div>
      </div>

      {/* CSV Lead Upload Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Caricamento Lead CSV (es. SwissLeadFinder)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Carica file CSV o incolla dati (colonne: company_name, website, email, city, canton, industry, notes)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCsvText(SAMPLE_CSV_DATA)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Carica Dati di Esempio (CH)
          </button>
        </div>

        {csvUploadSuccess && (
          <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Lead CSV importati con successo! Vai alla sezione "Discover Leads" per vederli.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-slate-300">Contenuto CSV (Modificabile o Incollabile)</label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Carica file .csv dal computer</label>
              <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-950 transition text-center">
                <Upload className="w-6 h-6 text-indigo-400 mb-1" />
                <span className="text-xs text-slate-300 font-medium">Scegli file .csv</span>
                <span className="text-[10px] text-slate-500 mt-0.5">SwissLeadFinder / Excel</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <button
              type="button"
              onClick={handleProcessCSV}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importa e Integra Lead CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

