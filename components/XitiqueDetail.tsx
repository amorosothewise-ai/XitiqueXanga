
import React, { useState, useEffect } from 'react';
import { Xitique, Participant, TransactionType, XitiqueStatus } from '../types';
import { formatDate, addPeriod } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { analyzeFairness } from '../services/geminiService';
import { saveXitique, deleteParticipant } from '../services/storage';
import { createTransaction, calculateCyclePot, calculateDynamicPot } from '../services/financeLogic';
import { Sparkles, Calendar, DollarSign, Users, ArrowLeft, Trash, CheckCircle2, Clock, Pencil, X, Check, History, Calculator, AlertTriangle, AlertCircle, RefreshCw, Archive, Share2, Search, ArrowUpDown, Filter, CheckSquare, Square, GripVertical, Plus, Save, Download, ThumbsUp, Hash, XCircle, FileText, Activity, PenTool, PlayCircle, Lock, Unlock, Shuffle, Coins, Settings, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import FinancialTip from './FinancialTip';
import ConfirmationModal from './ConfirmationModal';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

  // --- Global Edit Mode State ---
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  
  // Temporary States for Global Edit
  const [tempName, setTempName] = useState(xitique.name);
  const [tempAmount, setTempAmount] = useState(xitique.amount);
  const [tempStartDate, setTempStartDate] = useState(xitique.startDate ? new Date(xitique.startDate).toISOString().split('T')[0] : '');

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

  // Drag & Drop & Shuffle State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [_, setForceUpdate] = useState(0); // To trigger re-renders on mutation

  // Derived State
  const totalPotentialFlow = calculateCyclePot(xitique.amount, xitique.participants); 
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
    setTempName(xitique.name);
    setTempAmount(xitique.amount);
    setTempStartDate(xitique.startDate ? new Date(xitique.startDate).toISOString().split('T')[0] : '');
  }, [xitique]);

  // --- Helper Functions ---

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getStatusBadge = (status: XitiqueStatus) => {
      switch(status) {
          case XitiqueStatus.ACTIVE: 
            return { color: 'bg-emerald-500', textColor: 'text-emerald-50', text: 'Ativo', icon: <Activity size={16}/> };
          case XitiqueStatus.PLANNING: 
            return { color: 'bg-blue-500', textColor: 'text-blue-50', text: 'Planejamento', icon: <PenTool size={16}/> };
          case XitiqueStatus.COMPLETED: 
            return { color: 'bg-indigo-500', textColor: 'text-indigo-50', text: 'Concluído', icon: <CheckCircle2 size={16}/> };
          case XitiqueStatus.RISK: 
            return { color: 'bg-rose-500', textColor: 'text-rose-50', text: 'Risco', icon: <AlertTriangle size={16}/> };
          default: 
            return { color: 'bg-slate-500', textColor: 'text-slate-50', text: status, icon: <FileText size={16}/> };
      }
  };

  // --- List Processing ---

  const processedParticipants = [...xitique.participants]
    .filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        if (p.name.toLowerCase().includes(term)) return true;
        const dateStr = p.payoutDate ? formatDate(p.payoutDate).toLowerCase() : '';
        if (dateStr.includes(term)) return true;
        if (p.customContribution?.toString().includes(term)) return true;
        return false;
    })
    .sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.key) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'received': return (Number(a.received) - Number(b.received)) * dir;
        case 'payoutDate':
           const dateA = a.payoutDate ? new Date(a.payoutDate).getTime() : 0;
           const dateB = b.payoutDate ? new Date(b.payoutDate).getTime() : 0;
           return (dateA - dateB) * dir;
        case 'order':
        default: return (a.order - b.order) * dir;
      }
    });

  const canDrag = isGlobalEditMode && sortConfig.key === 'order' && searchTerm === '';

  // --- Actions ---

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const toggleLock = (id: string) => {
      setLockedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (!canDrag || lockedIds.has(id)) return;
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
      if (lockedIds.has(targetId) || lockedIds.has(draggedId)) {
          addToast("Posições travadas não podem ser movidas", "error");
          return;
      }

      const items = [...xitique.participants];
      const oldIndex = items.findIndex(i => i.id === draggedId);
      const newIndex = items.findIndex(i => i.id === targetId);

      if (oldIndex === -1 || newIndex === -1) return;

      const [movedItem] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, movedItem);

      // Reassign order & Recalculate Dates based on new order
      const updatedParticipants = items.map((p, index) => ({
          ...p,
          order: index + 1,
          payoutDate: addPeriod(xitique.startDate, xitique.frequency, index)
      }));

      // Optimistic update
      xitique.participants = updatedParticipants;
      
      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      
      addToast('Ordem atualizada e datas recalculadas', 'success');
      setDraggedId(null);
      setForceUpdate(prev => prev + 1);
  };

  // --- Optimized Edit Mode Logic ---

  const handleCancelGlobalEdit = () => {
    setTempName(xitique.name);
    setTempAmount(xitique.amount);
    setTempStartDate(xitique.startDate ? new Date(xitique.startDate).toISOString().split('T')[0] : '');
    setIsGlobalEditMode(false);
  };

  const handleSaveGlobalEdit = async () => {
    let updatedParticipants = [...xitique.participants];
    
    // Check if start date changed
    const oldDate = xitique.startDate ? new Date(xitique.startDate).toISOString().split('T')[0] : '';
    const newDate = tempStartDate;
    const dateChanged = oldDate !== newDate;

    // Check if base amount changed (check for risk)
    const amountChanged = xitique.amount !== tempAmount;

    // Apply Date Updates if changed
    if (dateChanged) {
        updatedParticipants = updatedParticipants.map((p, index) => ({
            ...p,
            payoutDate: addPeriod(newDate, xitique.frequency, index)
        }));
    }

    // Determine Status
    let newStatus = xitique.status;
    if (amountChanged) {
        const hasRisk = updatedParticipants.some(p => {
             const val = p.customContribution !== undefined ? p.customContribution : tempAmount;
             return val !== tempAmount;
        });
        newStatus = hasRisk ? XitiqueStatus.RISK : XitiqueStatus.ACTIVE;
    }

    const updatedXitique = {
        ...xitique,
        name: tempName,
        amount: tempAmount,
        startDate: new Date(newDate).toISOString(),
        participants: updatedParticipants,
        status: newStatus
    };

    await saveXitique(updatedXitique);
    
    // Apply to local state
    xitique.name = tempName;
    xitique.amount = tempAmount;
    xitique.startDate = new Date(newDate).toISOString();
    xitique.participants = updatedParticipants;
    xitique.status = newStatus;

    setIsGlobalEditMode(false);
    addToast('Alterações salvas com sucesso!', 'success');
    setForceUpdate(prev => prev + 1);
  };

  const handleAddMember = async () => {
      // Calculate next Order
      const newOrder = xitique.participants.length + 1;
      
      // Calculate next Date based on CURRENT (possibly temp) Start Date
      const baseDate = isGlobalEditMode ? tempStartDate : xitique.startDate;
      const nextDate = addPeriod(baseDate, xitique.frequency, newOrder - 1); // 0-based index logic for addPeriod

      const newMember: Participant = {
          id: crypto.randomUUID(),
          name: "Novo Participante",
          received: false,
          order: newOrder,
          payoutDate: nextDate,
          customContribution: isGlobalEditMode ? tempAmount : xitique.amount
      };

      const updatedParticipants = [...xitique.participants, newMember];
      const updatedXitique = { ...xitique, participants: updatedParticipants };
      
      await saveXitique(updatedXitique);
      xitique.participants = updatedParticipants;
      
      startEditingParticipant(newMember); // Auto-open edit for name
      addToast('Membro adicionado ao final da fila', 'success');
      setForceUpdate(prev => prev + 1);
  };

  // --- Deletion & Toggle Logic ---

  const handleDeleteMemberClick = (p: Participant) => {
    if (!isGlobalEditMode) return; // Safety
    setConfirmModal({
        isOpen: true,
        type: 'danger',
        title: `${t('detail.remove_member_title')} ${p.name}?`,
        desc: t('detail.remove_member_desc'),
        confirmText: t('detail.remove_confirm'),
        action: () => executeDeleteMember(p.id)
    });
  };

  const executeDeleteMember = async (id: string) => {
      await deleteParticipant(id);
      
      // Remove & Re-calculate dates/orders
      const remainingParticipants = xitique.participants
          .filter(p => p.id !== id)
          .map((p, index) => ({
              ...p,
              order: index + 1,
              payoutDate: addPeriod(xitique.startDate, xitique.frequency, index)
          }));

      const updatedXitique = { 
          ...xitique, 
          participants: remainingParticipants 
      };
      
      await saveXitique(updatedXitique);
      xitique.participants = remainingParticipants;
      
      setForceUpdate(prev => prev + 1);
      addToast(t('common.success'), 'success');
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

      let updatedParticipants = xitique.participants.map(p => {
          if (p.id === editForm.id) {
              return { 
                  ...p, 
                  name: editForm.name,
                  payoutDate: editForm.date ? new Date(editForm.date).toISOString() : undefined,
                  customContribution: editForm.amount
                  // Note: Order change via modal not implemented here to keep drag/drop as primary reorder method
              };
          }
          return p;
      });

      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      xitique.participants = updatedParticipants;
      setEditForm(null);
      addToast('Participante atualizado', 'success');
      setForceUpdate(prev => prev + 1);
  };

  const handleToggleClick = (participantId: string) => {
    // Cannot toggle payments in edit mode to avoid confusion
    if (isGlobalEditMode) {
        addToast("Saia do modo de edição para registrar pagamentos.", "info");
        return;
    }
    if(isCompleted) return;

    const participant = xitique.participants.find(p => p.id === participantId);
    if (!participant) return;

    const dynamicAmount = calculateDynamicPot(xitique, participant);
    const action = () => executeToggle(participantId);

    if (!participant.received) {
        setConfirmModal({
            isOpen: true,
            type: 'success',
            title: `${t('modal.payout_title')}: ${participant.name}`,
            desc: `${t('modal.payout_desc')} (${formatCurrency(dynamicAmount)})`,
            confirmText: t('modal.confirm_payout'),
            action
        });
    } else {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('modal.reversal_title'),
            desc: `${t('modal.reversal_desc')} (${formatCurrency(dynamicAmount)})`,
            confirmText: t('modal.confirm_reversal'),
            action
        });
    }
  };

  const executeToggle = async (participantId: string) => {
    const participant = xitique.participants.find(p => p.id === participantId);
    if (!participant) return;
    const willReceive = !participant.received;
    const dynamicAmount = calculateDynamicPot(xitique, participant);

    let newTx = createTransaction(
            willReceive ? TransactionType.PAYOUT : TransactionType.PAYOUT_REVERSAL,
            dynamicAmount, 
            `${willReceive ? t('ind.type_payout') : 'Correction'}: ${participant.name}`
    );

    const updatedParticipants = xitique.participants.map(p => 
      p.id === participantId ? { ...p, received: willReceive } : p
    );
    
    const allReceived = updatedParticipants.every(p => p.received);
    const updatedTx = [newTx, ...(xitique.transactions || [])];

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
    
    addToast(willReceive ? 'Pago' : 'Revertido', 'success');
    setForceUpdate(prev => prev + 1);
  };

  // --- Exports & Utils ---
  
  const handleShare = async () => {
    const header = `💰 *${xitique.name}*`;
    const list = xitique.participants.map((p, i) => {
        const date = p.payoutDate ? formatDate(p.payoutDate) : 'Data indef.';
        const status = p.received ? '✅ Pago' : '⏳ Pendente';
        const amount = calculateDynamicPot(xitique, p);
        return `${i + 1}. ${p.name} - ${date} (${formatCurrency(amount)}) ${status}`;
    }).join('\n');
    const fullText = `${header}\n\n📅 *Cronograma:*\n${list}`;

    if (navigator.share) {
        await navigator.share({ title: xitique.name, text: fullText });
    } else {
        await navigator.clipboard.writeText(fullText);
        addToast(t('detail.share_success'), 'success');
    }
  };

  const currentBadge = getStatusBadge(xitique.status);

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

      {/* --- Top Bar --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium">
          <ArrowLeft size={20} className="mr-2" /> {t('detail.back')}
        </button>
        
        <div className="flex gap-2">
            {!isGlobalEditMode && !isCompleted && (
                <button 
                    onClick={() => setIsGlobalEditMode(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center text-sm font-bold shadow-md hover:bg-slate-800 transition-all"
                >
                    <Settings size={18} className="mr-2" /> Editar Grupo
                </button>
            )}
            {isGlobalEditMode && (
                <>
                    <button onClick={handleCancelGlobalEdit} className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-xl font-bold text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSaveGlobalEdit} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 flex items-center gap-2">
                        <Save size={18} /> Salvar Alterações
                    </button>
                </>
            )}
            
            {!isGlobalEditMode && (
                <div className="flex gap-2">
                    <button onClick={handleShare} className="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-3 py-2 rounded-xl">
                        <Share2 size={18} />
                    </button>
                    <button onClick={() => {
                        setConfirmModal({
                            isOpen: true,
                            type: 'danger',
                            title: t('modal.delete_title'),
                            desc: t('modal.delete_desc'),
                            confirmText: t('modal.confirm_delete'),
                            action: onDelete
                        });
                    }} className="text-red-400 hover:bg-red-50 px-3 py-2 rounded-xl">
                        <Trash size={18} />
                    </button>
                </div>
            )}
        </div>
      </div>

      <FinancialTip context="group" />

      {/* --- Main Info Card --- */}
      <div className={`bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all ${isGlobalEditMode ? 'ring-4 ring-emerald-500/30 scale-[1.01]' : ''}`}>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
            {/* Header / Title / Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                 {isGlobalEditMode ? (
                    <div className="flex-1">
                        <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Nome do Grupo</label>
                        <input 
                            type="text" 
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-3xl font-bold text-white w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            {xitique.name}
                        </h1>
                        <div className="flex items-center gap-2">
                             <span className={`${currentBadge.color} ${currentBadge.textColor} text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm ring-1 ring-white/10`}>
                                {currentBadge.icon} {currentBadge.text}
                            </span>
                            <span className="bg-white/10 backdrop-blur text-slate-300 border border-white/10 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {xitique.frequency === 'WEEKLY' ? t('wiz.weekly') : xitique.frequency === 'MONTHLY' ? t('wiz.monthly') : t('wiz.daily')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {!isGlobalEditMode && (
                <div className="mb-8">
                   <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                      <span>Progresso do Ciclo</span>
                      <span>{Math.round(progressPercentage)}%</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                       <div 
                          className={`h-3 rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                          style={{ width: `${progressPercentage}%` }}
                       ></div>
                   </div>
                </div>
            )}

            <div className="flex flex-wrap gap-4">
                {/* Contribution Amount */}
                <div className={`flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 relative ${isGlobalEditMode ? 'bg-slate-800 border-slate-600' : ''}`}>
                    <div className="bg-emerald-400/20 p-2 rounded-lg">
                        <DollarSign size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-2">
                            {t('detail.contribution_per_person')}
                        </div>
                        {isGlobalEditMode ? (
                             <input 
                                type="number"
                                value={tempAmount}
                                onChange={(e) => setTempAmount(Number(e.target.value))}
                                className="bg-transparent border-b border-slate-500 w-24 text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                             />
                        ) : (
                             <div className="text-xl font-bold">{formatCurrency(xitique.amount)}</div>
                        )}
                    </div>
                </div>

                {/* Start Date & Recalculation */}
                <div className={`flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 ${isGlobalEditMode ? 'bg-slate-800 border-slate-600' : ''}`}>
                    <div className="bg-purple-400/20 p-2 rounded-lg">
                        <Calendar size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold">{t('detail.start_date')}</div>
                        {isGlobalEditMode ? (
                            <div className="flex flex-col">
                                <input 
                                    type="date"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                    className="bg-transparent text-white font-bold text-sm focus:outline-none w-32"
                                />
                                <span className="text-[10px] text-emerald-400 mt-0.5">*Datas futuras serão ajustadas</span>
                            </div>
                        ) : (
                            <div className="text-xl font-bold">{formatDate(xitique.startDate)}</div>
                        )}
                    </div>
                </div>

                {/* Member Count */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
                    <div className="bg-blue-400/20 p-2 rounded-lg">
                        <Users size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-300 uppercase font-semibold">{t('detail.members')}</div>
                        <div className="text-xl font-bold">{xitique.participants.length}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      
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
          Histórico
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div className="space-y-4">
          
          {/* List Header / Filters */}
          <div className="bg-slate-100 p-4 -mx-4 md:mx-0 md:rounded-2xl border-y md:border border-slate-200 shadow-inner mb-4 transition-all">
             <div className="flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex-1 relative w-full">
                     <Search className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                     <input 
                       type="text" 
                       placeholder={t('detail.search_placeholder')} 
                       className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-bold text-slate-700 shadow-sm transition-all placeholder:font-normal placeholder:text-slate-400"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                     />
                     {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <XCircle size={16} />
                        </button>
                     )}
                 </div>
                 
                 {!isGlobalEditMode && (
                     <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                         <button 
                            onClick={() => handleSort('name')} 
                            className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'name' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                         >
                            <ArrowUpDown size={16} className={sortConfig.key === 'name' ? 'text-emerald-400' : 'text-slate-400'} /> 
                            {t('detail.sort_name')}
                         </button>
                         <button 
                            onClick={() => handleSort('payoutDate')} 
                            className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'payoutDate' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                         >
                            <Calendar size={16} className={sortConfig.key === 'payoutDate' ? 'text-emerald-400' : 'text-slate-400'} /> 
                            {t('detail.sort_date')}
                         </button>
                         <button 
                            onClick={() => handleSort('received')} 
                            className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'received' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                         >
                            <CheckSquare size={16} className={sortConfig.key === 'received' ? 'text-emerald-400' : 'text-slate-400'} /> 
                            {t('detail.sort_status')}
                         </button>
                     </div>
                 )}
             </div>
          </div>
          
          {/* Add Member Button (Only in Edit Mode) */}
          {isGlobalEditMode && (
                <button 
                    onClick={handleAddMember}
                    className="w-full py-4 border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 font-bold hover:bg-emerald-100 transition-all gap-2 shadow-sm"
                >
                    <Plus size={20} /> Adicionar Novo Membro
                </button>
          )}

          {/* Members Grid/List */}
          <div className="grid gap-3">
            {processedParticipants.map((p, idx) => {
              const isEditing = editForm?.id === p.id;
              const isLocked = lockedIds.has(p.id);
              const receivableAmount = calculateDynamicPot(xitique, p);
              const isVariableAmount = p.customContribution !== undefined && p.customContribution !== xitique.amount;
              
              return (
              <div 
                key={p.id} 
                draggable={canDrag && !isEditing && !isLocked}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, p.id)}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
                  isEditing ? 'bg-indigo-50 border-indigo-200 shadow-lg ring-1 ring-indigo-300 relative z-10' : 
                  isLocked ? 'bg-rose-50 border-rose-200' :
                  isGlobalEditMode ? 'bg-white border-dashed border-slate-300 hover:border-emerald-400 cursor-move' :
                  p.received 
                    ? 'bg-slate-50 border-slate-100 opacity-75' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                  {/* Drag Handle or Lock Status */}
                  <div className={`w-6 flex justify-center ${canDrag ? 'text-slate-400' : 'text-slate-200'}`}>
                     {isGlobalEditMode && !isLocked && <GripVertical size={20} />}
                     {isLocked && <Lock size={16} className="text-rose-400" />}
                  </div>

                  {/* Status Checkbox */}
                  {!isGlobalEditMode && (
                      <button 
                          onClick={() => handleToggleClick(p.id)}
                          disabled={isCompleted}
                          className={`transition-colors p-1 rounded-md ${p.received ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                          {p.received ? <CheckSquare size={24} /> : <Square size={24} />}
                      </button>
                  )}

                  {/* Index */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${p.received ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {p.order}
                  </div>

                  {/* Avatar - Unique Icon per User */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 overflow-hidden ring-2 ring-white ${getAvatarColor(p.name)}`}>
                      {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Details or Edit Form */}
                  <div className="flex-1 min-w-[200px]">
                    {isEditing ? (
                        // INLINE EDIT FORM
                        <div className="flex flex-col md:flex-row gap-2 md:items-center w-full">
                             <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nome</label>
                                <input 
                                    type="text" 
                                    value={editForm.name} 
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className="font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full"
                                    placeholder="Nome"
                                    autoFocus
                                />
                             </div>
                             <div className="flex gap-2">
                                <div className="relative w-32">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Contribuição (MT)</label>
                                    <span className="absolute left-2 bottom-2.5 text-xs font-bold text-slate-400">MT</span>
                                    <input 
                                        type="number"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                                        className="w-full pl-8 p-2 border border-slate-300 rounded-lg font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Data Pagamento</label>
                                    <input 
                                        type="date" 
                                        value={editForm.date} 
                                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                             </div>
                             <div className="flex gap-1 items-end pb-0.5">
                                <button onClick={saveParticipantChanges} className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600"><Check size={16}/></button>
                                <button onClick={() => setEditForm(null)} className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300"><X size={16}/></button>
                             </div>
                        </div>
                    ) : (
                        // DISPLAY MODE
                        <div onClick={() => isGlobalEditMode && startEditingParticipant(p)} className={isGlobalEditMode ? 'cursor-pointer hover:bg-slate-50 p-1 rounded-lg -ml-1 transition-colors' : ''}>
                             <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold text-lg ${p.received ? 'text-emerald-900 line-through decoration-emerald-500/50' : 'text-slate-900'}`}>
                                    {p.name}
                                </h3>
                                {p.received && <CheckCircle2 size={16} className="text-emerald-500" />}
                                {isVariableAmount && (
                                    <div className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border border-indigo-200 shadow-sm">
                                        <Coins size={10} /> {formatCurrency(p.customContribution!)}
                                    </div>
                                )}
                                {isGlobalEditMode && <Pencil size={12} className="text-slate-400" />}
                             </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-slate-500 font-medium">
                                    <Calendar size={12} />
                                    {p.payoutDate ? formatDate(p.payoutDate) : t('detail.date_tbd')}
                                </div>
                                <div className="flex items-center gap-1 font-mono font-medium text-slate-400">
                                    <DollarSign size={12} /> {formatCurrency(receivableAmount)}
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 pl-12 md:pl-0">
                   {isGlobalEditMode && !isEditing && (
                       <button 
                           onClick={(e) => { e.stopPropagation(); handleDeleteMemberClick(p); }}
                           className="p-2 bg-white text-red-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all shadow-sm"
                           title="Remover Membro"
                       >
                           <Trash size={18} />
                       </button>
                   )}
                   
                   {!isGlobalEditMode && (
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${p.received ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {p.received ? 'PAGO' : 'PENDENTE'}
                        </div>
                   )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* History Tab */}
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
                                    {tx.type === TransactionType.PAYOUT_REVERSAL ? <RotateCcw size={18} /> : <CheckCircle2 size={18} />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{tx.description}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>{new Date(tx.date).toLocaleDateString()}</span>
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
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{tx.type}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default XitiqueDetail;
