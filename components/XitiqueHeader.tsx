import React from 'react';
import { Xitique, XitiqueStatus } from '../types';
import { formatDate } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { DollarSign, Calendar, Users, LogIn, Activity, PenTool, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  xitique: Xitique;
  isEditMode: boolean;
  tempName: string;
  tempAmount: number;
  tempStartDate: string;
  totalVolume: number;
  onNameChange: (val: string) => void;
  onAmountChange: (val: number) => void;
  onStartDateChange: (val: string) => void;
}

const XitiqueHeader: React.FC<Props> = ({
  xitique, isEditMode, tempName, tempAmount, tempStartDate, totalVolume,
  onNameChange, onAmountChange, onStartDateChange
}) => {
  const { t } = useLanguage();

  const getStatusBadge = (status: XitiqueStatus) => {
    switch(status) {
        case XitiqueStatus.ACTIVE: 
          return { color: 'bg-emerald-500', textColor: 'text-emerald-50', text: t('status.active') || 'Ativo', icon: <Activity size={16}/> };
        case XitiqueStatus.PLANNING: 
          return { color: 'bg-blue-500', textColor: 'text-blue-50', text: t('status.planning') || 'Planejamento', icon: <PenTool size={16}/> };
        case XitiqueStatus.COMPLETED: 
          return { color: 'bg-indigo-500', textColor: 'text-indigo-50', text: t('status.completed') || 'Concluído', icon: <CheckCircle2 size={16}/> };
        case XitiqueStatus.RISK: 
          return { color: 'bg-rose-500', textColor: 'text-rose-50', text: t('status.risk') || 'Dinâmico', icon: <AlertTriangle size={16}/> };
        default: 
          return { color: 'bg-slate-500', textColor: 'text-slate-50', text: status, icon: <FileText size={16}/> };
    }
  };

  const currentBadge = getStatusBadge(xitique.status);
  const progressPercentage = (xitique.participants.filter(p => p.received).length / xitique.participants.length) * 100;

  return (
    <div className={`bg-slate-900 text-white rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden transition-all ${isEditMode ? 'ring-4 ring-emerald-500/30 scale-[1.01]' : ''}`}>
      <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {isEditMode ? (
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{t('detail.group_name') || 'Nome do Grupo'}</label>
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => onNameChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xl md:text-3xl font-bold text-white w-full focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <h1 className="text-xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                {xitique.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className={`${currentBadge.color} ${currentBadge.textColor} text-[9px] md:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm ring-1 ring-white/10`}>
                  {currentBadge.icon} {currentBadge.text}
                </span>
                <span className="bg-white/10 backdrop-blur text-slate-300 border border-white/10 text-[9px] md:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                  {xitique.frequency === 'WEEKLY' ? t('wiz.weekly') : xitique.frequency === 'MONTHLY' ? t('wiz.monthly') : t('wiz.daily')}
                </span>
              </div>
            </div>
          )}
        </div>

        {!isEditMode && (
          <div className="mb-6 md:mb-8">
            <div className="flex justify-between text-[10px] md:text-xs font-medium text-slate-400 mb-2">
              <span>{t('detail.cycle_progress') || 'Progresso do Ciclo'}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 md:h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${xitique.status === XitiqueStatus.COMPLETED ? 'bg-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
          <div className={`flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-white/10 relative transition-all ${isEditMode ? 'bg-emerald-900/20 border-emerald-500/50 shadow-lg' : ''}`}>
            <div className="bg-emerald-400/20 p-1.5 md:p-2 rounded-lg shrink-0">
              <DollarSign size={16} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] md:text-xs text-slate-300 uppercase font-semibold truncate">
                {t('detail.total_volume') || 'Volume Total'}
              </div>
              {isEditMode ? (
                <input 
                  type="number"
                  value={tempAmount}
                  onChange={(e) => onAmountChange(Number(e.target.value))}
                  className="bg-transparent border-b border-emerald-500 w-full text-sm md:text-xl font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              ) : (
                <div className="text-sm md:text-xl font-bold truncate text-white">{formatCurrency(totalVolume)}</div>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-white/10 transition-all ${isEditMode ? 'bg-purple-900/20 border-purple-500/50 shadow-lg' : ''}`}>
            <div className="bg-purple-400/20 p-1.5 md:p-2 rounded-lg shrink-0">
              <Calendar size={16} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] md:text-xs text-slate-300 uppercase font-semibold truncate">{t('detail.start_date')}</div>
              {isEditMode ? (
                <div className="flex flex-col">
                  <input 
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="bg-transparent text-purple-300 font-bold text-[10px] md:text-sm focus:outline-none w-full border-b border-purple-500"
                  />
                </div>
              ) : (
                <div className="text-sm md:text-xl font-bold truncate text-white">{formatDate(xitique.startDate)}</div>
              )}
            </div>
          </div>

          {xitique.inviteCode && (
            <div className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-white/10">
              <div className="bg-blue-400/20 p-1.5 md:p-2 rounded-lg shrink-0">
                <LogIn size={16} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-xs text-slate-300 uppercase font-semibold truncate">Invite Code</div>
                <div className="text-sm md:text-xl font-bold font-mono tracking-wider truncate">{xitique.inviteCode}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-white/10">
            <div className="bg-blue-400/20 p-1.5 md:p-2 rounded-lg shrink-0">
              <Users size={16} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] md:text-xs text-slate-300 uppercase font-semibold truncate">{t('detail.members')}</div>
              <div className="text-sm md:text-xl font-bold truncate">{xitique.participants.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XitiqueHeader;
