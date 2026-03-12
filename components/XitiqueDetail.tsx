
import React, { useState, useEffect } from 'react';
import { Xitique, Participant, TransactionType, XitiqueStatus } from '../types';
import { formatDate, addPeriod } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { analyzeFairness, suggestAdjustments, AdjustmentSuggestion } from '../services/geminiService';
import { saveXitique, deleteParticipant } from '../services/storage';
import { createTransaction, calculateCyclePot, calculateDynamicPot } from '../services/financeLogic';
import { ArrowLeft, Trash, CheckCircle2, Pencil, X, Check, History, Calculator, AlertTriangle, AlertCircle, RefreshCw, Archive, Share2, Search, ArrowUpDown, Filter, CheckSquare, Square, GripVertical, Plus, Save, Download, ThumbsUp, Hash, XCircle, FileText, Activity, PenTool, PlayCircle, Lock, Unlock, Shuffle, Coins, Settings, RotateCcw, ArrowDownRight, LogIn, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import FinancialTip from './FinancialTip';
import ConfirmationModal from './ConfirmationModal';
import XitiqueHeader from './XitiqueHeader';
import ParticipantList from './ParticipantList';
import ActionToolbar from './ActionToolbar';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  xitique: Xitique;
  onBack: () => void;
  onDelete: () => void;
  onRenew?: (xitique: Xitique) => void;
}

type SortKey = 'order' | 'name' | 'payoutDate' | 'received';

const XitiqueDetail: React.FC<Props> = ({ xitique: initialXitique, onBack, onDelete, onRenew }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [xitique, setXitique] = useState<Xitique>(initialXitique);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AdjustmentSuggestion[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'analysis' | 'history'>('schedule');

  // --- Global Edit Mode State ---
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  
  // Temporary States for Global Edit
  const [tempName, setTempName] = useState(initialXitique.name);
  const [tempAmount, setTempAmount] = useState(initialXitique.amount);
  const [tempStartDate, setTempStartDate] = useState(initialXitique.startDate ? new Date(initialXitique.startDate).toISOString().split('T')[0] : '');

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

  // Derived State
  // Note: totalPotentialFlow now represents the sum of all dynamic payouts in the cycle
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
    setXitique(initialXitique);
    setTempName(initialXitique.name);
    setTempAmount(initialXitique.amount);
    setTempStartDate(initialXitique.startDate ? new Date(initialXitique.startDate).toISOString().split('T')[0] : '');
    
    // Reset AI state when xitique changes
    setAiAnalysis(null);
    setAiSuggestions([]);
  }, [initialXitique]);

  const runAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const [analysis, suggestions] = await Promise.all([
        analyzeFairness(xitique, user?.id),
        suggestAdjustments(xitique)
      ]);
      setAiAnalysis(analysis);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("AI Error:", error);
      addToast("Erro ao processar análise da IA", "error");
    } finally {
      setLoadingAi(false);
    }
  };

  const applyAiSuggestion = async (suggestion: AdjustmentSuggestion) => {
    const updatedParticipants = xitique.participants.map(p => 
      p.id === suggestion.participantId 
        ? { ...p, customContribution: suggestion.suggestedContribution } 
        : p
    );
    
    const updatedXitique = { ...xitique, participants: updatedParticipants };
    await saveXitique(updatedXitique);
    setXitique(updatedXitique);
    
    // Remove suggestion from list
    setAiSuggestions(prev => prev.filter(s => s.participantId !== suggestion.participantId));
    addToast(`Ajuste aplicado para ${xitique.participants.find(p => p.id === suggestion.participantId)?.name}`, 'success');
  };

  const applyAllSuggestions = async () => {
    let updatedParticipants = [...xitique.participants];
    aiSuggestions.forEach(suggestion => {
      updatedParticipants = updatedParticipants.map(p => 
        p.id === suggestion.participantId 
          ? { ...p, customContribution: suggestion.suggestedContribution } 
          : p
      );
    });

    const updatedXitique = { ...xitique, participants: updatedParticipants };
    await saveXitique(updatedXitique);
    setXitique(updatedXitique);
    setAiSuggestions([]);
    addToast("Todos os ajustes foram aplicados", 'success');
  };

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
            return { color: 'bg-rose-500', textColor: 'text-rose-50', text: 'Dinâmico', icon: <AlertTriangle size={16}/> };
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

      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      
      // Update local state
      setXitique(updatedXitique);
      
      addToast('Ordem atualizada e datas recalculadas', 'success');
      setDraggedId(null);
  };

  // --- Optimized Edit Mode Logic ---

  const handleCancelGlobalEdit = () => {
    setTempName(xitique.name);
    setTempAmount(xitique.amount);
    setTempStartDate(xitique.startDate ? new Date(xitique.startDate).toISOString().split('T')[0] : '');
    setIsGlobalEditMode(false);
  };

  const handleSaveGlobalEdit = async () => {
    setIsSaving(true);
    try {
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
        setXitique(updatedXitique);

        setIsGlobalEditMode(false);
        addToast(t('common.success'), 'success');
    } catch (error) {
        console.error(error);
        addToast(t('common.error'), 'error');
    } finally {
        setIsSaving(false);
    }
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
      setXitique(updatedXitique);
      
      startEditingParticipant(newMember); // Auto-open edit for name
      addToast('Membro adicionado ao final da fila', 'success');
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
      setXitique(updatedXitique);
      
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
      setXitique(updatedXitique);
      setEditForm(null);
      addToast('Participante atualizado', 'success');
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
    setXitique(updatedXitique);
    
    addToast(willReceive ? 'Pago' : 'Revertido', 'success');
  };

  // --- Exports & Utils ---
  
  const handleShare = async () => {
    const header = `💰 *${xitique.name}*`;
    const invite = xitique.inviteCode ? `\n🔑 *Invite Code:* ${xitique.inviteCode}` : '';
    const list = xitique.participants.map((p, i) => {
        const date = p.payoutDate ? formatDate(p.payoutDate) : 'Data indef.';
        const status = p.received ? '✅ Pago' : '⏳ Pendente';
        const amount = calculateDynamicPot(xitique, p);
        return `${i + 1}. ${p.name} - ${date} (${formatCurrency(amount)}) ${status}`;
    }).join('\n');
    const fullText = `${header}${invite}\n\n📅 *Cronograma:*\n${list}`;

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

      <ActionToolbar 
        isEditMode={isGlobalEditMode}
        isCompleted={isCompleted}
        isSaving={isSaving}
        onBack={onBack}
        onEditToggle={() => setIsGlobalEditMode(true)}
        onCancelEdit={handleCancelGlobalEdit}
        onSaveEdit={handleSaveGlobalEdit}
        onShare={handleShare}
        onDelete={() => {
            setConfirmModal({
                isOpen: true,
                type: 'danger',
                title: t('modal.delete_title'),
                desc: t('modal.delete_desc'),
                confirmText: t('modal.confirm_delete'),
                action: onDelete
            });
        }}
      />

      <FinancialTip context="group" />

      <XitiqueHeader 
        xitique={xitique}
        isEditMode={isGlobalEditMode}
        tempName={tempName}
        tempAmount={tempAmount}
        tempStartDate={tempStartDate}
        totalVolume={totalPotentialFlow}
        onNameChange={setTempName}
        onAmountChange={setTempAmount}
        onStartDateChange={setTempStartDate}
      />

      {/* --- Main Content Area --- */}
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'schedule' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          {t('detail.tab_schedule')}
          {activeTab === 'schedule' && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full" 
            />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'analysis' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={activeTab === 'analysis' ? 'text-amber-500' : ''} />
            {t('detail.tab_analysis') || 'Análise IA'}
          </div>
          {activeTab === 'analysis' && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" 
            />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors relative ${activeTab === 'history' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          {t('dash.tab_history') || 'Histórico'}
          {activeTab === 'history' && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" 
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
      {activeTab === 'schedule' && (
        <motion.div
          key="schedule"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
        >
          <ParticipantList 
              xitique={xitique}
              participants={processedParticipants}
              isEditMode={isGlobalEditMode}
              searchTerm={searchTerm}
              sortConfig={sortConfig}
              lockedIds={lockedIds}
              editForm={editForm}
              onSearchChange={setSearchTerm}
              onSort={handleSort}
              onAddMember={handleAddMember}
              onTogglePayment={handleToggleClick}
              onEditClick={startEditingParticipant}
              onDeleteClick={handleDeleteMemberClick}
              onLockToggle={toggleLock}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditFormChange={setEditForm}
              onSaveEdit={saveParticipantChanges}
              onCancelEdit={() => setEditForm(null)}
          />
        </motion.div>
      )}

      {activeTab === 'analysis' && (
        <motion.div
          key="analysis"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {!aiAnalysis && !loadingAi ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                <Sparkles size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Assistente de Justiça IA</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Nossa IA pode analisar seu grupo para garantir que todos recebam um valor justo, especialmente em grupos com contribuições variadas.
              </p>
              <button 
                onClick={runAiAnalysis}
                className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={18} /> Começar Análise
              </button>
            </div>
          ) : loadingAi ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <Loader2 size={48} className="animate-spin text-amber-500 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analisando Equilíbrio Financeiro...</h3>
              <p className="text-slate-500 dark:text-slate-400">Isso pode levar alguns segundos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="text-amber-500" /> Relatório de Justiça
                    </h3>
                    <button 
                      onClick={runAiAnalysis}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Atualizar
                    </button>
                  </div>
                  <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/30">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <PenTool size={16} /> Ajustes Sugeridos
                  </h3>
                  
                  {aiSuggestions.length === 0 ? (
                    <div className="text-center py-8">
                      <ThumbsUp size={32} className="mx-auto mb-2 text-amber-300" />
                      <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">Tudo parece equilibrado! Nenhum ajuste automático necessário.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">{aiSuggestions.length} Sugestões</span>
                        <button 
                          onClick={applyAllSuggestions}
                          className="text-[10px] font-bold text-amber-800 underline"
                        >
                          Aplicar Todos
                        </button>
                      </div>
                      {aiSuggestions.map((suggestion, idx) => {
                        const p = xitique.participants.find(part => part.id === suggestion.participantId);
                        if (!p) return null;
                        return (
                          <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</span>
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                {formatCurrency(suggestion.suggestedContribution)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-tight">{suggestion.reason}</p>
                            <button 
                              onClick={() => applyAiSuggestion(suggestion)}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Aplicar Ajuste
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div
          key="history"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="text-blue-500" /> {t('dash.tab_history')}
              </h3>
              <div className="flex gap-2">
                  <button 
                      onClick={() => {
                          const doc = new jsPDF();
                          doc.text(`Relatório: ${xitique.name}`, 10, 10);
                          autoTable(doc, {
                              head: [['Data', 'Tipo', 'Descrição', 'Valor']],
                              body: (xitique.transactions || []).map(t => [
                                  formatDate(t.date) || '',
                                  t.type || '',
                                  t.description || '',
                                  formatCurrency(t.amount) || ''
                              ]),
                          });
                          doc.save(`xitique_${xitique.id}.pdf`);
                          addToast(t('detail.export_success'), 'success');
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                      <Download size={14} /> PDF
                  </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {(xitique.transactions || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-600 italic">
                  {t('detail.empty_history') || 'Nenhuma transação registrada ainda.'}
                </div>
              ) : (
                (xitique.transactions || []).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.type === TransactionType.PAYOUT ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                        tx.type === TransactionType.PAYOUT_REVERSAL ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {tx.type === TransactionType.PAYOUT ? <ArrowDownRight size={18} /> : <RotateCcw size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{tx.description}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">{formatDate(tx.date)}</div>
                      </div>
                    </div>
                    <div className={`font-black ${
                      tx.type === TransactionType.PAYOUT ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {tx.type === TransactionType.PAYOUT ? '-' : '+'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default XitiqueDetail;
