import React, { useState, useEffect } from 'react';
import { Xitique, Frequency, XitiqueStatus, XitiqueType } from '../types';
import { getXitiques, getUserProfile } from '../services/storage';
import { formatCurrency } from '../services/formatUtils';
import { PlusCircle, Calendar, ChevronRight, Wallet, TrendingUp, Users, Clock } from 'lucide-react';
import { formatDate } from '../services/dateUtils';
import { useLanguage } from '../contexts/LanguageContext';
import FinancialTip from './FinancialTip';

interface DashboardProps {
  onCreate: () => void;
  onSelect: (xitique: Xitique) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCreate, onSelect }) => {
  const [xitiques, setXitiques] = useState<Xitique[]>([]);
  const [user, setUser] = useState(getUserProfile());
  const { t } = useLanguage();

  useEffect(() => {
    setXitiques(getXitiques());
    setUser(getUserProfile());
  }, []);

  // Calculate Dashboard Stats
  const activeXitiques = xitiques.filter(x => x.status === XitiqueStatus.ACTIVE || x.status === XitiqueStatus.RISK);
  const totalCommitment = activeXitiques.reduce((sum, x) => {
      // For groups, user contributes 'amount'. For individual, they contribute 'amount'.
      // If individual frequency is daily, normalize to monthly approx? Let's just sum raw 'amount' per period for simplicity.
      // Or better: Sum of all active target amounts (Pot Size) / Participants if group?
      // Let's stick to: "Your Monthly Contribution Value"
      let contribution = x.amount;
      if (x.frequency === Frequency.WEEKLY) contribution *= 4;
      if (x.frequency === Frequency.DAILY) contribution *= 30;
      return sum + contribution;
  }, 0);
  
  const totalSaved = xitiques.reduce((sum, x) => {
      // Calculate derived balance/payouts received
      if (x.type === XitiqueType.INDIVIDUAL) {
          return sum + (x.transactions?.reduce((acc, t) => t.type === 'DEPOSIT' ? acc + t.amount : acc, 0) || 0);
      }
      return sum;
      // Note: For groups, "saved" implies what you received? Or what you put in?
      // Simple metric: Individual Xitique Balances.
  }, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Summary Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Welcome Card */}
         <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                        {t('dash.greeting', `Olá, ${user.name.split(' ')[0]}`).replace('{name}', user.name.split(' ')[0])}
                    </h1>
                    <p className="text-slate-500 max-w-lg leading-relaxed">
                        {t('dash.subtitle_welcome', 'Here is an overview of your financial circles and savings progress.')}
                    </p>
                </div>
                <div className="flex gap-3">
                   <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 text-center">
                       <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">{t('dash.stat_circles', 'Active Circles')}</div>
                       <div className="text-2xl font-bold text-emerald-600">{activeXitiques.length}</div>
                   </div>
                   <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 text-center">
                       <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">{t('dash.stat_monthly', 'Monthly Est.')}</div>
                       <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCommitment)}</div>
                   </div>
                </div>
            </div>
            {/* Background Deco */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         </div>
      </div>

      <FinancialTip context="group" />

      {/* Main Content */}
      <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-emerald-500" />
                {t('dash.your_groups', 'Your Circles')}
            </h2>
            {xitiques.length > 0 && (
                <button onClick={onCreate} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                    {t('dash.create_new', '+ New Circle')}
                </button>
            )}
        </div>

        {xitiques.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm hover:border-emerald-300 transition-colors group cursor-pointer" onClick={onCreate}>
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                <Wallet size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{t('dash.no_active')}</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">{t('dash.start_new')}</p>
            <button 
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all inline-flex items-center transform group-hover:-translate-y-1"
            >
                <PlusCircle size={18} className="mr-2" /> {t('dash.btn_init')}
            </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {xitiques.map((x) => {
                const progress = (x.participants.filter(p => p.received).length / x.participants.length) * 100;
                const isDaily = x.frequency === Frequency.DAILY;
                const isCompleted = x.status === XitiqueStatus.COMPLETED;

                return (
                <div 
                    key={x.id} 
                    onClick={() => onSelect(x)}
                    className={`bg-white p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                        isCompleted ? 'border-indigo-100 opacity-80 hover:opacity-100' :
                        isDaily ? 'border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-xl' : 
                        'border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-xl'
                    }`}
                >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                        {isCompleted && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Done</span>}
                        {x.status === XitiqueStatus.RISK && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Action Needed</span>}
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ${
                                isCompleted ? 'bg-indigo-400' :
                                isDaily ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 
                                'bg-gradient-to-br from-teal-400 to-emerald-600'
                            }`}>
                                {x.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors truncate max-w-[140px]">
                                    {x.name}
                                </h3>
                                <div className="flex items-center text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                                    {x.frequency === 'WEEKLY' ? t('wiz.weekly') : x.frequency === 'MONTHLY' ? t('wiz.monthly') : t('wiz.daily')}
                                    <span className="mx-1">•</span>
                                    {x.participants.length} {t('detail.members')}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                                <span>{t('dash.progress')}</span>
                                <span className="text-slate-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                                    isCompleted ? 'bg-indigo-400' :
                                    isDaily ? 'bg-amber-500' : 
                                    'bg-gradient-to-r from-teal-400 to-emerald-500'
                                }`} 
                                style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase">{t('detail.total_payout')}</div>
                            <div className="text-lg font-bold text-slate-900">
                                {formatCurrency(x.amount * x.participants.length)}
                            </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-slate-900 group-hover:text-white`}>
                            <ChevronRight size={16} />
                        </div>
                        </div>
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;