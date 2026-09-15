import React, { useState } from 'react';
import { ProductConfig, OfferType, TargetCategory, Platform, Language } from '../types';
import { Settings, Save, Upload, Zap, FileText, CheckCircle2 } from 'lucide-react';

interface ProductConfigFormProps {
  config: ProductConfig;
  onSaveConfig: (config: ProductConfig) => void;
  onGenerateLeads: () => void;
  onUploadCSV: (csvText: string, replace?: boolean) => void;
  leadsCount: number;
  onOpenCSVModal?: () => void;
}

export const ProductConfigForm: React.FC<ProductConfigFormProps> = ({
  config,
  onSaveConfig,
  onGenerateLeads,
  onUploadCSV,
  leadsCount,
  onOpenCSVModal,
}) => {
  const [formData, setFormData] = useState<ProductConfig>(config);
  const [csvInput, setCsvInput] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Configurazione Prodotto & Parametri di Outreach
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Definisci le caratteristiche del prodotto affiliato, commissioni, canali e integrazioni esterne.
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
                  onChange={(e) => setFormData({ ...formData, offerType: e.target.value as OfferType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="affiliate">Affiliazione (% sulle vendite)</option>
                  <option value="digital_product">Prodotto Digitale / Corso</option>
                  <option value="sponsorship">Sponsorship / Post Sponsorizzato</option>
                  <option value="software">SaaS / Tool Software</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Commissione / Payout</label>
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
          </div>

          {/* Right Column: AI & Integrations */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Integrazioni API (Facoltative)</h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                OpenRouter API Key (per generazione testi con LLM reali)
              </label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={formData.openRouterApiKey || ''}
                onChange={(e) => setFormData({ ...formData, openRouterApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Se lasci vuoto, verrà utilizzato il generatore locale ottimizzato.</span>
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
              <input
                type="password"
                placeholder="re_..."
                value={formData.resendApiKey || ''}
                onChange={(e) => setFormData({ ...formData, resendApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Indirizzo Email Mittente (From)
              </label>
              <input
                type="text"
                placeholder="partners@tuodominio.ch"
                value={formData.emailFromAddress || ''}
                onChange={(e) => setFormData({ ...formData, emailFromAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs"
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

          <button
            type="button"
            onClick={onGenerateLeads}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Rigenera Lead con questi Parametri
          </button>
        </div>
      </form>

      {/* CSV Import Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-700" />
          Importazione Lead Reali via File CSV
        </h4>
        <p className="text-xs text-slate-500">
          Puoi importare lead reali esportati da Google Sheets, Hunter.io o CRM. Colonne supportate: <code>name, email, platform, city, canton, url, notes</code>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onOpenCSVModal ? (
            <button
              type="button"
              onClick={onOpenCSVModal}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Apri Strumento Caricamento CSV da PC
            </button>
          ) : (
            <label className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs">
              Seleziona File CSV da Computer
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
          <span className="text-xs text-slate-400">oppure incolla il testo CSV sotto:</span>
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
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Carica CSV
          </button>
        )}
      </div>
    </div>
  );
};
