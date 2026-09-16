import React, { useState, useRef } from 'react';
import { ProductConfig, Lead } from '../types';
import { parseCSVLeads, getSampleCSVTemplate } from '../lib/csvParser';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProductConfig;
  currentLeadsCount: number;
  onImport: (newLeads: Lead[], replace: boolean) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  config,
  currentLeadsCount,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [replaceMode, setReplaceMode] = useState<boolean>(true); // default to replace to help wipe fake data
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isManualPaste, setIsManualPaste] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processText = (text: string, fileName?: string) => {
    setErrorMsg('');
    try {
      const parsed = parseCSVLeads(text, config);
      if (parsed.length === 0) {
        setErrorMsg('Nessun contatto valido trovato nel CSV. Verifica l’intestazione delle colonne (es. Nome, Email, ecc.).');
        setParsedLeads([]);
        return;
      }
      setCsvContent(text);
      setParsedLeads(parsed);
    } catch (err: any) {
      setErrorMsg(`Errore nella lettura del file: ${err?.message || 'Formato non supportato'}`);
      setParsedLeads([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processText(text, selectedFile.name);
      };
      reader.onerror = () => {
        setErrorMsg('Impossibile leggere il file selezionato dal PC.');
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processText(text, droppedFile.name);
      };
      reader.readAsText(droppedFile);
    }
  };

  const handleConfirmImport = () => {
    if (parsedLeads.length > 0) {
      onImport(parsedLeads, replaceMode);
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    const template = getSampleCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modello_contatti_affiliate.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setCsvContent('');
    setParsedLeads([]);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Carica CSV Contatti dal PC</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Importa i tuoi lead reali esportati da Excel, CRM o Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-5 flex-1">
          {/* Action Tabs: File vs Paste */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setIsManualPaste(false)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  !isManualPaste ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
                Carica File (.csv)
              </button>
              <button
                type="button"
                onClick={() => setIsManualPaste(true)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  isManualPaste ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1.5" />
                Incolla Testo CSV
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Scarica modello CSV
            </button>
          </div>

          {!isManualPaste ? (
            /* Drag & Drop File Zone */
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />

              {!file && parsedLeads.length === 0 ? (
                <label
                  htmlFor="csv-file-input"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition text-center ${
                    dragActive
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Clicca per selezionare il file CSV dal tuo PC
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      oppure trascina e rilascia il file qui (.csv supportato)
                    </span>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-500 font-medium">
                    Supporta virgola (,) o punto e virgola (;)
                  </span>
                </label>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-sm">
                        {file ? file.name : 'Contenuto CSV caricato'}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {parsedLeads.length} contatti rilevati e pronti all’importazione
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Rimuovi file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual Paste Zone */
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Incolla le righe CSV copiate da Excel o file di testo:
              </label>
              <textarea
                rows={5}
                placeholder={`Nome Negozio,Email,Piattaforma,Città,Cantone,Note\nMio Store,info@miostore.com,Etsy,Lugano,TI,Negozio artigianale`}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  if (e.target.value.trim()) {
                    processText(e.target.value);
                  } else {
                    setParsedLeads([]);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-900"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Contacts */}
          {parsedLeads.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Anteprima Contatti Trovati ({parsedLeads.length})
                </span>
                <span className="text-[11px] text-slate-400">Prime 3 righe rilevate</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/75 text-[11px] text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Nome Negozio</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Piattaforma</th>
                      <th className="py-2 px-3">Città</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedLeads.slice(0, 3).map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{l.shopName}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{l.email || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{l.platform}</td>
                        <td className="py-2 px-3 text-slate-600">{l.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Mode Options (Replace vs Append) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <span className="text-xs font-bold text-slate-900 block">
              Modalità di Importazione:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  replaceMode
                    ? 'border-slate-900 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-100/50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="import_mode"
                  checked={replaceMode}
                  onChange={() => setReplaceMode(true)}
                  className="mt-0.5 text-slate-900 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Sostituisci tutti i contatti
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Cancella i dati finti/attuali ({currentLeadsCount}) e carica solo il nuovo CSV.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  !replaceMode
                    ? 'border-slate-900 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-100/50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="import_mode"
                  checked={!replaceMode}
                  onChange={() => setReplaceMode(false)}
                  className="mt-0.5 text-slate-900 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Aggiungi ai contatti esistenti
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Conserva i contatti già presenti e accoda quelli del CSV.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition text-center cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            disabled={parsedLeads.length === 0}
            onClick={handleConfirmImport}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition ${
              parsedLeads.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Importa {parsedLeads.length > 0 ? `${parsedLeads.length} Contatti` : 'Contatti'}
          </button>
        </div>

      </div>
    </div>
  );
};
