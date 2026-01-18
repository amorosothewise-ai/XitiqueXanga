import React, { useState, useEffect } from 'react';
import { Frequency } from '../types';
import { calculateDuration } from '../services/dateUtils';
import { formatCurrency } from '../services/formatUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from 'recharts';
import { Users, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Simulation: React.FC = () => {
  const { t, language } = useLanguage();
  const [participants, setParticipants] = useState(5);
  const [amount, setAmount] = useState(1000);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
  
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Generate simulation data
    const totalPot = amount * participants;
    const newData = Array.from({ length: participants }).map((_, i) => {
      // Simulate inflation impact (simple logic: money later is worth less)
      const advantage = (participants - 1 - (2 * i)) * (amount * 0.05); 
      
      return {
        name: `${i + 1}`,
        netValue: advantage
      };
    });
    setData(newData);
  }, [participants, amount, frequency]);

  const totalPot = amount * participants;
  const cycleTime = calculateDuration(frequency, participants, language);
  const totalContribution = amount * participants;

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const isPositive = val > 0;
      return (
        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-xl border border-slate-700">
          <p className="font-bold text-sm mb-2">Member #{label}</p>
          <p className="text-xs text-slate-400 mb-1">
            {isPositive ? t('sim.tooltip_pos') : t('sim.tooltip_neg')}
          </p>
          <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
             {formatCurrency(Math.abs(val))}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-900 p-3 rounded-xl text-emerald-400">
            <RefreshCw size={28} />
          </div>
          <div>
             <h2 className="text-2xl font-bold text-slate-900">{t('sim.title')}</h2>
             <p className="text-slate-500">{t('sim.subtitle')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Users size={16} /> {t('sim.num_people')}
            </label>
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">Min: 2</span>
                <span className="text-2xl font-bold text-slate-900">{participants}</span>
                <span className="text-slate-400 text-xs">Max: 20</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="20" 
              value={participants} 
              onChange={(e) => setParticipants(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 touch-action-manipulation"
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <DollarSign size={16} /> {t('sim.contribution')}
            </label>
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">100</span>
                <span className="text-2xl font-bold text-slate-900">{amount}</span>
                <span className="text-slate-400 text-xs">20k</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="20000" 
              step="100"
              value={amount} 
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 touch-action-manipulation"
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
             <label className="block text-sm font-bold text-slate-700 mb-3">{t('sim.frequency')}</label>
             <div className="flex bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
                <button 
                  onClick={() => setFrequency(Frequency.WEEKLY)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${frequency === Frequency.WEEKLY ? 'bg-slate-900 text-emerald-400' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {t('wiz.weekly')}
                </button>
                <button 
                  onClick={() => setFrequency(Frequency.MONTHLY)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${frequency === Frequency.MONTHLY ? 'bg-slate-900 text-emerald-400' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {t('wiz.monthly')}
                </button>
             </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
            <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider mb-1">{t('sim.pot')}</div>
            <div className="text-4xl font-bold text-emerald-600 truncate">{formatCurrency(totalPot)}</div>
          </div>
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
            <div className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-1">{t('sim.cycle')}</div>
            <div className="text-4xl font-bold text-blue-600 truncate">{cycleTime}</div>
          </div>
          <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 text-center">
            <div className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-1">{t('sim.investment')}</div>
            <div className="text-4xl font-bold text-slate-700 truncate">{formatCurrency(totalContribution)}</div>
          </div>
        </div>

        {/* Visual Logic */}
        <div className="mt-8 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-500">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{t('sim.analysis_title')}</h3>
                    <p className="text-slate-500 text-sm">{t('sim.analysis_desc')}</p>
                </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-3 h-80 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} label={{ value: 'Participant Order', position: 'insideBottom', offset: -10 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="netValue" radius={[4, 4, 4, 4]}>
                        {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.netValue > 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <div className="w-4 h-4 bg-emerald-500 rounded mb-2"></div>
                        <h4 className="font-bold text-emerald-800 text-sm mb-1">{t('sim.advantage')}</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            {t('sim.green_desc')}
                        </p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                         <div className="w-4 h-4 bg-rose-500 rounded mb-2"></div>
                        <h4 className="font-bold text-rose-800 text-sm mb-1">{t('sim.disadvantage')}</h4>
                        <p className="text-xs text-rose-700 leading-relaxed">
                            {t('sim.red_desc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;