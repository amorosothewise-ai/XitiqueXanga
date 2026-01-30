
import React, { useState, useEffect } from 'react';
import { Xitique, XitiqueType, Frequency, PaymentMethod, TransactionType } from '../types';
import { getXitiques, saveXitique, createNewXitique, deleteXitique } from '../services/storage';
import { calculateBalance, createTransaction, validateTransaction } from '../services/financeLogic';
import { formatCurrency } from '../services/formatUtils';
import { addPeriod } from '../services/dateUtils';
import { PiggyBank, Plus, Smartphone, Banknote, Trash, X, ShieldAlert, Loader2, Calendar, Hash, Target, Calculator } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import FinancialTip from './FinancialTip';
import ConfirmationModal from './ConfirmationModal';

const IndividualDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [sticks, setSticks] = useState<Xitique[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Withdrawal State
  const [withdrawStick, setWithdrawStick] = useState<Xitique | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawError, setWithdrawError] = useState<string>('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'danger' | 'success' | 'info';
    title: string;
    desc: string;
    action: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    desc: '',
    action: () => {}
  });

  // Form State - Using string | number for inputs to avoid leading zero issues
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>(''); // Initial empty string
  const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.MPESA);
  
  // New Planning State
  const [goalMode, setGoalMode] = useState<'manual' | 'date' | 'count'>('manual');
  const [targetAmount, setTargetAmount] = useState<number | string>(''); // Initial empty string
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(addPeriod(new Date().toISOString(), Frequency.DAILY, 30).split('T')[0]);
  const [occurrences, setOccurrences] = useState<number | string>(10);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSticks();
  }, []);

  // --- Auto-Calculation Logic ---
  useEffect(() => {
    if (goalMode === 'manual') return;

    const numAmount = Number(amount) || 0;
    const numOccurrences = Number(occurrences) || 0;

    if (goalMode === 'count') {
        // Calculate Target and End Date based on Count
        if (numAmount > 0 && numOccurrences > 0) {
            const total = numAmount * numOccurrences;
            setTargetAmount(total);
            // Estimate end date
            const calculatedEnd = addPeriod(startDate, frequency, numOccurrences);
            setEndDate(calculatedEnd.split('T')[0]);
        }
    } else if (goalMode === 'date') {
        // Calculate Count and Target based on Date Range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end > start) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            let count = 0;
            if (frequency === Frequency.DAILY) count = diffDays;
            if (frequency === Frequency.WEEKLY) count = Math.floor(diffDays / 7);
            if (frequency === Frequency.MONTHLY) count = Math.floor(diffDays / 30);
            
            if (count > 0) {
                setOccurrences(count);
                if (numAmount > 0) {
                    setTargetAmount(count * numAmount);
                }
            }
        }
    }
  }, [amount, frequency, startDate, endDate, occurrences, goalMode]);

  const loadSticks = async () => {
    setLoading(true);
    const all = await getXitiques();
    setSticks(all.filter(x => x.type === XitiqueType.INDIVIDUAL));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name) {
        addToast(t('wiz.alert_name'), 'error');
        return;
    }

    const finalTarget = Number(targetAmount) || 0;
    const finalAmount = Number(amount) || 0;

    if (finalTarget <= 0) {
        addToast('Accumulated amount must be greater than 0', 'error');
        return;
    }
    
    if (finalAmount <= 0) {
        addToast('Contribution amount must be greater than 0', 'error');
        return;
    }

    const newStick = createNewXitique({
      name,
      type: XitiqueType.INDIVIDUAL,
      targetAmount: finalTarget,
      amount: finalAmount,
      frequency,
      method,
      startDate: new Date(startDate).toISOString(),
      participants: []
    });

    try {
        await saveXitique(newStick);
        addToast(t('common.success'), 'success');
        setIsCreating(false);
        loadSticks();
        // Reset defaults
        setName('');
        setTargetAmount('');
        setAmount('');
        setOccurrences(10);
        setGoalMode('manual');
    } catch(err) {
        addToast('Failed to create', 'error');
    }
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
        isOpen: true,
        type: 'danger',
        title: t('modal.delete_title'),
        desc: t('modal.delete_desc'),
        confirmText: t('modal.confirm_delete'),
        action: async () => {
            await deleteXitique(id); 
            loadSticks();
            addToast('Item deletado', 'info');
        }
    });
  };

  const handleDeposit = async (stick: Xitique, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    
    const validation = validateTransaction(stick, TransactionType.DEPOSIT, stick.amount);
    if (!validation.valid) {
        addToast(validation.error || 'Erro', 'error');
        return;
    }

    const newTx = createTransaction(
        TransactionType.DEPOSIT,
        stick.amount,
        t('ind.type_deposit')
    );

    const updated = {
      ...stick,
      transactions: [newTx, ...(stick.transactions || [])]
    };
    
    await saveXitique(updated);
    addToast(t('ind.type_deposit') + ' ' + t('common.success'), 'success');
    loadSticks();
  };

  const handleWithdraw = async () => {
    if(!withdrawStick) return;
    
    const validation = validateTransaction(withdrawStick, TransactionType.WITHDRAWAL, withdrawAmount);
    if (!validation.valid) {
        setWithdrawError(validation.error || "Error");
        return;
    }

    const newTx = createTransaction(
        TransactionType.WITHDRAWAL,
        withdrawAmount,
        t('ind.type_withdrawal')
    );

    const updated = {
        ...withdrawStick,
        transactions: [newTx, ...(withdrawStick.transactions || [])]
    };

    await saveXitique(updated);
    setWithdrawStick(null);
    setWithdrawAmount(0);
    setWithdrawError('');
    addToast(t('ind.type_withdrawal') + ' ' + t('common.success'), 'success');
    loadSticks();
  };

  const getMethodIcon = (m?: PaymentMethod) => {
    switch (m) {
      case PaymentMethod.MPESA: return <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide"><Smartphone size={12}/> M-Pesa</span>;
      case PaymentMethod.EMOLA: return <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide"><Smartphone size={12}/> e-Mola</span>;
      default: return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide"><Banknote size={12}/> Cash</span>;
    }
  };

  const getFrequencyLabel = (f: Frequency) => {
    switch (f) {
      case Frequency.DAILY: return t('ind.daily');
      case Frequency.WEEKLY: return t('ind.weekly');
      default: return t('ind.monthly');
    }
  };

  const getProjectedDate = (stick: Xitique, balance: number) => {
    if (balance <= 0) return null;
    const start = new Date(stick.createdAt);
    const now = new Date();
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const ratePerDay = balance / daysSinceStart;
    if (ratePerDay <= 0) return null;

    const remaining = (stick.targetAmount || 0) - balance;
    if (remaining <= 0) return new Date(); 

    const daysLeft = Math.ceil(remaining / ratePerDay);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysLeft);
    return projectedDate;
  };

  if (isCreating) {
    return (
       <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 animate-fade-in my-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <PiggyBank className="text-purple-500" /> {t('ind.create_btn')}
            </h2>
            <button onClick={() => setIsCreating(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                <X size={20} />
            </button>
        </div>
        
        <div className="space-y-6">
            {/* 1. Name */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('ind.form_name')}</label>
                <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Novo Telefone"
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-base"
                />
            </div>

            {/* 2. Frequency & Amount */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('ind.form_freq')}</label>
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        {[Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY].map(f => (
                            <button
                                key={f}
                                onClick={() => setFrequency(f)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                    frequency === f 
                                    ? 'bg-purple-100 text-purple-700 shadow-sm' 
                                    : 'text-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {f === Frequency.DAILY ? 'Day' : f === Frequency.WEEKLY ? 'Week' : 'Month'}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('ind.form_contribution')}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-4 text-slate-400 text-xs font-bold">{t('common.currency')}</span>
                        <input 
                            type="number" 
                            inputMode="decimal"
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="w-full p-3 pl-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-900 text-lg"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Goal Planning Tabs */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Planning Method</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                     <button 
                        onClick={() => setGoalMode('manual')}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                            goalMode === 'manual' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                        }`}
                     >
                        <Target size={16} /> Total Target
                     </button>
                     <button 
                        onClick={() => setGoalMode('date')}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                            goalMode === 'date' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                        }`}
                     >
                        <Calendar size={16} /> By Date
                     </button>
                     <button 
                        onClick={() => setGoalMode('count')}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                            goalMode === 'count' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                        }`}
                     >
                        <Hash size={16} /> By Count
                     </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    {/* Common Start Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                        <input 
                             type="date" 
                             value={startDate} 
                             onChange={(e) => setStartDate(e.target.value)}
                             className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                        />
                    </div>

                    {goalMode === 'manual' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 mb-1">{t('ind.form_target')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-4 text-slate-400 text-xs font-bold">{t('common.currency')}</span>
                                <input 
                                    type="number" 
                                    inputMode="decimal"
                                    value={targetAmount} 
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full p-3 pl-10 border border-slate-300 rounded-lg text-lg font-bold text-purple-700"
                                />
                            </div>
                        </div>
                    )}

                    {goalMode === 'date' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                            <input 
                                 type="date" 
                                 value={endDate} 
                                 onChange={(e) => setEndDate(e.target.value)}
                                 className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                            />
                            <div className="mt-3 text-xs text-slate-500 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                <span>Estimated Saves:</span>
                                <span className="font-bold text-slate-800">{occurrences || 0} times</span>
                            </div>
                        </div>
                    )}

                    {goalMode === 'count' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Number of times to save</label>
                            <input 
                                 type="number" 
                                 inputMode="numeric"
                                 value={occurrences} 
                                 onChange={(e) => setOccurrences(e.target.value)}
                                 placeholder="0"
                                 className="w-full p-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-800"
                            />
                             <div className="mt-3 text-xs text-slate-500 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                <span>Est. End Date:</span>
                                <span className="font-bold text-slate-800">{new Date(endDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Footer */}
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                     <div className="text-xs text-purple-600 font-bold uppercase mb-1">Total Accumulated</div>
                     <div className="text-2xl font-bold text-purple-800">{formatCurrency(Number(targetAmount) || 0)}</div>
                </div>
                <div className="bg-white p-2 rounded-full text-purple-500 shadow-sm">
                    <Calculator size={20} />
                </div>
            </div>

            {/* Method */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('ind.form_method')}</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: PaymentMethod.MPESA, label: 'M-Pesa', icon: Smartphone },
                        { id: PaymentMethod.EMOLA, label: 'e-Mola', icon: Smartphone },
                        { id: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMethod(m.id)}
                            className={`py-2 px-2 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                                method === m.id
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <m.icon size={14} />
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleCreate}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all mt-4"
            >
                {t('ind.create_btn')}
            </button>
        </div>
      </div>
    );
  }

  if (loading) {
     return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
        {/* Confirmation Modal */}
        <ConfirmationModal 
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.action}
            title={confirmModal.title}
            description={confirmModal.desc}
            type={confirmModal.type}
            confirmText={confirmModal.confirmText}
        />

        {/* Withdrawal Modal */}
        {withdrawStick && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('ind.withdraw_modal_title')}</h3>
                    <p className="text-slate-500 text-sm mb-4">{t('ind.withdraw_modal_desc')}</p>
                    
                    <div className="mb-4">
                      <FinancialTip context="withdrawal" />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                        <div className="text-xs text-slate-400 font-bold uppercase">{t('ind.balance')}</div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(calculateBalance(withdrawStick.transactions))}</div>
                    </div>

                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount</label>
                    <input 
                        type="number" 
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="w-full p-3 border border-slate-300 rounded-xl mb-2 font-bold text-lg"
                    />
                    {withdrawError && <p className="text-red-500 text-xs font-bold mb-4 flex items-center gap-1"><ShieldAlert size={12}/> {withdrawError}</p>}

                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setWithdrawStick(null); setWithdrawError(''); }}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl"
                        >
                            {t('ind.withdraw_cancel')}
                        </button>
                        <button 
                            onClick={handleWithdraw}
                            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                        >
                            {t('ind.withdraw_confirm')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('ind.title')}</h1>
                <p className="text-slate-500 mt-1">{t('ind.subtitle')}</p>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
            >
                <Plus size={20} /> <span className="hidden md:inline">{t('ind.create_btn')}</span>
            </button>
        </div>

        {sticks.length > 0 && (
           <FinancialTip context="individual" />
        )}

        {sticks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-400">
                    <PiggyBank size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('ind.no_active')}</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">{t('ind.start_desc')}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sticks.map(stick => {
                    const balance = calculateBalance(stick.transactions);
                    const target = stick.targetAmount || 1;
                    const progress = Math.min(100, (balance / target) * 100);
                    const remaining = Math.max(0, target - balance);
                    const estimatedPeriods = Math.ceil(remaining / stick.amount);
                    const isExpanded = expandedId === stick.id;
                    const projectedDate = getProjectedDate(stick, balance);

                    return (
                        <div 
                            key={stick.id} 
                            onClick={() => setExpandedId(isExpanded ? null : stick.id)}
                            className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer ${isExpanded ? 'border-purple-300 shadow-xl ring-2 ring-purple-50 col-span-1 md:col-span-2' : 'border-slate-200 shadow-sm hover:shadow-lg'}`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-900">{stick.name}</h3>
                                        {getMethodIcon(stick.method)}
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        {getFrequencyLabel(stick.frequency)} • {formatCurrency(stick.amount)}
                                    </p>
                                </div>
                                <button onClick={(e) => requestDelete(stick.id, e)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                    <Trash size={18} />
                                </button>
                            </div>

                            {/* Main Balance Display */}
                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-3xl font-bold text-slate-900">{formatCurrency(balance)}</div>
                                    <div className="text-xs font-bold text-slate-500">{Math.round(progress)}% of {formatCurrency(target)}</div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-purple-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            {/* Actions & Insights */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button 
                                    onClick={(e) => handleDeposit(stick, e)}
                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-emerald-100"
                                >
                                    <Plus size={16} /> {t('ind.deposit')}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setWithdrawStick(stick); }}
                                    className="bg-slate-50 text-slate-700 hover:bg-slate-100 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-100"
                                >
                                    {t('ind.withdraw')}
                                </button>
                            </div>

                            {/* Details (Expanded View) */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 pt-4 mt-4 animate-fade-in">
                                     <div className="grid md:grid-cols-2 gap-6">
                                         <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('ind.timeline')}</h4>
                                            <ul className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                                                <li className="relative">
                                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-white"></div>
                                                    <div className="text-sm font-bold text-slate-800">{t('ind.timeline_start')}</div>
                                                    <div className="text-xs text-slate-500">{new Date(stick.createdAt).toLocaleDateString()}</div>
                                                </li>
                                                <li className="relative">
                                                     <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></div>
                                                     <div className="text-sm font-bold text-slate-800">{t('ind.remaining')}</div>
                                                     <div className="text-xs text-slate-500">{formatCurrency(remaining)} ({estimatedPeriods} {stick.frequency === 'DAILY' ? t('ind.days') : stick.frequency === 'WEEKLY' ? t('ind.weeks') : t('ind.months')})</div>
                                                </li>
                                                <li className="relative">
                                                     <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-white"></div>
                                                     <div className="text-sm font-bold text-emerald-700">{t('ind.timeline_projected')}</div>
                                                     <div className="text-xs text-emerald-600 font-bold">
                                                        {projectedDate ? projectedDate.toLocaleDateString() : t('ind.timeline_unknown')}
                                                     </div>
                                                </li>
                                            </ul>
                                         </div>
                                         
                                         <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('ind.history')}</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {stick.transactions && stick.transactions.length > 0 ? (
                                                    stick.transactions.map((tx) => (
                                                        <div key={tx.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${tx.type === TransactionType.DEPOSIT ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                                <span className="text-slate-600">{tx.description}</span>
                                                            </div>
                                                            <div className={`font-bold ${tx.type === TransactionType.DEPOSIT ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                {tx.type === TransactionType.WITHDRAWAL ? '-' : '+'}{formatCurrency(tx.amount)}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-slate-400 text-xs text-center py-4 italic">No transactions yet</div>
                                                )}
                                            </div>
                                         </div>
                                     </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};

export default IndividualDashboard;
