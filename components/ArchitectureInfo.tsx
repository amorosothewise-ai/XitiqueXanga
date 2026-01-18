import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Database, ShieldCheck, Calculator, ScrollText, Users, Lock, RefreshCw, AlertTriangle, Play, Settings } from 'lucide-react';

const ArchitectureInfo: React.FC = () => {
  const { language, t: translate } = useLanguage();

  const content = {
    pt: {
      title: "Como o Sistema Pensa",
      subtitle: "Uma explicação simples das regras invisíveis que garantem a segurança do seu dinheiro.",
      
      entities_title: "1. As Peças do Jogo",
      user_title: "O Usuário (Você)",
      user_desc: "É o dono do celular. O sistema gira em torno de você. Você é o 'Administrador' supremo de todos os grupos neste dispositivo.",
      xitique_title: "O Xitique (O Contrato)",
      xitique_desc: "Pense nisso como um 'Contrato Digital'. Ele define as regras: quanto dinheiro, com que frequência e quem participa. Uma vez iniciado (Ativo), as regras financeiras são trancadas.",
      part_title: "O Participante (O Jogador)",
      part_desc: "Uma pessoa dentro de um Xitique. Eles têm uma 'Posição' na fila. O sistema garante que cada participante receba apenas uma vez por ciclo.",
      trans_title: "A Transação (A Verdade)",
      trans_desc: "A parte mais importante. É o registro de um movimento real de dinheiro. Tudo o que você vê na tela vem daqui.",

      principles_title: "2. As Regras de Ouro",
      
      principle_1_title: "A Caneta Permanente (Imutabilidade)",
      principle_1_desc: "Nós nunca usamos borracha. Se você marcar alguém como 'Pago' por engano, nós não apagamos o erro. Nós criamos uma nova linha dizendo 'Correção: Cancelar pagamento anterior'. Isso garante que ninguém possa esconder dinheiro apagando o histórico.",
      
      principle_2_title: "A Calculadora Automática (Estado Derivado)",
      principle_2_desc: "O sistema nunca 'decora' o saldo atual. Toda vez que você abre o app, ele pega o caderno de transações e soma tudo do zero na velocidade da luz. Isso impede erros onde o saldo diz 500 mas o histórico só mostra 400.",

      principle_3_title: "A Lixeira Segura (Soft Delete)",
      principle_3_desc: "Quando você clica em 'Apagar', nós não queimamos o arquivo. Nós apenas o colocamos em um arquivo morto invisível. Se houver um desastre, os dados ainda existem.",
    },
    en: {
      title: "How the System Thinks",
      subtitle: "A simple explanation of the invisible rules that keep your money safe.",

      entities_title: "1. The Pieces of the Game",
      user_title: "The User (You)",
      user_desc: "The owner of the phone. The system revolves around you. You are the supreme 'Admin' of all groups on this device.",
      xitique_title: "The Xitique (The Agreement)",
      xitique_desc: "Think of this as a 'Digital Contract'. It defines the rules: how much money, how often, and who plays. Once started (Active), the financial rules are locked.",
      part_title: "The Participant (The Player)",
      part_desc: "A person inside a Xitique. They have a 'Position' in the line. The system ensures each participant receives exactly once per cycle.",
      trans_title: "The Transaction (The Truth)",
      trans_desc: "The most important part. It is the record of actual money movement. Everything else you see on screen is calculated from these.",

      principles_title: "2. The Golden Rules",
      
      principle_1_title: "The Permanent Pen (Immutability)",
      principle_1_desc: "We never use an eraser. If you mark someone as 'Paid' by mistake, we don't delete the error. We write a new line saying 'Correction: Cancel previous payment'. This ensures no one can hide money by deleting history.",
      
      principle_2_title: "The Auto-Calculator (Derived State)",
      principle_2_desc: "The system never 'memorizes' the current balance. Every time you open the app, it grabs the transaction notebook and adds everything up from zero at lightspeed. This prevents bugs where the Balance says 500 but History only shows 400.",

      principle_3_title: "The Safe Trash Can (Soft Delete)",
      principle_3_desc: "When you click 'Delete', we don't burn the file. We just move it to an invisible archive. If there is a disaster, the data still exists.",
    }
  };

  const t = language === 'pt' ? content.pt : content.en;

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/10 p-2 rounded-lg">
                <Database size={24} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          </div>
          <p className="text-slate-300 text-lg max-w-2xl">
            {t.subtitle}
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </div>

      {/* Section 1: Entities */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="text-slate-400" /> {t.entities_title}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
            <EntityCard 
                icon={<Lock className="text-blue-500" />} 
                title={t.xitique_title} 
                desc={t.xitique_desc} 
                color="bg-blue-50 border-blue-100"
            />
             <EntityCard 
                icon={<ScrollText className="text-emerald-500" />} 
                title={t.trans_title} 
                desc={t.trans_desc} 
                color="bg-emerald-50 border-emerald-100"
            />
            <EntityCard 
                icon={<Users className="text-purple-500" />} 
                title={t.part_title} 
                desc={t.part_desc} 
                color="bg-purple-50 border-purple-100"
            />
            <EntityCard 
                icon={<ShieldCheck className="text-amber-500" />} 
                title={t.user_title} 
                desc={t.user_desc} 
                color="bg-amber-50 border-amber-100"
            />
        </div>
      </div>

      {/* Section 2: Principles */}
      <div>
         <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ShieldCheck className="text-slate-400" /> {t.principles_title}
        </h2>
        <div className="space-y-4">
            <PrincipleRow 
                icon={<ScrollText />}
                title={t.principle_1_title}
                desc={t.principle_1_desc}
            />
            <PrincipleRow 
                icon={<Calculator />}
                title={t.principle_2_title}
                desc={t.principle_2_desc}
            />
            <PrincipleRow 
                icon={<RefreshCw />}
                title={t.principle_3_title}
                desc={t.principle_3_desc}
            />
        </div>
      </div>

      {/* Section 3: Real World Scenarios */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
           <AlertTriangle className="text-slate-400" /> {translate('scen.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
           <ScenarioCard 
             icon={<AlertTriangle size={24} className="text-amber-500" />}
             title={translate('scen.missed_title')}
             risk={translate('scen.missed_risk')}
             logic={translate('scen.missed_logic')}
             bg="bg-amber-50 border-amber-100"
           />
           <ScenarioCard 
             icon={<Play size={24} className="text-indigo-500" />}
             title={translate('scen.early_title')}
             risk={translate('scen.early_risk')}
             logic={translate('scen.early_logic')}
             bg="bg-indigo-50 border-indigo-100"
           />
           <ScenarioCard 
             icon={<Settings size={24} className="text-rose-500" />}
             title={translate('scen.change_title')}
             risk={translate('scen.change_risk')}
             logic={translate('scen.change_logic')}
             bg="bg-rose-50 border-rose-100"
           />
        </div>
      </div>

    </div>
  );
};

const EntityCard: React.FC<{icon: React.ReactNode, title: string, desc: string, color: string}> = ({ icon, title, desc, color }) => (
    <div className={`p-6 rounded-2xl border ${color} transition-all hover:shadow-md`}>
        <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
);

const PrincipleRow: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-200 transition-colors shadow-sm">
        <div className="bg-slate-100 p-3 rounded-xl text-slate-600 mt-1">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
        </div>
    </div>
);

const ScenarioCard: React.FC<{icon: React.ReactNode, title: string, risk: string, logic: string, bg: string}> = ({
  icon, title, risk, logic, bg
}) => (
  <div className={`p-6 rounded-2xl border ${bg} hover:shadow-md transition-all`}>
      <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm">
          {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
      <div className="space-y-3">
        <div className="bg-white/60 p-3 rounded-lg text-xs font-semibold text-slate-700">
           {risk}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
           {logic}
        </p>
      </div>
  </div>
);

export default ArchitectureInfo;