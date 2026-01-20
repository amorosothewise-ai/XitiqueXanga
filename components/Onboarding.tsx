
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BookOpen, Shield, Users, ArrowRight } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t('onb.step1_title'),
      desc: t('onb.step1_desc'),
      icon: <BookOpen size={48} className="text-white" />,
      bg: 'bg-emerald-500'
    },
    {
      title: t('onb.step2_title'),
      desc: t('onb.step2_desc'),
      icon: <Users size={48} className="text-white" />,
      bg: 'bg-indigo-500'
    },
    {
      title: t('onb.step3_title'),
      desc: t('onb.step3_desc'),
      icon: <Shield size={48} className="text-white" />,
      bg: 'bg-slate-800'
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
        
        {/* Visual */}
        <div className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center shadow-xl mb-8 transition-colors duration-500 ${steps[step].bg}`}>
           {steps[step].icon}
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{steps[step].title}</h1>
        <p className="text-slate-500 text-lg leading-relaxed mb-10 h-20">
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
