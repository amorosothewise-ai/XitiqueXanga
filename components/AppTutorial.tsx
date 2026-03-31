import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  X,
  UserPlus,
  Play
} from 'lucide-react';
import { formatCurrency } from '../services/formatUtils';

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

const AppTutorial: React.FC<Props> = ({ onComplete, onClose }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  
  // Simulation State
  const [simName, setSimName] = useState('');
  const [simAmount, setSimAmount] = useState(1000);
  const [simFreq, setSimFreq] = useState('MONTHLY');
  const [simMembers, setSimMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      setSimMembers([...simMembers, newMemberName.trim()]);
      setNewMemberName('');
    }
  };

  const steps = [
    {
      id: 'welcome',
      title: t('tut.welcome_title'),
      desc: t('tut.welcome_desc'),
      icon: <Sparkles className="text-amber-500" size={48} />,
      render: () => (
        <div className="flex flex-col items-center justify-center py-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-amber-50 p-8 rounded-full mb-6"
          >
            <Sparkles className="text-amber-500" size={64} />
          </motion.div>
          <button 
            onClick={() => setStep(1)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Play size={20} /> {t('tut.simulate_btn')}
          </button>
        </div>
      )
    },
    {
      id: 'name_amount',
      title: t('tut.step1_title'),
      desc: t('tut.step1_desc'),
      icon: <DollarSign className="text-emerald-500" size={32} />,
      render: () => (
        <div className="space-y-6 py-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome do Grupo</label>
            <input 
              type="text" 
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="Ex: Família, Amigos..."
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 dark:text-slate-200"
              autoFocus
            />
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Valor da Contribuição</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="font-black text-emerald-600 text-xl min-w-[100px] text-right">
                {formatCurrency(simAmount)}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'frequency',
      title: t('tut.step2_title'),
      desc: t('tut.step2_desc'),
      icon: <Calendar className="text-blue-500" size={32} />,
      render: () => (
        <div className="grid grid-cols-1 gap-4 py-4">
          {['DAILY', 'WEEKLY', 'MONTHLY'].map((f) => (
            <button
              key={f}
              onClick={() => setSimFreq(f)}
              className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between ${simFreq === f ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${simFreq === f ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Calendar size={24} />
                </div>
                <div className="text-left">
                  <div className={`font-bold ${simFreq === f ? 'text-blue-900' : 'text-slate-700'}`}>
                    {f === 'DAILY' ? 'Diário' : f === 'WEEKLY' ? 'Semanal' : 'Mensal'}
                  </div>
                  <div className="text-xs text-slate-400">Ciclo de pagamentos {f.toLowerCase()}</div>
                </div>
              </div>
              {simFreq === f && <CheckCircle2 className="text-blue-500" size={24} />}
            </button>
          ))}
        </div>
      )
    },
    {
      id: 'members',
      title: t('tut.step3_title'),
      desc: t('tut.step3_desc'),
      icon: <Users className="text-indigo-500" size={32} />,
      render: () => (
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="Nome do membro..."
              className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            />
            <button 
              onClick={handleAddMember}
              className="bg-indigo-500 text-white p-4 rounded-xl hover:bg-indigo-600 transition-colors"
            >
              <UserPlus size={24} />
            </button>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-4 min-h-[150px] border border-slate-100">
            {simMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <Users size={32} className="mb-2" />
                <p className="text-sm font-medium">Nenhum membro adicionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {simMembers.map((m, i) => (
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={i} 
                    className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {i + 1}
                      </div>
                      <span className="font-bold text-slate-700">{m}</span>
                    </div>
                    <button 
                      onClick={() => setSimMembers(simMembers.filter((_, idx) => idx !== i))}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'finish',
      title: t('tut.step4_title'),
      desc: t('tut.step4_desc'),
      icon: <CheckCircle2 className="text-emerald-500" size={32} />,
      render: () => (
        <div className="py-4 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <div className="relative z-10">
                <h4 className="text-2xl font-black mb-1">{simName || 'Meu Xitique'}</h4>
                <div className="flex items-center gap-2 mb-6">
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Ativo</span>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{simFreq}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Contribuição</div>
                      <div className="text-lg font-black">{formatCurrency(simAmount)}</div>
                   </div>
                   <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Membros</div>
                      <div className="text-lg font-black">{simMembers.length}</div>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-start gap-4">
             <div className="bg-emerald-500 text-white p-2 rounded-xl">
                <Sparkles size={20} />
             </div>
             <p className="text-emerald-800 text-sm font-medium leading-relaxed">
               O sistema gerou automaticamente as datas de recebimento para cada membro. Agora é só acompanhar os pagamentos!
             </p>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-4 md:p-8 pb-3 md:pb-4 flex justify-between items-start">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-1.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl">
              {React.cloneElement(currentStep.icon as React.ReactElement, { size: window.innerWidth < 768 ? 24 : 32 })}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{currentStep.title}</h2>
              <p className="text-slate-500 font-medium text-xs md:text-sm">{currentStep.desc}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep.render()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 md:p-8 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="hidden sm:flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-slate-900' : 'w-1.5 bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="flex gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm md:text-base"
              >
                <ArrowLeft size={18} /> {t('tut.back')}
              </button>
            )}
            
            {step < steps.length - 1 ? (
              <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !simName}
                className="bg-slate-900 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base ml-auto sm:ml-0"
              >
                {t('tut.next')} <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={onComplete}
                className="bg-emerald-500 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 text-sm md:text-base ml-auto sm:ml-0"
              >
                {t('tut.btn_finish')} <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppTutorial;
