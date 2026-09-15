import React, { useState } from 'react';
import { ProductConfig, Lead, AppTab, IntentClassification } from './types';
import { DEFAULT_CONFIG, parseCSVLeads, SAMPLE_CSV_DATA, simulateSimulatedResponses } from './utils/mockData';
import { generateMarketplaceLeads } from './lib/marketplaceLeadGenerator';
import { ProductConfigForm } from './components/ProductConfigForm';
import { LeadFilters } from './components/LeadFilters';
import { LeadTable } from './components/LeadTable';
import { OutreachPanel } from './components/OutreachPanel';
import { ResponsesList } from './components/ResponsesList';
import { DashboardKPIs } from './components/DashboardKPIs';
import { InstructionsPage } from './components/InstructionsPage';
import { InteractiveTourModal } from './components/InteractiveTourModal';
import { Bot, Settings, Users, Sparkles, MessageSquareReply, BarChart3, ChevronRight, Zap, BookOpen, HelpCircle } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ProductConfig>(DEFAULT_CONFIG);
  const [leads, setLeads] = useState<Lead[]>(() => generateMarketplaceLeads(DEFAULT_CONFIG));
  const [activeTab, setActiveTab] = useState<AppTab>('config');
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // Lead filters state
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleGenerateNewLeads = () => {
    const newLeads = generateMarketplaceLeads(config);
    setLeads(newLeads);
    setActiveTab('leads');
  };

  const handleUploadCSV = (csvText: string, replace: boolean = false) => {
    const csvLeads = parseCSVLeads(csvText, config);
    if (csvLeads.length > 0) {
      setLeads((prev) => (replace ? csvLeads : [...csvLeads, ...prev]));
      setActiveTab('leads');
    }
  };

  const handleLoadTestConfig = () => {
    setConfig(DEFAULT_CONFIG);
    const mockAndCsv = generateMarketplaceLeads(DEFAULT_CONFIG);
    setLeads(mockAndCsv);
    setActiveTab('leads');
  };


  const handleToggleSelectLead = (leadId: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, selected: !l.selected } : l))
    );
  };

  const handleSelectAllAboveThreshold = () => {
    setLeads((prev) =>
      prev.map((l) => (l.leadScore >= config.minLeadScore ? { ...l, selected: true } : l))
    );
  };

  const handleDeselectAll = () => {
    setLeads((prev) => prev.map((l) => ({ ...l, selected: false })));
  };

  const handleUpdateLeadMessage = (leadId: string, subject: string, body: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, message: { ...l.message, subject, body, generatedAt: new Date().toLocaleTimeString() } } : l))
    );
  };

  const handleSendMessages = (leadIds: string[]) => {
    const now = new Date().toLocaleTimeString();
    setLeads((prev) =>
      prev.map((l) =>
        leadIds.includes(l.id)
          ? {
              ...l,
              status: 'contacted',
              message: {
                subject: l.message?.subject || 'Partnership inquiry',
                body: l.message?.body || 'Hello...',
                generatedAt: l.message?.generatedAt || now,
                sentAt: now,
                followUpScheduled: '2 & 5 days',
              },
            }
          : l
      )
    );
  };

  const handleSimulateIncomingResponses = () => {
    const replyOptions = simulateSimulatedResponses();
    setLeads((prev) =>
      prev.map((l) => {
        if (l.status === 'contacted' || l.status === 'awaiting_reply') {
          const randomReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
          return {
            ...l,
            status: 'replied',
            response: {
              text: randomReply.text,
              receivedAt: new Date().toLocaleTimeString(),
              intent: randomReply.intent,
            },
          };
        }
        return l;
      })
    );
  };

  const handleTakeAction = (leadId: string, actionName: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'in_negotiation',
              opportunity: {
                actionTaken: actionName,
                stage: 'In Negotiation',
                revenueValue: 49,
              },
            }
          : l
      )
    );
  };

  const handleCloseOpportunity = (leadId: string, revenue: number) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'won',
              opportunity: {
                ...l.opportunity,
                stage: 'Won',
                revenueValue: revenue,
                closedAt: new Date().toLocaleDateString(),
              },
            }
          : l
      )
    );
  };

  // Filter leads for lead table view
  const filteredLeads = leads.filter((l) => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    if (platformFilter !== 'all' && l.platform !== platformFilter) return false;
    if (languageFilter !== 'all' && l.language !== languageFilter) return false;
    if (l.leadScore < minScoreFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = l.shopName.toLowerCase().includes(q);
      const matchNotes = l.shortNotes.toLowerCase().includes(q);
      if (!matchName && !matchNotes) return false;
    }
    return true;
  });

  const selectedCount = leads.filter((l) => l.selected).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Affiliate Sales Agent</h1>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-semibold">
                Autonomous Bot v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">Promoting: <span className="text-indigo-300 font-medium">{config.productName}</span> ({config.offerType})</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              1. Configurazione
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'leads'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              2. Scopri Lead ({leads.length})
            </button>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'outreach'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              3. Outreach AI ({leads.filter((l) => l.selected).length})
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'responses'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              4. Risposte & Pipeline
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              5. Dashboard ROI
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'instructions'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              6. Istruzioni
            </button>
          </nav>

          <button
            onClick={() => setIsTourOpen(true)}
            className="px-3 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
            title="Avvia guida interattiva"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Guida Interattiva
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'config' && (
          <ProductConfigForm
            config={config}
            onSaveConfig={(newConfig) => setConfig(newConfig)}
            onGenerateLeads={handleGenerateNewLeads}
            onUploadCSV={handleUploadCSV}
            leadsCount={leads.length}
          />
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-400" />
                  Scoperta & Qualificazione Lead
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Lead scoperti automaticamente o caricati da CSV (Svizzera e mercati target) qualificati per il tuo prodotto.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateNewLeads}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Genera Nuovi Lead
                </button>
                <button
                  onClick={() => setActiveTab('outreach')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition flex items-center gap-2"
                >
                  Procedi all'Outreach ({selectedCount}) <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <LeadFilters
              platformFilter={platformFilter}
              setPlatformFilter={setPlatformFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              languageFilter={languageFilter}
              setLanguageFilter={setLanguageFilter}
              minScoreFilter={minScoreFilter}
              setMinScoreFilter={setMinScoreFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectAllAboveThreshold={handleSelectAllAboveThreshold}
              onDeselectAll={handleDeselectAll}
              onRefreshLeads={handleGenerateNewLeads}
              totalLeads={filteredLeads.length}
              selectedCount={selectedCount}
            />

            <LeadTable
              leads={filteredLeads}
              onToggleSelectLead={handleToggleSelectLead}
              productName={config.productName}
            />
          </div>
        )}

        {activeTab === 'outreach' && (
          <OutreachPanel
            leads={leads}
            config={config}
            onUpdateLeadMessage={handleUpdateLeadMessage}
            onSendMessages={handleSendMessages}
          />
        )}

        {activeTab === 'responses' && (
          <ResponsesList
            leads={leads}
            onSimulateIncomingResponses={handleSimulateIncomingResponses}
            onTakeAction={handleTakeAction}
            onCloseOpportunity={handleCloseOpportunity}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                Dashboard, Funnel & ROI
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Monitoraggio in tempo reale delle performance di outreach, funnel di conversione e fatturato generato.
              </p>
            </div>

            <DashboardKPIs leads={leads} />
          </div>
        )}

        {activeTab === 'instructions' && (
          <InstructionsPage
            onStartTour={() => setIsTourOpen(true)}
            onGoToConfig={() => setActiveTab('config')}
          />
        )}
      </main>

      {/* Interactive Tour Modal */}
      <InteractiveTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onLoadTestConfig={handleLoadTestConfig}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        Affiliate Sales Agent • Designed for Lovable & No-Code Builder Migration • Fully Simulated Mock Engine
      </footer>
    </div>
  );
}
