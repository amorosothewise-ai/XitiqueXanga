
import React from 'react';
import { Info, ShieldCheck, Users, TrendingUp, Sparkles, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

const AboutTab: React.FC = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Users className="text-emerald-500" size={24} />,
      title: t('about.feature_group_title'),
      desc: t('about.feature_group_desc')
    },
    {
      icon: <TrendingUp className="text-cyan-500" size={24} />,
      title: t('about.feature_ind_title'),
      desc: t('about.feature_ind_desc')
    },
    {
      icon: <Sparkles className="text-amber-500" size={24} />,
      title: t('about.feature_ai_title'),
      desc: t('about.feature_ai_process')
    },
    {
      icon: <ShieldCheck className="text-blue-500" size={24} />,
      title: "Segurança Imutável",
      desc: "Utilizamos tecnologia de ponta para garantir que cada metical registado seja um compromisso sagrado."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2"
        >
          <Heart size={32} fill="currentColor" className="opacity-20" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('about.title')}
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('about.mission_desc')}
        </p>
      </section>

      {/* Bento Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 w-fit group-hover:scale-110 transition-transform">
              {f.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Fun Fact / Quote */}
      <section className="bg-slate-900 dark:bg-emerald-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Info size={120} />
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-emerald-400" />
            Curiosidade Tecnológica
          </h2>
          <p className="text-lg text-emerald-100/80 italic leading-relaxed">
            "Sabia que o Xitique Xanga utiliza o modelo Gemini 3 Flash? É como ter um contabilista moçambicano super-veloz e um matemático de Harvard a trabalhar juntos no seu bolso, 24 horas por dia."
          </p>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
          {t('about.footer')}
        </p>
      </footer>
    </div>
  );
};

export default AboutTab;
