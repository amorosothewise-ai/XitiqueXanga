
import React, { useState, useEffect } from 'react';
import { Xitique, Participant, TransactionType, XitiqueStatus } from '../types';
import { formatDate, addPeriod } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { analyzeFairness } from '../services/geminiService';
import { saveXitique } from '../services/storage';
import { createTransaction, calculateCyclePot } from '../services/financeLogic';
import { Sparkles, Calendar, DollarSign, Users, ArrowLeft, Trash, CheckCircle2, Clock, Pencil, X, Check, History, Calculator, AlertTriangle, AlertCircle, RefreshCw, Archive, Share2, Search, ArrowUpDown, Filter, CheckSquare, Square, GripVertical, Plus, Save, Download, ThumbsUp, Hash, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import FinancialTip from './FinancialTip';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  xitique: Xitique;
  onBack: () => void;
  onDelete: () => void;
  onRenew?: (xitique: Xitique) => void;
}

type SortKey = 'order' | 'name' | 'payoutDate' | 'received';

const XitiqueDetail: React.FC<Props> = ({ xitique, onBack, onDelete, onRenew }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'analysis' | 'history'>('schedule');

  // Edit State (Global)
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [newBaseAmount, setNewBaseAmount] = useState(xitique.amount);
  
  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(xitique.name);

  // Edit State (Individual Participant)
  const [editForm, setEditForm] = useState<{
      id: string;
      name: string;
      date: string;
      amount: number;
      order: number;
  } | null>(null);

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'order', direction: 'asc' });

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Derived State
  const potSize = calculateCyclePot(xitique.amount, xitique.participants);
  const hasUnequalContributions = xitique.participants.some(p => p.customContribution !== undefined && p.customContribution !== xitique.amount);
  const progressPercentage = (xitique.participants.filter(p => p.received).length / xitique.participants.length) * 100;
  const isCompleted = xitique.status === XitiqueStatus.COMPLETED;

  // Modal State
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

  useEffect(() => {
    setNewBaseAmount(xitique.amount);
    setNewName(xitique.name);
  }, [xitique.amount, xitique.name]);

  // --- Logic ---

  // Filter & Sort Logic
  const processedParticipants = [...xitique.participants]
    .filter(p => {
        if (!searchTerm) return true;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'received':
          // Sort by boolean status
          if (a.received === b.received) return 0;
          return a.received ? dir : -dir;
        case 'payoutDate':
           const dateA = a.payoutDate ? new Date(a.payoutDate).getTime() : 0;
           const dateB = b.payoutDate ? new Date(b.payoutDate).getTime() : 0;
           return (dateA - dateB) * dir;
        case 'order':
        default:
          return (a.order - b.order) * dir;
      }
    });

  const canDrag = sortConfig.key === 'order' && searchTerm === '';

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (!canDrag) return;
      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (!canDrag) return;
      e.preventDefault(); 
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!canDrag || !draggedId || draggedId === targetId) return;

      const items = [...xitique.participants];
      const oldIndex = items.findIndex(i => i.id === draggedId);
      const newIndex = items.findIndex(i => i.id === targetId);

      if (oldIndex === -1 || newIndex === -1) return;

      // Move item
      const [movedItem] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, movedItem);

      // Reassign order based on new index
      const updatedParticipants = items.map((p, index) => ({
          ...p,
          order: index + 1
      }));

      // Optimistic update
      xitique.participants = updatedParticipants;
      
      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      
      addToast('Ordem atualizada', 'success');
      setDraggedId(null);
  };

  const handleAddMember = async () => {
      const newOrder = xitique.participants.length + 1;
      
      // Predict next date
      let nextDate = new Date().toISOString();
      if (xitique.participants.length > 0) {
          const lastDate = xitique.participants[xitique.participants.length - 1].payoutDate;
          if (lastDate) {
             nextDate = addPeriod(lastDate, xitique.frequency, 1);
          } else {
             nextDate = addPeriod(xitique.startDate, xitique.frequency, xitique.participants.length);
          }
      }

      const newMember: Participant = {
          id: crypto.randomUUID(),
          name: "Novo Membro",
          received: false,
          order: newOrder,
          payoutDate: nextDate,
          customContribution: xitique.amount
      };

      const updatedParticipants = [...xitique.participants, newMember];
      
      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      xitique.participants = updatedParticipants;
      
      startEditingParticipant(newMember);
      addToast('Membro adicionado', 'success');
  };

  const startEditingParticipant = (p: Participant) => {
      setEditForm({
          id: p.id,
          name: p.name,
          date: p.payoutDate ? new Date(p.payoutDate).toISOString().split('T')[0] : '',
          amount: p.customContribution !== undefined ? p.customContribution : xitique.amount,
          order: p.order
      });
  };

  const saveParticipantChanges = async () => {
      if (!editForm) return;

      // --- Validation: Unique and Sequential Order ---
      // Get all orders EXCEPT the one being edited, then add the new one proposed
      const otherOrders = xitique.participants
          .filter(p => p.id !== editForm.id)
          .map(p => p.order);
      
      const allOrders = [...otherOrders, editForm.order].sort((a, b) => a - b);

      // Check for duplicates
      const hasDuplicates = new Set(allOrders).size !== allOrders.length;
      
      // Check for sequential (1 to N)
      const isSequential = allOrders.every((val, index) => val === index + 1);

      if (hasDuplicates || !isSequential) {
          addToast(t('common.error') + ": Ordem inválida. Deve ser sequencial (1, 2, 3...) e única.", 'error');
          return;
      }
      // -----------------------------------------------

      const updatedParticipants = xitique.participants.map(p => {
          if (p.id === editForm.id) {
              return { 
                  ...p, 
                  name: editForm.name,
                  payoutDate: editForm.date ? new Date(editForm.date).toISOString() : undefined,
                  customContribution: editForm.amount,
                  order: editForm.order
              };
          }
          return p;
      }).sort((a, b) => a.order - b.order); // Re-sort list based on new orders if order changed

      const isRisk = updatedParticipants.some(p => {
         const val = p.customContribution !== undefined ? p.customContribution : xitique.amount;
         return val !== xitique.amount;
      });

      const newStatus = isRisk ? XitiqueStatus.RISK : (xitique.status === XitiqueStatus.RISK ? XitiqueStatus.ACTIVE : xitique.status);

      const updatedXitique = { 
          ...xitique, 
          participants: updatedParticipants,
          status: newStatus 
      };
      
      await saveXitique(updatedXitique);
      xitique.participants = updatedParticipants;
      xitique.status = newStatus;
      setEditForm(null);
      addToast('Membro atualizado', 'success');
  };

  const handleBulkToggle = () => {
    // Safety check for completed groups to prevent accidental mass reversals if everything is already done
    if (isCompleted && xitique.participants.every(p => p.received)) {
         setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('modal.reversal_title') + " (All)",
            desc: "This will revert the status of ALL participants to 'Pending' and reopen the Xitique. Are you sure?",
            confirmText: "Revert All",
            action: executeBulkToggle
        });
        return;
    }

    const allPaid = xitique.participants.every(p => p.received);
    
    setConfirmModal({
        isOpen: true,
        type: 'success',
        title: allPaid ? "Mark All as Pending?" : "Mark All as Paid?",
        desc: allPaid 
            ? "This will reverse all payments." 
            : `This will mark all remaining participants as paid. This will change the Xitique status to ${XitiqueStatus.COMPLETED}.`,
        confirmText: allPaid ? "Revert All" : "Confirm All Payouts",
        action: executeBulkToggle
    });
  };

  const executeBulkToggle = async () => {
    const allCurrentlyPaid = xitique.participants.every(p => p.received);
    const targetState = !allCurrentlyPaid; 

    const newTransactions: any[] = [];
    
    const updatedParticipants = xitique.participants.map(p => {
        if (p.received !== targetState) {
             if (targetState) {
                newTransactions.push(createTransaction(
                    TransactionType.PAYOUT,
                    potSize, 
                    `${t('ind.type_payout')}: ${p.name} (Bulk)`
                ));
            } else {
                newTransactions.push(createTransaction(
                    TransactionType.PAYOUT_REVERSAL,
                    potSize,
                    `Correction (Reversal): ${p.name} (Bulk)`
                ));
            }
            return { ...p, received: targetState };
        }
        return p;
    });

    const updatedTx = [...newTransactions, ...(xitique.transactions || [])];
    
    let newStatus = XitiqueStatus.ACTIVE;
    if (targetState) {
        newStatus = XitiqueStatus.COMPLETED;
    } else {
        newStatus = hasUnequalContributions ? XitiqueStatus.RISK : XitiqueStatus.ACTIVE;
    }

    const updatedXitique = { 
        ...xitique, 
        participants: updatedParticipants,
        transactions: updatedTx,
        status: newStatus
    };
    
    await saveXitique(updatedXitique);
    xitique.participants = updatedParticipants; 
    xitique.transactions = updatedTx;
    xitique.status = newStatus;
    
    addToast(targetState ? 'Todos marcados como pagos' : 'Todos revertidos', 'success');
  };

  const handleShare = async () => {
    try {
        const header = `💰 *${xitique.name}*`;
        const pot = `💵 *Pote:* ${formatCurrency(potSize)}`;
        const list = xitique.participants.map((p, i) => {
            const date = p.payoutDate ? formatDate(p.payoutDate) : 'TBD';
            const status = p.received ? '✅ Pago' : '⏳ Pendente';
            return `${i + 1}. ${p.name} - ${date} (${status})`;
        }).join('\n');
        
        const footer = `\nGerado por Xitique Xanga`;
        const fullText = `${header}\n${pot}\n\n📅 *Cronograma:*\n${list}${footer}`;

        await navigator.clipboard.writeText(fullText);
        addToast(t('detail.share_success'), 'success');
    } catch (err) {
        addToast(t('detail.share_fail'), 'error');
    }
  };

  const handleExportCSV = () => {
      const headers = "Order,Name,Date,Amount,Status\n";
      const rows = xitique.participants.map(p => 
        `${p.order},"${p.name}",${p.payoutDate || ''},${p.customContribution || xitique.amount},${p.received ? 'PAID' : 'PENDING'}`
      ).join("\n");
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${xitique.name.replace(/\s+/g, '_')}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(t('detail.export_success'), 'success');
  };

  const handleRunAnalysis = async () => {
    setLoadingAi(true);
    addToast('Iniciando análise com Gemini...', 'info');
    const result = await analyzeFairness(xitique);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  const handleRecalculate = async () => {
      const updatedXitique = { 
          ...xitique, 
          status: hasUnequalContributions ? XitiqueStatus.RISK : XitiqueStatus.ACTIVE 
      };
      await saveXitique(updatedXitique);
      if(updatedXitique.status === XitiqueStatus.RISK) {
          xitique.status = XitiqueStatus.RISK; 
      }
      addToast(t('detail.recalc_title') + ': ' + t('common.success'), 'success');
  };

  const handleApproveRisk = async () => {
    // Explicitly allow unequal contributions by forcing status to ACTIVE
    const updatedXitique = { 
        ...xitique, 
        status: XitiqueStatus.ACTIVE 
    };
    await saveXitique(updatedXitique);
    xitique.status = XitiqueStatus.ACTIVE;
    addToast('Risk Approved. Group is Active.', 'success');
  };

  const handleToggleClick = (participantId: string) => {
    if(isCompleted) return;

    const participant = xitique.participants.find(p => p.id === participantId);
    if (!participant) return;

    if (!participant.received) {
        setConfirmModal({
            isOpen: true,
            type: 'success',
            title: `${t('modal.payout_title')}: ${participant.name}`,
            desc: `${t('modal.payout_desc')} (${formatCurrency(potSize)})`,
            confirmText: t('modal.confirm_payout'),
            action: () => executeToggle(participantId)
        });
    } else {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('modal.reversal_title'),
            desc: t('modal.reversal_desc'),
            confirmText: t('modal.confirm_reversal'),
            action: () => executeToggle(participantId)
        });
    }
  };

  const executeToggle = async (participantId: string) => {
    const participant = xitique.participants.find(p => p.id === participantId);
    if (!participant) return;

    const willReceive = !participant.received;

    let newTx;
    if (willReceive) {
        newTx = createTransaction(
            TransactionType.PAYOUT,
            potSize, 
            `${t('ind.type_payout')}: ${participant.name}`
        );
    } else {
        newTx = createTransaction(
            TransactionType.PAYOUT_REVERSAL,
            potSize,
            `Correction (Reversal): ${participant.name}`
        );
    }

    const updatedTx = [newTx, ...(xitique.transactions || [])];

    const updatedParticipants = xitique.participants.map(p => 
      p.id === participantId ? { ...p, received: willReceive } : p
    );
    
    const allReceived = updatedParticipants.every(p => p.received);

    const updatedXitique = { 
        ...xitique, 
        participants: updatedParticipants,
        transactions: updatedTx,
        status: allReceived ? XitiqueStatus.COMPLETED : (hasUnequalContributions ? XitiqueStatus.RISK : XitiqueStatus.ACTIVE)
    };
    
    await saveXitique(updatedXitique);
    
    xitique.participants = updatedParticipants; 
    xitique.transactions = updatedTx;
    xitique.status = updatedXitique.status;
    setAiAnalysis(null);
    
    addToast(willReceive ? 'Pagamento registrado com sucesso' : 'Pagamento revertido', willReceive ? 'success' : 'info');
  };

  const saveBaseContributionChange = async () => {
    if (newBaseAmount <= 0) return;
    const isRisk = xitique.participants.some(p => {
        const val = p.customContribution !== undefined ? p.customContribution : newBaseAmount;
        return val !== newBaseAmount;
    });

    const newStatus = isRisk ? XitiqueStatus.RISK : XitiqueStatus.ACTIVE;
    const updatedXitique = { 
        ...xitique, 
        amount: newBaseAmount,
        status: newStatus 
    };

    await saveXitique(updatedXitique);
    xitique.amount = newBaseAmount; 
    xitique.status = newStatus;
    setIsEditingBase(false);
    addToast('Contribuição base atualizada', 'success');
  };

  const saveNameChanges = async () => {
      if (!newName.trim()) return;
      const updatedXitique = { ...xitique, name: newName };
      await saveXitique(updatedXitique);
      xitique.name = newName;
      setIsEditingName(false);
      addToast('Nome atualizado', 'success');
  };

  const requestDelete = () => {
      setConfirmModal({
          isOpen: true,
          type: 'danger',
          title: t('modal.delete_title'),
          desc: t('modal.delete_desc'),
          confirmText: t('modal.confirm_delete'),
          action: onDelete
      });
  };

  const handleRenewClick = () => {
      if(onRenew) onRenew(xitique);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.desc}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium">
          <ArrowLeft size={20} className="mr-2" /> {t('detail.back')}
        </button>
        <div className="flex gap-2">
            <button onClick={handleExportCSV} className="bg-white text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center text-sm font-bold transition-colors border border-slate-200">
                <Download size={18} className="mr-2" /> {t('detail.export')}
            </button>
            <button onClick={handleShare} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl flex items-center text-sm font-bold transition-colors border border-emerald-200">
                <Share2 size={18} className="mr-2" /> {t('detail.share')}
            </button>
            <button onClick={requestDelete} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl flex items-center text-sm font-medium transition-colors">
                <Trash size={18} className="mr-2" /> {t('detail.delete')}
            </button>
        </div>
      </div>

      <FinancialTip context="group" />

      {/* END OF CYCLE DASHBOARD */}
      {isCompleted && (
          <div className="bg-indigo-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden animate-fade-in">
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-full">
                         <CheckCircle2 size={32} className="text-emerald-400" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold">{t('end.title')}</h2>
                          <p className="text-indigo-200">{t('end.subtitle')}</p>
                      </div>
                  </div>
                  <p className="mb-8 text-indigo-100 max-w-2xl leading-relaxed">{t('end.question')}</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                      <button onClick={handleRenewClick} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:-translate-y-1 flex items-center gap-2 justify-center">
                         <RefreshCw size={20} /> {t('end.btn_renew')}
                      </button>
                      <button onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-colors flex items-center gap-2 justify-center">
                         <Archive size={20} /> {t('end.btn_terminate')}
                      </button>
                  </div>
                  <p className="mt-4 text-xs text-indigo-300 flex items-center gap-1"><Clock size={12} /> {t('end.renew_info')}</p>
              </div>
          </div>
      )}

      {/* Main Info Card */}
      <div className={`bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden ${isCompleted ? 'opacity-75 grayscale-[0.5]' : ''}`}>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-500 text-slate-900 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{xitique.frequency === 'WEEKLY' ? t('wiz.weekly') : t('wiz.monthly')}</span>
                {xitique.status === XitiqueStatus.RISK && !isCompleted && (
                     <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={12} /> {t('detail.risk_alert')}
                     </span>
                )}
                {isCompleted && (
                    <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                       <CheckCircle2 size={12} /> {t('dash.completed_badge')}
                    </span>
                )}
            </div>
            
            {/* Editable Name */}
            {isEditingName ? (
                <div className="flex items-center gap-2 mb-6">
                    <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-transparent border-b-2 border-emerald-400 text-4xl font-bold text-white focus:outline-none w-full"
                        autoFocus
                    />
                    <button onClick={saveNameChanges} className="bg-emerald-500 p-2 rounded-lg text-slate-900 hover:bg-emerald-400"><Check size={20} /></button>
                    <button onClick={() => { setIsEditingName(false); setNewName(xitique.name); }} className="bg-white/10 p-2 rounded-lg text-white hover:bg-white/20"><X size={20} /></button>
                </div>
            ) : (
                <h1 className="text-4xl font-bold mb-6 tracking-tight flex items-center gap-3 group">
                    {xitique.name}
                    {!isCompleted && (
                        <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white p-1">
                            <Pencil size={20} />
                        </button>
                    )}
                </h1>
            )}
            
            <div className="mb-8">
               <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                  <span>Cycle Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                   <div 
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                      style={{ width: `${progressPercentage}%` }}
                   ></div>
               </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 relative group">
                    <div className="bg-emerald-400/20 p-2 rounded-lg">
                        <DollarSign size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-2">
                            {t('detail.contribution_per_person')}
                            {!isCompleted && (
                                <button onClick={() => setIsEditingBase(true)} className="hover:text-white transition-colors"><Pencil size={12} /></button>
                            )}
                        </div>
                        <div className="text-xl font-bold">{formatCurrency(xitique.amount)}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
                    <div className="bg-emerald-400/20 p-2 rounded-lg">
                        {hasUnequalContributions && !isCompleted ? <AlertCircle size={20} className="text-amber-400" /> : <Calculator size={20} className="text-emerald-400" />}
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold">{t('detail.total_payout')}</div>
                        <div className={`text-xl font-bold ${hasUnequalContributions && !isCompleted ? 'text-amber-400' : 'text-white'}`}>{formatCurrency(potSize)}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
                    <div className="bg-blue-400/20 p-2 rounded-lg">
                        <Users size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold">{t('detail.members')}</div>
                        <div className="text-xl font-bold">{xitique.participants.length}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
                    <div className="bg-purple-400/20 p-2 rounded-lg">
                        <Calendar size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold">{t('detail.start_date')}</div>
                        <div className="text-xl font-bold">{formatDate(xitique.startDate)}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Recalculate Alert */}
      {hasUnequalContributions && !isCompleted && xitique.status === XitiqueStatus.RISK && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
             <div className="flex items-start gap-4">
                <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                    <Calculator size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-amber-900 text-lg">{t('detail.recalc_title')}</h3>
                    <p className="text-sm text-amber-700 leading-relaxed max-w-lg">{t('detail.recalc_desc')}</p>
                </div>
             </div>
             <div className="flex gap-2">
                 <button 
                    onClick={handleApproveRisk}
                    className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold py-3 px-6 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2"
                 >
                    <ThumbsUp size={18} /> {t('detail.approve_risk')}
                 </button>
                 <button 
                    onClick={handleRecalculate}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-200 transition-colors whitespace-nowrap"
                >
                    {t('detail.recalc_btn')}
                </button>
             </div>
          </div>
      )}

      {/* Edit Base Amount Modal */}
      {isEditingBase && (
          <div className="bg-white border-2 border-emerald-100 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-4 animate-fade-in">
              <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">{t('detail.edit_contribution')}</h3>
                  <p className="text-xs text-slate-500">This will update the base contribution amount.</p>
              </div>
              <div className="flex items-center gap-2">
                  <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">{t('common.currency')}</span>
                      <input 
                        type="number" 
                        value={newBaseAmount} 
                        onChange={(e) => setNewBaseAmount(Number(e.target.value))}
                        className="pl-10 p-2 border border-slate-300 rounded-lg w-32 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                  </div>
                  <button onClick={saveBaseContributionChange} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-lg transition-colors">
                      <Check size={18} />
                  </button>
                  <button onClick={() => { setIsEditingBase(false); setNewBaseAmount(xitique.amount); }} className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2.5 rounded-lg transition-colors">
                      <X size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'schedule' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {t('detail.tab_schedule')}
          {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <History size={16} /> {t('detail.tab_history')}
          </span>
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'analysis' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" /> {t('detail.tab_analysis')}
          </span>
          {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-t-full" />}
        </button>
      </div>

      {/* Tab Content (Schedule) */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          
          {/* Controls: Search, Filter, Sort, Bulk Actions */}
          <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
             <div className="flex-1 relative">
                 <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search member..." 
                   className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium transition-all"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                         <XCircle size={18} />
                     </button>
                 )}
             </div>
             
             <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                 <button 
                   onClick={() => handleSort('name')}
                   className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 border transition-colors whitespace-nowrap ${sortConfig.key === 'name' ? 'bg-slate-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <ArrowUpDown size={14} /> Name
                 </button>
                 <button 
                   onClick={() => handleSort('payoutDate')}
                   className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 border transition-colors whitespace-nowrap ${sortConfig.key === 'payoutDate' ? 'bg-slate-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <Calendar size={14} /> Date
                 </button>
                  <button 
                   onClick={() => handleSort('received')}
                   className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 border transition-colors whitespace-nowrap ${sortConfig.key === 'received' ? 'bg-slate-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <Filter size={14} /> Status
                 </button>
             </div>

             <div className="w-px bg-slate-200 hidden md:block mx-1"></div>

             <button 
                onClick={handleBulkToggle}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
             >
                {xitique.participants.every(p => p.received) ? <CheckSquare size={16} /> : <Square size={16} />}
                Select All
             </button>
          </div>

          <div className="grid gap-3">
            {processedParticipants.map((p, idx) => {
              const isEditing = editForm?.id === p.id;
              
              return (
              <div 
                key={p.id} 
                draggable={canDrag && !isEditing}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, p.id)}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
                  isEditing ? 'bg-emerald-50 border-emerald-200 shadow-md ring-1 ring-emerald-300' : 
                  p.received 
                    ? 'bg-slate-50 border-slate-100 opacity-75 hover:opacity-100' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                  {/* Drag Handle */}
                  <div className={`cursor-grab ${canDrag ? 'text-slate-400 hover:text-emerald-500' : 'text-slate-200 cursor-not-allowed'}`}>
                     <GripVertical size={20} />
                  </div>

                  {/* Checkbox Status */}
                  <button 
                      onClick={() => handleToggleClick(p.id)}
                      disabled={isCompleted || isEditing}
                      className={`transition-colors p-1 rounded-md ${p.received ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
                  >
                      {p.received ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>

                  {/* Index */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                    p.received ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.order}
                  </div>

                  {/* Main Details (Or Edit Form) */}
                  <div className="flex-1 min-w-[200px]">
                    {isEditing ? (
                        <div className="flex flex-col gap-2">
                             <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={editForm.name} 
                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                  className="flex-1 font-bold text-slate-900 border border-emerald-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                  placeholder="Name"
                                  autoFocus
                                />
                                <div className="relative w-20">
                                   <Hash size={12} className="absolute left-2 top-2 text-slate-400"/>
                                   <input 
                                     type="number" 
                                     value={editForm.order} 
                                     onChange={(e) => setEditForm({...editForm, order: Number(e.target.value)})}
                                     className="w-full pl-6 border border-emerald-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-bold"
                                     title="Order Position"
                                   />
                                </div>
                             </div>

                             <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    value={editForm.date} 
                                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                    className="text-sm border border-emerald-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none bg-white w-full"
                                />
                                <div className="relative w-full">
                                    <span className="absolute left-2 top-1 text-xs text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                                        className="w-full pl-5 border border-emerald-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                                    />
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div onClick={() => !isCompleted && startEditingParticipant(p)} className="cursor-pointer group">
                             <h3 className={`font-bold text-lg flex items-center gap-2 group-hover:text-emerald-600 transition-colors ${p.received ? 'text-emerald-900 line-through decoration-emerald-500/50' : 'text-slate-900'}`}>
                                {p.name}
                                {!p.received && <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />}
                            </h3>
                            <div className="flex items-center gap-4 text-sm mt-1">
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Calendar size={12} />
                                    {p.payoutDate ? formatDate(p.payoutDate) : t('detail.date_tbd')}
                                </div>
                                <div className={`flex items-center gap-1 font-mono font-medium ${p.customContribution !== undefined && p.customContribution !== xitique.amount ? 'text-amber-600' : 'text-slate-400'}`}>
                                    <DollarSign size={12} />
                                    {formatCurrency(p.customContribution !== undefined ? p.customContribution : xitique.amount)}
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 pl-12 md:pl-0">
                   {isEditing ? (
                       <>
                        <button onClick={saveParticipantChanges} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg"><Save size={18} /></button>
                        <button onClick={() => setEditForm(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-lg"><X size={18} /></button>
                       </>
                   ) : (
                       <button 
                          onClick={() => handleToggleClick(p.id)}
                          disabled={isCompleted}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                              p.received 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : isCompleted 
                                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                       >
                          {p.received ? t('detail.paid_out') : t('detail.mark_paid')}
                       </button>
                   )}
                </div>
              </div>
            )})}
            
            {/* Add Member Button */}
            {!isCompleted && !searchTerm && (
                <button 
                    onClick={handleAddMember}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-bold hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all gap-2"
                >
                    <Plus size={20} /> Add New Member
                </button>
            )}

            {processedParticipants.length === 0 && searchTerm && (
                <div className="text-center py-10 text-slate-400">
                    <Search size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No members found matching "{searchTerm}"</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content (History & Analysis) remain unchanged visually but connected to state */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {!xitique.transactions || xitique.transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('detail.empty_history')}</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {xitique.transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    tx.type === TransactionType.PAYOUT ? 'bg-emerald-100 text-emerald-600' :
                                    tx.type === TransactionType.PAYOUT_REVERSAL ? 'bg-amber-100 text-amber-600' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                    {tx.type === TransactionType.PAYOUT_REVERSAL ? <History size={18} /> : <CheckCircle2 size={18} />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{tx.description}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{new Date(tx.date).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold font-mono ${
                                    tx.type === TransactionType.PAYOUT_REVERSAL ? 'text-slate-400 line-through decoration-red-400' : 'text-emerald-600'
                                }`}>
                                    {formatCurrency(tx.amount)}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{tx.type.replace('_', ' ')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
          {!aiAnalysis ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{t('detail.ai_title')}</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                {t('detail.ai_desc')}
              </p>
              <button 
                onClick={handleRunAnalysis}
                disabled={loadingAi}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loadingAi ? (
                    <>{t('detail.ai_running')}</>
                ) : (
                    <>
                        <Sparkles size={18} /> {t('detail.ai_btn')}
                    </>
                )}
              </button>
            </div>
          ) : (
             <div className="prose prose-slate max-w-none">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                   <div className="bg-purple-100 p-3 rounded-xl text-purple-700">
                      <Sparkles size={28} />
                   </div>
                   <div>
                       <h3 className="text-xl font-bold text-slate-900 m-0">{t('detail.ai_report')}</h3>
                       <p className="text-slate-500 text-sm">{t('detail.ai_generated')}</p>
                   </div>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed bg-slate-50 p-8 rounded-2xl border border-slate-200 font-medium">
                  {aiAnalysis}
                </div>
                <button 
                  onClick={() => setAiAnalysis(null)}
                  className="mt-8 text-slate-500 font-semibold hover:text-slate-900 text-sm flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> {t('detail.ai_reset')}
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XitiqueDetail;
