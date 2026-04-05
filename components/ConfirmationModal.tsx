import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type: 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type,
  confirmText,
  cancelText
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const styles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      btnBg: 'bg-red-600 hover:bg-red-700',
      icon: <AlertTriangle size={24} />
    },
    success: {
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
      icon: <CheckCircle2 size={24} />
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
      icon: <CheckCircle2 size={24} />
    }
  };

  const currentStyle = styles[type];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 border border-slate-200 dark:border-slate-800 animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full flex-shrink-0 ${currentStyle.iconBg} ${currentStyle.iconColor}`}>
            {currentStyle.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
              {description}
            </p>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
              >
                {cancelText || t('detail.cancel')}
              </button>
              <button 
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl shadow-lg transition-colors ${currentStyle.btnBg}`}
              >
                {confirmText || t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('root')!);
};

export default ConfirmationModal;