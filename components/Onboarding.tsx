
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BookOpen, Shield, Users, ArrowRight, Lock, Unlock, Shuffle, CheckCircle2, Cloud, UploadCloud } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // Interactive States
  const [demoList, setDemoList] = useState(['Ana', 'João', 'Maria']);
  const [isLocked, setIsLocked] = useState(false);
  const [isDigitized, setIsDigitized] = useState(false);

  useEffect(() => {
      // Reset interaction states when step changes
      if (step === 0) setIsDigitized(false);
      if (step === 1) setDemoList(['Ana', 'João', 'Maria']);
      if (step === 2) setIsLocked(false);
  }, [step]);

  const handleShuffleDemo = () => {
      const shuffled = [...demoList];
      // Simple shift for demo purposes
      shuffled.push(shuffled.shift()!);
      setDemoList(shuffled);
  };

  const steps = [
    {
      title: t('onb.step1_title'),
      desc: t('onb.step1_desc'),
      renderVisual: () => (
          <div className="relative w-48 h-32 flex items-center justify-center cursor-pointer group" onClick={() => setIsDigitized(!isDigitized)}>
              {/* Notebook State */}
              <div className={`absolute transition-all duration-700 transform ${isDigitized ? 'scale-0 opacity-0 translate-y-10' : 'scale-100 opacity-100'}`}>
                  <div className="w-24 h-32 bg-amber-100 border-4 border-amber-200 rounded-r-lg shadow-lg relative flex flex-col justify-center items-center">
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-amber-300 border-r border-amber-400"></div>
                        <div className="w-12 h-1 bg-slate-300 mb-2 rounded-full"></div>
                        <div className="w-12 h-1 bg-slate-300 mb-2 rounded-full"></div>
                        <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
                        <div className="absolute -bottom-8 text-xs font-bold text-slate-400 animate-bounce">Click me</div>
                  </div>
              </div>

              {/* Digital Cloud State */}
              <div className={`absolute transition-all duration-700 transform ${isDigitized ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 -translate-y-10'}`}>
                  <div className="bg-emerald-500 text-white p-4 rounded-3xl shadow-xl shadow-emerald-200 flex items-center gap-3">
                      <Cloud size={32} />
                      <div>
                          <div className="h-2 w-12 bg-white/50 rounded-full mb-1"></div>
                          <div className="h-2 w-8 bg-white/50 rounded-full"></div>
                      </div>
                      <div className="bg-white text-emerald-500 rounded-full p-1"><CheckCircle2 size={16} /></div>
                  </div>
              </div>
          </div>
      )
    },
    {
      title: t('onb.step2_title'),
      desc: t('onb.step2_desc'),
      renderVisual: () => (
          <div className="w-56 bg-white p-4 rounded-2xl shadow-xl border border-indigo-50 relative overflow-hidden">
              <div className="flex justify-between items-center mb-3 border-b border-indigo-50 pb-2">
                  <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Fair Rotation</div>
                  <button onClick={handleShuffleDemo} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors">
                      <Shuffle size={14} />
                  </button>
              </div>
              <div className="space-y-2">
                  {demoList.map((name, i) => (
                      <div key={name} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl animate-fade-in transition-all border border-transparent hover:border-indigo-100">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${i === 0 ? 'bg-emerald-400 scale-110' : 'bg-slate-300'}`}>{i+1}</div>
                          <div className={`text-xs font-bold ${i === 0 ? 'text-slate-800' : 'text-slate-500'}`}>{name}</div>
                          {i === 0 && <div className="ml-auto text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">PAYOUT</div>}
                      </div>
                  ))}
              </div>
          </div>
      )
    },
    {
      title: t('onb.step3_title'),
      desc: t('onb.step3_desc'),
      renderVisual: () => (
          <div 
            className={`w-36 h-36 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer relative group ${isLocked ? 'bg-emerald-500 rotate-0' : 'bg-slate-800 -rotate-3 hover:rotate-0'}`}
            onClick={() => setIsLocked(!isLocked)}
          >
             <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300">
                 {isLocked ? (
                     <div className="flex flex-col items-center animate-fade-in">
                         <Shield size={48} className="text-white mb-2" />
                         <span className="text-[10px] font-bold text-white uppercase tracking-widest">Secured</span>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center">
                         <Unlock size={48} className="text-slate-400 mb-2 group-hover:text-white transition-colors" />
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Tap to Lock</span>
                     </div>
                 )}
             </div>
             
             {/* Particles */}
             {isLocked && (
                 <>
                    <div className="absolute top-4 right-6 w-2 h-2 bg-white/40 rounded-full animate-ping"></div>
                    <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse"></div>
                 </>
             )}
          </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md text-center">
        
        {/* Visual Container */}
        <div className="h-56 flex items-center justify-center mb-8 bg-slate-50 rounded-3xl w-full max-w-xs mx-auto">
           {steps[step].renderVisual()}
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{steps[step].title}</h1>
        <p className="text-slate-500 text-lg leading-relaxed mb-10 h-24 px-4">
            {steps[step].desc}
        </p>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mb-10">
            {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-500 ${i === step ? 'w-10 bg-emerald-500 shadow-lg shadow-emerald-200' : 'w-2 bg-slate-200'}`}
                />
            ))}
        </div>

        {/* Actions */}
        <button 
            onClick={handleNext}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-2 hover:translate-y-[-2px]"
        >
            {step === steps.length - 1 ? t('onb.btn_start') : t('onb.btn_next')} 
            {step < steps.length - 1 && <ArrowRight size={20} />}
        </button>
        
        <button onClick={onComplete} className="mt-6 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors">
            {t('onb.btn_skip')}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
