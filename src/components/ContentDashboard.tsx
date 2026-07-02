import { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Lightbulb, 
  FileText, 
  Search, 
  ChevronRight, 
  ChevronDown,
  Map as MapIcon,
  List,
  BarChart3,
  Accessibility,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { contentService } from '../lib/contentService';
import { useAuth } from '../lib/AuthContext';
import AgentMap from './Map';

export type DashboardType = 'espacos' | 'eventos' | 'oportunidades' | 'projetos';

interface ContentDashboardProps {
  type: DashboardType;
  onItemClick?: (item: any) => void;
  onCreateNew?: () => void;
  isAdmin?: boolean;
}

const CONFIG = {
  espacos: {
    title: 'Espaços',
    icon: Building2,
    dbType: 'space',
    color: 'bg-[#5A5A40]',
    searchPlaceholder: 'Buscar espaços...',
    filterTitle: 'Filtros de espaço',
    filters: [
      { label: 'Status do espaço', options: [{ id: 'accessibility', label: 'Possui acessibilidade' }, { id: 'official', label: 'Espaços oficiais' }] },
      { label: 'Tipos de espaços', type: 'select', placeholder: 'Selecione os tipos:' },
      { label: 'Área de atuação', type: 'select', placeholder: 'Selecione as áreas de atuação' },
    ],
    itemsLabel: 'Espaços encontrados',
    createLabel: 'Criar Espaço'
  },
  eventos: {
    title: 'Eventos',
    icon: Calendar,
    dbType: 'event',
    color: 'bg-[#5A5A40]',
    searchPlaceholder: 'Buscar eventos...',
    filterTitle: 'Filtros de eventos',
    filters: [
      { label: 'Eventos acontecendo', type: 'select', placeholder: 'Próximos 30 dias' },
      { label: 'Status do evento', options: [{ id: 'official', label: 'Eventos oficiais' }] },
      { label: 'Classificação Etária', type: 'select', placeholder: 'Classificação Etária' },
      { label: 'Linguagens', type: 'select', placeholder: 'Selecione as linguagens' },
    ],
    itemsLabel: 'Eventos encontrados',
    createLabel: 'Criar Evento'
  },
  oportunidades: {
    title: 'Oportunidades',
    icon: Lightbulb,
    dbType: 'opportunity',
    color: 'bg-[#5A5A40]',
    searchPlaceholder: 'Buscar oportunidades...',
    filterTitle: 'Filtros de oportunidades',
    filters: [
      { label: 'Status das oportunidades', type: 'radio', options: [{ id: 'open', label: 'Inscrições abertas' }, { id: 'closed', label: 'Inscrições encerradas' }, { id: 'future', label: 'Inscrições futuras' }] },
      { label: 'Editais oficiais', options: [{ id: 'official', label: 'Editais oficiais' }] },
      { label: 'Tipo de oportunidade', type: 'select', placeholder: 'Selecione os tipos:' },
    ],
    itemsLabel: 'Oportunidades encontradas',
    createLabel: 'Criar Oportunidade'
  },
  projetos: {
    title: 'Projetos',
    icon: FileText,
    dbType: 'project',
    color: 'bg-[#5A5A40]',
    searchPlaceholder: 'Buscar projetos...',
    filterTitle: 'Filtros de projeto',
    filters: [
      { label: 'Status do projeto', options: [{ id: 'official', label: 'Projetos oficiais' }] },
      { label: 'Tipos de projetos', type: 'select', placeholder: 'Selecione os tipos:' },
    ],
    itemsLabel: 'Projetos encontrados',
    createLabel: 'Criar Projeto'
  }
};

export default function ContentDashboard({ type, onItemClick, onCreateNew, isAdmin: globalIsAdmin }: ContentDashboardProps) {
  const { user } = useAuth();
  const config = CONFIG[type];
  const [items, setItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'lista' | 'mapa' | 'indicadores'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const data = await contentService.getAllContent(config.dbType);
        setItems(data);
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [config.dbType]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [items, searchQuery, sortBy]);

  const mappedMapItems = useMemo(() => {
    return filteredItems.map(item => ({
      ...item,
      entityType: config.dbType
    }));
  }, [filteredItems, config.dbType]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este item permanentemente?')) return;
    try {
      await contentService.deleteContent(config.dbType, id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert('Falha ao excluir.');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 bg-[#F8F9FA] min-h-screen">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-tighter mb-8 pl-32 md:pl-48">
        <span className="hover:text-stone-900 cursor-pointer">INÍCIO</span>
        <ChevronRight size={12} />
        <span className="text-[#0070BA]">{config.title.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 md:w-16 md:h-16 ${config.color} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-stone-200`}>
            <config.icon size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-900 uppercase tracking-tighter italic">{config.title}</h1>
        </div>
        
        <button 
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-4 bg-[#0070BA] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-[#005FA3] transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          {config.createLabel}
        </button>
      </div>

      {/* Navigation and Search */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12 border-b border-stone-100 pb-8">
        <div className="flex items-center gap-4 md:gap-8 overflow-x-auto w-full lg:w-auto pb-4 lg:pb-0 scrollbar-hide">
          <span className="text-[11px] font-black text-stone-400 uppercase tracking-tighter whitespace-nowrap">Visualizar como:</span>
          <div className="flex p-1.5 bg-stone-100 rounded-[1.5rem] shrink-0">
            {[
              { id: 'lista', label: 'Lista', icon: List },
              { id: 'mapa', label: 'Mapa', icon: MapIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${viewMode === tab.id ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input 
              type="text" 
              placeholder={config.searchPlaceholder}
              className="w-full pl-14 pr-12 py-4 bg-white border border-stone-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-[#5A5A40] text-sm font-black shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors">
              <Search size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
         {/* Main Content Area */}
         <div className="flex-1 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
               <div className="relative w-full sm:w-auto">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-white border border-stone-200 rounded-[1rem] px-6 py-3 pr-12 text-[10px] font-black text-stone-900 uppercase tracking-tighter shadow-sm outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="recent">Mais recentes primeiro</option>
                    <option value="name">Ordem alfabética (A-Z)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
               </div>
               
               <div className="px-6 py-3 bg-white border border-stone-100 rounded-[1rem] shadow-sm">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                    <span className="text-stone-900">{filteredItems.length}</span> {config.itemsLabel}
                  </span>
               </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === 'mapa' ? (
                  <div className="h-[600px] w-full rounded-[2.5rem] overflow-hidden border border-stone-100 shadow-2xl bg-white p-4">
                    <AgentMap 
                      agents={mappedMapItems} 
                      onAgentClick={(item) => setSelectedItemId(item ? item.id : null)}
                      selectedAgentId={selectedItemId}
                      onViewProfile={onItemClick}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                     {loading ? (
                        <div className="p-20 text-center">
                           <div className="w-10 h-10 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                           <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Sincronizando dados...</p>
                        </div>
                     ) : filteredItems.length > 0 ? (
                       filteredItems.map((item, idx) => (
                         <motion.div 
                           key={item.id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.1 }}
                           className="bg-white rounded-3xl border border-stone-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all group"
                         >
                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-4">
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <div className="flex items-center gap-2 mb-1">
                                         <p className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">ID: {item.id.slice(-6).toUpperCase()}</p>
                                         {(globalIsAdmin || user?.uid === item.ownerId) && (
                                           <div className="flex items-center gap-1 ml-2">
                                             <button 
                                               onClick={() => onCreateNew?.()} 
                                               className="p-1 px-2 bg-[#5A5A40]/10 text-[#5A5A40] rounded text-[9px] font-black uppercase hover:bg-[#5A5A40] hover:text-white transition-all flex items-center gap-1"
                                             >
                                               <Edit2 size={10} /> EDITAR
                                             </button>
                                             <button 
                                               onClick={() => handleDelete(item.id)}
                                               className="p-1 px-2 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all flex items-center gap-1"
                                             >
                                               <Trash2 size={10} /> EXCLUIR
                                             </button>
                                           </div>
                                         )}
                                       </div>
                                       <h3 className="text-xl md:text-2xl font-black text-stone-900 uppercase tracking-tighter group-hover:text-[#0070BA] transition-colors">{item.name}</h3>
                                       <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-tighter mt-1">TIPO: {item.type}</p>
                                    </div>
                                    {type === 'oportunidades' && item.status && (
                                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                                         <CheckCircle2 size={12} />
                                         {item.status === 'open' ? 'Inscrições Abertas' : item.status === 'closed' ? 'Encerradas' : 'Futuras'}
                                      </div>
                                    )}
                                 </div>

                                 <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 italic">
                                    {item.description || 'Nenhuma descrição adicional informada.'}
                                 </p>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-black text-stone-400 uppercase tracking-tight">
                                    {item.accessibility && (
                                       <div className="flex items-center gap-2">
                                          <Accessibility size={14} className="text-[#5A5A40]" />
                                          <span>ACESSIBILIDADE: <span className="text-stone-900">{item.accessibility}</span></span>
                                       </div>
                                    )}
                                    {item.areasOfActivity && item.areasOfActivity.length > 0 && (
                                       <div className="flex items-center gap-2">
                                          <Tag size={14} className="text-[#5A5A40]" />
                                          <span>ÁREAS: <span className="text-[#5A5A40]">{item.areasOfActivity.join(', ')}</span></span>
                                       </div>
                                    )}
                                    {(item.address?.text || item.location) && (
                                       <div className="flex items-center gap-2 col-span-full">
                                          <MapPin size={14} className="text-[#5A5A40]" />
                                          <span>LOCAL: <span className="text-stone-900">{item.address?.text || item.location}</span></span>
                                       </div>
                                    )}
                                 </div>

                                 <button 
                                  onClick={() => onItemClick?.(item)}
                                  className="w-full py-4 bg-[#0070BA] text-white rounded-2xl text-[11px] font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-[#005FA3] transition-all group/btn shadow-lg"
                                 >
                                    DETALHES DO {config.title.toUpperCase().slice(0, -1)}
                                    <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                 </button>
                              </div>
                           </div>
                         </motion.div>
                       ))
                     ) : (
                       <div className="bg-white rounded-[3rem] border border-stone-100 border-dashed py-32 text-center">
                         <p className="text-stone-400 font-black text-xs uppercase tracking-[0.2em]">Nenhum {config.title.toLowerCase()} encontrado.</p>
                       </div>
                     )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
         </div>

         {/* Sidebar Filters */}
         <div className="w-full lg:w-80 shrink-0 order-1 lg:order-2">
            <div className="bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-8 border-b border-stone-50 pb-4">{config.filterTitle}</h3>
              
              <div className="space-y-8">
                {config.filters.map((filter, i) => (
                  <div key={i}>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-4 block">{filter.label}</label>
                    {filter.type === 'select' ? (
                      <div className="relative">
                        <select className="w-full appearance-none bg-stone-50 border border-stone-100 rounded-xl px-5 py-4 text-xs font-black text-stone-600 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                          <option>{filter.placeholder}</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                      </div>
                    ) : filter.type === 'radio' ? (
                      <div className="space-y-3">
                        {filter.options?.map(opt => (
                          <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                             <input type="radio" name={filter.label} className="w-4 h-4 text-[#0070BA] bg-stone-100 border-stone-200 focus:ring-[#0070BA]" />
                             <span className="text-xs font-black text-stone-600 group-hover:text-stone-900">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filter.options?.map(opt => (
                          <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input type="checkbox" className="peer sr-only" />
                              <div className="w-5 h-5 bg-stone-100 border border-stone-200 rounded peer-checked:bg-[#5A5A40] transition-all" />
                              <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100" />
                            </div>
                            <span className="text-xs font-black text-stone-600 group-hover:text-stone-900">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <button className="text-[10px] font-black text-[#0070BA] uppercase tracking-tighter hover:underline pt-4 w-full text-left">
                  Limpar todos os filtros
                </button>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
