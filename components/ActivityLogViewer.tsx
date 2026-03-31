
import React from 'react';
import { ActivityLog } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Clock, CheckCircle2, XCircle, Info } from 'lucide-react';

interface ActivityLogViewerProps {
    logs: ActivityLog[];
}

const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({ logs }) => {
    const { t } = useLanguage();

    if (logs.length === 0) {
        return (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Info className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 text-sm italic">{t('profile.no_logs') || 'No activity recorded yet.'}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                            <th className="p-4">{t('profile.log_action') || 'Action'}</th>
                            <th className="p-4">{t('profile.log_date') || 'Date'}</th>
                            <th className="p-4 text-right">{t('profile.log_status') || 'Status'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{log.action.replace(/_/g, ' ')}</span>
                                        {log.details && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={log.details}>
                                                {log.details}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                        <Clock size={12} className="text-slate-300" />
                                        {new Date(log.timestamp).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                            log.status === 'SUCCESS' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {log.status === 'SUCCESS' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                            {log.status}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivityLogViewer;
