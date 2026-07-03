import { useState, useEffect } from 'react';
import { useAuth } from './lib/AuthContext';
import { AccessibilityProvider, useAccessibility } from './contexts/AccessibilityContext';
import AccessibilityToolbar from './components/AccessibilityToolbar';
import { agentService } from './lib/agentService';
import { CulturalAgent, AppConfig, StatsConfig } from './types';
import Navbar from './components/Navbar';
import AgentProfile from './components/AgentProfile';
import AgentEditForm from './components/AgentEditForm';
import AuthPage from './components/AuthPage';
import UserDashboard from './components/UserDashboard';
import ContentDashboard from './components/ContentDashboard';
import AdminPanel from './components/AdminPanel';
import HeroBanner from './components/HeroBanner';
import CategoryBanners from './components/CategoryBanners';
import FeaturedContent from './components/FeaturedContent';
import StatisticsSection from './components/StatisticsSection';
import Footer from './components/Footer';
import HelpPage from './components/HelpPage';
import AgentsDashboard from './components/AgentsDashboard';
import ReportsDashboard from './components/ReportsDashboard';
import GeoMapping from './components/GeoMapping';
import ContentDetail from './components/ContentDetail';
import OpportunityRegistrationFlow from './components/OpportunityRegistration';
import { checkIsAdmin, sanitizeText } from './lib/auth-utils';
import { contentService } from './lib/contentService';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Settings, Minus, Plus, Sun, Moon, Contrast } from 'lucide-react';

type ViewMode = 'map' | 'profile' | 'edit' | 'list' | 'admin' | 'user_dashboard' | 'auth' | 'oportunidades' | 'eventos' | 'espacos' | 'projetos' | 'agentes' | 'acessibilidade' | 'content_detail' | 'opportunity_registration' | 'help' | 'reports' | 'mapping';

export default function App() {
  return (
    <AccessibilityProvider>
      <AppContent />
    </AccessibilityProvider>
  );
}

function AppContent() {
  const { user, profile, loading: authLoading, logout } = useAuth();
  const { increaseFontSize, decreaseFontSize, resetFontSize, toggleHighContrast, toggleTheme, theme, highContrast } = useAccessibility();
  
  const [agents, setAgents] = useState<CulturalAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedAgent, setSelectedAgent] = useState<CulturalAgent | null>(null);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [contentType, setContentType] = useState<'space' | 'event' | 'opportunity' | 'project' | null>(null);
  const [myAgent, setMyAgent] = useState<CulturalAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'collective'>('all');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [targetCreateType, setTargetCreateType] = useState<'space' | 'event' | 'opportunity' | 'project' | 'agent' | null>(null);

  const isAdmin = checkIsAdmin(user as any, appConfig);

  useEffect(() => {
    if (user && viewMode === 'auth') {
      if (targetCreateType) {
        if (targetCreateType === 'agent') {
          handleSetView('edit');
        } else {
          handleSetView('user_dashboard');
        }
      } else {
        handleSetView('map');
      }
    }
  }, [user, viewMode, targetCreateType]);

  useEffect(() => {
    if (user) {
      agentService.getAgent(user.uid).then(setMyAgent);
    } else {
      setMyAgent(null);
    }

    const unsubscribeAgents = agentService.subscribeToAgents((data) => {
      setAgents(data);
      setLoading(false);
    });

    const unsubscribeConfig = agentService.subscribeToAppConfig(cfg => {
      if (cfg) {
        setAppConfig(cfg as AppConfig);
        if (cfg.siteConfig?.siteName) {
          document.title = cfg.siteConfig.siteName;
        }
      }
    });

    return () => {
      unsubscribeAgents();
      unsubscribeConfig();
    };
  }, [user]);

  useEffect(() => {
    if (appConfig?.siteConfig?.themeColors) {
      const colors = appConfig.siteConfig.themeColors;
      const root = document.documentElement;
      Object.entries(colors).forEach(([key, value]) => {
        const cssKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        root.style.setProperty(`--${cssKey}`, value);
      });
    }
  }, [appConfig]);

  const handleSaveProfile = async (data: Partial<CulturalAgent>) => {
    if (!user) return;
    try {
      if (myAgent) {
        await agentService.updateAgent(user.uid, data);
      } else {
        await agentService.createAgent({ ...data, ownerId: user.uid } as any);
      }
      const updated = await agentService.getAgent(user.uid);
      setMyAgent(updated);
      setSelectedAgent(updated);
      handleSetView('profile');
    } catch (error) {
      alert("Erro ao salvar perfil. Verifique os campos ou sua permissão.");
    }
  };

  const filteredAgents = agents.filter(a => {
    const cleanSearch = sanitizeText(searchQuery).toLowerCase();
    const matchesSearch = a.name.toLowerCase().includes(cleanSearch) ||
      a.areasOfActivity.some(area => area.toLowerCase().includes(cleanSearch)) ||
      a.tags.some(tag => tag.toLowerCase().includes(cleanSearch));
    
    if (typeFilter === 'all') return matchesSearch;
    return matchesSearch && a.type === typeFilter;
  });

  const handleAgentClick = (item: any) => {
    if (!item) {
      setSelectedAgent(null);
      return;
    }
    if (item && item.entityType && item.entityType !== 'agent') {
      setSelectedContent(item);
      setContentType(item.entityType);
      handleSetView('content_detail');
    } else {
      setSelectedAgent(item);
      handleSetView('profile');
    }
  };

  const [realStats, setRealStats] = useState<StatsConfig>({
    opportunitiesCount: 0,
    newOpportunitiesCount: 0,
    collectiveAgentsCount: 0,
    certifiedCollectiveAgentsCount: 0,
    individualAgentsCount: 0,
    certifiedIndividualAgentsCount: 0,
    spacesCount: 0,
    certifiedSpacesCount: 0,
    projectsCount: 0,
    certifiedProjectsCount: 0,
    eventsCount: 0,
    certifiedEventsCount: 0,
  });

  useEffect(() => {
    // Calculate stats in real-time
    const individual = agents.filter(a => a.type === 'individual').length;
    const collective = agents.filter(a => a.type === 'collective').length;
    
    // We would ideally subscribe to other collections too
    // For now, let's update what we have and maybe fetch counts
    setRealStats(prev => ({
      ...prev,
      individualAgentsCount: individual,
      collectiveAgentsCount: collective,
      // In a real app with more resources, we'd fetch these from the DB
    }));

    // Optionally fetch other counts
    const fetchCounts = async () => {
      try {
        const [opps, events, spaces, projects] = await Promise.all([
          contentService.getAllContent('opportunity').catch(e => handleFirestoreError(e, OperationType.LIST, 'opportunities')),
          contentService.getAllContent('event').catch(e => handleFirestoreError(e, OperationType.LIST, 'events')),
          contentService.getAllContent('space').catch(e => handleFirestoreError(e, OperationType.LIST, 'spaces')),
          contentService.getAllContent('project').catch(e => handleFirestoreError(e, OperationType.LIST, 'projects'))
        ] as any);
        setRealStats(prev => ({
          ...prev,
          opportunitiesCount: opps.length,
          eventsCount: events.length,
          spacesCount: spaces.length,
          projectsCount: projects.length
        }));
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
    };
    fetchCounts();
  }, [agents]);

  const handleSetView = (view: ViewMode) => {
    setViewMode(view);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#FDFDFD] dark:bg-[#0f0f0f]">
          <div className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (viewMode) {
      case 'auth':
        return <AuthPage onBack={() => handleSetView('map')} />;
      
      case 'user_dashboard':
        return user ? (
          <UserDashboard 
            setView={handleSetView} 
            setSelectedContent={setSelectedContent}
            hasAgent={!!myAgent} 
            initialCreateType={targetCreateType}
            clearCreateType={() => setTargetCreateType(null)}
          />
        ) : (
          <AuthPage onBack={() => {
            setTargetCreateType(null);
            handleSetView('map');
          }} />
        );
      case 'map':
        return (
          <div className="bg-[#FDFDFD] dark:bg-[#0f0f0f]">
            <HeroBanner 
              config={appConfig?.siteConfig?.banners}
              heroImage={appConfig?.siteConfig?.heroBannerImage}
              heroTitle={appConfig?.siteConfig?.heroTitle}
              heroSubtitle={appConfig?.siteConfig?.heroSubtitle}
              heroZoom={appConfig?.siteConfig?.heroZoom}
              heroPositionX={appConfig?.siteConfig?.heroPositionX}
              heroPositionY={appConfig?.siteConfig?.heroPositionY}
              onDiscover={() => handleSetView('list')}
              onOpportunities={() => handleSetView('oportunidades')}
              onRegister={() => handleSetView(user ? 'edit' : 'auth')}
            />
            
            <CategoryBanners 
              banners={appConfig?.siteConfig?.categoryBanners} 
              onSectionClick={(path) => handleSetView(path as any)} 
            />

            <FeaturedContent 
              onItemClick={(item, category) => {
                if (category === 'agentes') {
                  setSelectedAgent(item);
                  handleSetView('profile');
                } else {
                  setSelectedContent(item);
                  const typeMap: Record<string, 'space' | 'event' | 'opportunity' | 'project'> = {
                    'espacos': 'space',
                    'eventos': 'event',
                    'oportunidades': 'opportunity',
                    'projetos': 'project'
                  };
                  setContentType(typeMap[category] || 'event');
                  handleSetView('content_detail');
                }
              }} 
            />

            <StatisticsSection 
              stats={realStats} 
              setView={handleSetView} 
              reportsConfig={appConfig?.siteConfig?.reportsConfig}
            />
          </div>
        );
      
      case 'list':
        return (
          <AgentsDashboard 
            agents={filteredAgents}
            onAgentClick={handleAgentClick}
            onRegister={() => handleSetView(user ? 'edit' : 'auth')}
            selectedAgentId={selectedAgent?.id}
          />
        );

      case 'profile':
        return selectedAgent ? (
          <div className="relative">
             <button 
                onClick={() => handleSetView('map')}
                className="fixed top-20 left-4 z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur shadow-lg p-3 rounded-full hover:bg-white dark:hover:bg-stone-800 transition-all text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-2"
              >
                <MapIcon size={16} /> VOLTAR AO MAPA
              </button>
              <AgentProfile 
                agent={selectedAgent} 
                isOwner={user?.uid === selectedAgent.ownerId}
                onEdit={() => handleSetView('edit')}
              />
          </div>
        ) : null;

      case 'edit':
        return (
          <AgentEditForm 
            initialData={myAgent || {}}
            onSave={handleSaveProfile}
            onCancel={() => handleSetView('profile')}
            isAdmin={isAdmin}
          />
        );

      case 'admin':
        return isAdmin ? <AdminPanel /> : null;

      case 'help':
        return <HelpPage onBack={() => handleSetView('map')} helpConfig={appConfig?.helpConfig} />;

      case 'espacos':
        return (
          <ContentDashboard 
            type="espacos" 
            onItemClick={(item: any) => {
              setSelectedContent(item);
              setContentType('space');
              handleSetView('content_detail');
            }} 
            isAdmin={!!isAdmin} 
            onCreateNew={() => {
              setTargetCreateType('space');
              handleSetView(user ? 'user_dashboard' : 'auth');
            }} 
          />
        );
      case 'eventos':
        return (
          <ContentDashboard 
            type="eventos" 
            onItemClick={(item: any) => {
              setSelectedContent(item);
              setContentType('event');
              handleSetView('content_detail');
            }} 
            isAdmin={!!isAdmin} 
            onCreateNew={() => {
              setTargetCreateType('event');
              handleSetView(user ? 'user_dashboard' : 'auth');
            }} 
          />
        );
      case 'oportunidades':
        return (
          <ContentDashboard 
            type="oportunidades" 
            onItemClick={(item: any) => {
              setSelectedContent(item);
              setContentType('opportunity');
              handleSetView('content_detail');
            }} 
            isAdmin={!!isAdmin} 
            onCreateNew={() => {
              setTargetCreateType('opportunity');
              handleSetView(user ? 'user_dashboard' : 'auth');
            }} 
          />
        );
      
      case 'content_detail':
        return selectedContent && contentType ? (
          <ContentDetail 
            content={selectedContent} 
            type={contentType}
            onBack={() => {
              const backViews: Record<string, ViewMode> = {
                'space': 'espacos',
                'event': 'eventos',
                'opportunity': 'oportunidades',
                'project': 'projetos'
              };
              handleSetView(backViews[contentType] || 'map');
            }} 
            isOwnerOrAdmin={isAdmin || (user?.uid === selectedContent.ownerId)}
            onEdit={() => handleSetView('user_dashboard')}
            onDelete={async () => {
              if (window.confirm('Excluir permanentemente?')) {
                await contentService.deleteContent(contentType, selectedContent.id);
                handleSetView('oportunidades');
              }
            }}
            onRegister={() => {
              if (!user) {
                handleSetView('auth');
              } else if (!myAgent) {
                alert('Você precisa criar um perfil de agente antes de se inscrever.');
                handleSetView('edit');
              } else {
                handleSetView('opportunity_registration');
              }
            }}
          />
        ) : null;
      
      case 'opportunity_registration':
        return selectedContent && myAgent ? (
          <OpportunityRegistrationFlow 
            opportunity={selectedContent}
            registration={selectedContent.registration}
            agent={myAgent}
            onBack={() => handleSetView('user_dashboard')}
            onSave={async (data) => {
              await contentService.saveOpportunityRegistration(data, user!.uid);
              handleSetView('user_dashboard');
            }}
          />
        ) : null;

      case 'projetos':
        return (
          <ContentDashboard 
            type="projetos" 
            onItemClick={(item: any) => {
              setSelectedContent(item);
              setContentType('project');
              handleSetView('content_detail');
            }} 
            isAdmin={!!isAdmin} 
            onCreateNew={() => {
              setTargetCreateType('project');
              handleSetView(user ? 'user_dashboard' : 'auth');
            }} 
          />
        );
      case 'agentes':
        return (
          <AgentsDashboard 
            agents={filteredAgents}
            onAgentClick={handleAgentClick}
            onRegister={() => {
              if (user) {
                handleSetView('edit');
              } else {
                setTargetCreateType('agent');
                handleSetView('auth');
              }
            }}
            selectedAgentId={selectedAgent?.id}
          />
        );
      
      case 'reports':
        return <ReportsDashboard onGoToMapping={() => handleSetView('mapping')} onAgentProfileClick={handleAgentClick} />;
      case 'mapping':
        return <GeoMapping onBack={() => handleSetView('reports')} onAgentProfileClick={handleAgentClick} />;
      case 'acessibilidade':
        return (
          <div className="max-w-[1600px] mx-auto px-8 py-12 pt-24">
            <div className="bg-white dark:bg-stone-900 rounded-[3rem] p-16 text-center border border-stone-100 dark:border-stone-800 shadow-xl transition-colors">
              <h2 className="text-4xl font-black text-stone-900 dark:text-white uppercase italic mb-6">Guia de Acessibilidade</h2>
              <p className="text-stone-500 dark:text-stone-400 max-w-2xl mx-auto text-lg leading-relaxed mb-10">
                O Mapa Cultural está comprometido com a inclusão. Esta seção traz ferramentas para facilitar sua navegação e orientações sobre acessibilidade.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
                <div className="p-8 bg-stone-50 dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700">
                  <p className="text-xl font-black text-stone-900 dark:text-white uppercase mb-6 italic">Controles de Visualização</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={decreaseFontSize}
                      className="px-6 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold hover:bg-stone-100 dark:hover:bg-stone-700 transition-all flex items-center gap-2"
                    >
                      <Minus size={16} /> A-
                    </button>
                    <button 
                      onClick={resetFontSize}
                      className="px-6 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold hover:bg-stone-100 dark:hover:bg-stone-700 transition-all"
                    >
                      REDEFINIR
                    </button>
                    <button 
                      onClick={increaseFontSize}
                      className="px-6 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold hover:bg-stone-100 dark:hover:bg-stone-700 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} /> A+
                    </button>
                  </div>
                </div>

                <div className="p-8 bg-stone-50 dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700">
                  <p className="text-xl font-black text-stone-900 dark:text-white uppercase mb-6 italic">Temas e Contraste</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={toggleTheme}
                      className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${
                        theme === 'dark' ? 'bg-stone-700 border-stone-600 text-white' : 'bg-white border-stone-200 text-stone-900'
                      }`}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                      MODO {theme === 'dark' ? 'CLARO' : 'ESCURO'}
                    </button>
                    <button 
                      onClick={toggleHighContrast}
                      className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${
                        highContrast ? 'bg-yellow-400 border-yellow-500 text-black' : 'bg-white border-stone-200 text-stone-900'
                      }`}
                    >
                      <Contrast size={18} />
                      ALTO CONTRASTE
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-black text-stone-900 dark:text-white uppercase italic mb-8">Orientações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {[
                  { title: 'Libras', desc: 'Língua Brasileira de Sinais' },
                  { title: 'Audiodescrição', desc: 'Para pessoas com deficiência visual' },
                  { title: 'Arquitetônica', desc: 'Rampas e banheiros adaptados' }
                ].map(item => (
                  <div key={item.title} className="p-8 bg-stone-50 dark:bg-stone-800 rounded-[2.5rem] border border-stone-100 dark:border-stone-700">
                    <p className="text-xl font-black text-stone-900 dark:text-white uppercase mb-2 italic">{item.title}</p>
                    <p className="text-stone-400 dark:text-stone-500 text-xs font-bold uppercase tracking-tighter leading-loose">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-stone-50 dark:bg-[#0f0f0f]">
            <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] mb-6">
              <Settings size={40} className="animate-spin-slow" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4 dark:text-white">Em Desenvolvimento</h2>
            <p className="text-stone-500 font-medium max-w-md mx-auto">
              Esta seção está sendo preparada para conectar você ainda mais com a cultura de Breves. 
              Em breve, teremos novidades aqui!
            </p>
            <button 
              onClick={() => handleSetView('map')}
              className="mt-8 px-8 py-3 bg-[#141414] dark:bg-stone-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-tighter hover:bg-[#5A5A40] transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0f0f0f] text-[#141414] dark:text-gray-100 transition-colors">
      <Navbar 
        user={user} 
        profile={profile}
        onLogin={() => handleSetView('auth')} 
        onLogout={logout}
        activeView={viewMode}
        setView={handleSetView}
        hasAgent={!!myAgent}
        logoUrl={appConfig?.logoUrl}
        logoScale={appConfig?.siteConfig?.logoScale}
        siteName={appConfig?.siteConfig?.siteName}
        isAdmin={!!isAdmin}
        onToggleAccessibility={() => setShowAccessibility(!showAccessibility)}
        isAccessibilityOpen={showAccessibility}
        onCreateAction={(type) => {
          if (!user) {
            setTargetCreateType(type);
            handleSetView('auth');
          } else {
            if (type === 'agent') {
              handleSetView('edit');
            } else {
              setTargetCreateType(type);
              handleSetView('user_dashboard');
            }
          }
        }}
      />
      {showAccessibility && <AccessibilityToolbar onClose={() => setShowAccessibility(false)} />}
      <main className="pt-20 md:pt-24 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + (selectedAgent?.id || '')}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer config={appConfig?.siteConfig?.footer} logoUrl={appConfig?.logoUrl} setView={handleSetView} />
    </div>
  );
}
