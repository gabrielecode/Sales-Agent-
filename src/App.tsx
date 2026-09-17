import React, { useState, useEffect } from 'react';
import { ProductConfig, Lead, AppTab } from './types';
import { DEFAULT_CONFIG, parseCSVLeads, simulateSimulatedResponses } from './utils/mockData';
import { validateEmailQuality, determineToneOfVoice } from './lib/csvParser';
import { ProductConfigForm } from './components/ProductConfigForm';
import { LeadFilters } from './components/LeadFilters';
import { LeadTable } from './components/LeadTable';
import { OutreachPanel } from './components/OutreachPanel';
import { ResponsesList } from './components/ResponsesList';
import { DashboardKPIs } from './components/DashboardKPIs';
import { InstructionsPage } from './components/InstructionsPage';
import { InteractiveTourModal } from './components/InteractiveTourModal';
import { CSVImportModal } from './components/CSVImportModal';
import { ClearDataModal } from './components/ClearDataModal';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Sparkles,
  Settings,
  BookOpen,
  Plus,
  TrendingUp,
  CheckCircle2,
  Workflow,
  HelpCircle,
  Upload,
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('leads');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [config, setConfig] = useState<ProductConfig>(() => {
    try {
      const saved = localStorage.getItem('AFFILIATE_AGENT_CONFIG');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CONFIG;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('AFFILIATE_AGENT_LEADS');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        return parsed.map((l: Lead) => ({
          ...l,
          source: 'csv',
          emailQuality: l.emailQuality || (l.email ? validateEmailQuality(l.email) : 'Mancante'),
          toneOfVoice: l.toneOfVoice || determineToneOfVoice(l.industry),
        }));
      }
    } catch (e) {}
    return [];
  });

  const [showTour, setShowTour] = useState<boolean>(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('AFFILIATE_AGENT_CONFIG', JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('AFFILIATE_AGENT_LEADS', JSON.stringify(leads));
    } catch (e) {}
  }, [leads]);

  // Lead actions
  const handleToggleSelect = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l))
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setLeads((prev) => prev.map((l) => ({ ...l, selected })));
  };

  const handleSelectAllAboveThreshold = () => {
    setLeads((prev) =>
      prev.map((l) => ({
        ...l,
        selected: l.leadScore >= (config.minLeadScore || 65),
      }))
    );
  };

  const handleDeselectAll = () => {
    setLeads((prev) => prev.map((l) => ({ ...l, selected: false })));
  };

  const handleDeleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    showToast('Contatto eliminato');
  };

  const handleClearAllLeads = () => {
    setLeads([]);
    showToast('Tutti i contatti sono stati rimossi');
  };

  const handleDeleteSelectedLeads = () => {
    const count = leads.filter((l) => l.selected).length;
    if (count === 0) return;
    setLeads((prev) => prev.filter((l) => !l.selected));
    showToast(`${count} contatti selezionati eliminati`);
  };

  const handleImportCSVFromModal = (newLeads: Lead[], replace: boolean) => {
    if (replace) {
      setLeads(newLeads);
      showToast(`${newLeads.length} contatti importati con successo da CSV!`);
    } else {
      setLeads((prev) => [...newLeads, ...prev]);
      showToast(`${newLeads.length} contatti aggiunti alla pipeline da CSV!`);
    }
  };

  const handleUploadCSV = (csvText: string, replace = false) => {
    const parsed = parseCSVLeads(csvText, config);
    if (parsed.length > 0) {
      setLeads((prev) => (replace ? parsed : [...parsed, ...prev]));
      showToast(`${parsed.length} contatti importati dal CSV!`);
    }
  };

  const handleOpenOutreachForLead = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: true } : l))
    );
    setActiveTab('outreach');
  };

  const handleUpdateLeadMessage = (id: string, subject: string, body: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              message: {
                ...l.message,
                subject,
                body,
                generatedAt: new Date().toLocaleTimeString(),
              },
            }
          : l
      )
    );
  };

  const handleSendMessages = (leadIds: string[]) => {
    setLeads((prev) =>
      prev.map((l) =>
        leadIds.includes(l.id)
          ? {
              ...l,
              status: 'contacted',
              message: {
                subject: l.message?.subject || `Collaborazione con ${config.productName}`,
                body: l.message?.body || '',
                sentAt: new Date().toLocaleTimeString(),
              },
            }
          : l
      )
    );
  };

  const handleSimulateIncomingResponses = () => {
    const simPool = simulateSimulatedResponses();
    setLeads((prev) =>
      prev.map((l, idx) => {
        if (l.status === 'contacted') {
          const sim = simPool[idx % simPool.length];
          return {
            ...l,
            status: 'replied',
            response: {
              text: sim.text,
              receivedAt: new Date().toLocaleTimeString(),
              intent: sim.intent,
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
                stage: 'In Negotiation',
                actionTaken: actionName,
                revenueValue: 0,
              },
            }
          : l
      )
    );
  };

  const onCloseOpportunity = (leadId: string, revenue: number) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'won',
              opportunity: {
                stage: 'Won',
                actionTaken: 'Accordo firmato & link affiliato attivo',
                revenueValue: revenue,
                closedAt: new Date().toLocaleDateString(),
              },
            }
          : l
      )
    );
  };

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    if (platformFilter !== 'all' && lead.platform !== platformFilter) return false;
    if (languageFilter !== 'all' && lead.language !== languageFilter) return false;
    if (lead.leadScore < minScoreFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        lead.shopName.toLowerCase().includes(q) ||
        (lead.shortNotes && lead.shortNotes.toLowerCase().includes(q)) ||
        (lead.city && lead.city.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // KPI calculations
  const totalLeadsCount = leads.length;
  const activeWorkflowsCount = leads.filter((l) => l.status !== 'discovered').length;
  const totalEnrolledCount = leads.filter((l) => l.selected).length;
  const wonPartnersCount = leads.filter((l) => l.status === 'won').length;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-x-hidden md:overflow-hidden">
      {/* 1. Mobile Top Navigation Bar (Visible only on < md screens) */}
      <nav className="md:hidden flex flex-col w-full bg-white border-b border-slate-200 shrink-0 z-30 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-slate-900">Affiliate Agent</h2>
              <span className="text-[10px] text-slate-400 font-medium">SaaS Growth Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowTour(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Guida Rapida"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Quick Scrollable Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'leads' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Contacts ({totalLeadsCount})
          </button>
          <button
            onClick={() => { setActiveTab('responses'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'responses' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Inbound
          </button>
          <button
            onClick={() => { setActiveTab('outreach'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'outreach' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Automation
          </button>
          <button
            onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'config' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Config
          </button>
          <button
            onClick={() => { setActiveTab('instructions'); setMobileMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'instructions' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guida
          </button>
        </div>

        {/* Mobile Dropdown Menu when toggled */}
        {mobileMenuOpen && (
          <div className="p-3 border-t border-slate-100 space-y-1 bg-slate-50/80">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'dashboard' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              Dashboard Panoramica
            </button>
            <button
              onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'leads' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-500" />
                Contatti & Lead
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {totalLeadsCount}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('responses'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'responses' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Inbound & Risposte
              </div>
              {leads.filter((l) => l.status === 'replied').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                  {leads.filter((l) => l.status === 'replied').length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('outreach'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'outreach' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              Automazione Outreach
            </button>
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <button
                onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  activeTab === 'config' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Configurazione
              </button>
              <button
                onClick={() => { setActiveTab('instructions'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  activeTab === 'instructions' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                Istruzioni & Info
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Desktop Left Sidebar (Visible only on md+ screens) */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col justify-between z-20 shrink-0 overflow-hidden">
        <div className="flex flex-col overflow-y-auto">
          {/* Brand Logo & Name */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Affiliate Agent</h2>
              <span className="text-[11px] text-slate-400 font-medium">SaaS Growth Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'leads'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-500" />
                Contacts
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {totalLeadsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('responses')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'responses'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Inbound
              </div>
              {leads.filter((l) => l.status === 'replied').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                  {leads.filter((l) => l.status === 'replied').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('outreach')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'outreach'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              Automation
            </button>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Sistema
              </span>
              <button
                onClick={() => setActiveTab('config')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'config'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Configurazione
              </button>

              <button
                onClick={() => setActiveTab('instructions')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'instructions'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                Istruzioni & Info
              </button>
            </div>
          </nav>
        </div>

        {/* Footer User Profile & Quick Tour */}
        <div className="p-4 border-t border-slate-100 space-y-3 shrink-0">
          <button
            onClick={() => setShowTour(true)}
            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 border border-slate-200"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Guida Rapida Dashboard
          </button>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:h-full md:overflow-hidden bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 shrink-0 z-10 w-full">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight capitalize">
                {activeTab === 'leads' ? 'Contacts & Leads' : activeTab === 'outreach' ? 'Automation & Outreach' : activeTab}
              </h1>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Direct Upload CSV from PC Button */}
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                title="Carica un file CSV dal tuo computer"
              >
                <Upload className="w-3.5 h-3.5" />
                Carica CSV (PC)
              </button>

              <button
                onClick={() => setActiveTab('outreach')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-700" />
                Create Workflow
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable container for KPI section and tab content */}
        <div className="flex-1 flex flex-col md:overflow-y-auto md:overflow-x-hidden p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-8 max-w-7xl mx-auto w-full custom-scrollbar">
          
          {/* 4. KPI Cards: 4 Horizontal Rectangular Adjacent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full shrink-0">
            
            {/* Card 1: Total Workflows */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Total Contacts</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Workflow className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {totalLeadsCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {totalLeadsCount === 0 ? 'Nessun lead importato' : `${totalLeadsCount} lead in pipeline`}
              </div>
            </div>

            {/* Card 2: Active */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Active</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {activeWorkflowsCount}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">Flussi attivi & contattati</div>
            </div>

            {/* Card 3: Total Enrolled */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Total Enrolled</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {totalEnrolledCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">Lead selezionati per batch</div>
            </div>

            {/* Card 4: Won Partners / Conversion */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Partners Won</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {wonPartnersCount}
              </div>
              <div className="text-[11px] text-amber-600 font-medium mt-1 truncate">Accordi conclusi</div>
            </div>

          </div>

          {/* 5. Tab Content: Container */}
          <div className="flex-1 flex flex-col min-w-0 w-full">
            {activeTab === 'leads' && (
              <div className="space-y-4 flex flex-col w-full">
                <LeadFilters
                  platformFilter={platformFilter}
                  setPlatformFilter={setPlatformFilter}
                  languageFilter={languageFilter}
                  setLanguageFilter={setLanguageFilter}
                  minScoreFilter={minScoreFilter}
                  setMinScoreFilter={setMinScoreFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelectAllAboveThreshold={handleSelectAllAboveThreshold}
                  onDeselectAll={handleDeselectAll}
                  leads={leads}
                  totalLeads={leads.length}
                  selectedCount={totalEnrolledCount}
                  onOpenCSVModal={() => setIsCSVModalOpen(true)}
                  onOpenClearModal={() => setIsClearModalOpen(true)}
                  onDeleteSelected={handleDeleteSelectedLeads}
                />

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="text-xs font-bold text-slate-900">Tabella Lead & Creator</span>
                      <span className="text-xs text-slate-400">({filteredLeads.length} filtrati)</span>
                      {leads.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {leads.length} totali da CSV
                        </span>
                      )}
                    </div>
                  </div>
                  <LeadTable
                    leads={filteredLeads}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onOpenOutreachForLead={handleOpenOutreachForLead}
                    onDeleteLead={handleDeleteLead}
                    onOpenCSVModal={() => setIsCSVModalOpen(true)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'outreach' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col">
                <OutreachPanel
                  leads={leads}
                  config={config}
                  onUpdateLeadMessage={handleUpdateLeadMessage}
                  onSendMessages={handleSendMessages}
                  onLeadsUpdated={(updatedLeads) => {
                    setLeads((prev) =>
                      prev.map((l) => {
                        const found = updatedLeads.find((ul) => ul.id === l.id);
                        return found || l;
                      })
                    );
                  }}
                />
              </div>
            )}

            {activeTab === 'responses' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col">
                <ResponsesList
                  leads={leads}
                  onSimulateIncomingResponses={handleSimulateIncomingResponses}
                  onTakeAction={handleTakeAction}
                  onCloseOpportunity={onCloseOpportunity}
                  onLeadReplied={(leadId, responseData) => {
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.id === leadId
                          ? {
                              ...l,
                              status: 'replied',
                              response: responseData,
                            }
                          : l
                      )
                    );
                  }}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col">
                <DashboardKPIs leads={leads} />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col">
                <ProductConfigForm
                  config={config}
                  onSaveConfig={setConfig}
                  onUploadCSV={handleUploadCSV}
                  leadsCount={leads.length}
                  onOpenCSVModal={() => setIsCSVModalOpen(true)}
                  onNavigateToOutreach={() => setActiveTab('outreach')}
                  onRegenerateAllLeadsWithConfig={(newConfig) => {
                    setConfig(newConfig);
                    // Clear cached messages so newly generated emails adopt the new product analysis
                    setLeads((prev) =>
                      prev.map((l) => ({
                        ...l,
                        message: undefined,
                      }))
                    );
                    setActiveTab('outreach');
                    showToast(`Dati del prodotto "${newConfig.productName}" salvati. Pronto per generare email!`);
                  }}
                />
              </div>
            )}

            {activeTab === 'instructions' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col">
                <InstructionsPage />
              </div>
            )}
          </div>

        </div>
      </main>

      {/* CSV Import Modal from PC */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        config={config}
        currentLeadsCount={leads.length}
        onImport={handleImportCSVFromModal}
      />

      {/* Clear/Delete Data Confirmation Modal */}
      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        totalLeadsCount={leads.length}
        selectedLeadsCount={totalEnrolledCount}
        onClearAll={handleClearAllLeads}
        onClearSelected={handleDeleteSelectedLeads}
      />

      {/* Interactive Tour Modal */}
      <InteractiveTourModal isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2.5 border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
