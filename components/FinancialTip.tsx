import React, { useState, useEffect } from 'react';
import { Lightbulb, Info, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type TipContext = 'group' | 'individual' | 'withdrawal' | 'general';

interface FinancialTipProps {
  context: TipContext;
}

const FinancialTip: React.FC<FinancialTipProps> = ({ context }) => {
  const { t } = useLanguage();
  const [tipKey, setTipKey] = useState<string>('');

  useEffect(() => {
    // Select a random tip key based on context
    const tips = {
      group: ['tip.group_1', 'tip.group_2'],
      individual: ['tip.ind_1', 'tip.ind_2'],
      withdrawal: ['tip.with_1', 'tip.with_2'],
      general: ['tip.group_1', 'tip.ind_1']
    };

    const availableTips = tips[context] || tips.general;
    const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)];
    setTipKey(randomTip);
  }, [context]);

  const isWarning = context === 'withdrawal';

  return (
    <div className={`rounded-xl p-4 border flex items-start gap-3 transition-all animate-fade-in ${
      isWarning 
        ? 'bg-amber-50 border-amber-200 text-amber-900' 
        : 'bg-indigo-50 border-indigo-100 text-indigo-900'
    }`}>
      <div className={`p-2 rounded-lg ${isWarning ? 'bg-amber-100' : 'bg-indigo-100'}`}>
        {isWarning ? <ShieldAlert size={20} className="text-amber-600" /> : <Lightbulb size={20} className="text-indigo-600" />}
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">
          {t('tip.did_you_know')}
        </h4>
        <p className="text-sm font-medium leading-relaxed">
          {t(tipKey)}
        </p>
      </div>
    </div>
  );
};

export default FinancialTip;