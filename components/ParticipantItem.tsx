import React from 'react';
import { Participant, Xitique } from '../types';
import { GripVertical, Lock, CheckSquare, Square, Pencil, Trash, Save, X } from 'lucide-react';
import { formatCurrency } from '../services/formatUtils';
import { formatDate } from '../services/dateUtils';
import { calculateDynamicPot } from '../services/financeLogic';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  participant: Participant;
  xitique: Xitique;
  isEditMode: boolean;
  isLocked: boolean;
  canDrag: boolean;
  isEditing: boolean;
  editForm: any;
  onTogglePayment: (id: string) => void;
  onEditClick: (p: Participant) => void;
  onDeleteClick: (p: Participant) => void;
  onLockToggle: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onEditFormChange: (form: any) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const ParticipantItem: React.FC<Props> = ({
  participant, xitique, isEditMode, isLocked, canDrag, isEditing, editForm,
  onTogglePayment, onEditClick, onDeleteClick, onLockToggle,
  onDragStart, onDragOver, onDrop, onEditFormChange, onSaveEdit, onCancelEdit
}) => {
  const { t } = useLanguage();

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

  const receivableAmount = calculateDynamicPot(xitique, participant);

  return (
    <div 
      draggable={canDrag && !isEditing && !isLocked}
      onDragStart={(e) => onDragStart(e, participant.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, participant.id)}
      className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
        isEditing ? 'bg-indigo-50 border-indigo-200 shadow-lg ring-1 ring-indigo-300 relative z-10 dark:bg-indigo-900/20 dark:border-indigo-800' : 
        isLocked ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800' :
        isEditMode ? 'bg-white border-dashed border-slate-300 hover:border-emerald-400 cursor-move dark:bg-slate-900 dark:border-slate-700' :
        participant.received 
          ? 'bg-slate-50 border-slate-100 opacity-75 dark:bg-slate-900/50 dark:border-slate-800' 
          : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md dark:bg-slate-900 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
        <div className={`w-6 flex justify-center ${canDrag ? 'text-slate-400' : 'text-slate-200 dark:text-slate-800'}`}>
           {isEditMode && !isLocked && <GripVertical size={20} />}
           {isLocked && <Lock size={16} className="text-rose-400" />}
        </div>

        {!isEditMode && (
            <button 
                onClick={() => onTogglePayment(participant.id)}
                aria-label={participant.received ? t('aria.mark_unpaid') || 'Marcar como não pago' : t('aria.mark_paid') || 'Marcar como pago'}
                className={`transition-colors p-1 rounded-md ${participant.received ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500 dark:text-slate-700'}`}
            >
                {participant.received ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>
        )}

        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${participant.received ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {participant.order}
        </div>

        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-slate-800 ${getAvatarColor(participant.name)}`}>
            {participant.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-[150px]">
          {isEditing ? (
              <div className="flex flex-col md:flex-row gap-2 md:items-center w-full">
                   <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{t('detail.name') || 'Nome'}</label>
                      <input 
                          type="text" 
                          value={editForm.name} 
                          onChange={(e) => onEditFormChange({...editForm, name: e.target.value})}
                          className="font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full bg-white dark:bg-slate-800"
                          placeholder={t('detail.name_placeholder') || 'Nome'}
                          autoFocus
                      />
                   </div>
                   <div className="flex gap-2">
                      <div className="relative w-32">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{t('detail.capacity') || 'Capacidade (MT)'}</label>
                          <span className="absolute left-2 bottom-2.5 text-xs font-bold text-slate-400">MT</span>
                          <input 
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => onEditFormChange({...editForm, amount: Number(e.target.value)})}
                              className="w-full pl-8 p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                      </div>
                   </div>
              </div>
          ) : (
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {participant.name}
                    {participant.received && <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">{t('status.received') || 'Recebeu'}</span>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    {participant.payoutDate ? formatDate(participant.payoutDate) : t('detail.date_pending') || 'Data pendente'}
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="font-medium text-slate-400">{t('detail.contribution') || 'Contribuição'}: {formatCurrency(participant.customContribution || xitique.amount)}</span>
                </div>
              </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-2 md:gap-6 w-full md:w-auto pl-12 md:pl-0">
          <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">{t('detail.receivable') || 'A Receber'}</div>
              <div className={`text-lg font-black ${participant.received ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                {formatCurrency(receivableAmount)}
              </div>
          </div>

          <div className="flex items-center gap-1">
              {isEditing ? (
                  <>
                    <button 
                        onClick={onSaveEdit}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md"
                        aria-label={t('common.save') || 'Salvar'}
                    >
                        <Save size={18} />
                    </button>
                    <button 
                        onClick={onCancelEdit}
                        className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400"
                        aria-label={t('common.cancel') || 'Cancelar'}
                    >
                        <X size={18} />
                    </button>
                  </>
              ) : isEditMode ? (
                  <>
                    <button 
                        onClick={() => onLockToggle(participant.id)}
                        className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        aria-label={isLocked ? t('aria.unlock') || 'Desbloquear' : t('aria.lock') || 'Bloquear'}
                    >
                        {isLocked ? <Lock size={18} /> : <Lock size={18} className="opacity-40" />}
                    </button>
                    <button 
                        onClick={() => onEditClick(participant)}
                        className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label={t('common.edit') || 'Editar'}
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        onClick={() => onDeleteClick(participant)}
                        className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        aria-label={t('common.delete') || 'Excluir'}
                    >
                        <Trash size={18} />
                    </button>
                  </>
              ) : (
                  <div className="w-8" />
              )}
          </div>
      </div>
    </div>
  );
};

export default ParticipantItem;
