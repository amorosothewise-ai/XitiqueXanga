import React from 'react';
import { ArrowLeft, Settings, Save, Share2, Trash, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isEditMode: boolean;
  isCompleted: boolean;
  isSaving: boolean;
  onBack: () => void;
  onEditToggle: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onRenew?: () => void;
}

const ActionToolbar: React.FC<Props> = ({
  isEditMode, isCompleted, isSaving, onBack, onEditToggle, onCancelEdit, onSaveEdit, onShare, onDelete, onRenew
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
        aria-label={t('detail.back') || 'Voltar'}
      >
        <ArrowLeft size={20} className="mr-2" /> {t('detail.back')}
      </button>
      
      <div className="flex gap-2 w-full md:w-auto justify-end">
        {isCompleted && onRenew && (
          <button 
            onClick={onRenew}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center text-sm font-bold shadow-md hover:bg-purple-700 transition-all"
            aria-label={t('detail.renew') || 'Renovar Ciclo'}
          >
            <RefreshCw size={18} className="mr-2" /> {t('detail.renew') || 'Renovar Ciclo'}
          </button>
        )}

        {!isEditMode && !isCompleted && (
          <button 
            onClick={onEditToggle}
            className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center text-sm font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            aria-label={t('detail.edit_group') || 'Editar Grupo'}
          >
            <Settings size={18} className="mr-2" /> {t('detail.edit_group') || 'Editar Grupo'}
          </button>
        )}
        
        {isEditMode && (
          <>
            <button 
              onClick={onCancelEdit} 
              disabled={isSaving}
              className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t('common.cancel') || 'Cancelar'}
            </button>
            <button 
              onClick={onSaveEdit} 
              disabled={isSaving}
              className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? (t('common.saving') || 'Salvando...') : (t('common.save_changes') || 'Salvar Alterações')}
            </button>
          </>
        )}
        
        {!isEditMode && (
          <div className="flex gap-2">
            <button 
              onClick={onShare} 
              className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 px-3 py-2 rounded-xl transition-colors"
              aria-label={t('detail.share') || 'Compartilhar'}
            >
              <Share2 size={18} />
            </button>
            <button 
              onClick={onDelete} 
              className="text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-colors"
              aria-label={t('common.delete') || 'Excluir'}
            >
              <Trash size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionToolbar;
