
import React, { useState, useEffect } from 'react';
import { Xitique, Participant, TransactionType, XitiqueStatus } from '../types';
import { formatDate, addPeriod } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { analyzeFairness } from '../services/geminiService';
import { saveXitique, deleteParticipant } from '../services/storage';
import { createTransaction, calculateCyclePot, calculateDynamicPot } from '../services/financeLogic';
import { Sparkles, Calendar, DollarSign, Users, ArrowLeft, Trash, CheckCircle2, Clock, Pencil, X, Check, History, Calculator, AlertTriangle, AlertCircle, RefreshCw, Archive, Share2, Search, ArrowUpDown, Filter, CheckSquare, Square, GripVertical, Plus, Save, Download, ThumbsUp, Hash, XCircle, FileText, Activity, PenTool, PlayCircle, Lock, Unlock, Shuffle, Coins } from 'lucide-react';
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

  // Drag & Drop & Shuffle State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [_, setForceUpdate] = useState(0); // To trigger re-renders on mutation

  // Derived State
  // Note: calculateCyclePot is used for general stats, but individual rows use calculateDynamicPot
  const totalPotentialFlow = calculateCyclePot(xitique.amount, xitique.participants); 
  const hasUnequalContributions = xitique.participants.some(p => p.customContribution !== undefined && p.customContribution !== xitique.amount);
  const progressPercentage = (xitique.participants.filter(p => p.received).length / xitique.participants.length) * 100;
  const isCompleted = xitique.status === XitiqueStatus.COMPLETED;
  
  // Check if payments have started (block delete if true)
  const paymentsStarted = xitique.participants.some(p => p.received);

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

  // Helper: Deterministic color for avatar based on name
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

  // Helper: Get Status Badge details
  const getStatusBadge = (status: XitiqueStatus) => {
      switch(status) {
          case XitiqueStatus.ACTIVE: 
            return { color: 'bg-emerald-500', textColor: 'text-emerald-50', text: 'Active', icon: <Activity size={14}/> };
          case XitiqueStatus.PLANNING: 
            return { color: 'bg-blue-500', textColor: 'text-blue-50', text: 'Planning', icon: <PenTool size={14}/> };
          case XitiqueStatus.COMPLETED: 
            return { color: 'bg-indigo-500', textColor: 'text-indigo-50', text: 'Completed', icon: <CheckCircle2 size={14}/> };
          case XitiqueStatus.RISK: 
            return { color: 'bg-rose-500', textColor: 'text-rose-50', text: 'Risk', icon: <AlertTriangle size={14}/> };
          default: 
            return { color: 'bg-slate-500', textColor: 'text-slate-50', text: status, icon: <FileText size={14}/> };
      }
  };

  // Filter & Sort Logic
  const processedParticipants = [...xitique.participants]
    .filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        
        // 1. Name Match
        if (p.name.toLowerCase().includes(term)) return true;
        
        // 2. Date Match (Formatted)
        const dateStr = p.payoutDate ? formatDate(p.payoutDate).toLowerCase() : '';
        if (dateStr.includes(term)) return true;
        
        // 3. Amount Match (Custom)
        if (p.customContribution?.toString().includes(term)) return true;
        
        // 4. Status Match
        const statusPaid = t('detail.paid_out').toLowerCase();
        const statusPending = "pending"; // Common fallback term
        if (p.received && statusPaid.includes(term)) return true;
        // Basic heuristic for 'pending' in different languages if user types 'pen'
        if (!p.received && (term.includes('pen') || statusPending.includes(term))) return true;
        
        return false;
    })
    .sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'received':
          return (Number(a.received) - Number(b.received)) * dir;
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

  const toggleLock = (id: string) => {
      setLockedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleShuffle = async () => {
    if (isCompleted) return;

    // Filter out locked participants
    const currentParticipants = [...xitique.participants].sort((a, b) => a.order - b.order);
    const unlocked = currentParticipants.filter(p => !lockedIds.has(p.id));

    if (unlocked.length < 2) {
        addToast(t('wiz.alert_members') || "Need at least 2 unlocked members to shuffle", "info");
        return;
    }

    // Shuffle logic (Fisher-Yates)
    const shuffledUnlocked = [...unlocked];
    for (let i = shuffledUnlocked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledUnlocked[i], shuffledUnlocked[j]] = [shuffledUnlocked[j], shuffledUnlocked[i]];
    }

    // Reconstruct list preserving locked positions
    const newParticipants = currentParticipants.map(p => {
        if (lockedIds.has(p.id)) return p;
        return shuffledUnlocked.shift()!;
    });

    // Update Orders and Dates
    const updatedWithDates = newParticipants.map((p, index) => ({
        ...p,
        order: index + 1,
        payoutDate: addPeriod(xitique.startDate, xitique.frequency, index)
    }));

    // Save
    const updatedXitique = { ...xitique, participants: updatedWithDates };
    await saveXitique(updatedXitique);
    xitique.participants = updatedWithDates;
    
    // Reset sort to see changes
    setSortConfig({ key: 'order', direction: 'asc' });
    setForceUpdate(prev => prev + 1);
    addToast("Order shuffled successfully", "success");
  };

  // Drag Handlers
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
          addToast("Cannot swap locked items", "error");
          return;
      }

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
          order: index + 1,
          payoutDate: addPeriod(xitique.startDate, xitique.frequency, index)
      }));

      // Optimistic update
      xitique.participants = updatedParticipants;
      
      const updatedXitique = { ...xitique, participants: updatedParticipants };
      await saveXitique(updatedXitique);
      
      addToast('Ordem atualizada', 'success');
      setDraggedId(null);
      setForceUpdate(prev => prev + 1);
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
      setForceUpdate(prev => prev + 1);
  };

  // DELETE MEMBER LOGIC
  const handleDeleteMemberClick = (p: Participant) => {
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
      try {
          await deleteParticipant(id);
      } catch (err) {
          console.error("Failed to delete participant from DB", err);
          addToast(t('common.error'), 'error');
          return;
      }

      // 1. Filter
      const remainingParticipants = xitique.participants.filter(p => p.id !== id);
      
      // 2. Reorder & Redate
      const reorderedParticipants = remainingParticipants.map((p, index) => ({
          ...p,
          order: index + 1,
          payoutDate: addPeriod(xitique.startDate, xitique.frequency, index)
      }));

      // 3. Status Check
      const hasUnequal = reorderedParticipants.some(p => {
         const val = p.customContribution !== undefined ? p.customContribution : xitique.amount;
         return val !== xitique.amount;
      });
      const newStatus = hasUnequal ? XitiqueStatus.RISK : (xitique.status === XitiqueStatus.RISK ? XitiqueStatus.ACTIVE : xitique.status);

      const updatedXitique = { 
          ...xitique, 
          participants: reorderedParticipants,
          status: newStatus 
      };
      
      await saveXitique(updatedXitique);
      
      // Update local state
      xitique.participants = reorderedParticipants;
      xitique.status = newStatus;
      
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

      const currentParticipant = xitique.participants.find(p => p.id === editForm.id);
      if (!currentParticipant) return;

      // Basic bounds check
      if (editForm.order < 1 || editForm.order > xitique.participants.length) {
          addToast(`A ordem deve ser entre 1 e ${xitique.participants.length}`, 'error');
          return;
      }

      // Handle Logic: If order changed, check collision and swap
      let updatedParticipants = [...xitique.participants];
      const targetOrder = editForm.order;
      const oldOrder = currentParticipant.order;

      if (targetOrder !== oldOrder) {
          if (lockedIds.has(editForm.id)) {
              addToast("Cannot change order of locked member", "error");
              return;
          }
          
          const collisionIndex = updatedParticipants.findIndex(p => p.order === targetOrder && p.id !== editForm.id);
          
          if (collisionIndex !== -1) {
              if (lockedIds.has(updatedParticipants[collisionIndex].id)) {
                 addToast("Target position is locked", "error");
                 return;
              }
              // SWAP: The person currently at targetOrder moves to oldOrder
              updatedParticipants[collisionIndex] = {
                  ...updatedParticipants[collisionIndex],
                  order: oldOrder
              };
              addToast(`Ordem trocada com ${updatedParticipants[collisionIndex].name}`, 'info');
          }
      }

      // Apply changes to the edited participant
      updatedParticipants = updatedParticipants.map(p => {
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
      }).sort((a, b) => a.order - b.order);

      // Final Sequence Validation (Just in case)
      const allOrders = updatedParticipants.map(p => p.order).sort((a, b) => a - b);
      const isSequential = allOrders.every((val, index) => val === index + 1);

      if (!isSequential) {
          addToast(t('common.error') + ": Erro de sequência. Use 'Arrastar e Soltar' para reordenar com segurança.", 'error');
          return;
      }

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
      setForceUpdate(prev => prev + 1);
  };

  const handleBulkToggle = () => {
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
    
    // CALCULATE DYNAMIC TRANSACTION AMOUNT FOR EACH PERSON
    // Rule: The payout amount depends on the beneficiary's base contribution
    const updatedParticipants = xitique.participants.map(p => {
        if (p.received !== targetState) {
             const dynamicAmount = calculateDynamicPot(xitique, p);
             
             if (targetState) {
                newTransactions.push(createTransaction(
                    TransactionType.PAYOUT,
                    dynamicAmount, 
                    `${t('ind.type_payout')}: ${p.name} (Bulk)`
                ));
            } else {
                newTransactions.push(createTransaction(
                    TransactionType.PAYOUT_REVERSAL,
                    dynamicAmount,
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
    setForceUpdate(prev => prev + 1);
  };

  const handleShare = async () => {
    try {
        const header = `💰 *${xitique.name}*`;
        const list = xitique.participants.map((p, i) => {
            const date = p.payoutDate ? formatDate(p.payoutDate) : 'TBD';
            const status = p.received ? '✅ Pago' : '⏳ Pendente';
            const amount = calculateDynamicPot(xitique, p);
            return `${i + 1}. ${p.name} - ${date} (${formatCurrency(amount)}) ${status}`;
        }).join('\n');
        
        const footer = `\nGerado por Xitique Xanga`;
        const fullText = `${header}\n\n📅 *Cronograma e Pagamentos:*\n${list}${footer}`;

        if (navigator.share) {
            await navigator.share({
                title: xitique.name,
                text: fullText,
            });
            addToast(t('detail.share_success'), 'success');
        } else {
            await navigator.clipboard.writeText(fullText);
            addToast(t('detail.share_success'), 'success');
        }
    } catch (err) {
        console.error("Share failed:", err);
        addToast(t('detail.share_fail'), 'error');
    }
  };

  const handleExportCSV = () => {
      const headers = "Order,Name,Date,ContributionBase,ReceivablePot,Status\n";
      const rows = xitique.participants.map(p => {
        const receivable = calculateDynamicPot(xitique, p);
        return `${p.order},"${p.name}",${p.payoutDate || ''},${p.customContribution || xitique.amount},${receivable},${p.received ? 'PAID' : 'PENDING'}`
      }).join("\n");
      
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text(xitique.name, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${t('detail.start_date')}: ${formatDate(xitique.startDate)} | ${t('detail.members')}: ${xitique.participants.length}`, 14, 30);

    // Table Data
    const tableData = xitique.participants.map(p => [
      p.order.toString(),
      p.name,
      p.payoutDate ? formatDate(p.payoutDate) : 'TBD',
      formatCurrency(calculateDynamicPot(xitique, p)),
      p.received ? "PAID" : "PENDING"
    ]);

    // Generate Table
    // @ts-ignore - autotable plugin types can be tricky with ESM imports
    doc.autoTable({
      head: [['#', 'Name', 'Date', 'Payout Amount', 'Status']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        4: { fontStyle: 'bold' }
      },
      didParseCell: function(data: any) {
         if (data.column.index === 4 && data.cell.raw === 'PAID') {
             data.cell.styles.textColor = [16, 185, 129]; // Green
         }
      }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by Xitique Xanga", 14, pageHeight - 10);

    doc.save(`${xitique.name.replace(/\s+/g, '_')}_schedule.pdf`);
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

    // Calculate dynamic amount for this specific participant
    const dynamicAmount = calculateDynamicPot(xitique, participant);

    if (!participant.received) {
        setConfirmModal({
            isOpen: true,
            type: 'success',
            title: `${t('modal.payout_title')}: ${participant.name}`,
            desc: `${t('modal.payout_desc')} (${formatCurrency(dynamicAmount)})`,
            confirmText: t('modal.confirm_payout'),
            action: () => executeToggle(participantId)
        });
    } else {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: t('modal.reversal_title'),
            desc: `${t('modal.reversal_desc')} (${formatCurrency(dynamicAmount)})`,
            confirmText: t('modal.confirm_reversal'),
            action: () => executeToggle(participantId)
        });
    }
  };

  const executeToggle = async (participantId: string) => {
    const participant = xitique.participants.find(p => p.id === participantId);
    if (!participant) return;

    const willReceive = !participant.received;
    
    // CALCULATE DYNAMIC TRANSACTION AMOUNT
    const dynamicAmount = calculateDynamicPot(xitique, participant);

    let newTx;
    if (willReceive) {
        newTx = createTransaction(
            TransactionType.PAYOUT,
            dynamicAmount, 
            `${t('ind.type_payout')}: ${participant.name}`
        );
    } else {
        newTx = createTransaction(
            TransactionType.PAYOUT_REVERSAL,
            dynamicAmount,
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
    setForceUpdate(prev => prev + 1);
    
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium">
          <ArrowLeft size={20} className="mr-2" /> {t('detail.back')}
        </button>
        <div className="flex gap-2">
            <button onClick={handleExportPDF} className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl flex items-center text-sm font-bold transition-colors border border-emerald-200">
                <FileText size={18} className="mr-2" /> {t('detail.export_pdf')}
            </button>
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
                <span className="bg-white/10 backdrop-blur text-slate-300 border border-white/10 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {xitique.frequency === 'WEEKLY' ? t('wiz.weekly') : xitique.frequency === 'MONTHLY' ? t('wiz.monthly') : t('wiz.daily')}
                </span>
                
                <span className={`${currentBadge.color} ${currentBadge.textColor} text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
                    {currentBadge.icon}
                    {currentBadge.text}
                </span>
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
                        <div className="text-xs text-slate-300 uppercase font-semibold">Max Pot (Est.)</div>
                        <div className={`text-xl font-bold ${hasUnequalContributions && !isCompleted ? 'text-amber-400' : 'text-white'}`}>{formatCurrency(totalPotentialFlow)}</div>
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
                   placeholder="Search (name, amount, date)..." 
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
                 {/* Shuffle Button */}
                 {!isCompleted && !searchTerm && (
                     <button 
                         onClick={handleShuffle}
                         className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap"
                         title="Randomly shuffle unlocked participants"
                     >
                         <Shuffle size={14} /> Shuffle
                     </button>
                 )}
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
              const isLocked = lockedIds.has(p.id);
              
              // Dynamic Calculation for UI
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
                  p.received 
                    ? 'bg-slate-50 border-slate-100 opacity-75 hover:opacity-100' 
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                  {/* Drag Handle */}
                  <div className={`cursor-grab ${canDrag && !isLocked ? 'text-slate-400 hover:text-emerald-500' : 'text-slate-200 cursor-not-allowed'}`}>
                     <GripVertical size={20} />
                  </div>

                  {/* Lock Button */}
                   {!isEditing && !isCompleted && (
                       <button 
                          onClick={(e) => { e.stopPropagation(); toggleLock(p.id); }}
                          className={`p-1 rounded transition-colors ${isLocked ? 'text-rose-500 hover:text-rose-600' : 'text-slate-300 hover:text-slate-500'}`}
                          title={isLocked ? "Unlock position" : "Lock position"}
                       >
                          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                       </button>
                   )}

                  {/* Checkbox Status */}
                  <button 
                      onClick={() => handleToggleClick(p.id)}
                      disabled={isCompleted || isEditing}
                      className={`transition-colors p-1 rounded-md ${p.received ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
                  >
                      {p.received ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>

                  {/* Index */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    p.received ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.order}
                  </div>

                  {/* Avatar Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 ${getAvatarColor(p.name)}`}>
                      {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Main Details (Or Edit Form) */}
                  <div className="flex-1 min-w-[200px]">
                    {isEditing ? (
                        <div className="flex flex-col gap-3 w-full">
                             <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                 {/* Order & Name Group */}
                                 <div className="flex gap-2 items-center flex-1">
                                    <div className="relative w-16 flex-shrink-0">
                                       <Hash size={12} className="absolute left-2 top-3 text-slate-400 pointer-events-none"/>
                                       <input 
                                         type="number" 
                                         value={editForm.order} 
                                         onChange={(e) => setEditForm({...editForm, order: Number(e.target.value)})}
                                         className="w-full pl-6 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-bold text-center"
                                         title="Order Position"
                                       />
                                    </div>
                                    <input 
                                      type="text" 
                                      value={editForm.name} 
                                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                      className="flex-1 font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white min-w-[120px]"
                                      placeholder="Name"
                                      autoFocus
                                    />
                                 </div>

                                 {/* Amount & Date Group */}
                                 <div className="flex gap-2 items-center">
                                    {/* Custom Contribution Input - Highlighted */}
                                    <div className="relative w-32 md:w-36 flex-shrink-0">
                                        <div className="md:hidden text-[10px] uppercase font-bold text-indigo-600 mb-1 ml-1 flex items-center gap-1">
                                            <Coins size={10} /> Contribution
                                        </div>
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0 text-indigo-400 text-xs font-bold pointer-events-none">$</span>
                                        <input 
                                            type="number"
                                            value={editForm.amount}
                                            onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                                            className="w-full pl-6 p-2 border-2 border-indigo-200 bg-indigo-50/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-bold text-indigo-900"
                                            title="Contribuição Individual"
                                            placeholder="Valor"
                                        />
                                    </div>

                                    <div className="relative flex-1 md:w-40">
                                        <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                        <input 
                                            type="date" 
                                            value={editForm.date} 
                                            onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                            className="w-full pl-8 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                                        />
                                    </div>
                                 </div>
                             </div>
                        </div>
                    ) : (
                        <div onClick={() => !isCompleted && !isLocked && startEditingParticipant(p)} className={`cursor-pointer group ${isLocked ? 'cursor-default' : ''}`}>
                             <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold text-lg flex items-center gap-2 group-hover:text-emerald-600 transition-colors ${p.received ? 'text-emerald-900 line-through decoration-emerald-500/50' : 'text-slate-900'}`}>
                                    {p.name}
                                </h3>
                                {p.received ? (
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                ) : null}
                                {isVariableAmount && (
                                    <div title="Contribuição Variável" className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-200 flex items-center gap-1">
                                        <Coins size={10} /> {formatCurrency(p.customContribution!)}
                                    </div>
                                )}
                                {!p.received && !isLocked && <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />}
                             </div>
                            <div className="flex items-center gap-4 text-sm pl-0">
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Calendar size={12} />
                                    {p.payoutDate ? formatDate(p.payoutDate) : t('detail.date_tbd')}
                                </div>
                                <div className={`flex items-center gap-1 font-mono font-medium text-slate-400`}>
                                    <DollarSign size={12} />
                                    {/* Show what THEY will receive when it's their turn */}
                                    <span title="Total Payout for this member">
                                        Payout: {formatCurrency(receivableAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 pl-12 md:pl-0">
                   {isEditing ? (
                       <div className="flex flex-col gap-2 h-full justify-center pt-6 md:pt-0">
                        <button onClick={saveParticipantChanges} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-lg shadow-sm transition-transform hover:scale-105"><Save size={18} /></button>
                        <button onClick={() => setEditForm(null)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 p-2.5 rounded-lg transition-transform hover:scale-105"><X size={18} /></button>
                       </div>
                   ) : (
                       <>
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMemberClick(p); }}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                              title={t('detail.remove_member_title') || "Remove"}
                          >
                              <Trash size={18} />
                          </button>
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
                       </>
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
