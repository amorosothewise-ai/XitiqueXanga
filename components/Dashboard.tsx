import React, { useState, useEffect } from 'react';
import { Xitique, Frequency, XitiqueStatus } from '../types';
import { getXitiques } from '../services/storage';
import { formatCurrency } from '../services/formatUtils';
import { PlusCircle, ChevronRight, Wallet, Users, Loader2, Archive, Activity, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import FinancialTip from './FinancialTip';

interface DashboardProps {
  onCreate: () => void;
  onSelect: (xitique: Xitique) => void;
}

const ITEMS_PER_PAGE = 6;

const Dashboard: React.FC<DashboardProps> = ({ onCreate, onSelect }) => {
  const [xitiques, setXitiques] = useState<Xitique[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Refactor: Use user from AuthContext instead of localStorage
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      const data = await getXitiques();
      setXitiques(data);
      setLoadingData(false);
    }
    loadData();
  }, []);

  useEffect(() => {
      // Reset page when tab changes
      setCurrentPage(1);
  }, [activeTab]);

  // Calculate Dashboard Stats (Only for Active)
  const allActiveXitiques = xitiques.filter(x => x.status === XitiqueStatus.ACTIVE || x.status === XitiqueStatus.RISK);
  const totalCommitment = allActiveXitiques.reduce((sum, x) => {
      let contribution = x.amount;
      if (x.frequency === Frequency.WEEKLY) contribution *= 4;
      if (x.frequency === Frequency.DAILY) contribution *= 30;
      return sum + contribution;
  }, 0);

  // Filtering Logic for Views
  const filteredList = xitiques.filter(x => {
      if (activeTab === 'active') {
          return x.status === XitiqueStatus.ACTIVE || x.status === XitiqueStatus.RISK || x.status === XitiqueStatus.PLANNING;
      } else {
          // History tab includes completed and archived
          return x.status === XitiqueStatus.COMPLETED || x.status === XitiqueStatus.ARCHIVED;
      }
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
      if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  if (loadingData) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Loading your circles...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Summary Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Welcome Card */}
         <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                        {user ? t('dash.greeting', `Olá, ${user.name.split(' ')[0]}`).replace('{name}', user.name.split(' ')[0]) : 'Olá!'}
                    </h1>
                    <p className="text-slate-500 max-w-lg leading-relaxed">
                        {t('dash.subtitle_welcome', 'Here is an overview of your financial circles and savings progress.')}
                    </p>
                </div>
                <div className="flex gap-3">
                   <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 text-center">
                       <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">{t('dash.stat_circles', 'Active Circles')}</div>
                       <div className="text-2xl font-bold text-emerald-600">{allActiveXitiques.length}</div>
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
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-emerald-500" />
                {t('dash.your_groups', 'Your Circles')}
            </h2>
            
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'active' 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Activity size={16} /> {t('dash.tab_active')}
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'history' 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Archive size={16} /> {t('dash.tab_history')}
                </button>
            </div>

            {xitiques.length > 0 && activeTab === 'active' && (
                <button onClick={onCreate} className="hidden md:block text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                    {t('dash.create_new', '+ New Circle')}
                </button>
            )}
        </div>

        {filteredList.length === 0 ? (
            activeTab === 'active' ? (
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
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Archive size={32} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-400 font-medium">{t('dash.no_archived')}</p>
                </div>
            )
        ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {paginatedList.map((x) => {
                    const progress = (x.participants.filter(p => p.received).length / x.participants.length) * 100;
                    const isDaily = x.frequency === Frequency.DAILY;
                    const isCompleted = x.status === XitiqueStatus.COMPLETED;
                    const isArchived = x.status === XitiqueStatus.ARCHIVED;

                    return (
                    <div 
                        key={x.id} 
                        onClick={() => onSelect(x)}
                        className={`bg-white p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                            isArchived ? 'opacity-60 grayscale border-slate-100' :
                            isCompleted ? 'border-indigo-100 opacity-90 hover:opacity-100' :
                            isDaily ? 'border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-xl' : 
                            'border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-xl'
                        }`}
                    >
                        <div className="absolute top-4 right-4">
                            {isArchived && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Archived</span>}
                            {!isArchived && isCompleted && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Done</span>}
                            {!isArchived && x.status === XitiqueStatus.RISK && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Action Needed</span>}
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ${
                                    isArchived ? 'bg-slate-400' :
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
                                        isArchived ? 'bg-slate-400' :
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-4">
                        <button 
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border transition-all ${
                                currentPage === 1 
                                ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="text-sm font-bold text-slate-600">
                            {t('dash.page')} {currentPage} {t('dash.of')} {totalPages}
                        </div>

                        <button 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg border transition-all ${
                                currentPage === totalPages 
                                ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;