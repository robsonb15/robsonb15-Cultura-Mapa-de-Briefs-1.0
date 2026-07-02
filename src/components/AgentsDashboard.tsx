import { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  User, 
  UserPlus, 
  Map as MapIcon, 
  List, 
  BarChart3, 
  Search, 
  ChevronRight, 
  Filter, 
  X, 
  Printer, 
  FileText,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { CulturalAgent, AgentType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AgentMap from './Map';

interface AgentsDashboardProps {
  agents: CulturalAgent[];
  onAgentClick: (agent: CulturalAgent) => void;
  onRegister: () => void;
  selectedAgentId?: string;
}

export default function AgentsDashboard({ agents, onAgentClick, onRegister, selectedAgentId }: AgentsDashboardProps) {
  const [viewMode, setViewMode] = useState<'lista' | 'mapa' | 'indicadores'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'collective'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  // Statistics
  const stats = useMemo(() => {
    const total = agents.length;
    const individual = agents.filter(a => a.type === AgentType.INDIVIDUAL).length;
    const collective = agents.filter(a => a.type === AgentType.COLLECTIVE).length;
    
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = agents.filter(a => {
      if (!a.createdAt) return false;
      const date = a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
      return date > sevenDaysAgo;
    }).length;

    return { total, individual, collective, recent };
  }, [agents]);

  const areasOfActivity = useMemo(() => {
    const areas = new Set<string>();
    agents.forEach(a => a.areasOfActivity.forEach(area => areas.add(area)));
    return Array.from(areas).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    let result = agents.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.areasOfActivity.some(area => area.toLowerCase().includes(searchQuery.toLowerCase())) ||
        a.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || a.type === typeFilter;
      const matchesArea = areaFilter === 'all' || a.areasOfActivity.includes(areaFilter);
      
      return matchesSearch && matchesType && matchesArea;
    });

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
  }, [agents, searchQuery, typeFilter, areaFilter, sortBy]);

  const renderViewContent = () => {
    switch (viewMode) {
      case 'mapa':
        return (
          <div className="h-[600px] w-full rounded-[2.5rem] overflow-hidden border border-stone-100 shadow-2xl bg-white p-4">
            <AgentMap 
              agents={filteredAgents} 
              onAgentClick={onAgentClick}
              selectedAgentId={selectedAgentId}
            />
          </div>
        );
      case 'indicadores':
        return (
          <div className="bg-white rounded-[3rem] border border-stone-100 p-12 text-center shadow-lg">
             <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
                <BarChart3 size={40} />
             </div>
             <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic mb-4">Relatórios e Indicadores</h3>
             <p className="text-stone-500 max-w-md mx-auto mb-10">Métricas detalhadas sobre o desenvolvimento cultural na região de Breves.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100">
                   <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-2">Crescimento Mensal</p>
                   <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5A5A40] w-[65%]" />
                   </div>
                   <p className="mt-4 text-2xl font-black text-stone-900">+12%</p>
                </div>
                <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100">
                   <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-2">Engajamento Regional</p>
                   <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0070BA] w-[82%]" />
                   </div>
                   <p className="mt-4 text-2xl font-black text-stone-900">82%</p>
                </div>
             </div>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {filteredAgents.length === 0 ? (
              <div className="bg-white rounded-[3rem] border border-dashed border-stone-200 py-32 text-center">
                 <p className="text-sm font-black text-stone-300 uppercase tracking-[0.2em]">Nenhum agente corresponde aos filtros</p>
              </div>
            ) : (
              filteredAgents.map(agent => (
                <motion.div 
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-[2.5rem] border border-stone-100 p-6 md:p-10 shadow-sm hover:shadow-2xl transition-all group flex flex-col md:flex-row gap-10"
                >
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-stone-100 overflow-hidden border-4 border-stone-50 shadow-md group-hover:shadow-2xl transition-all duration-500">
                      {agent.images?.profile ? (
                        <img src={agent.images.profile} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300"><Users size={48} strokeWidth={1} /></div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                       <div>
                          <p className="text-[9px] font-black text-stone-300 uppercase tracking-tighter mb-1">ID: {agent.id.slice(0, 8).toUpperCase()}</p>
                          <h4 className="text-2xl md:text-3xl font-black text-stone-900 uppercase tracking-tighter leading-none group-hover:text-[#5A5A40] transition-colors">{agent.name}</h4>
                          <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-tighter mt-1">Este agente atua de forma {agent.type === AgentType.INDIVIDUAL ? 'Individual' : 'Coletiva'}</p>
                       </div>
                    </div>

                    <p className="text-stone-500 text-sm md:text-base leading-relaxed mb-8 line-clamp-3 italic">
                        {agent.description || 'Sem descrição detalhada disponível.'}
                    </p>

                    <div className="space-y-6">
                       <div>
                          <h5 className="text-[9px] font-black text-[#5A5A40] uppercase tracking-tighter mb-3">ÁREAS DE ATUAÇÃO: ({agent.areasOfActivity.length})</h5>
                          <div className="flex flex-wrap gap-2">
                             {agent.areasOfActivity.map((area, i) => (
                                <span key={i} className="px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-lg text-[9px] font-black text-stone-500 uppercase tracking-tighter">
                                   {area}
                                </span>
                             ))}
                          </div>
                       </div>
                       
                       <button 
                          onClick={() => onAgentClick(agent)}
                          className="w-full py-4 bg-[#0070BA] text-white rounded-2xl text-[11px] font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-[#005FA3] transition-all group/btn"
                       >
                          Acessar
                          <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 bg-[#F8F9FA] min-h-screen">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-tighter mb-8">
        <span className="hover:text-stone-900 cursor-pointer" onClick={() => setViewMode('map' as any)}>INÍCIO</span>
        <ChevronRight size={12} />
        <span className="text-[#0070BA]">AGENTES</span>
      </div>

      {/* Header with Icon and Title */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-stone-200">
          <Users size={28} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 uppercase tracking-tighter italic">Agentes</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        {[
          { label: 'Agentes cadastrados', value: stats.total, icon: Users, color: 'text-stone-900' },
          { label: 'Agentes individuais', value: stats.individual, icon: User, color: 'text-stone-900' },
          { label: 'Agentes coletivos', value: stats.collective, icon: UserPlus, color: 'text-stone-900' },
          { label: 'Cadastrados nos últimos 7 dias', value: stats.recent, icon: Users, color: 'text-stone-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all h-full">
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter leading-none">{stat.value}</span>
              <stat.icon className="text-stone-200 group-hover:text-stone-400 transition-colors" size={24} />
            </div>
            <p className="text-[10px] md:text-[11px] font-black text-stone-400 uppercase tracking-[0.2em]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Secondary Navigation */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12 border-b border-stone-100 pb-8">
        <div className="flex items-center gap-4 md:gap-8 overflow-x-auto w-full lg:w-auto pb-4 lg:pb-0 scrollbar-hide">
          <span className="text-[11px] font-black text-stone-400 uppercase tracking-tighter whitespace-nowrap">Visualizar como:</span>
          <div className="flex p-1.5 bg-stone-100 rounded-[1.5rem] shrink-0">
            {[
              { id: 'lista', label: 'Lista', icon: List },
              { id: 'mapa', label: 'Mapa', icon: MapIcon },
              { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
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
              placeholder="Buscar agentes..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-stone-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-[#5A5A40] text-sm font-black shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-4 bg-white text-stone-900 border border-stone-200 rounded-2xl hover:bg-stone-50 shadow-sm">
             <Search size={22} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-8 border-b border-stone-50 pb-4">Filtros de agente</h3>
            
            <div className="space-y-8">
              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-4 block">Status do agente</label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={statusFilter}
                      onChange={() => setStatusFilter(!statusFilter)}
                    />
                    <div className="w-5 h-5 bg-stone-100 border border-stone-200 rounded peer-checked:bg-[#5A5A40] transition-all" />
                    <ChevronRight size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 -rotate-90" />
                  </div>
                  <span className="text-xs font-black text-stone-600 group-hover:text-stone-900">Agentes oficiais</span>
                </label>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-4 block">Tipo</label>
                <div className="relative">
                    <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full appearance-none bg-stone-50 border border-stone-100 rounded-xl px-5 py-4 text-xs font-black text-stone-600 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    >
                        <option value="all">Todos</option>
                        <option value="individual">Individual</option>
                        <option value="collective">Coletivo</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Area Filter */}
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-4 block">Área de atuação</label>
                <div className="relative">
                    <select 
                      value={areaFilter}
                      onChange={(e) => setAreaFilter(e.target.value)}
                      className="w-full appearance-none bg-stone-50 border border-stone-100 rounded-xl px-5 py-4 text-xs font-black text-stone-600 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    >
                        <option value="all">Selecione as áreas de atuação</option>
                        {areasOfActivity.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                </div>
              </div>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setAreaFilter('all');
                  setStatusFilter(false);
                }}
                className="text-[10px] font-black text-[#0070BA] uppercase tracking-tighter hover:underline pt-4"
              >
                Limpar todos os filtros
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
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
             
             <div className="px-6 py-3 bg-white border border-stone-200 rounded-[1rem] shadow-sm">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                  <span className="text-stone-900">{filteredAgents.length}</span> Agentes encontrados
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
              {renderViewContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
