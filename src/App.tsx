import React, { useState } from 'react';
import { ProductConfig, Lead, AppTab } from './types';
import { DEFAULT_CONFIG, parseCSVLeads, simulateSimulatedResponses } from './utils/mockData';
import { generateMarketplaceLeads } from './lib/marketplaceLeadGenerator';
import { ProductConfigForm } from './components/ProductConfigForm';
import { LeadFilters } from './components/LeadFilters';
import { LeadTable } from './components/LeadTable';
import { OutreachPanel } from './components/OutreachPanel';
import { ResponsesList } from './components/ResponsesList';
import { DashboardKPIs } from './components/DashboardKPIs';
import { InstructionsPage } from './components/InstructionsPage';
import { InteractiveTourModal } from './components/InteractiveTourModal';
import { 
  Bot, Settings, Users, Sparkles, MessageSquareReply, BarChart3, 
  ChevronRight, Zap, BookOpen, HelpCircle, LayoutDashboard, Inbox, 
  Briefcase, Building2, Workflow, FolderKanban, ShieldCheck, Plus, Search, Bell
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ProductConfig>(DEFAULT_CONFIG);
  const [leads, setLeads] = useState<Lead[]>(() => generateMarketplaceLeads(DEFAULT_CONFIG));
  const [activeTab, setActiveTab] = useState<AppTab>('leads');
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
  const activeCount = leads.filter((l) => l.status === 'contacted' || l.status === 'in_negotiation').length;
  const inactiveCount = leads.filter((l) => l.status === 'discovered').length;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 flex font-sans selection:bg-slate-900 selection:text-white">
      
      {/* 1. LEFT SIDEBAR (Pure White, Fixed) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              SA
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                Sales Agent <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">Pro</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{config.productName}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-6 flex-1 text-xs">
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Main Menu</div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'leads' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-500" />
                Contacts & Leads
              </div>
              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {leads.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'outreach' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Workflow className="w-4 h-4 text-slate-500" />
                Workflow Automation
              </div>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {selectedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'responses' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-slate-500" />
                Inbound & Responses
              </div>
            </button>
          </div>

          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Management</div>
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'config' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-500" />
                Configurazione Prodotto
              </div>
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                activeTab === 'instructions' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Istruzioni & Setup
              </div>
            </button>
          </div>
        </div>

        {/* Sidebar Footer / Tour Button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setIsTourOpen(true)}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Guida Interattiva
          </button>
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              {activeTab === 'config' && 'Configurazione Prodotto & Obiettivo'}
              {activeTab === 'leads' && 'Workflow Automation & Lead Discovery'}
              {activeTab === 'outreach' && 'Outreach Automatico & IA Generator'}
              {activeTab === 'responses' && 'Pipeline Inbound & Negoziazione'}
              {activeTab === 'dashboard' && 'Dashboard, Funnel & ROI'}
              {activeTab === 'instructions' && 'Manuale Utente & Istruzioni'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca lead o workflow... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-900 w-64 transition"
              />
            </div>

            <button
              onClick={() => setActiveTab('config')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* 3. FOUR KPI CARDS (Horizontal Adjacent Rectangles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Workflow className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12% questo mese</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Workflows</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{leads.length}</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Attivi</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{selectedCount + activeCount}</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Copertura</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{leads.length * 4}</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">In attesa</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{inactiveCount}</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
          </div>

          {/* 4. ACTIVE TAB CONTENT CONTAINER */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-slate-700" />
                      Workflow Automation & Lead Discovery
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Lead scoperti automaticamente o caricati da CSV (Svizzera e mercati target) qualificati per {config.productName}.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateNewLeads}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Genera Nuovi Lead
                    </button>
                    <button
                      onClick={() => setActiveTab('outreach')}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-2 shadow-xs"
                    >
                      Procedi all'Outreach ({selectedCount}) <ChevronRight className="w-3.5 h-3.5" />
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
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-700" />
                    Dashboard, Funnel & ROI Analytics
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
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
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-400 shrink-0">
          Affiliate Sales Agent • Modern SaaS Dashboard Style • Designed for Vercel & Lovable
        </footer>
      </div>

      {/* Interactive Tour Modal */}
      <InteractiveTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onLoadTestConfig={handleLoadTestConfig}
      />
    </div>
  );
}
