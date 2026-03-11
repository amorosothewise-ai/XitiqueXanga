import React from 'react';
import { Participant, Xitique } from '../types';
import ParticipantItem from './ParticipantItem';
import { Search, XCircle, ArrowUpDown, Calendar, CheckSquare, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  xitique: Xitique;
  participants: Participant[];
  isEditMode: boolean;
  searchTerm: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  lockedIds: Set<string>;
  editForm: any;
  onSearchChange: (val: string) => void;
  onSort: (key: any) => void;
  onAddMember: () => void;
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

const ParticipantList: React.FC<Props> = ({
  xitique, participants, isEditMode, searchTerm, sortConfig, lockedIds, editForm,
  onSearchChange, onSort, onAddMember, onTogglePayment, onEditClick, onDeleteClick, onLockToggle,
  onDragStart, onDragOver, onDrop, onEditFormChange, onSaveEdit, onCancelEdit
}) => {
  const { t } = useLanguage();

  const canDrag = isEditMode && sortConfig.key === 'order' && searchTerm === '';

  return (
    <div className="space-y-4">
      <div className="bg-slate-100 dark:bg-slate-900/50 p-4 -mx-4 md:mx-0 md:rounded-2xl border-y md:border border-slate-200 dark:border-slate-800 shadow-inner mb-4 transition-all">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
            <input 
              type="text" 
              placeholder={t('detail.search_placeholder') || 'Buscar por nome, data...'} 
              className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all placeholder:font-normal placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => onSearchChange('')} 
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                aria-label={t('aria.clear_search') || 'Limpar busca'}
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
          
          {!isEditMode && (
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button 
                onClick={() => onSort('name')} 
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'name' ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'}`}
              >
                <ArrowUpDown size={16} className={sortConfig.key === 'name' ? 'text-emerald-400' : 'text-slate-400'} /> 
                {t('detail.sort_name')}
              </button>
              <button 
                onClick={() => onSort('payoutDate')} 
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'payoutDate' ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'}`}
              >
                <Calendar size={16} className={sortConfig.key === 'payoutDate' ? 'text-emerald-400' : 'text-slate-400'} /> 
                {t('detail.sort_date')}
              </button>
              <button 
                onClick={() => onSort('received')} 
                className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border ${sortConfig.key === 'received' ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'}`}
              >
                <CheckSquare size={16} className={sortConfig.key === 'received' ? 'text-emerald-400' : 'text-slate-400'} /> 
                {t('detail.sort_status')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isEditMode && (
        <button 
          onClick={onAddMember}
          className="w-full py-4 border-2 border-dashed border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all gap-2 shadow-sm"
        >
          <Plus size={20} /> {t('detail.add_member') || 'Adicionar Novo Membro'}
        </button>
      )}

      <div className="grid gap-3">
        {participants.map((p) => (
          <ParticipantItem 
            key={p.id}
            participant={p}
            xitique={xitique}
            isEditMode={isEditMode}
            isLocked={lockedIds.has(p.id)}
            canDrag={canDrag}
            isEditing={editForm?.id === p.id}
            editForm={editForm}
            onTogglePayment={onTogglePayment}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onLockToggle={onLockToggle}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onEditFormChange={onEditFormChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        ))}
        {participants.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-600">
            {t('detail.no_members_found') || 'Nenhum membro encontrado.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantList;
