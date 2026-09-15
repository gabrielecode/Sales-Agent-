import React from 'react';
import { Lead } from '../types';
import { Users, Send, MessageSquareReply, Target, Award, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

interface DashboardProps {
  leads: Lead[];
}

export const DashboardKPIs: React.FC<DashboardProps> = ({ leads }) => {
  const totalDiscovered = leads.length;
  const contactedCount = leads.filter((l) => ['contacted', 'awaiting_reply', 'replied', 'in_negotiation', 'won'].includes(l.status)).length;
  const repliedCount = leads.filter((l) => l.response || l.status === 'replied' || l.status === 'in_negotiation' || l.status === 'won').length;
  const openOpportunities = leads.filter((l) => l.status === 'in_negotiation').length;
  const wonClients = leads.filter((l) => l.status === 'won');
  
  const totalRevenue = wonClients.reduce((acc, lead) => acc + (lead.opportunity?.revenueValue || 49), 0);
  const botCost = 25; // fixed session cost mock
  const roi = botCost > 0 ? Math.round(((totalRevenue - botCost) / botCost) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Discovered</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDiscovered}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Filtered by target</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Contacted</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{contactedCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Outreach sent</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Responses</span>
            <MessageSquareReply className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{repliedCount}</div>
          <span className="text-[10px] text-purple-400 mt-1 block font-medium">
            {contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0}% reply rate
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">In Pipeline</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{openOpportunities}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Active negotiation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Won Clients</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{wonClients.length}</div>
          <span className="text-[10px] text-emerald-400 mt-1 block font-medium">Converted</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">CHF {totalRevenue}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Simulated total</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Est. ROI</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{roi}%</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Return on Bot Cost</span>
        </div>
      </div>

      {/* Funnel & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Conversion Funnel Analytics
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>1. Discovered Leads</span>
                <span>{totalDiscovered}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>2. Contacted (Outreach Sent)</span>
                <span>{contactedCount} ({totalDiscovered > 0 ? Math.round((contactedCount / totalDiscovered) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalDiscovered > 0 ? (contactedCount / totalDiscovered) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>3. Responses Received</span>
                <span>{repliedCount} ({contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${contactedCount > 0 ? (repliedCount / contactedCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>4. Opportunities in Negotiation</span>
                <span>{openOpportunities}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${repliedCount > 0 ? (openOpportunities / repliedCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>5. Won Clients / Partners Acquired</span>
                <span>{wonClients.length}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalDiscovered > 0 ? (wonClients.length / totalDiscovered) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Won Clients Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-emerald-400" />
              Acquired Clients & Partners
            </h2>

            {wonClients.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No deals closed yet. Move leads to "Deal Won" in the Responses tab to populate this list.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-72">
                {wonClients.map((client) => (
                  <div key={client.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{client.shopName}</h4>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase">
                        {client.platform}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">CHF {client.opportunity?.revenueValue || 49}</span>
                      <span className="text-[10px] text-slate-500 block">Converted</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 text-center">
            Autonomous sales agent active • Ready for Lovable export
          </div>
        </div>
      </div>
    </div>
  );
};
