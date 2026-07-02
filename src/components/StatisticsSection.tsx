import { motion } from 'motion/react';
import { Lightbulb, Users, User, Building2, FileText, Calendar } from 'lucide-react';
import { StatsConfig, ReportsConfig } from '../types';

interface StatisticsSectionProps {
  stats?: StatsConfig;
  setView?: (view: any) => void;
  reportsConfig?: ReportsConfig;
}

export default function StatisticsSection({ stats, setView, reportsConfig }: StatisticsSectionProps) {
  const defaultStats: StatsConfig = {
    opportunitiesCount: 333,
    newOpportunitiesCount: 178,
    collectiveAgentsCount: 1552,
    certifiedCollectiveAgentsCount: 9,
    individualAgentsCount: 32059,
    certifiedIndividualAgentsCount: 0,
    spacesCount: 2644,
    certifiedSpacesCount: 0,
    projectsCount: 1635,
    certifiedProjectsCount: 0,
    eventsCount: 1159,
    certifiedEventsCount: 0,
  };

  const currentStats = stats || defaultStats;

  const cards = [
    {
      title: 'Oportunidade',
      icon: <Lightbulb size={24} className="text-cat-oportunidades" />,
      mainValue: currentStats.opportunitiesCount,
      mainLabel: 'oportunidades criadas',
      secondValue: currentStats.newOpportunitiesCount,
      secondLabel: 'oportunidades certificadas'
    },
    {
      title: 'Agentes coletivos',
      icon: <Users size={24} className="text-cat-agentes" />,
      mainValue: currentStats.collectiveAgentsCount,
      mainLabel: 'coletivos cadastrados',
      secondValue: currentStats.certifiedCollectiveAgentsCount,
      secondLabel: 'coletivos certificados'
    },
    {
      title: 'Agentes individuais',
      icon: <User size={24} className="text-cat-agentes" />,
      mainValue: currentStats.individualAgentsCount,
      mainLabel: 'agentes individuais cadastrados',
      secondValue: currentStats.certifiedIndividualAgentsCount,
      secondLabel: 'agentes individuais certificados'
    },
    {
      title: 'Espaços',
      icon: <Building2 size={24} className="text-cat-espacos" />,
      mainValue: currentStats.spacesCount,
      mainLabel: 'espaços cadastrados',
      secondValue: currentStats.certifiedSpacesCount,
      secondLabel: 'espaços certificados'
    },
    {
      title: 'Projetos',
      icon: <FileText size={24} className="text-cat-projetos" />,
      mainValue: currentStats.projectsCount,
      mainLabel: 'projetos cadastrados',
      secondValue: currentStats.certifiedProjectsCount,
      secondLabel: 'projetos certificados'
    },
    {
      title: 'Eventos',
      icon: <Calendar size={24} className="text-cat-eventos" />,
      mainValue: currentStats.eventsCount,
      mainLabel: 'eventos cadastrados',
      secondValue: currentStats.certifiedEventsCount,
      secondLabel: 'eventos certificados'
    }
  ];

  return (
    <section className="bg-primary py-24 px-4 md:px-8 relative overflow-hidden">
      {/* Background illustration placeholder based on reference image */}
      <div className="absolute top-10 right-10 w-96 opacity-20 pointer-events-none hidden lg:block">
         <img src="https://cdni.iconscout.com/illustration/premium/thumb/business-statistics-4528151-3773173.png" className="w-full" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
            {reportsConfig?.title || 'Relatórios'}
          </h2>
          <p className="text-white font-bold text-sm max-w-xl mb-8">
            {reportsConfig?.description || 'Acesse painéis de dados ao clicar no botão abaixo para visualizar gráficos e outras informações importantes para consulta e análise.'}
          </p>
          <button 
            onClick={() => setView?.('reports')}
            className="px-10 py-5 bg-white text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone-100 transition-all shadow-xl"
          >
            {reportsConfig?.footerButtonLabel || 'Acessar Painel de Relatórios'}
          </button>
        </div>

        <div className="mb-12">
           <p className="text-white/80 font-black text-xs uppercase tracking-tighter mb-8">Confira abaixo alguns dados destacados</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center text-center"
                >
                   <div className="flex items-center gap-3 mb-8 w-full">
                      {card.icon}
                      <span className="text-stone-900 font-black text-sm uppercase tracking-tighter">{card.title}</span>
                   </div>

                   <div className="flex justify-between w-full gap-8 mb-8 items-start">
                      <div className="flex-1">
                         <span className="block text-4xl font-black text-stone-900 mb-2">{card.mainValue}</span>
                         <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-tighter leading-tight">{card.mainLabel}</span>
                      </div>
                      <div className="flex-1">
                         <span className="block text-3xl font-black text-stone-900 mb-2">{card.secondValue}</span>
                         <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-tighter leading-tight">{card.secondLabel}</span>
                      </div>
                   </div>

                   <button 
                      onClick={() => setView?.('reports')}
                      className="w-full py-4 bg-accent text-white rounded-lg font-black text-xs uppercase tracking-tighter hover:opacity-90 transition-all shadow-md"
                   >
                      Conferir painel de dados
                   </button>
                </motion.div>
              ))}
           </div>
        </div>
      </div>
    </section>
  );
}
