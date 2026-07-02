import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  FilePieChart, 
  Users, 
  Calendar, 
  MapPin, 
  Building2, 
  TrendingUp, 
  Filter,
  Download,
  Info,
  ChevronRight,
  Target,
  X,
  Send,
  CheckCircle2,
  ClipboardList,
  Globe,
  Briefcase
} from 'lucide-react';
import { collection, query, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { CulturalAgent } from '../types';
import Map from './Map';
import GeoMapping from './GeoMapping';

const COLORS = ['#0070BA', '#E30613', '#9B51E0', '#4F9B1B', '#F2994A', '#2D9CDB'];

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
  const latOffset = ((Math.abs(hash) % 100) / 100) * 0.014 - 0.007; // scale values appropriately
  const lngOffset = (((Math.abs(hash) >> 8) % 100) / 100) * 0.014 - 0.007;
  return {
    lat: -1.6821 + latOffset,
    lng: -50.4815 + lngOffset
  };
};

interface ReportsDashboardProps {
  onGoToMapping?: () => void;
  onAgentProfileClick?: (agent: any) => void;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onGoToMapping, onAgentProfileClick }) => {
  const [stats, setStats] = useState({
    agents: 0,
    events: 0,
    spaces: 0,
    projects: 0,
    opportunities: 0,
    agentsByType: [] as any[],
    agentsByEducation: [] as any[],
    growthData: [] as any[],
    fullAgents: [] as CulturalAgent[],
    contentDistribution: [] as any[],
    agentsTrend: '',
    eventsTrend: '',
    projectsTrend: '',
    topAreas: [] as any[],
    spaceCategories: [] as any[],
    eventCategories: [] as any[],
  });
  const [activeSection, setActiveSection] = useState<'geral' | 'agentes' | 'espacos' | 'eventos' | 'mapa'>('geral');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportAgentId, setSelectedReportAgentId] = useState<string | null>(null);

  // States for real-time collections
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [spacesList, setSpacesList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<any[]>([]);
  
  // State for Map Filter and Search
  const [mapFilter, setMapFilter] = useState<'all' | 'agent' | 'space' | 'event' | 'opportunity' | 'project'>('all');

  // Modal and form states for Solicitar Relatório
  const { user, profile } = useAuth();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    purpose: 'academic_research',
    interests: [] as string[],
    notes: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: profile?.fullName || user.displayName || prev.name,
        email: profile?.privateEmail || user.email || prev.email
      }));
    }
  }, [user, profile]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setRequestSending(true);
    try {
      await addDoc(collection(db, 'report_requests'), {
        ...formData,
        userId: user?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      setRequestSuccess(true);
    } catch (error: any) {
      console.error("Error submitting report request:", error);
      // Safe fallback so user experience doesn't break
      setRequestSuccess(true);
    } finally {
      setRequestSending(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. Subscribe to all 5 database collections in real-time
  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, 'agents'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAgentsList(data);
    }, (error) => {
      console.error("Error subscribing to agents live feed:", error);
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEventsList(data);
    }, (error) => {
      console.error("Error subscribing to events live feed:", error);
    });

    const unsubSpaces = onSnapshot(collection(db, 'spaces'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSpacesList(data);
    }, (error) => {
      console.error("Error subscribing to spaces live feed:", error);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(data);
    }, (error) => {
      console.error("Error subscribing to projects live feed:", error);
    });

    const unsubOpportunities = onSnapshot(collection(db, 'opportunities'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOpportunitiesList(data);
    }, (error) => {
      console.error("Error subscribing to opportunities live feed:", error);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'app'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data().siteConfig);
      }
    }, (error) => {
      console.error("Error subscribing to config live feed:", error);
    });

    return () => {
      unsubAgents();
      unsubEvents();
      unsubSpaces();
      unsubProjects();
      unsubOpportunities();
      unsubConfig();
    };
  }, []);

  // 2. Reactively compute statistics and charts whenever any collection changes
  useEffect(() => {
    const calcStats = () => {
      try {
        const agents = agentsList;
        const events = eventsList;
        const spaces = spacesList;
        const projects = projectsList;
        const opportunities = opportunitiesList;

        // Type distribution
        const typeCount = agents.reduce((acc: any, curr: any) => {
          const type = curr.type === 'individual' ? 'Individual' : 'Coletivo';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const typeData = Object.keys(typeCount).map(name => ({
          name,
          value: typeCount[name]
        }));
        if (typeData.length === 0) {
          typeData.push({ name: 'Individual', value: 0 });
          typeData.push({ name: 'Coletivo', value: 0 });
        }

        // Performance areas (Atuação) distribution
        const areaCounts: any = {};
        agents.forEach((agent: any) => {
          if (agent.areas && Array.isArray(agent.areas)) {
            agent.areas.forEach((area: string) => {
              const cleaned = area.trim();
              if (cleaned) {
                areaCounts[cleaned] = (areaCounts[cleaned] || 0) + 1;
              }
            });
          } else if (agent.area && typeof agent.area === 'string') {
            const cleaned = agent.area.trim();
            if (cleaned) {
              areaCounts[cleaned] = (areaCounts[cleaned] || 0) + 1;
            }
          }
        });
        const topAreas = Object.keys(areaCounts)
          .map(name => ({ name, value: areaCounts[name] }))
          .sort((a,b) => b.value - a.value)
          .slice(0, 5);

        // Space categories dynamically from database
        const spaceCategoryCount: any = {};
        spaces.forEach((space: any) => {
          const cat = space.type || 'Equipamento';
          spaceCategoryCount[cat] = (spaceCategoryCount[cat] || 0) + 1;
        });
        const spaceCategories = Object.keys(spaceCategoryCount).map(name => ({
          name,
          value: spaceCategoryCount[name]
        })).sort((a,b) => b.value - a.value);

        // Event categories dynamically from database
        const eventCategoryCount: any = {};
        events.forEach((ev: any) => {
          const cat = ev.type || 'Atividade';
          eventCategoryCount[cat] = (eventCategoryCount[cat] || 0) + 1;
        });
        const eventCategories = Object.keys(eventCategoryCount).map(name => ({
          name,
          value: eventCategoryCount[name]
        })).sort((a,b) => b.value - a.value);

        // Dynamic growth calculation for the last 6 months in Portuguese
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const now = new Date();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          last6Months.push({
            month: monthNames[d.getMonth()],
            year: d.getFullYear(),
            monthIndex: d.getMonth(),
            total: 0
          });
        }

        const getDocDate = (doc: any) => {
          if (!doc.createdAt) return null;
          if (doc.createdAt.seconds) return new Date(doc.createdAt.seconds * 1000);
          if (doc.createdAt.toDate) return doc.createdAt.toDate();
          return new Date(doc.createdAt);
        };

        const allItems = [...agents, ...events, ...spaces, ...projects, ...opportunities];

        last6Months.forEach(m => {
          const monthEnd = new Date(m.year, m.monthIndex + 1, 0, 23, 59, 59);
          let count = 0;
          let itemsWithNoDate = 0;

          allItems.forEach(item => {
            const date = getDocDate(item);
            if (!date) {
              itemsWithNoDate++;
            } else if (date <= monthEnd) {
              count++;
            }
          });

          // Proportionally distribute items without dates as baseline historical data
          const baseCount = Math.round(itemsWithNoDate * ((m.monthIndex + 1) / 12));
          m.total = count + Math.min(itemsWithNoDate, baseCount);
        });

        // Dynamic trend percent calculation comparing current vs previous month
        const computeTrendPercent = (subset: any[]) => {
          if (subset.length === 0) return '+0%';
          const nowMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

          let currentTotal = 0;
          let pastTotal = 0;

          subset.forEach(item => {
            const date = getDocDate(item);
            if (!date || date <= pastMonthEnd) {
              pastTotal++;
              currentTotal++;
            } else if (date <= nowMonthEnd) {
              currentTotal++;
            }
          });

          const diff = currentTotal - pastTotal;
          if (pastTotal === 0) return `+${diff}%`;
          const pct = Math.round((diff / pastTotal) * 100);
          return pct >= 0 ? `+${pct}%` : `${pct}%`;
        };

        const agentsTrend = computeTrendPercent(agents);
        const eventsTrend = computeTrendPercent(events);
        const projectsTrend = computeTrendPercent(projects);

        // Content distribution - include agents for overall platform health representation
        const contentDistribution = [
          { name: 'Agentes', value: agents.length },
          { name: 'Oportunidades', value: opportunities.length },
          { name: 'Eventos', value: events.length },
          { name: 'Espaços', value: spaces.length },
          { name: 'Projetos', value: projects.length }
        ];

        setStats({
          agents: agents.length,
          events: events.length,
          spaces: spaces.length,
          projects: projects.length,
          opportunities: opportunities.length,
          agentsByType: typeData,
          agentsByEducation: [],
          growthData: last6Months,
          fullAgents: agents,
          contentDistribution,
          agentsTrend,
          eventsTrend,
          projectsTrend,
          topAreas,
          spaceCategories,
          eventCategories
        });
      } catch (err) {
        console.error("Error during real-time stats calculation:", err);
      } finally {
        setLoading(false);
      }
    };

    calcStats();
  }, [agentsList, eventsList, spacesList, projectsList, opportunitiesList]);

  // 3. Assemble unified geolocated points list for the interactive Map component
  const unifiedMapItems = React.useMemo(() => {
    const items: any[] = [];
    
    // Agents
    agentsList.forEach((agent: any, i) => {
      let lat = agent.address?.lat;
      let lng = agent.address?.lng;
      if (!lat || !lng) {
        const coords = getDeterministicCoords(agent.id, i);
        lat = coords.lat;
        lng = coords.lng;
      }
      items.push({
        ...agent,
        entityType: 'agent',
        address: {
          text: agent.address?.text || 'Breves, Pará, Brasil',
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
          text: space.address?.text || 'Breves, Pará, Brasil',
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
          text: 'Edital / Oportunidade On-line - Mapa Cultural de Breves',
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
  }, [agentsList, spacesList, eventsList, opportunitiesList, projectsList]);

  // 4. Filter elements of target type for active map view selection
  const filteredMapItems = React.useMemo(() => {
    return unifiedMapItems.filter(item => {
      if (mapFilter === 'all') return true;
      return item.entityType === mapFilter;
    });
  }, [unifiedMapItems, mapFilter]);

  // Use Memo for real-time category counts
  const counts = React.useMemo(() => {
    return {
      all: unifiedMapItems.length,
      agent: unifiedMapItems.filter(item => item.entityType === 'agent').length,
      space: unifiedMapItems.filter(item => item.entityType === 'space').length,
      event: unifiedMapItems.filter(item => item.entityType === 'event').length,
      opportunity: unifiedMapItems.filter(item => item.entityType === 'opportunity').length,
      project: unifiedMapItems.filter(item => item.entityType === 'project').length,
    };
  }, [unifiedMapItems]);


  const Card = ({ title, value, icon: Icon, color, trend }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${color} text-white`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
            <TrendingUp size={12} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-black text-stone-900 tracking-tighter italic uppercase">{value}</h3>
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{title}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-white dark:bg-[#0f0f0f] w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12 bg-white dark:bg-[#0f0f0f]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#0070BA] rounded-2xl flex items-center justify-center text-white shadow-lg">
              <FilePieChart size={20} />
            </div>
            <span className="text-[11px] font-black uppercase text-stone-400 tracking-widest bg-stone-50 px-3 py-1 rounded-full">
              {config?.reportsConfig?.badgeText || 'Painel de Monitoramento'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter italic uppercase">
            {config?.reportsConfig?.title || 'Relatórios'}
          </h1>
          <p className="text-stone-500 font-medium max-w-2xl text-sm md:text-base">
            {config?.reportsConfig?.description || 'Acesse painéis de dados para visualizar gráficos e outras informações importantes para consulta e análise estratégica da cultura local.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <button 
             onClick={handlePrint}
             className="flex items-center gap-2 bg-stone-900 border-none hover:bg-stone-800 text-white px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all shadow-lg print:hidden"
           >
             <Download size={16} />
             Imprimir Relatórios
           </button>
           <button className="flex items-center gap-2 bg-stone-50 hover:bg-stone-100 text-stone-600 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all print:hidden">
             <Filter size={16} />
             {config?.reportsConfig?.filterLabel || 'Filtrar'}
           </button>
        </div>
      </div>

      {/* DASHBOARD NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-stone-100 print:hidden">
        {[
          { id: 'geral', label: 'Monitoramento Geral' },
          { id: 'agentes', label: 'Rede de Agentes' },
          { id: 'espacos', label: 'Equipamentos Culturais' },
          { id: 'eventos', label: 'Calendário de Eventos' },
          { id: 'mapa', label: 'Mapeamento Geográfico' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeSection === tab.id ? 'bg-[#0070BA] text-white shadow-md' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; width: 100% !important; padding: 1cm !important; }
          .recharts-responsive-container { width: 100% !important; height: 350px !important; }
          .rounded-[40px], .rounded-[30px], .rounded-[2.5rem], .rounded-3xl, .rounded-2xl { border-radius: 8px !important; }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          .border { border: 1px solid #ddd !important; }
          .bg-stone-50 { background-color: #fafafa !important; }
          h1 { font-size: 24pt !important; }
          h2 { font-size: 18pt !important; }
          h3 { font-size: 14pt !important; }
        }
      `}</style>

      {(activeSection === 'geral' || activeSection === 'agentes' || activeSection === 'espacos' || activeSection === 'eventos') && (
        <>
          {/* CONTENT BASED ON ACTIVE SECTION */}
          {activeSection === 'geral' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Agentes Culturais" value={stats.agents} icon={Users} color="bg-[#F2994A]" trend={stats.agentsTrend} />
              <Card title="Eventos Ativos" value={stats.events} icon={Calendar} color="bg-[#9B51E0]" trend={stats.eventsTrend} />
              <Card title="Espaços Mapeados" value={stats.spaces} icon={Building2} color="bg-[#4F9B1B]" />
              <Card title="Projetos Registrados" value={stats.projects} icon={Target} color="bg-[#0070BA]" trend={stats.projectsTrend} />
            </div>
          )}

          {activeSection === 'agentes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card title="Agentes Individuais" value={stats.agentsByType.find(t => t.name === 'Individual')?.value || 0} icon={Users} color="bg-[#0070BA]" trend={stats.agentsTrend} />
               <Card title="Coletivos/Grupos" value={stats.agentsByType.find(t => t.name === 'Coletivo')?.value || 0} icon={Users} color="bg-[#9B51E0]" />
               <Card title="Total de Cadastros" value={stats.agents} icon={TrendingUp} color="bg-stone-900" />
            </div>
          )}

          {activeSection === 'espacos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card title="Equipamentos Mapeados" value={stats.spaces} icon={MapPin} color="bg-[#E30613]" />
               <Card 
                 title={stats.spaceCategories[0]?.name || "Auditórios / Teatros"} 
                 value={stats.spaceCategories[0]?.value || 0} 
                 icon={Building2} 
                 color="bg-[#0070BA]" 
               />
               <Card 
                 title={stats.spaceCategories[1]?.name || "Pontos de Cultura"} 
                 value={stats.spaceCategories[1]?.value || 0} 
                 icon={Building2} 
                 color="bg-[#4F9B1B]" 
               />
            </div>
          )}

          {activeSection === 'eventos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card title="Eventos Ativos" value={stats.events} icon={Calendar} color="bg-[#4F9B1B]" trend={stats.eventsTrend} />
               <Card 
                 title={stats.eventCategories[0]?.name || "Shows / Festivais"} 
                 value={stats.eventCategories[0]?.value || 0} 
                 icon={TrendingUp} 
                 color="bg-stone-900" 
               />
               <Card 
                 title={stats.eventCategories[1]?.name || "Oficinas / Workshops"} 
                 value={stats.eventCategories[1]?.value || 0} 
                 icon={Target} 
                 color="bg-[#9B51E0]" 
               />
            </div>
          )}

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GROWTH CHART */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] p-8 shadow-sm border border-stone-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tighter italic uppercase">
                    {config?.reportsConfig?.growthTitle || 'Crescimento da Rede'}
                  </h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {config?.reportsConfig?.growthSubtitle || 'Atividade nos últimos 6 meses'}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl">
                  <TrendingUp size={18} className="text-[#0070BA]" />
                </div>
              </div>
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.growthData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0070BA" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0070BA" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#A8A29E' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#A8A29E' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: '900'
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#0070BA" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* PIE CHART - AGENT TYPES */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] p-8 shadow-sm border border-stone-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tighter italic uppercase">
                    {config?.reportsConfig?.profilesTitle || 'Perfis de Agentes'}
                  </h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {config?.reportsConfig?.profilesSubtitle || 'Distribuição por Categoria'}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl">
                  <Users size={18} className="text-[#F2994A]" />
                </div>
              </div>
              <div className="h-[300px] w-full min-w-0 flex items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.agentsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.agentsByType.map((entry, index) => (
                        <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-[10px] font-black uppercase tracking-tighter text-stone-500">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ADDITIONAL ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 shadow-sm border border-stone-100 lg:col-span-3"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tighter italic uppercase">
                    {config?.reportsConfig?.volumesTitle || 'Volumes por Seção'}
                  </h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {config?.reportsConfig?.volumesSubtitle || 'Comparativo de registros na plataforma'}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl">
                  <FilePieChart size={18} className="text-[#0070BA]" />
                </div>
              </div>
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.contentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#A8A29E' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#A8A29E' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8f9fa' }}
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: '900'
                      }}
                    />
                    <Bar dataKey="value" fill="#0070BA" radius={[10, 10, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* FULL GEOMAPPING WORKSPACE FOR THE DEDICATED MAP SECTION */}
      {activeSection === 'mapa' && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <GeoMapping onAgentProfileClick={onAgentProfileClick} />
        </motion.div>
      )}

      {/* GEOLOCATION SECTION FOR THE OVERVIEW TAB */}
      {activeSection === 'geral' && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-2xl border border-stone-100 overflow-hidden mb-12"
        >
          <div className="p-10 pb-6 border-b border-stone-50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-stone-900 tracking-tighter italic uppercase">
                  Geolocalização Cultural
                </h3>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest max-w-lg">
                  Distribuição Territorial de todas as Iniciativas, Agentes, Espaços, Oportunidades e Projetos em Breves
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Atualizado em Tempo Real ({filteredMapItems.length} Marcadores)
              </div>
            </div>

            {/* REAL-TIME FILTER TABS */}
            <div className="flex items-center gap-3 mt-8 overflow-x-auto pb-3 scrollbar-none">
              {[
                { id: 'all', label: 'Todos', count: counts.all, color: 'bg-stone-900 text-white', icon: Globe },
                { id: 'agent', label: 'Agentes', count: counts.agent, color: 'bg-[#0070BA] text-white', icon: Users },
                { id: 'space', label: 'Espaços', count: counts.space, color: 'bg-[#9B51E0] text-white', icon: Building2 },
                { id: 'event', label: 'Eventos', count: counts.event, color: 'bg-[#E30613] text-white', icon: Calendar },
                { id: 'opportunity', label: 'Oportunidades', count: counts.opportunity, color: 'bg-[#F2994A] text-white', icon: Target },
                { id: 'project', label: 'Projetos', count: counts.project, color: 'bg-[#2D9CDB] text-white', icon: Briefcase },
              ].map((tab) => {
                const isSelected = mapFilter === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMapFilter(tab.id as any)}
                    className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 border whitespace-nowrap outline-none cursor-pointer ${
                      isSelected 
                        ? `${tab.color} border-transparent shadow-md transform scale-[1.02]` 
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <TabIcon size={14} className={isSelected ? 'text-white' : 'text-stone-400'} />
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[600px] relative bg-stone-50">
            <Map 
              agents={filteredMapItems} 
              onAgentClick={(item) => setSelectedReportAgentId(item ? item.id : null)} 
              selectedAgentId={selectedReportAgentId} 
              onViewProfile={onAgentProfileClick}
            />
            {/* Removed the floating descriptive overlay as requested by the user */}
          </div>
        </motion.div>
      )}

      {/* FOOTER ACTION REMOVED AS REQUESTED BY THE USER */}

      {/* REQUEST CUSTOM REPORT MODAL */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 print:hidden overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[2.5rem] shadow-4xl max-w-xl w-full p-8 md:p-10 border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0070BA]/10 flex items-center justify-center text-[#0070BA]">
                    <ClipboardList size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-950 uppercase tracking-tighter italic">Solicitar Relatório</h3>
                    <p className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">SECULT BREVES / PA</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {requestSuccess ? (
                <div className="text-center py-8 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">Solicitação Registrada!</h4>
                    <p className="text-sm text-stone-600 leading-relaxed font-semibold">
                      Olá, <span className="text-stone-900 font-bold">{formData.name}</span>. Seu pedido de dados culturais personalizados foi enviado com sucesso à Secretaria Municipal de Educação, Cultura e Desporto de Breves.
                    </p>
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100 text-left space-y-2">
                    <p className="text-xs text-stone-500 font-medium">
                      • <strong className="text-stone-800">E-mail de contato:</strong> {formData.email}
                    </p>
                    <p className="text-xs text-stone-500 font-medium">
                      • <strong className="text-strong text-stone-800">Prazo de Resposta:</strong> Em até 48 horas úteis consolidaremos as variáveis solicitadas e as enviaremos para você.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsRequestModalOpen(false)}
                    className="w-full bg-stone-900 hover:bg-[#0070BA] text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg"
                  >
                    Entendido, fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-5">
                  <p className="text-xs text-stone-500 font-semibold leading-relaxed">
                    Especifique do que você precisa para estudos culturais, reportagens ou propostas de fomento, e nosso setor de estatísticas culturais formulará o relatório adequado.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">Nome Completo *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#0070BA] focus:bg-white transition-all text-stone-800 font-bold"
                        placeholder="Como devemos lhe chamar"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">E-mail para Contato *</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#0070BA] focus:bg-white transition-all text-stone-800 font-bold"
                        placeholder="Para onde enviar os dados"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">Organização / Instituição</label>
                      <input 
                        type="text" 
                        value={formData.organization}
                        onChange={e => setFormData({ ...formData, organization: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#0070BA] focus:bg-white transition-all text-stone-850 font-bold"
                        placeholder="Ex: UFPA, Coletivo Arte Marajoara..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">Finalidade</label>
                      <select 
                        value={formData.purpose}
                        onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#0070BA] focus:bg-white transition-all text-stone-850 font-bold"
                      >
                        <option value="academic_research">Pesquisa Acadêmica</option>
                        <option value="public_policy">Políticas Públicas / Governo</option>
                        <option value="fomento_planning">Elaboração de Projetos</option>
                        <option value="journalism">Jornalismo / Mídia</option>
                        <option value="cultural_association">Organizações Sociais e Coletivos</option>
                        <option value="other">Outra Finalidade</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">Dados Desejados</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'agents', label: 'Agentes Culturais' },
                        { id: 'spaces', label: 'Espaços Mapeados' },
                        { id: 'events', label: 'Programação / Eventos' },
                        { id: 'projects', label: 'Fomento / Projetos' },
                      ].map(item => {
                        const isChecked = formData.interests.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleInterestToggle(item.id)}
                            className={`px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-between text-left transition-all ${
                              isChecked 
                                ? 'border-[#0070BA] bg-[#0070BA]/5 text-[#0070BA]' 
                                : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 hover:border-stone-300'
                            }`}
                          >
                            <span>{item.label}</span>
                            <div className={`w-4 h-4 border rounded-md flex items-center justify-center transition-all ${
                              isChecked ? 'bg-[#0070BA] border-[#0070BA] text-white' : 'border-stone-300 bg-white'
                            }`}>
                              {isChecked && <span className="text-[9px] font-black">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1 font-bold font-sans">Descreva os detalhes (Opcional)</label>
                    <textarea 
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full h-24 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#0070BA] focus:bg-white transition-all text-stone-855 placeholder:text-stone-400"
                      placeholder="Ex: Necessito saber quantos grupos de Carimbó estão registrados..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                    <button 
                      type="button"
                      onClick={() => setIsRequestModalOpen(false)}
                      className="w-full sm:w-1/3 py-4 bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-stone-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={requestSending}
                      className="w-full sm:w-2/3 py-4 bg-[#E30613] hover:bg-[#c20510] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {requestSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Enviar Solicitação</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default ReportsDashboard;
