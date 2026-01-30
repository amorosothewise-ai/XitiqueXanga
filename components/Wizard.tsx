
import React, { useState, useEffect, useRef } from 'react';
import { Frequency, Xitique, PaymentMethod, ContributionMode, XitiqueStatus } from '../types';
import { createNewXitique, saveXitique } from '../services/storage';
import { addPeriod, formatDate } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { ChevronRight, ChevronLeft, Check, UserPlus, Trash2, ArrowUp, ArrowDown, Calendar, GripVertical, Lock, Unlock, Smartphone, Banknote, RefreshCw, Loader2, Scale, BarChart3, Shuffle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

interface WizardProps {
  onComplete: () => void;
  onCancel: () => void;
  initialData?: Xitique | null; 
}

// Helper interface for local state with a stable ID for rendering
interface ParticipantInput {
    tempId: string;
    name: string;
    amount: number | string;
}

const Wizard: React.FC<WizardProps> = ({ onComplete, onCancel, initialData }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>(''); // Empty by default to avoid leading 0
  const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.MPESA);
  const [contributionMode, setContributionMode] = useState<ContributionMode>(ContributionMode.UNIFORM);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Participants now have a tempId for stable React keys
  const [participantsData, setParticipantsData] = useState<ParticipantInput[]>([
      { tempId: crypto.randomUUID(), name: '', amount: '' }, 
      { tempId: crypto.randomUUID(), name: '', amount: '' }
  ]);
  
  const [orderedParticipants, setOrderedParticipants] = useState<{name: string, amount: number}[]>([]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());

  // Ref to scroll to bottom when adding member
  const listEndRef = useRef<HTMLDivElement>(null);

  // Initialization Logic for Renewal
  useEffect(() => {
    if (initialData) {
        setName(`${initialData.name} (Cycle 2)`);
        setAmount(initialData.amount);
        setFrequency(initialData.frequency);
        if(initialData.method) setMethod(initialData.method);
        
        // Detect if it was variable before by checking if any custom contributions existed
        const hasCustom = initialData.participants.some(p => p.customContribution !== undefined && p.customContribution !== initialData.amount);
        setContributionMode(hasCustom ? ContributionMode.VARIABLE : ContributionMode.UNIFORM);

        // Extract names and amounts
        const pData = initialData.participants.map(p => ({
            tempId: crypto.randomUUID(),
            name: p.name,
            amount: p.customContribution !== undefined ? p.customContribution : initialData.amount
        }));
        setParticipantsData(pData);
        
        // Ensure start date is today or future, not old date
        setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData]);

  // When contribution mode changes to uniform, reset all individual amounts to base amount
  useEffect(() => {
    if (contributionMode === ContributionMode.UNIFORM) {
        const val = amount === '' ? '' : amount;
        setParticipantsData(prev => prev.map(p => ({ ...p, amount: val })));
    }
  }, [contributionMode, amount]);

  // When entering Step 3, init the ordered list if empty
  useEffect(() => {
    if (step === 3 && orderedParticipants.length === 0) {
        // Convert any strings to numbers for the ordered list
        const cleanData = participantsData
            .filter(p => p.name.trim() !== '')
            .map(p => ({
                name: p.name,
                amount: Number(p.amount) || 0
            }));
        setOrderedParticipants(cleanData);
    }
  }, [step, participantsData]);

  // Scroll to new participant logic
  useEffect(() => {
    if (step === 2 && participantsData.length > 2) {
       // Small timeout to allow render
       setTimeout(() => {
         listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }, 100);
    }
  }, [participantsData.length, step]);

  const handleAddParticipant = () => {
    // Add new participant with unique tempId
    setParticipantsData([
        ...participantsData, 
        { 
            tempId: crypto.randomUUID(), 
            name: '', 
            amount: contributionMode === ContributionMode.UNIFORM ? amount : '' 
        }
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    const newData = [...participantsData];
    newData.splice(index, 1);
    setParticipantsData(newData);
  };

  const handleNameChange = (index: number, val: string) => {
    const newData = [...participantsData];
    newData[index].name = val;
    setParticipantsData(newData);
  };

  const handleAmountChange = (index: number, val: string) => {
    const newData = [...participantsData];
    // Allow empty string to be set, otherwise parse float
    if (val === '') {
        newData[index].amount = '';
    } else {
        newData[index].amount = val; // Keep as string while typing to prevent cursor jumps
    }
    setParticipantsData(newData);
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
    
    // Safety check: Cannot move locked items manually (UX choice to enforce "Locked")
    if (lockedIndices.has(index)) return;

    const swap = (i1: number, i2: number) => {
        // We do not allow swapping IF the target is also locked (optional, but safer)
        if (lockedIndices.has(i2)) {
             return; 
        }
        [newOrder[i1], newOrder[i2]] = [newOrder[i2], newOrder[i1]];
    };

    if (direction === 'up' && index > 0) {
        if (lockedIndices.has(index - 1)) {
            addToast('Position above is locked', 'error');
            return;
        }
        swap(index, index - 1);
    } else if (direction === 'down' && index < newOrder.length - 1) {
        if (lockedIndices.has(index + 1)) {
            addToast('Position below is locked', 'error');
            return;
        }
        swap(index, index + 1);
    }
    setOrderedParticipants(newOrder);
  };

  const handleShuffle = () => {
    const newOrder = [...orderedParticipants];
    
    // 1. Identify available slots (indices that are NOT locked)
    const availableSlots = newOrder.map((_, i) => i).filter(i => !lockedIndices.has(i));
    
    if (availableSlots.length < 2) {
        addToast("Precisa de pelo menos 2 posições livres para misturar", 'info');
        return;
    }

    // 2. Build map of previous positions if this is a renewal (Smart Shuffle Logic)
    const prevPositionMap = new Map<string, number>();
    if (initialData && initialData.participants) {
        initialData.participants.forEach(p => {
            // Map Name -> 0-based Index from previous cycle
            prevPositionMap.set(p.name, p.order - 1);
        });
    }

    const peopleToShuffle = availableSlots.map(i => newOrder[i]);
    
    let bestShuffledPeople = [...peopleToShuffle];
    let minCollisions = Infinity;

    // 3. Attempt shuffle multiple times to find best "derangement" (least overlap with previous cycle)
    const maxAttempts = (initialData && availableSlots.length > 2) ? 20 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Fisher-Yates Shuffle
        const currentShuffle = [...peopleToShuffle];
        for (let i = currentShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentShuffle[i], currentShuffle[j]] = [currentShuffle[j], currentShuffle[i]];
        }

        // Check collisions with previous cycle
        let collisions = 0;
        if (initialData) {
            availableSlots.forEach((slotIndex, i) => {
                const person = currentShuffle[i];
                const prevIndex = prevPositionMap.get(person.name);
                
                // Collision if they are in the exact same slot as before
                if (prevIndex === slotIndex) {
                    collisions++;
                }
            });
        }

        if (collisions < minCollisions) {
            minCollisions = collisions;
            bestShuffledPeople = currentShuffle;
        }

        if (collisions === 0) break;
    }

    // 4. Put them back into the available slots
    availableSlots.forEach((slotIndex, i) => {
        newOrder[slotIndex] = bestShuffledPeople[i];
    });

    setOrderedParticipants(newOrder);

    // Provide context-aware feedback
    if (initialData && minCollisions === 0) {
        addToast('Ordem misturada (Posições anteriores evitadas)', 'success');
    } else {
        addToast('Ordem misturada (Bloqueios mantidos)', 'success');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const finalAmount = Number(amount) || 0;

    // Generate NEW IDs for participants to ensure no reference linking to old cycle
    const participants = orderedParticipants.map((p, index) => ({
      id: crypto.randomUUID(),
      name: p.name,
      received: false,
      order: index + 1,
      payoutDate: addPeriod(startDate, frequency, index),
      // If Uniform, customContribution is undefined. If Variable, use specific amount.
      customContribution: contributionMode === ContributionMode.VARIABLE ? (Number(p.amount) || 0) : undefined
    }));
    
    const status = contributionMode === ContributionMode.VARIABLE ? XitiqueStatus.RISK : XitiqueStatus.PLANNING;

    const newXitique = createNewXitique({
      name,
      amount: finalAmount,
      frequency,
      method,
      startDate: new Date(startDate).toISOString(),
      participants,
      status: status 
    });

    try {
        await saveXitique(newXitique);
        addToast(t('common.success'), 'success');
        onComplete();
    } catch (err) {
        console.error(err);
        addToast('Failed to save. Please try again.', 'error');
        setLoading(false);
    }
  };

  const isRenewal = !!initialData;

  // Calculate Pot Summary
  const estimatedPot = contributionMode === ContributionMode.UNIFORM 
    ? (Number(amount) || 0) * orderedParticipants.length
    : orderedParticipants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl mx-auto border border-slate-200 font-sans pb-0 relative flex flex-col h-[calc(100vh-80px)] md:h-auto">
      {/* Header */}
      <div className={`${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} p-6 md:p-8 text-white flex justify-between items-center relative overflow-hidden transition-colors flex-shrink-0`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
              {isRenewal && <RefreshCw size={24} className="text-emerald-400" />}
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{isRenewal ? t('wiz.title_renew') : t('wiz.title')}</h2>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mt-1">{t('wiz.subtitle')}</p>
        </div>
        
        {/* Progress Dots */}
        <div className="flex space-x-2 md:space-x-3 relative z-10">
          {[1, 2, 3, 4].map((s) => (
             <div 
                key={s} 
                className={`transition-all duration-500 ${step === s ? 'w-6 md:w-10 bg-emerald-400' : step > s ? 'w-2 md:w-3 bg-emerald-800' : 'w-2 md:w-3 bg-slate-700'} h-2 md:h-3 rounded-full`} 
             />
          ))}
        </div>
        
        {/* Abstract Deco */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 transform -skew-x-12 translate-x-10"></div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar relative">
        {/* Extra padding bottom to ensure last item clears the sticky footer on mobile */}
        <div className="p-4 md:p-10 pb-64 md:pb-10">
        
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
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
                        className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base"
                        autoFocus
                    />
                </div>

                {/* Contribution Mode Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.mode_title')}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                            onClick={() => setContributionMode(ContributionMode.UNIFORM)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                contributionMode === ContributionMode.UNIFORM 
                                ? 'border-emerald-500 bg-emerald-50' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className={`p-2 rounded-full ${contributionMode === ContributionMode.UNIFORM ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Scale size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{t('wiz.mode_uniform')}</div>
                                <div className="text-xs text-slate-500">{t('wiz.mode_uniform_desc')}</div>
                            </div>
                        </div>

                        <div 
                            onClick={() => setContributionMode(ContributionMode.VARIABLE)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                contributionMode === ContributionMode.VARIABLE 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className={`p-2 rounded-full ${contributionMode === ContributionMode.VARIABLE ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{t('wiz.mode_variable')}</div>
                                <div className="text-xs text-slate-500">{t('wiz.mode_variable_desc')}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('wiz.label_amount')}</label>
                    <div className="relative">
                    <span className="absolute left-4 top-4 text-slate-400 font-bold">{t('common.currency')}</span>
                    <input 
                        type="number" 
                        inputMode="decimal"
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
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
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base"
                />
                </div>
            </div>
          </div>
        )}

        {/* STEP 2: PARTICIPANTS */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full ${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-center text-sm`}>2</span>
                    {t('wiz.step2')}
                </h3>
                <p className="text-sm text-slate-500 mb-6 ml-10">
                    {t('wiz.add_member_desc')}
                </p>

                {/* Header for table if variable - Desktop Only */}
                <div className="hidden md:flex gap-4 px-2 mb-2 text-xs font-bold text-slate-400 uppercase">
                    <span className="w-10 text-center">#</span>
                    <span className="flex-1">{t('wiz.col_name')}</span>
                    {contributionMode === ContributionMode.VARIABLE && <span className="w-32">{t('wiz.col_amount')}</span>}
                    <span className="w-32">{t('wiz.est_date')}</span>
                    <span className="w-10"></span>
                </div>
                
                {/* List Container */}
                <div className="space-y-4">
                {participantsData.map((p, idx) => {
                    const projectedDate = addPeriod(startDate, frequency, idx);
                    return (
                    // KEY FIX: Using p.tempId instead of idx ensures React tracks inputs correctly and prevents cursor jumping
                    <div key={p.tempId} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 animate-fade-in bg-slate-50 md:bg-white p-4 md:p-0 rounded-xl border border-slate-200 md:border-0 shadow-sm md:shadow-none">
                        
                        {/* Header Row on Mobile Card */}
                        <div className="flex items-center justify-between md:hidden mb-2">
                             <div className="flex items-center gap-2">
                                <span className="bg-white text-slate-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                                    {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Member {idx + 1}</span>
                             </div>
                             {participantsData.length > 2 && (
                                <button onClick={() => handleRemoveParticipant(idx)} className="text-slate-300 hover:text-red-500 p-2 -mr-2">
                                    <Trash2 size={18} />
                                </button>
                             )}
                        </div>

                        {/* Desktop Index */}
                        <span className="hidden md:flex bg-slate-100 text-slate-400 w-10 h-10 items-center justify-center rounded-xl text-sm font-bold border border-slate-200 flex-shrink-0">
                             {idx + 1}
                        </span>

                        {/* Name Input */}
                        <div className="flex-1 flex flex-col gap-1 w-full">
                            <input
                                type="text"
                                placeholder={t('wiz.placeholder_member')}
                                value={p.name}
                                onChange={(e) => handleNameChange(idx, e.target.value)}
                                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-base font-medium"
                                autoComplete="off"
                            />
                             {/* Mobile Estimated Date */}
                            <div className="md:hidden text-xs text-slate-400 mt-1 flex items-center gap-1 pl-1">
                                <Calendar size={10} /> 
                                {t('wiz.est_date')}: <span className="text-slate-600 font-bold">{formatDate(projectedDate)}</span>
                            </div>
                        </div>
                        
                        {/* Variable Amount Input */}
                        {contributionMode === ContributionMode.VARIABLE && (
                             <div className="relative w-full md:w-32 flex-shrink-0 mt-2 md:mt-0">
                                <span className="absolute left-3 top-4 text-slate-400 text-xs font-bold">$</span>
                                <input 
                                    type="number" 
                                    inputMode="decimal"
                                    value={p.amount} 
                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                    className="w-full pl-6 p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900 text-base"
                                    placeholder="0"
                                />
                             </div>
                        )}

                        {/* Desktop Estimated Date */}
                        <div className="hidden md:flex w-32 items-center text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-3 rounded-xl border border-slate-100">
                           <Calendar size={14} className="mr-2 text-slate-400" />
                           {formatDate(projectedDate)}
                        </div>
                        
                        {/* Desktop Delete Button */}
                        {participantsData.length > 2 && (
                            <button onClick={() => handleRemoveParticipant(idx)} className="hidden md:block text-slate-300 hover:text-red-500 transition-colors p-2 flex-shrink-0">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                )})}
                
                {/* Dummy ref to scroll to */}
                <div ref={listEndRef} />
                </div>

                <button 
                onClick={handleAddParticipant}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all mt-4 text-base"
                >
                <UserPlus size={18} className="mr-2" /> {t('wiz.btn_add_member')}
                </button>
            </div>
          </div>
        )}

        {/* STEP 3: ORDERING */}
        {step === 3 && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-full ${isRenewal ? 'bg-indigo-900' : 'bg-slate-900'} text-white flex items-center justify-center text-sm`}>3</span>
                            {t('wiz.algo_title')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 ml-10">{t('wiz.algo_desc')}</p>
                    </div>
                    
                    <button 
                      onClick={handleShuffle}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors border border-slate-200"
                      title="Shuffle non-locked members"
                    >
                       <Shuffle size={16} /> 
                       Misturar
                    </button>
                </div>
                
                <div className="space-y-3 bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {orderedParticipants.map((p, idx) => {
                        const calculatedDate = addPeriod(startDate, frequency, idx);
                        const isLast = idx === orderedParticipants.length - 1;
                        const isFirst = idx === 0;
                        const isLocked = lockedIndices.has(idx);

                        return (
                            <div 
                                key={idx} 
                                className={`flex items-center gap-2 md:gap-4 border p-3 md:p-4 rounded-xl transition-all duration-300 group ${
                                    isLocked 
                                        ? 'bg-rose-50 border-rose-200 shadow-md transform scale-[1.01]' 
                                        : 'bg-white border-slate-100 hover:border-emerald-300 hover:shadow-md'
                                }`}
                            >
                                {/* Drag Handle - Hidden on Mobile */}
                                <div className={`hidden md:block cursor-grab ${isLocked ? 'text-rose-400 cursor-not-allowed opacity-50' : 'text-slate-300'}`}>
                                    <GripVertical size={20} />
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isLocked ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <span className={`font-bold text-base md:text-lg block truncate ${isLocked ? 'text-rose-700' : 'text-slate-800'}`}>
                                                    {p.name}
                                                </span>
                                                {contributionMode === ContributionMode.VARIABLE && (
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        {formatCurrency(p.amount)}
                                                    </span>
                                                )}
                                                {/* Mobile Date display */}
                                                <div className="md:hidden flex items-center text-xs font-semibold text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded inline-flex">
                                                    <Calendar size={10} className="mr-1" />
                                                    {formatDate(calculatedDate)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Desktop Date Display */}
                                        <div className={`hidden md:flex items-center text-sm font-semibold px-3 py-1.5 rounded-lg ${isLocked ? 'bg-rose-200 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>
                                            <span className="text-xs font-normal opacity-70 mr-1">Receives:</span>
                                            <Calendar size={14} className="mr-1" />
                                            {formatDate(calculatedDate)}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls Group */}
                                <div className="flex items-center gap-1 md:gap-2">
                                     {/* Lock Control */}
                                    <button 
                                        onClick={() => toggleLock(idx)}
                                        className={`p-2 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                                            isLocked 
                                            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                                        }`}
                                        title={isLocked ? t('wiz.unlock') : t('wiz.lock')}
                                    >
                                        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                    </button>

                                    {/* Movement Controls - Vertical on mobile too, but larger targets */}
                                    {/* Disabled if locked */}
                                    <div className={`flex flex-col gap-1 ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <button 
                                            onClick={() => moveParticipant(idx, 'up')}
                                            disabled={isFirst || isLocked}
                                            className={`p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0 ${isFirst ? 'text-slate-100' : 'text-slate-400 hover:text-emerald-600 bg-slate-50 border border-slate-100'}`}
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button 
                                            onClick={() => moveParticipant(idx, 'down')}
                                            disabled={isLast || isLocked}
                                            className={`p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0 ${isLast ? 'text-slate-100' : 'text-slate-400 hover:text-emerald-600 bg-slate-50 border border-slate-100'}`}
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                    </div>
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
              <span className="text-slate-400 text-sm">{t('wiz.total_pot')}</span> <strong className="text-emerald-600 text-2xl">{t('common.currency')} {formatCurrency(estimatedPot).replace(' MT', '')}</strong>
            </p>
            
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-left shadow-sm max-w-lg mx-auto">
               <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">{t('wiz.summary')}</h4>
               <ul className="space-y-4 text-sm">
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.first_payout')}</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">{orderedParticipants[0]?.name}</span>
                 </li>
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.last_payout')}</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">{orderedParticipants[orderedParticipants.length-1]?.name}</span>
                 </li>
                 <li className="flex justify-between items-center">
                    <span className="text-slate-500">{t('wiz.locked_dates')}</span>
                    <span className={`font-bold px-2 py-1 rounded ${lockedIndices.size > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-900'}`}>{lockedIndices.size} {t('wiz.members_count')}</span>
                 </li>
               </ul>
            </div>
          </div>
        )}

        </div> {/* End of scrollable padding container */}
      </div>

      {/* Footer Actions - Fixed at Bottom */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 md:p-6 z-50 flex justify-between">
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
                     const valid = participantsData.filter(p => p.name.trim() !== '');
                     if (valid.length < 2) { addToast(t('wiz.alert_members'), 'error'); return; }
                     if (valid.length !== orderedParticipants.length) {
                         // Convert strings to numbers for logic
                         const cleanData = valid.map(p => ({
                             name: p.name,
                             amount: Number(p.amount) || 0
                         }));
                         setOrderedParticipants(cleanData);
                     }
                }
                setStep(step + 1)
              }} 
              className={`${isRenewal ? 'bg-indigo-900 hover:bg-indigo-800' : 'bg-slate-900 hover:bg-slate-800'} text-white px-8 py-3 md:py-4 rounded-xl font-semibold flex items-center shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-1`}
            >
              {t('wiz.btn_next')} <ChevronRight size={20} className="ml-1" />
            </button>
          ) : (
            <button 
              onClick={handleFinish} 
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-3 md:py-4 rounded-xl font-bold flex items-center shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              {isRenewal ? t('wiz.btn_launch_renew') : t('wiz.btn_launch')}
            </button>
          )}
      </div>
    </div>
  );
};

export default Wizard;
