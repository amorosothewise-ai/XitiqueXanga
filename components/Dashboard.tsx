import React, { useState, useEffect } from 'react';
import { Xitique, Frequency, XitiqueStatus } from '../types';
import { getXitiques } from '../services/storage';
import { formatCurrency } from '../services/formatUtils';
import { PlusCircle, ChevronRight, Wallet, Users, Loader2, Archive, Activity, ChevronLeft, LogIn, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import FinancialTip from './FinancialTip';

interface DashboardProps {
  onCreate: () => void;
  onSelect: (xitique: Xitique) => void;
  onShowTutorial: () => void;
}

const ITEMS_PER_PAGE = 6;

const Dashboard: React.FC<DashboardProps> = ({ onCreate, onSelect, onShowTutorial }) => {
  const [xitiques, setXitiques] = useState<Xitique[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  // Refactor: Use user from AuthContext instead of localStorage
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoadingData(true);
    setFetchError(false);
    try {
      const data = await getXitiques();
      setXitiques(data);
    } catch (error) {
      console.error("Failed to load Xitiques:", error);
      setFetchError(true);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
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
            <p className="text-slate-400 font-medium">{t('dash.loading', 'Carregando seus círculos...')}</p>
        </div>
    );
  }

  if (fetchError) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500">
                <Activity size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{t('dash.error_title', 'Erro de Conexão')}</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto text-center">
                {t('dash.error_desc', 'Não foi possível carregar seus dados no momento. Fique tranquilo, seus registros estão seguros.')}
            </p>
            <button 
                onClick={loadData}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all inline-flex items-center justify-center"
            >
                {t('dash.try_again', 'Tentar Novamente')}
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Summary Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Welcome Card */}
         <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        {user ? t('dash.greeting', `Olá, ${user.name.split(' ')[0]}`).replace('{name}', user.name.split(' ')[0]) : 'Olá!'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
                        {t('dash.subtitle_welcome', 'Here is an overview of your financial circles and savings progress.')}
                    </p>
                </div>
                <div className="flex gap-2 md:gap-3 w-full md:w-auto">
                   <div className="flex-1 md:flex-none bg-emerald-50 dark:bg-emerald-900/20 px-4 md:px-5 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                       <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">{t('dash.stat_circles', 'Active Circles')}</div>
                       <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-300">{allActiveXitiques.length}</div>
                   </div>
                   <div className="flex-1 md:flex-none bg-blue-50 dark:bg-blue-900/20 px-4 md:px-5 py-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-center">
                       <div className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-1">{t('dash.stat_monthly', 'Monthly Est.')}</div>
                       <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-300">{formatCurrency(totalCommitment)}</div>
                   </div>
                </div>
            </div>
            {/* Background Deco */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         </div>
      </div>

      <FinancialTip context="group" />

      {/* Main Content */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-emerald-500" />
                    {t('dash.your_groups', 'Your Circles')}
                </h2>
                <button 
                    onClick={onShowTutorial}
                    className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                    title={t('tut.title')}
                >
                    <Sparkles size={16} />
                </button>
            </div>
            
            <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'active' 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <Activity size={16} /> {t('dash.tab_active')}
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'history' 
                        ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <Archive size={16} /> {t('dash.tab_history')}
                </button>
            </div>

            {xitiques.length > 0 && activeTab === 'active' && (
                <div className="flex gap-4">
                    <button onClick={onCreate} className="hidden md:block text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                        {t('dash.create_new', '+ New Circle')}
                    </button>
                </div>
            )}
        </div>

        <AnimatePresence mode="wait">
        {filteredList.length === 0 ? (
            <motion.div
                key={`${activeTab}-empty`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
            {activeTab === 'active' ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors group cursor-pointer" onClick={onCreate}>
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                        <Wallet size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('dash.no_active')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">{t('dash.start_new')}</p>
                    <div className="flex flex-col md:flex-row justify-center gap-4 px-6">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onCreate(); }}
                            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-slate-200 dark:shadow-none transition-all inline-flex items-center justify-center transform group-hover:-translate-y-1"
                        >
                            <PlusCircle size={18} className="mr-2" /> {t('dash.btn_init')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Archive size={32} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-400 dark:text-slate-500 font-medium">{t('dash.no_archived')}</p>
                </div>
            )}
            </motion.div>
        ) : (
            <motion.div
                key={`${activeTab}-list`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
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
                        className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                            isArchived ? 'opacity-60 grayscale border-slate-100 dark:border-slate-800' :
                            isCompleted ? 'border-indigo-100 dark:border-indigo-900/50 opacity-90 hover:opacity-100' :
                            isDaily ? 'border-amber-100 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-500 shadow-sm hover:shadow-xl' : 
                            'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500 shadow-sm hover:shadow-xl'
                        }`}
                    >
                        <div className="absolute top-4 right-4">
                            {isArchived && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Archived</span>}
                            {!isArchived && isCompleted && <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Done</span>}
                            {!isArchived && x.status === XitiqueStatus.RISK && <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Action Needed</span>}
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg ${
                                    isArchived ? 'bg-slate-400 dark:bg-slate-600' :
                                    isCompleted ? 'bg-indigo-400 dark:bg-indigo-600' :
                                    isDaily ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 
                                    'bg-gradient-to-br from-teal-400 to-emerald-600'
                                }`}>
                                    {x.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                                        {x.name}
                                    </h3>
                                    <div className="flex items-center text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                                        {x.frequency === 'WEEKLY' ? t('wiz.weekly') : x.frequency === 'MONTHLY' ? t('wiz.monthly') : t('wiz.daily')}
                                        <span className="mx-1">•</span>
                                        {x.participants.length} {t('detail.members')}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                    <span>{t('dash.progress')}</span>
                                    <span className="text-slate-900 dark:text-white">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                                        isArchived ? 'bg-slate-400 dark:bg-slate-600' :
                                        isCompleted ? 'bg-indigo-400 dark:bg-indigo-500' :
                                        isDaily ? 'bg-amber-500' : 
                                        'bg-gradient-to-r from-teal-400 to-emerald-500'
                                    }`} 
                                    style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">{t('detail.total_payout')}</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(x.amount * x.participants.length)}
                                </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-colors group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:text-white dark:text-slate-300`}>
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
                                ? 'text-slate-300 border-slate-100 cursor-not-allowed dark:text-slate-600 dark:border-slate-800' 
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                            }`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            {t('dash.page')} {currentPage} {t('dash.of')} {totalPages}
                        </div>

                        <button 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg border transition-all ${
                                currentPage === totalPages 
                                ? 'text-slate-300 border-slate-100 cursor-not-allowed dark:text-slate-600 dark:border-slate-800' 
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                            }`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;