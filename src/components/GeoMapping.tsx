import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Info, 
  Search, 
  Filter, 
  Maximize2, 
  Minimize2, 
  ChevronRight,
  Target,
  Users,
  Building2,
  Calendar,
  ChevronLeft,
  Globe,
  Briefcase
} from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CulturalAgent, AgentType } from '../types';
import Map from './Map';

interface GeoMappingProps {
  onBack?: () => void;
  onAgentProfileClick?: (agent: any) => void;
}

// Deterministic coordinates mapping for items with no explicit geolocations
const stringToHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getDeterministicCoords = (id: string, index: number) => {
  const hash = stringToHash(id || String(index));
  const latOffset = ((Math.abs(hash) % 100) / 100) * 0.014 - 0.007;
  const lngOffset = (((Math.abs(hash) >> 8) % 100) / 100) * 0.014 - 0.007;
  return {
    lat: -1.6821 + latOffset,
    lng: -50.4815 + lngOffset
  };
};

const getEntityTypeInfo = (type: string) => {
  switch (type) {
    case 'agent':
      return { label: 'Agente', color: 'bg-[#0070BA]', icon: Users };
    case 'space':
      return { label: 'Espaço', color: 'bg-[#9B51E0]', icon: Building2 };
    case 'event':
      return { label: 'Evento', color: 'bg-[#E30613]', icon: Calendar };
    case 'opportunity':
      return { label: 'Oportunidade', color: 'bg-[#F2994A]', icon: Target };
    case 'project':
      return { label: 'Projeto', color: 'bg-[#2D9CDB]', icon: Briefcase };
    case 'user_location':
      return { label: 'Você', color: 'bg-emerald-500', icon: MapPin };
    default:
      return { label: 'Cadastro', color: 'bg-stone-500', icon: MapPin };
  }
};

const GeoMapping: React.FC<GeoMappingProps> = ({ onBack, onAgentProfileClick }) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapFilter, setMapFilter] = useState<'all' | 'agent' | 'space' | 'event' | 'opportunity' | 'project'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lists for real-time collections
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [spacesList, setSpacesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<any[]>([]);

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setSelectedAgentId('user_location');
        },
        (error) => {
          console.log("Localização do GPS indisponível no momento.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Subscribe to all 5 database collections in real-time
  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, 'agents'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAgentsList(data);
      setLoading(false);
    }, (error) => {
      console.warn("Error subscribing to agents live feed:", error);
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEventsList(data);
    }, (error) => {
      console.warn("Error subscribing to events live feed:", error);
    });

    const unsubSpaces = onSnapshot(collection(db, 'spaces'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSpacesList(data);
    }, (error) => {
      console.warn("Error subscribing to spaces live feed:", error);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(data);
    }, (error) => {
      console.warn("Error subscribing to projects live feed:", error);
    });

    const unsubOpportunities = onSnapshot(collection(db, 'opportunities'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOpportunitiesList(data);
    }, (error) => {
      console.warn("Error subscribing to opportunities live feed:", error);
    });

    // Auto request user geolocation when opening mapping page
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.log("Permissão de geolocalização negada ou indisponível.");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      unsubAgents();
      unsubEvents();
      unsubSpaces();
      unsubProjects();
      unsubOpportunities();
    };
  }, []);

  // Assemble unified geolocated points list
  const unifiedMapItems = React.useMemo(() => {
    const items: any[] = [];
    
    // User Location (GPS) if available
    if (userLocation) {
      items.push({
        id: 'user_location',
        name: 'Sua Localização',
        entityType: 'user_location',
        description: 'Sua localização atual aproximada obtida via GPS do dispositivo.',
        ownerId: 'user_location_owner',
        areasOfActivity: ['Sistemas de Posicionamento'],
        tags: ['GPS', 'Local'],
        location: 'Sua Posição Atual',
        address: {
          text: 'Sua Localização Atual (GPS)',
          lat: userLocation.lat,
          lng: userLocation.lng
        },
        contactInfo: {
          phone: 'GPS Ativo',
          email: 'Dispositivo Móvel'
        },
        createdAt: new Date()
      });
    }

    // Agents
    agentsList.forEach((agent: any, i) => {
      let lat = agent.address?.lat;
      let lng = agent.address?.lng;
      
      const addressStr = JSON.stringify(agent.address || {}).toLowerCase();
      const agentNameLower = (agent.name || '').toLowerCase();
      const isRioBranco = addressStr.includes('rio branco') || addressStr.includes('aeroporto') || agentNameLower.includes('teste');
      const isFallbackCoords = !lat || !lng || (Math.abs(lat - (-1.681123)) < 0.005 && Math.abs(lng - (-50.480234)) < 0.005);

      if (isRioBranco && isFallbackCoords) {
        lat = -1.6891195;
        lng = -50.4843378;
      } else if (!lat || !lng) {
        const coords = getDeterministicCoords(agent.id, i);
        lat = coords.lat;
        lng = coords.lng;
      }
      items.push({
        ...agent,
        entityType: 'agent',
        address: {
          text: agent.address?.text || agent.location || 'Breves, Pará, Brasil',
          lat: lat,
          lng: lng,
          mapUrl: agent.address?.mapUrl
        }
      });
    });

    // Spaces
    spacesList.forEach((space: any) => {
      items.push({
        ...space,
        entityType: 'space',
        address: {
          text: space.address?.text || space.location || 'Breves, Pará, Brasil',
          lat: space.address?.lat || -1.6853,
          lng: space.address?.lng || -50.4800,
          mapUrl: space.address?.mapUrl
        },
        contactInfo: {
          phone: space.phone || '(91) 99103-2228',
          email: space.email || 'contato@espacocultural.org'
        }
      });
    });

    // Events
    eventsList.forEach((event: any, i) => {
      let lat = event.address?.lat;
      let lng = event.address?.lng;
      let text = event.address?.text || event.location || 'Local do Evento, Breves, PA';
      
      if (!lat && event.spaceId) {
        const matchSpace = spacesList.find(s => s.id === event.spaceId);
        if (matchSpace) {
          lat = matchSpace.address?.lat;
          lng = matchSpace.address?.lng;
          text = matchSpace.address?.text || text;
        }
      }
      
      if (!lat || !lng) {
        const coords = getDeterministicCoords(event.id, i + 50);
        lat = coords.lat;
        lng = coords.lng;
      }

      items.push({
        ...event,
        entityType: 'event',
        address: { text, lat, lng },
        contactInfo: {
          phone: event.phone || '(91) 99103-2228',
          email: event.email || 'cultural@breves.pa.gov.br'
        }
      });
    });

    // Opportunities
    opportunitiesList.forEach((opportunity: any, i) => {
      const coords = getDeterministicCoords(opportunity.id, i + 150);
      items.push({
        ...opportunity,
        entityType: 'opportunity',
        address: {
          text: 'Edital / Oportunidade On-line - Mapa Cultural',
          lat: coords.lat,
          lng: coords.lng
        },
        contactInfo: {
          phone: opportunity.phone || '(91) 99103-2228',
          email: opportunity.email || 'editais@breves.pa.gov.br'
        }
      });
    });

    // Projects
    projectsList.forEach((project: any, i) => {
      const coords = getDeterministicCoords(project.id, i + 250);
      items.push({
        ...project,
        entityType: 'project',
        address: {
          text: 'Projeto Cultural Homologado - Secretaria de Cultura',
          lat: coords.lat,
          lng: coords.lng
        },
        contactInfo: {
          phone: project.phone || '(91) 99103-2228',
          email: project.email || 'projetos@breves.pa.gov.br'
        }
      });
    });

    return items;
  }, [agentsList, spacesList, eventsList, opportunitiesList, projectsList, userLocation]);

  // Compute stats counting for categories
  const counts = React.useMemo(() => {
    return {
      all: unifiedMapItems.filter(item => item.id !== 'user_location').length,
      agent: agentsList.length,
      space: spacesList.length,
      event: eventsList.length,
      opportunity: opportunitiesList.length,
      project: projectsList.length,
    };
  }, [unifiedMapItems, agentsList, spacesList, eventsList, opportunitiesList, projectsList]);

  // Compute filtered map and list items
  const filteredMapItems = React.useMemo(() => {
    return unifiedMapItems.filter(item => {
      if (item.id === 'user_location') return true; // Always show user location pin
      const matchesCategory = mapFilter === 'all' || item.entityType === mapFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [unifiedMapItems, mapFilter, searchTerm]);

  // Selected item detail for sidebar list
  const selectedItem = React.useMemo(() => {
    return selectedAgentId ? unifiedMapItems.find(item => item.id === selectedAgentId) : null;
  }, [selectedAgentId, unifiedMapItems]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const currentCategoryLabel = () => {
    switch (mapFilter) {
      case 'all': return 'Todos os Pontos';
      case 'agent': return 'Agentes Culturais';
      case 'space': return 'Espaços Culturais';
      case 'event': return 'Eventos Culturais';
      case 'opportunity': return 'Editais & Oportunidades';
      case 'project': return 'Projetos Identificados';
      default: return 'Pontos Mapeados';
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0070BA] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Carregando Mapeamento Geográfico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-500 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100] bg-white' : 'max-w-[1600px] mx-auto px-4 md:px-8 py-8'}`}>
      <div className={`flex flex-col h-full bg-white rounded-[40px] shadow-2xl border border-stone-100 overflow-hidden ${isFullscreen ? 'rounded-none' : ''}`}>
        
        {/* HEADER */}
        <div className="p-6 border-b border-stone-50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {onBack && !isFullscreen && (
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-all cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-[#E30613]" />
                <h1 className="text-xl font-black text-stone-900 tracking-tighter italic uppercase">Geolocalização Cultural</h1>
              </div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Distribuição Territorial das Agentes, Projetos e Oportunidades em Breves
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex bg-stone-50 rounded-2xl px-4 py-2 items-center gap-3 border border-stone-100 flex-1 md:w-64">
                <Search size={18} className="text-stone-300" />
                <input 
                  type="text" 
                  placeholder="Pesquisar no mapa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-stone-900 flex-1"
                />
             </div>
             <button 
               onClick={toggleFullscreen}
               className="p-3 bg-stone-900 text-white rounded-xl hover:bg-[#0070BA] transition-all shadow-lg cursor-pointer"
             >
               {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
             </button>
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-[650px] relative">
          
          {/* SIDEBAR FILTERS AND LIST */}
          <div className="w-full lg:w-96 border-r border-stone-50 flex flex-col bg-white z-10 transition-transform overflow-hidden">
             <div className="p-6 space-y-6 flex-1 flex flex-col min-h-0">
                
                {/* REAL-TIME TAB FILTER */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Filtrar por Categoria</label>
                     <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'all', label: 'Todos', count: counts.all, icon: Globe, color: 'bg-stone-900 text-white' },
                        { id: 'agent', label: 'Agentes', count: counts.agent, icon: Users, color: 'bg-[#0070BA] text-white' },
                        { id: 'space', label: 'Espaços', count: counts.space, icon: Building2, color: 'bg-[#9B51E0] text-white' },
                        { id: 'event', label: 'Eventos', count: counts.event, icon: Calendar, color: 'bg-[#E30613] text-white' },
                        { id: 'opportunity', label: 'Editais', count: counts.opportunity, icon: Target, color: 'bg-[#F2994A] text-white' },
                        { id: 'project', label: 'Projetos', count: counts.project, icon: Briefcase, color: 'bg-[#2D9CDB] text-white' },
                      ].map((cat) => {
                        const isSelected = mapFilter === cat.id;
                        const IconComponent = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setMapFilter(cat.id as any);
                              setSelectedAgentId(null); // Reset selection to zoom out cleanly
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all duration-200 border cursor-pointer ${
                              isSelected 
                                ? `${cat.color} border-transparent shadow-md font-extrabold` 
                                : 'bg-stone-50 border-stone-100 text-stone-500 hover:bg-stone-100 hover:border-stone-300 hover:text-stone-900'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <IconComponent size={12} className={isSelected ? 'text-white' : 'text-stone-400'} />
                              <span className="truncate">{cat.label}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-white text-stone-500 border border-stone-200'
                            }`}>
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                   </div>
                </div>

                {/* SIDEBAR LIST */}
                <div className="space-y-4 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                   <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-widest border-b border-stone-50 pb-2 flex items-center justify-between">
                     <span>{currentCategoryLabel()}</span>
                     <span className="text-stone-400 font-bold">{filteredMapItems.filter(item => item.id !== 'user_location').length} itens</span>
                   </h3>
                   <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-none">
                      {filteredMapItems.length > 0 ? (
                        filteredMapItems.map(item => {
                          const isSelected = selectedAgentId === item.id;
                          const info = getEntityTypeInfo(item.entityType);
                          const IconComponent = info.icon;
                          
                          if (item.id === 'user_location') return null; // GPS handeled separately or globally

                          return (
                            <div
                              key={item.id}
                              className={`w-full p-3.5 rounded-2xl text-left transition-all border flex flex-col gap-2 ${
                                isSelected 
                                  ? 'bg-stone-50 border-stone-800' 
                                  : 'bg-white border-stone-100 hover:border-stone-300'
                              }`}
                            >
                               <button
                                 onClick={() => setSelectedAgentId(item.id)}
                                 className="w-full text-left flex items-start gap-3 cursor-pointer"
                               >
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${info.color}`}>
                                    <IconComponent size={14} />
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-black text-stone-900 uppercase truncate leading-tight">{item.name}</h4>
                                    <p className="text-[8px] text-stone-400 font-black uppercase tracking-widest mt-0.5">{info.label} • {item.type || 'Cadastro'}</p>
                                    <div className="flex items-center gap-1 text-[9px] text-stone-500 mt-2 truncate">
                                       <MapPin size={9} className="shrink-0 text-stone-400" />
                                       <span className="truncate">{item.address?.text || 'Localização não informada'}</span>
                                    </div>
                                 </div>
                               </button>

                               {/* Collapsible Action buttons when selected */}
                               <AnimatePresence>
                                 {isSelected && (
                                   <motion.div
                                     initial={{ opacity: 0, height: 0 }}
                                     animate={{ opacity: 1, height: 'auto' }}
                                     exit={{ opacity: 0, height: 0 }}
                                     className="overflow-hidden pt-2 border-t border-stone-200/60 mt-1 flex gap-2"
                                   >
                                     <button
                                       onClick={() => onAgentProfileClick?.(item)}
                                       className="flex-1 py-2 bg-stone-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 hover:bg-[#0070BA] transition-all cursor-pointer"
                                     >
                                       <span>Acessar</span>
                                       <ChevronRight size={10} />
                                     </button>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center text-stone-400 font-black text-[10px] uppercase tracking-wider border border-dashed border-stone-200 rounded-3xl">
                          Nenhum ponto georreferenciado encontrado
                        </div>
                      )}
                   </div>
                </div>

                {/* BOTTOM BRANDING/FOOTER */}
                <div className="bg-stone-50 border border-stone-100 p-4 rounded-3xl mt-auto shadow-sm">
                   <div className="flex items-center gap-2.5 mb-2">
                     <div className="w-7 h-7 rounded-full bg-[#E30613]/10 flex items-center justify-center text-[#E30613]">
                       <Target size={14} />
                     </div>
                     <h4 className="text-[9px] font-black uppercase text-stone-900 tracking-wider">Monitoramento Territorial</h4>
                   </div>
                   <p className="text-[10px] text-stone-500 leading-relaxed font-semibold">
                     Este mapeamento fornece um panorama preciso das iniciativas culturais do município de Breves, facilitando as ações de fomento descentralizado.
                   </p>
                </div>

             </div>
          </div>
 
          {/* MAP CANVAS */}
          <div className="flex-1 relative bg-stone-100 min-h-[500px]">
             <Map 
               agents={filteredMapItems}
               onAgentClick={(item) => setSelectedAgentId(item ? item.id : null)}
               selectedAgentId={selectedAgentId}
               onViewProfile={onAgentProfileClick}
             />
 
             {/* FLOATING MAP LEGENDS AND CONTROLS */}
             <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-30 pointer-events-none">
                <button 
                  onClick={requestUserLocation}
                  className="bg-stone-900/95 backdrop-blur-md text-white rounded-2xl px-4 py-3 border border-stone-800 shadow-2xl hover:bg-[#0070BA] hover:scale-105 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
                >
                  <Target size={12} className="animate-pulse text-[#E30613]" />
                  Minha Localização (GPS)
                </button>
                <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-4 border border-stone-100 space-y-2.5 pointer-events-auto min-w-[180px]">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0070BA]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Agentes</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#9B51E0]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Espaços</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#E30613]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Eventos</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F2994A]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Oportunidades</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2D9CDB]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Projetos</span>
                   </div>
                   {userLocation && (
                     <div className="flex items-center gap-3 border-t border-stone-100 pt-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Sua Posição</span>
                     </div>
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GeoMapping;
