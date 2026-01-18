import React, { useState, useEffect } from 'react';
import { Frequency, Xitique, PaymentMethod } from '../types';
import { createNewXitique, saveXitique } from '../services/storage';
import { addPeriod, formatDate } from '../services/dateUtils';
import { ChevronRight, ChevronLeft, Check, UserPlus, Trash2, ArrowUp, ArrowDown, Calendar, GripVertical, Lock, Unlock, Smartphone, Banknote, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

interface WizardProps {
  onComplete: () => void;
  onCancel: () => void;
  initialData?: Xitique | null; // For Renewal Flow
}

const Wizard: React.FC<WizardProps> = ({ onComplete, onCancel, initialData }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(100);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.MPESA);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [participantNames, setParticipantNames] = useState<string[]>(['', '']);
  
  const [orderedParticipants, setOrderedParticipants] = useState<string[]>([]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());

  // Initialization Logic for Renewal
  useEffect(() => {
    if (initialData) {
        setName(`${initialData.name} (Cycle 2)`);
        setAmount(initialData.amount);
        setFrequency(initialData.frequency);
        if(initialData.method) setMethod(initialData.method);
        
        // Extract names from previous participants
        const names = initialData.participants.map(p => p.name);
        setParticipantNames(names);
        
        // Ensure start date is today or future, not old date
        setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

  useEffect(() => {
    if (step === 3 && orderedParticipants.length === 0) {
        setOrderedParticipants(participantNames.filter(n => n.trim() !== ''));
    }
  }, [step, participantNames]);

  const handleAddParticipant = () => {
    setParticipantNames([...participantNames, '']);
  };

  const handleRemoveParticipant = (index: number) => {
    const newNames = [...participantNames];
    newNames.splice(index, 1);
    setParticipantNames(newNames);
  };

  const handleNameChange = (index: number, val: string) => {
    const newNames = [...participantNames];
    newNames[index] = val;
    setParticipantNames(newNames);
  };

  const toggleLock = (index: number) => {
    const newSet = new Set(lockedIndices);
    if (newSet.has(index)) {
        newSet.delete(index);
    } else {
        newSet.add(index);
    }
    setLockedIndices(newSet);
  };

  const moveParticipant = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedParticipants];
    const newLocked = new Set(lockedIndices);

    const swap = (i1: number, i2: number) => {
        [newOrder[i1], newOrder[i2]] = [newOrder[i2], newOrder[i1]];
        const locked1 = newLocked.has(i1);
        const locked2 = newLocked.has(i2);
        
        if (locked1) { newLocked.delete(i1); newLocked.add(i2); }
        if (locked2) { newLocked.delete(i2); newLocked.add(i1); }
    };

    if (direction === 'up' && index > 0) {
        swap(index, index - 1);
    } else if (direction === 'down' && index < newOrder.length - 1) {
        swap(index, index + 1);
    }
    setOrderedParticipants(newOrder);
    setLockedIndices(newLocked);
  };

  const handleFinish = () => {
    // Generate NEW IDs for participants to ensure no reference linking to old cycle
    const participants = orderedParticipants.map((pName, index) => ({
      id: crypto.randomUUID(),
      name: pName,
      received: false,
      order: index + 1,
      payoutDate: addPeriod(startDate, frequency, index)
    }));
    
    const newXitique = createNewXitique({
      name,
      amount,
      frequency,
      method,
      startDate: new Date(startDate).toISOString(),
      participants
    });

    saveXitique(newXitique);
    addToast(t('common.success'), 'success');
    onComplete();
  };

  const isRenewal = !!initialData;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl mx-auto border border-slate-200 font-sans">
      {/* Header */}
      <div className={`${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} p-8 text-white flex justify-between items-center relative overflow-hidden transition-colors`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
              {isRenewal && <RefreshCw size={24} className="text-emerald-400" />}
              <h2 className="text-3xl font-bold tracking-tight">{isRenewal ? t('wiz.title_renew') : t('wiz.title')}</h2>
          </div>
          <p className="text-slate-400 text-sm mt-1">{t('wiz.subtitle')}</p>
        </div>
        
        {/* Progress Dots */}
        <div className="flex space-x-3 relative z-10">
          {[1, 2, 3, 4].map((s) => (
             <div 
                key={s} 
                className={`transition-all duration-500 ${step === s ? 'w-10 bg-emerald-400' : step > s ? 'w-3 bg-emerald-800' : 'w-3 bg-slate-700'} h-3 rounded-full`} 
             />
          ))}
        </div>
        
        {/* Abstract Deco */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 transform -skew-x-12 translate-x-10"></div>
      </div>

      <div className="p-8 md:p-10 bg-slate-50/50">
        
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full ${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-center text-sm`}>1</span>
                    {t('wiz.step1')}
                </h3>
                
                <div className="group mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_name')}</label>
                <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('wiz.placeholder_name')}
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    autoFocus
                />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_amount')}</label>
                    <div className="relative">
                    <span className="absolute left-4 top-4 text-slate-400 font-bold">{t('common.currency')}</span>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full p-4 pl-12 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-lg"
                    />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_freq')}</label>
                    <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => setFrequency(Frequency.WEEKLY)}
                        className={`py-4 px-2 rounded-xl text-xs font-bold transition-all border ${frequency === Frequency.WEEKLY ? 'bg-slate-900 text-emerald-400 border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {t('wiz.weekly')}
                    </button>
                    <button 
                        onClick={() => setFrequency(Frequency.MONTHLY)}
                        className={`py-4 px-2 rounded-xl text-xs font-bold transition-all border ${frequency === Frequency.MONTHLY ? 'bg-slate-900 text-emerald-400 border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {t('wiz.monthly')}
                    </button>
                    <button 
                        onClick={() => setFrequency(Frequency.DAILY)}
                        className={`py-4 px-2 rounded-xl text-xs font-bold transition-all border ${frequency === Frequency.DAILY ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {t('wiz.daily')}
                    </button>
                    </div>
                </div>
                </div>

                <div className="mb-6">
                   <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_method')}</label>
                   <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: PaymentMethod.MPESA, label: 'M-Pesa', icon: Smartphone },
                        { id: PaymentMethod.EMOLA, label: 'e-Mola', icon: Smartphone },
                        { id: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMethod(m.id)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                                method === m.id
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <m.icon size={16} />
                            {m.label}
                        </button>
                    ))}
                  </div>
                </div>

                <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_start')}</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                </div>
            </div>
          </div>
        )}

        {/* STEP 2: PARTICIPANTS */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full ${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-center text-sm`}>2</span>
                    {t('wiz.step2')}
                </h3>
                <p className="text-sm text-slate-500 mb-6 ml-10">
                    {t('wiz.add_member_desc')}
                </p>
                
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {participantNames.map((pName, idx) => (
                    <div key={idx} className="flex items-center gap-3 animate-fade-in">
                    <span className="bg-slate-100 text-slate-400 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold border border-slate-200">
                        {idx + 1}
                    </span>
                    <input
                        type="text"
                        placeholder={t('wiz.placeholder_member')}
                        value={pName}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        autoFocus={idx === participantNames.length - 1 && idx > 0}
                    />
                    {participantNames.length > 2 && (
                        <button onClick={() => handleRemoveParticipant(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={20} />
                        </button>
                    )}
                    </div>
                ))}
                </div>

                <button 
                onClick={handleAddParticipant}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all mt-4"
                >
                <UserPlus size={18} className="mr-2" /> {t('wiz.btn_add_member')}
                </button>
            </div>
          </div>
        )}

        {/* STEP 3: ORDERING (ALGORITHM OF JUSTICE) */}
        {step === 3 && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-full ${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-center text-sm`}>3</span>
                            {t('wiz.algo_title')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 ml-10">{t('wiz.algo_desc')}</p>
                    </div>
                </div>
                
                <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {orderedParticipants.map((pName, idx) => {
                        const calculatedDate = addPeriod(startDate, frequency, idx);
                        const isLast = idx === orderedParticipants.length - 1;
                        const isFirst = idx === 0;
                        const isLocked = lockedIndices.has(idx);

                        return (
                            <div 
                                key={idx} 
                                className={`flex items-center gap-4 border p-4 rounded-xl transition-all duration-300 group ${
                                    isLocked 
                                        ? 'bg-rose-50 border-rose-200 shadow-md transform scale-[1.01]' 
                                        : 'bg-white border-slate-100 hover:border-emerald-300 hover:shadow-md'
                                }`}
                            >
                                <div className={`cursor-grab ${isLocked ? 'text-rose-400' : 'text-slate-300'}`}>
                                    <GripVertical size={20} />
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isLocked ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className={`font-bold text-lg ${isLocked ? 'text-rose-700' : 'text-slate-800'}`}>
                                                {pName}
                                            </span>
                                        </div>
                                        
                                        <div className={`flex items-center text-sm font-semibold px-3 py-1.5 rounded-lg ${isLocked ? 'bg-rose-200 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>
                                            <Calendar size={14} className="mr-2" />
                                            {formatDate(calculatedDate)}
                                        </div>
                                    </div>
                                </div>

                                {/* Lock Control */}
                                <button 
                                    onClick={() => toggleLock(idx)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        isLocked 
                                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                                        : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                                    }`}
                                    title={isLocked ? t('wiz.unlock') : t('wiz.lock')}
                                >
                                    {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                </button>

                                {/* Movement Controls */}
                                <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={() => moveParticipant(idx, 'up')}
                                        disabled={isFirst}
                                        className={`p-1 rounded hover:bg-slate-100 ${isFirst ? 'text-slate-200' : 'text-slate-400 hover:text-emerald-600'}`}
                                    >
                                        <ArrowUp size={18} />
                                    </button>
                                    <button 
                                        onClick={() => moveParticipant(idx, 'down')}
                                        disabled={isLast}
                                        className={`p-1 rounded hover:bg-slate-100 ${isLast ? 'text-slate-200' : 'text-slate-400 hover:text-emerald-600'}`}
                                    >
                                        <ArrowDown size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <div className="animate-fade-in text-center py-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100/50">
              <Check size={48} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-3">{t('wiz.system_ready')}</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
              {t('wiz.ready_desc')}
              <br />
              <span className="text-slate-400 text-sm">{t('wiz.total_pot')}</span> <strong className="text-emerald-600 text-2xl">{t('common.currency')} {amount * participantNames.filter(n => n).length}</strong>
            </p>
            
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-left shadow-sm max-w-lg mx-auto">
               <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">{t('wiz.summary')}</h4>
               <ul className="space-y-4 text-sm">
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.first_payout')}</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">{orderedParticipants[0]}</span>
                 </li>
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.last_payout')}</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">{orderedParticipants[orderedParticipants.length-1]}</span>
                 </li>
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.locked_dates')}</span>
                    <span className={`font-bold px-2 py-1 rounded ${lockedIndices.size > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-900'}`}>{lockedIndices.size} {t('wiz.members_count')}</span>
                 </li>
               </ul>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between mt-10 pt-6 border-t border-slate-200">
          {step === 1 ? (
            <button onClick={onCancel} className="text-slate-400 font-semibold hover:text-slate-600 px-4">
              {t('wiz.btn_cancel')}
            </button>
          ) : (
            <button onClick={() => setStep(step - 1)} className="flex items-center text-slate-500 font-semibold hover:text-slate-800 px-4">
              <ChevronLeft size={20} className="mr-1" /> {t('wiz.btn_back')}
            </button>
          )}

          {step < 4 ? (
            <button 
              onClick={() => {
                if(step === 1 && !name) { addToast(t('wiz.alert_name'), 'error'); return; }
                if(step === 2) {
                     const valid = participantNames.filter(n => n.trim() !== '');
                     if (valid.length < 2) { addToast(t('wiz.alert_members'), 'error'); return; }
                     if (valid.length !== orderedParticipants.length) {
                         setOrderedParticipants(valid);
                     }
                }
                setStep(step + 1)
              }} 
              className={`${isRenewal ? 'bg-indigo-900 hover:bg-indigo-800' : 'bg-slate-900 hover:bg-slate-800'} text-white px-8 py-4 rounded-xl font-semibold flex items-center shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-1`}
            >
              {t('wiz.btn_next')} <ChevronRight size={20} className="ml-1" />
            </button>
          ) : (
            <button 
              onClick={handleFinish} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold flex items-center shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1"
            >
              {isRenewal ? t('wiz.btn_launch_renew') : t('wiz.btn_launch')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wizard;