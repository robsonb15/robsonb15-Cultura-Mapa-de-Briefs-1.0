import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight, FileText, Users, Building2, Calendar, Lightbulb } from 'lucide-react';
import { contentService } from '../lib/contentService';
import { agentService } from '../lib/agentService';

import { useAuth } from '../lib/AuthContext';

interface FeaturedContentProps {
  onItemClick: (item: any, category: string) => void;
}

export default function FeaturedContent({ onItemClick }: FeaturedContentProps) {
  const { appConfig } = useAuth();
  const [activeTab, setActiveTab] = useState<'todos' | 'agentes' | 'projetos' | 'eventos' | 'oportunidades' | 'espacos'>('todos');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const featuredTitle = appConfig?.siteConfig?.featuredTitle || 'Em destaque';
  const featuredDesc = appConfig?.siteConfig?.featuredDescription || 'Conteúdo exclusivo da SECRETARIA DE CULTURA, TURISMO E EVENTOS.';
  const badgeUrl = appConfig?.siteConfig?.featuredBadgeUrl || "";

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const [agents, opps, events, spaces, projects] = await Promise.all([
          agentService.getAllAgents(),
          contentService.getAllContent('opportunity'),
          contentService.getAllContent('event'),
          contentService.getAllContent('space'),
          contentService.getAllContent('project')
        ]);

        const all = ([
          ...agents.map(a => ({ ...a, category: 'agentes', typeName: 'Agente' })),
          ...opps.map(o => ({ ...o, category: 'oportunidades', typeName: 'Oportunidade' })),
          ...events.map(e => ({ ...e, category: 'eventos', typeName: 'Evento' })),
          ...spaces.map(s => ({ ...s, category: 'espacos', typeName: 'Espaço' })),
          ...projects.map(p => ({ ...p, category: 'projetos', typeName: 'Projeto' }))
        ] as any[]).filter(item => item.official === true || item.certified === true)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 8);

        setItems(all);
      } catch (error) {
        console.error("Error fetching featured content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const filteredItems = activeTab === 'todos' 
    ? items 
    : items.filter(item => item.category === activeTab);

  const getIcon = (category: string) => {
    switch(category) {
      case 'agentes': return <Users size={16} />;
      case 'espacos': return <Building2 size={16} />;
      case 'eventos': return <Calendar size={16} />;
      case 'oportunidades': return <Lightbulb size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <section className="bg-[#56B8F5] py-24 px-4 md:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 className="text-5xl font-black text-black uppercase italic tracking-tighter mb-4">Em destaque</h2>
            <p className="text-black/80 text-base font-bold italic">Confira os últimos destaques de cada uma das áreas.</p>
          </div>
          <div className="flex gap-4">
            <button className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-white/30">
              <ChevronLeft size={24} />
            </button>
            <button className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all border border-white/30">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-6 md:gap-12 mb-12 border-b border-black/10 overflow-x-auto pb-4 scrollbar-hide">
          {['todos', 'agentes', 'projetos', 'eventos', 'oportunidades', 'espacos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab ? 'text-black' : 'text-black/40 hover:text-black/60'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-700"
                />
              )}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/20 group hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="p-5 flex items-center justify-between border-b border-stone-50">
                     <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center relative">
                        <div className="text-stone-400">
                           {getIcon(item.category)}
                        </div>
                        {badgeUrl ? (
                          <img 
                            src={badgeUrl} 
                            alt="Selo oficial" 
                            className="absolute -top-3 -right-3 w-8 h-8 z-10 drop-shadow-md rounded-full object-contain bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute -top-3 -right-3 w-8 h-8 z-10 bg-amber-50 border border-amber-500 rounded-full flex items-center justify-center shadow-md bg-white">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-amber-600 fill-amber-400">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                     </div>
                     <div className="bg-[#0070BA] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 shadow-lg">
                        {item.typeName || item.category}
                     </div>
                  </div>
                  
                  <div className="px-6 py-8 flex-1">
                    <h3 className="text-xl font-black text-blue-700 leading-tight mb-4 group-hover:text-blue-500 transition-colors cursor-pointer min-h-[56px] line-clamp-2">
                      {item.name || item.title}
                    </h3>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-tight mb-6 line-clamp-3 leading-relaxed">
                      {item.description || item.shortDescription || 'Sem descrição.'}
                    </p>
                    
                    <div className="pt-4 border-t border-stone-50">
                       <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">SELOS:</p>
                       <div className="flex gap-2">
                          {(item.official || item.certified) && (
                            badgeUrl ? (
                              <img 
                                src={badgeUrl} alt="Oficial" 
                                className="w-8 h-8 rounded-full object-contain bg-white shadow-md border border-stone-100"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-500 flex items-center justify-center shadow-sm bg-white" title="Oficial">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-amber-600 fill-amber-400">
                                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            )
                          )}
                          <div className="w-8 h-8 skeleton-placeholder bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                             <FileText size={14} />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button 
                      onClick={() => onItemClick(item, item.category)}
                      className="w-full py-4 bg-[#0070BA] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#005FA3] transition-all shadow-xl hover:shadow-2xl"
                    >
                      Acessar
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center text-black/60 font-bold italic">
                Nenhum item em destaque nesta categoria.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
