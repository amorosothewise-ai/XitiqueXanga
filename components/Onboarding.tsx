
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BookOpen, Shield, Users, ArrowRight, Lock, Unlock, Shuffle, CheckCircle2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // Interactive States
  const [demoList, setDemoList] = useState(['Ana', 'João', 'Maria']);
  const [isLocked, setIsLocked] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
      // Reset interaction states when step changes
      if (step === 0) setShowCard(false);
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
          <div className="relative w-32 h-32 flex items-center justify-center cursor-pointer group" onClick={() => setShowCard(!showCard)}>
              <div className={`absolute inset-0 bg-emerald-500 rounded-3xl transition-all duration-500 flex items-center justify-center shadow-lg ${showCard ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                  <BookOpen size={48} className="text-white" />
              </div>
              
              <div className={`absolute inset-0 bg-white rounded-3xl border-2 border-emerald-100 shadow-xl flex flex-col p-3 transition-all duration-500 transform ${showCard ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-12'}`}>
                  <div className="h-2 w-12 bg-emerald-500 rounded-full mb-2"></div>
                  <div className="space-y-1">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full"></div>
                      <div className="h-1.5 w-3/4 bg-slate-100 rounded-full"></div>
                  </div>
                  <div className="mt-auto flex justify-end">
                      <div className="bg-emerald-50 p-1.5 rounded-full">
                          <CheckCircle2 size={12} className="text-emerald-500"/>
                      </div>
                  </div>
              </div>
              {!showCard && <div className="absolute -bottom-6 text-xs font-bold text-slate-300 animate-bounce">Tap me</div>}
          </div>
      )
    },
    {
      title: t('onb.step2_title'),
      desc: t('onb.step2_desc'),
      renderVisual: () => (
          <div className="w-48 bg-white p-3 rounded-2xl shadow-xl border border-indigo-50">
              <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-bold text-indigo-900 uppercase">Rotation</div>
                  <button onClick={handleShuffleDemo} className="p-1 hover:bg-indigo-50 rounded text-indigo-500">
                      <Shuffle size={12} />
                  </button>
              </div>
              <div className="space-y-1.5">
                  {demoList.map((name, i) => (
                      <div key={name} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg animate-fade-in">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${i === 0 ? 'bg-emerald-400' : 'bg-slate-300'}`}>{i+1}</div>
                          <div className="text-xs font-medium text-slate-600">{name}</div>
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
            className={`w-32 h-32 rounded-3xl flex items-center justify-center shadow-xl transition-colors duration-500 cursor-pointer relative ${isLocked ? 'bg-emerald-600' : 'bg-slate-800'}`}
            onClick={() => setIsLocked(!isLocked)}
          >
             <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300">
                 {isLocked ? <Lock size={48} className="text-white" /> : <Unlock size={48} className="text-slate-400" />}
             </div>
             {!isLocked && <div className="absolute -bottom-6 text-xs font-bold text-slate-300 animate-pulse">Tap to Secure</div>}
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
        <div className="h-48 flex items-center justify-center mb-6">
           {steps[step].renderVisual()}
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{steps[step].title}</h1>
        <p className="text-slate-500 text-lg leading-relaxed mb-10 h-20 px-4">
            {steps[step].desc}
        </p>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mb-10">
            {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`}
                />
            ))}
        </div>

        {/* Actions */}
        <button 
            onClick={handleNext}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-transform transform active:scale-95 flex items-center justify-center gap-2"
        >
            {step === steps.length - 1 ? t('onb.btn_start') : t('onb.btn_next')} 
            {step < steps.length - 1 && <ArrowRight size={20} />}
        </button>
        
        <button onClick={onComplete} className="mt-4 text-slate-400 font-semibold text-sm hover:text-slate-600">
            {t('onb.btn_skip')}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
