import React, { useState, useEffect } from 'react';
import { Sparkles, Target, Calendar, AlertCircle, ArrowRight, Loader2, Info, History } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { generateGoalPlan, getAIHistory, StoredAnalysis, PlanResult } from '../services/geminiService';

const AIGoalPlanner: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<StoredAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const data = await getAIHistory(user.id, 'GOAL_PLAN');
    setHistory(data);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    setPlan(null);

    try {
      const result = await generateGoalPlan(prompt, language, user?.id);
      setPlan(result);
      loadHistory(); // Refresh history
    } catch (err) {
      console.error(err);
      setError(t('planner.error') || "Não foi possível gerar o plano. Tente ser mais específico com valores e datas.");
    } finally {
      setLoading(false);
    }
  };

  const useHistoryItem = (item: StoredAnalysis) => {
    setPlan(item.result);
    setPrompt(item.input_data.prompt);
    setShowHistory(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold mb-4 border border-emerald-500/30">
            <Sparkles size={16} />
            <span>AI Powered</span>
          </div>
          <h2 className="text-3xl font-extrabold mb-2">{t('planner.title') || "Planejador de Metas com IA"}</h2>
          <p className="text-emerald-100/80 max-w-xl text-lg">
            {t('planner.subtitle') || "Diga o que quer comprar e quando. A IA cria o plano de Xitique perfeito."}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          {language === 'pt' ? 'Qual é o seu objetivo?' : 'What is your goal?'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('planner.placeholder') || "Ex: Quero comprar uma geleira de 15.000 MT em Dezembro..."}
          className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none h-32"
        />
        
        {error && (
          <div className="mt-4 p-4 bg-coral-50 dark:bg-coral-900/20 text-coral-600 dark:text-coral-400 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          {history.length > 0 && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm font-bold"
            >
              <History size={16} />
              {showHistory ? 'Ocultar Histórico' : 'Ver Histórico'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t('planner.generating') || "Analisando..."}</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>{t('planner.btn_generate') || "Criar Plano"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="text-slate-400" size={18} />
            Histórico de Planos
          </h3>
          <div className="space-y-3">
            {history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => useHistoryItem(item)}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">
                    {item.input_data.prompt.substring(0, 40)}...
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {item.result.targetAmount} MT • {item.result.frequency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="text-emerald-500" />
            {t('planner.result_title') || "Seu Plano de Ação"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('planner.target_amount') || "Objetivo Total"}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {plan.targetAmount.toLocaleString()} <span className="text-sm text-slate-500">{t('common.currency')}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">{t('planner.contribution') || "Contribuição Ideal"}</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {plan.contribution.toLocaleString()} <span className="text-sm opacity-70">{t('common.currency')}</span>
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">{plan.frequency}</div>
            </div>
            <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30">
              <div className="text-sm text-cyan-600 dark:text-cyan-400 mb-1">{t('planner.ideal_month') || "Mês Ideal"}</div>
              <div className="text-2xl font-black text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <Calendar size={24} />
                {plan.idealMonth}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Info size={18} className="text-emerald-500" />
              {t('planner.explanation') || "Por que este plano?"}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {plan.explanation}
            </p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              {language === 'pt' ? 'Criar Grupo com este Plano' : 'Create Group with this Plan'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGoalPlanner;
