import React from 'react';
import { Lead } from '../types';
import { BarChart3, TrendingUp, DollarSign, Users, MailCheck, Trophy } from 'lucide-react';

interface DashboardKPIsProps {
  leads: Lead[];
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ leads }) => {
  const total = leads.length;
  const contacted = leads.filter((l) => l.status !== 'discovered').length;
  const replied = leads.filter((l) => l.status === 'replied' || l.status === 'in_negotiation' || l.status === 'won').length;
  const won = leads.filter((l) => l.status === 'won').length;

  const totalRevenue = leads.reduce((sum, l) => sum + (l.opportunity?.revenueValue || 0), 0);
  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
  const conversionRate = contacted > 0 ? Math.round((won / contacted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 3 Metric Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tasso di Risposta</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{replyRate}%</div>
          <p className="text-[11px] text-slate-500">{replied} risposte su {contacted} invii</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversione a Partner</span>
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{conversionRate}%</div>
          <p className="text-[11px] text-slate-500">{won} partner chiusi con successo</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Fatturato Stimato / Payout</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">CHF {totalRevenue}</div>
          <p className="text-[11px] text-slate-500">Valore commissionale generato</p>
        </div>
      </div>

      {/* Funnel Progress Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Funnel di Conversione Lead</h4>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-slate-700">1. Lead Scoperti / Importati</span>
              <span className="font-bold text-slate-900">{total}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-slate-800 h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-slate-700">2. Outreach Inviato</span>
              <span className="font-bold text-slate-900">{contacted}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${total ? (contacted / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-slate-700">3. Risposte Positive Ricevute</span>
              <span className="font-bold text-slate-900">{replied}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${total ? (replied / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-slate-700">4. Partner Chiusi (Won)</span>
              <span className="font-bold text-emerald-600">{won}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${total ? (won / total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
