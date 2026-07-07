import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { checkIsAdmin, sanitizeText } from '../lib/auth-utils';
import { agentService } from '../lib/agentService';
import { motion, AnimatePresence } from 'motion/react';
import { generateAgentReport } from '../lib/pdf-utils';
import AgentEditForm from './AgentEditForm';
import ContentEditForm from './ContentEditForm';
import { 
  Award,
  Settings, 
  Users, 
  User,
  Map, 
  Image as ImageIcon, 
  Shield, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  Trash2,
  Edit2,
  FileText,
  Printer,
  Search,
  Filter,
  Clock,
  ChevronLeft,
  Upload,
  X,
  Palette,
  Lightbulb,
  PlusCircle,
  Calendar,
  FilePieChart,
  Download,
  HelpCircle
} from 'lucide-react';
import { HELP_CONTENT, PRIVACY_POLICY, IMAGE_AUTHORIZATION, TERMS_OF_USE } from '../constants/helpContent';
import { AppConfig, CulturalAgent, OpportunityRegistration, CulturalOpportunity, ThemeColors, UserProfile } from '../types';
import { contentService } from '../lib/contentService';
import { compressImageToBase64 } from '../lib/storage-utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RegistrationSummaryPDF } from './RegistrationSummaryPDF';
import { useRef } from 'react';

const formatToBrazilianDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'Não definida';
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(dateStr)) {
    return dateStr;
  }
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}))?/);
      if (match) {
        const [_, year, month, day, hasTime, hour, minute] = match;
        if (hasTime) {
          return `${day}/${month}/${year} às ${hour}:${minute}`;
        }
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    const hasTime = dateStr.includes('T') || (dateStr.includes(' ') && dateStr.match(/\d{2}:\d{2}/));
    
    if (hasTime) {
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hour}:${minute}`;
    }
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const isOpportunityOpen = (item: any): boolean => {
  if (!item) return false;
  const now = new Date();

  // 1. If timeline phases exist, check if an "Inscrição/Inscrições" phase is currently active or end date is in the future
  if (item.timelinePhases && item.timelinePhases.length > 0) {
    const inscriptionPhases = item.timelinePhases.filter((p: any) => 
      p.name && (p.name.toLowerCase().includes('inscri') || p.name.toLowerCase().includes('aberta'))
    );

    if (inscriptionPhases.length > 0) {
      return inscriptionPhases.some((p: any) => {
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.endDate ? new Date(p.endDate) : null;

        const isStartValid = start && !isNaN(start.getTime());
        const isEndValid = end && !isNaN(end.getTime());

        if (isStartValid && isEndValid) {
          return now >= start && now <= end;
        } else if (isStartValid) {
          return now >= start;
        } else if (isEndValid) {
          return now <= end;
        }
        return false;
      });
    }
  }

  // 2. Check the standard startDate and deadline fields
  const start = item.startDate ? new Date(item.startDate) : null;
  const deadline = item.deadline ? new Date(item.deadline) : null;

  const isStartValid = start && !isNaN(start.getTime());
  const isDeadlineValid = deadline && !isNaN(deadline.getTime());

  if (isStartValid && isDeadlineValid) {
    return now >= start && now <= deadline;
  } else if (isStartValid) {
    return now >= start;
  } else if (isDeadlineValid) {
    return now <= deadline;
  }

  // 3. Fallback to status field
  return item.status === 'open';
};

export default function AdminPanel() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [agents, setAgents] = useState<CulturalAgent[]>([]);
  const [registrations, setRegistrations] = useState<OpportunityRegistration[]>([]);
  const [opportunities, setOpportunities] = useState<CulturalOpportunity[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'agents' | 'registrations' | 'opportunities' | 'users' | 'banners' | 'categories' | 'stats' | 'reports' | 'footer' | 'colors' | 'acervo' | 'help'>('config');
  const [helpSubTab, setHelpSubTab] = useState<'faq' | 'terms' | 'privacy' | 'image'>('faq');

  const [editingAgent, setEditingAgent] = useState<CulturalAgent | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<CulturalOpportunity | null>(null);
  const [evaluatingRegistration, setEvaluatingRegistration] = useState<OpportunityRegistration | null>(null);
  const [phasesList, setPhasesList] = useState<any[]>([]);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(0);
  const contentAreaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [activeTab, editingAgent, editingOpportunity, evaluatingRegistration]);

  useEffect(() => {
    if (evaluatingRegistration) {
      const opp = opportunities.find(o => o.id === evaluatingRegistration.opportunityId);
      if (opp && opp.timelinePhases && opp.timelinePhases.length > 0) {
        const opportunityPhases = opp.timelinePhases.map((tp, idx) => {
          const existingPhase = evaluatingRegistration.phases?.find(p => p.name?.toLowerCase() === tp.name?.toLowerCase()) ||
                               evaluatingRegistration.phases?.[idx];
          
          let status: 'completed' | 'active' | 'pending' = 'pending';
          const now = new Date();
          const start = tp.startDate ? new Date(tp.startDate) : null;
          const end = tp.endDate ? new Date(tp.endDate) : null;
          if (start && !isNaN(start.getTime()) && end && !isNaN(end.getTime())) {
            if (now >= start && now <= end) {
              status = 'active';
            } else if (now > end) {
              status = 'completed';
            } else {
              status = 'pending';
            }
          } else if (idx === 0) {
            status = 'completed';
          }

          return {
            id: existingPhase?.id || String(idx + 1),
            name: tp.name || `Fase ${idx + 1}`,
            startDate: tp.startDate || '',
            endDate: tp.endDate || '',
            status: status,
            resultDescription: existingPhase?.resultDescription || (idx === 1 ? 'Em Análise' : ''),
            evaluations: existingPhase?.evaluations || []
          };
        });
        setPhasesList(opportunityPhases);
      } else if (evaluatingRegistration.phases && evaluatingRegistration.phases.length > 0) {
        setPhasesList(evaluatingRegistration.phases);
      } else {
        setPhasesList([
          { 
            id: '1', 
            name: 'Fase de inscrições', 
            startDate: '18/02/2025', 
            endDate: '12/03/2025', 
            status: 'completed' 
          },
          { 
            id: '2', 
            name: 'Etapa de Avaliação de Mérito Cultural', 
            startDate: '25/03/2025', 
            endDate: '10/04/2025', 
            status: 'active',
            resultDescription: 'Em Análise',
            evaluations: []
          },
          { 
            id: '3', 
            name: 'Etapa de Habilitação - Anexos', 
            startDate: '19/12/2025', 
            endDate: '25/12/2025', 
            status: 'pending' 
          },
          { 
            id: '4', 
            name: 'Etapa de Habilitação - Avaliação', 
            startDate: '29/12/2025', 
            endDate: '13/01/2027', 
            status: 'pending' 
          },
          { 
            id: '5', 
            name: 'Publicação final do resultado', 
            startDate: '31/01/2027', 
            endDate: '31/01/2027', 
            status: 'pending' 
          },
        ]);
      }
      setSelectedPhaseIndex(0);
    }
  }, [evaluatingRegistration, opportunities]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // Registration ID
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const exportCSV = () => {
    const headers = ['ID', 'Nome', 'Tipo', 'Email', 'Telefone', 'Cidade'];
    const rows = agents.map(a => [
      a.id,
      a.name,
      a.type,
      a.contactInfo?.email || '',
      a.contactInfo?.phone || '',
      a.address?.text || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "agentes_culturais_breves.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const configDoc = await getDoc(doc(db, 'config', 'app'));
      if (configDoc.exists()) {
        const data = configDoc.data() as AppConfig;
        if (!data.siteConfig) {
          data.siteConfig = {
            siteName: 'Mapa Cultural (Padrão)',
            logoUrl: data.logoUrl || '',
            heroTitle: 'Boas-vindas ao Mapa Cultural',
            heroSubtitle: 'O Mapa Cultural é uma ferramenta de gestão cultural que garante a estruturação de Sistemas de Informações e Indicadores.',
            banners: [
              { id: '1', title: 'Política Nacional Aldir Blanc de Fomento à Cultura', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#0070BA]', textColor: 'text-white' },
              { id: '2', title: 'Cultura & Sustentabilidade', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#EEF4F9]', textColor: 'text-[#0070BA]' },
              { id: '3', title: 'Guia de Acessibilidade', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#141414]', textColor: 'text-white' }
            ],
            footer: {
              vision: 'Fortalecendo a identidade cultural da nossa região através da transparência, conectividade e valorização de nossos talentos locais.',
              instagram: 'https://www.instagram.com/seculteoficial/',
              facebook: 'https://www.facebook.com/seculteoficial/',
              youtube: '',
              address: 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000',
              phone: '',
              addressText: 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000',
              email: 'portalseculte@gmail.com',
              copyrightText: '© 2026 MAPA CULTURAL • DESENVOLVIDO PARA A GESTÃO PÚBLICA'
            }
          };
        }
        
        // Ensure new fields exist
        if (data.siteConfig && (!data.siteConfig.footer.copyrightText || data.siteConfig.footer.copyrightText.includes('2024') || data.siteConfig.footer.copyrightText.includes('BREVES'))) {
          data.siteConfig.footer.copyrightText = '© 2026 MAPA CULTURAL • DESENVOLVIDO PARA A GESTÃO PÚBLICA';
        }
        if (data.siteConfig && (!data.siteConfig.footer.instagram || data.siteConfig.footer.instagram === '')) {
          data.siteConfig.footer.instagram = 'https://www.instagram.com/seculteoficial/';
        }
        if (data.siteConfig && (!data.siteConfig.footer.facebook || data.siteConfig.footer.facebook === '')) {
          data.siteConfig.footer.facebook = 'https://www.facebook.com/seculteoficial/';
        }
        if (data.siteConfig && (data.siteConfig.footer.email === 'contato@mapaculturalbreves.pa.gov.br' || !data.siteConfig.footer.email)) {
          data.siteConfig.footer.email = 'portalseculte@gmail.com';
        }
        if (data.siteConfig && (data.siteConfig.footer.addressText.includes('Secretaria de Cultura, Breves') || !data.siteConfig.footer.addressText)) {
          data.siteConfig.footer.addressText = 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000';
          data.siteConfig.footer.address = 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000';
        }
        if (data.siteConfig && (!data.siteConfig.siteName || data.siteConfig.siteName.includes('Breves') || data.siteConfig.siteName === 'Mapa Cultural')) {
          data.siteConfig.siteName = 'Mapa Cultural (Padrão)';
        }
        if (data.siteConfig && data.siteConfig.logoScale === undefined) {
          data.siteConfig.logoScale = 1;
        }
        if (data.siteConfig && (!data.siteConfig.heroTitle || data.siteConfig.heroTitle.includes('Breves'))) {
          data.siteConfig.heroTitle = 'Boas-vindas ao Mapa Cultural';
        }
        if (data.siteConfig && (!data.siteConfig.heroSubtitle || data.siteConfig.heroSubtitle.includes('Breves'))) {
          data.siteConfig.heroSubtitle = 'O Mapa Cultural é uma ferramenta de gestão cultural que garante a estruturação de Sistemas de Informações e Indicadores.';
        }
        if (!data.siteConfig.themeColors) {
          data.siteConfig.themeColors = {
            primary: '#E30613',
            primaryHover: '#C40510',
            secondary: '#5A5A40',
            accent: '#0070BA',
            bodyBg: '#FDFDFD',
            headerBg: '#FFFFFF',
            footerBg: '#141414',
            textPrimary: '#1C1917',
            textSecondary: '#78716C',
            navItemBg: '#141414',
            navItemActive: '#0070BA',
            oportunidades: '#E30613',
            eventos: '#9B51E0',
            espacos: '#4F9B1B',
            agentes: '#F2994A',
            projetos: '#0070BA',
          };
        }
        if (!data.siteConfig.categoryBanners) {
          data.siteConfig.categoryBanners = [];
        }
        if (!data.siteConfig.featuredTitle) {
          data.siteConfig.featuredTitle = 'Em destaque';
        }
        if (!data.siteConfig.featuredDescription) {
          data.siteConfig.featuredDescription = 'Conteúdo exclusivo da SECRETARIA DE CULTURA, TURISMO E EVENTOS.';
        }
        if (!data.siteConfig.stats) {
          data.siteConfig.stats = {
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
          };
        }

        if (!data.siteConfig.reportsConfig) {
          data.siteConfig.reportsConfig = {
            title: 'Relatórios',
            subtitle: 'Painel de Monitoramento',
            description: 'Acesse painéis de dados para visualizar gráficos e outras informações importantes para consulta e análise estratégica da cultura local.',
            badgeText: 'Painel de Monitoramento',
            exportLabel: 'Exportar Dados',
            filterLabel: 'Filtrar',
            growthTitle: 'Crescimento da Rede',
            growthSubtitle: 'Atividade nos últimos 6 meses',
            profilesTitle: 'Perfis de Agentes',
            profilesSubtitle: 'Distribuição por Categoria',
            volumesTitle: 'Volumes por Seção',
            volumesSubtitle: 'Comparativo de registros na plataforma',
            goalTitle: 'Meta Anual',
            goalSubtitle: '75% Atingido',
            goalStatus: 'Faltam 250 cadastros para atingir a meta de monitoramento de 2026.',
            goalValue: 75,
            mappingTitle: 'Mapeamento Cultural',
            mappingSubtitle: 'Distribuição Geográfica da Cultura em Breves',
            mappingInfoTitle: 'Mapeamento Geográfico',
            mappingInfoText: 'Este mapa exibe a concentração de agentes e espaços culturais em todo o município, permitindo identificar áreas de maior atividade e carências territoriais.',
            footerTitle: 'Precisa de dados específicos?',
            footerSubtitle: 'Nossa equipe pode gerar relatórios personalizados para pesquisadores e gestores culturais.',
            footerButtonLabel: 'Solicitar Relatório Completo'
          };
        }

        if (!data.helpConfig) {
          data.helpConfig = {
            faqCategories: HELP_CONTENT,
            privacyPolicy: PRIVACY_POLICY,
            termsOfUse: TERMS_OF_USE,
            imageAuthorization: IMAGE_AUTHORIZATION
          };
        }

        setConfig(data);
      } else {
        const defaultConfig: AppConfig = {
          logoUrl: 'https://i.postimg.cc/L6F2L3yw/logo-breves.png',
          adminEmails: ['robsonstudio15hd@gmail.com', 'portalseculte@gmail.com'],
          siteConfig: {
            siteName: 'Mapa Cultural (Padrão)',
            logoUrl: 'https://i.postimg.cc/L6F2L3yw/logo-breves.png',
            heroBannerImage: 'https://i.postimg.cc/ZKnRFWzb/Orla-Breves-ok.jpg',
            featuredTitle: 'Em destaque',
            featuredDescription: 'Conteúdo exclusivo da SECRETARIA DE CULTURA, TURISMO E EVENTOS.',
            banners: [
              { id: '1', title: 'Política Nacional Aldir Blanc de Fomento à Cultura', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#0070BA]', textColor: 'text-white' },
              { id: '2', title: 'Cultura & Sustentabilidade', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#EEF4F9]', textColor: 'text-[#0070BA]' },
              { id: '3', title: 'Guia de Acessibilidade', subtitle: 'SAIBA MAIS!', url: '#', image: '', bgColor: 'bg-[#141414]', textColor: 'text-white' }
            ],
            footer: {
              vision: 'Fortalecendo a identidade cultural da nossa região através da transparência, conectividade e valorização de nossos talentos locais.',
              instagram: 'https://www.instagram.com/seculteoficial/',
              facebook: 'https://www.facebook.com/seculteoficial/',
              youtube: '',
              phone: '',
              addressText: 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000',
              address: 'Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000',
              email: 'portalseculte@gmail.com',
              copyrightText: '© 2026 MAPA CULTURAL • DESENVOLVIDO PARA A GESTÃO PÚBLICA'
            },
            themeColors: {
              primary: '#E30613',
              primaryHover: '#C40510',
              secondary: '#5A5A40',
              accent: '#0070BA',
              bodyBg: '#FDFDFD',
              headerBg: '#FFFFFF',
              footerBg: '#141414',
              textPrimary: '#1C1917',
              textSecondary: '#78716C',
              navItemBg: '#141414',
              navItemActive: '#0070BA',
              oportunidades: '#E30613',
              eventos: '#9B51E0',
              espacos: '#4F9B1B',
              agentes: '#F2994A',
              projetos: '#0070BA',
            },
            categoryBanners: [
              { id: 'oportunidades', title: 'Oportunidades', description: 'Editais e Concursos', imageUrl: '', linkUrl: 'oportunidades' },
              { id: 'eventos', title: 'Eventos', description: 'Agenda Cultural', imageUrl: '', linkUrl: 'eventos' },
              { id: 'espacos', title: 'Espaços', description: 'Equipamentos Culturais', imageUrl: '', linkUrl: 'espacos' },
              { id: 'agentes', title: 'Agentes', description: 'Quem faz cultura', imageUrl: '', linkUrl: 'agentes' },
              { id: 'projetos', title: 'Projetos', description: 'Iniciativas Culturais', imageUrl: '', linkUrl: 'projetos' }
            ],
            stats: {
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
            },
            reportsConfig: {
              title: 'Relatórios',
              subtitle: 'Painel de Monitoramento',
              description: 'Acesse painéis de dados para visualizar gráficos e outras informações importantes para consulta e análise estratégica da cultura local.',
              badgeText: 'Painel de Monitoramento',
              exportLabel: 'Exportar Dados',
              filterLabel: 'Filtrar',
              growthTitle: 'Crescimento da Rede',
              growthSubtitle: 'Atividade nos últimos 6 meses',
              profilesTitle: 'Perfis de Agentes',
              profilesSubtitle: 'Distribuição por Categoria',
              volumesTitle: 'Volumes por Seção',
              volumesSubtitle: 'Comparativo de registros na plataforma',
              goalTitle: 'Meta Anual',
              goalSubtitle: '75% Atingido',
              goalStatus: 'Faltam 250 cadastros para atingir a meta de monitoramento de 2026.',
              goalValue: 75,
              mappingTitle: 'Mapeamento Cultural',
              mappingSubtitle: 'Distribuição Geográfica da Cultura em Breves',
              mappingInfoTitle: 'Mapeamento Geográfico',
              mappingInfoText: 'Este mapa exibe a concentração de agentes e espaços culturais em todo o município, permitindo identificar áreas de maior atividade e carências territoriais.',
              footerTitle: 'Precisa de dados específicos?',
              footerSubtitle: 'Nossa equipe pode gerar relatórios personalizados para pesquisadores e gestores culturais.',
              footerButtonLabel: 'Solicitar Relatório Completo'
            }
          },
          helpConfig: {
            faqCategories: HELP_CONTENT,
            privacyPolicy: PRIVACY_POLICY,
            termsOfUse: TERMS_OF_USE,
            imageAuthorization: IMAGE_AUTHORIZATION
          }
        };
        await setDoc(doc(db, 'config', 'app'), defaultConfig);
        setConfig(defaultConfig);
      }

      const agentsSnap = await getDocs(collection(db, 'agents'));
      const agentsList = agentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CulturalAgent));
      setAgents(agentsList);

      const regsList = await contentService.getAllRegistrations();
      setRegistrations(regsList as OpportunityRegistration[]);

      const oppsList = await contentService.getAllContent('opportunity');
      setOpportunities(oppsList as CulturalOpportunity[]);

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersList);

      const [spacesList, eventsList, projectsList] = await Promise.all([
        contentService.getAllContent('space'),
        contentService.getAllContent('event'),
        contentService.getAllContent('project')
      ]);
      setSpaces(spacesList);
      setEvents(eventsList);
      setProjects(projectsList);

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'admin_dashboard_data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (reg: OpportunityRegistration) => {
    setIsGenerating(reg.id);
    
    const cleanup = () => {
      setIsGenerating(null);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    // Give a short delay to ensure React renders the RegistrationSummaryPDF element
    setTimeout(() => {
      window.print();
      // Safe fallback unmount after 2 seconds
      setTimeout(() => {
        setIsGenerating(null);
      }, 2000);
    }, 500);
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    
    try {
      // Basic sanitization for critical fields
      const sanitizedVision = sanitizeText(config.siteConfig?.footer.vision || '');
      const sanitizedDescription = sanitizeText(config.siteConfig?.featuredDescription || '');
      
      const updatePayload = {
        ...config,
        siteConfig: {
          ...config.siteConfig!,
          featuredDescription: sanitizedDescription,
          footer: {
            ...config.siteConfig!.footer,
            vision: sanitizedVision
          }
        },
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'config', 'app'), updatePayload as any);
      setStatus({ type: 'success', message: 'Configurações do sistema atualizadas com sucesso!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Falha ao salvar configurações.' });
      handleFirestoreError(error, OperationType.UPDATE, 'config/app');
    }
  };

  const handleEditAgent = (agent: CulturalAgent) => {
    setEditingAgent(agent);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este agente cultural? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await agentService.deleteAgent(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setStatus({ type: 'success', message: 'Agente cultural removido com sucesso.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Falha ao remover o agente.' });
      handleFirestoreError(error, OperationType.DELETE, `agents/${agentId}`);
    }
  };

  const handleSaveAgent = async (updatedData: Partial<CulturalAgent>) => {
    if (!editingAgent) return;

    try {
      const agentRef = doc(db, 'agents', editingAgent.id);
      
      // Filter out immutable fields to avoid rule violations
      const { id, ownerId, createdAt, updatedAt, ...dataToUpdate } = updatedData as any;
      
      await updateDoc(agentRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      });

      setAgents(prev => prev.map(a => a.id === editingAgent.id ? { ...a, ...updatedData } as CulturalAgent : a));
      setEditingAgent(null);
      setStatus({ type: 'success', message: 'Perfil do agente atualizado com sucesso!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Falha ao atualizar o perfil do agente.' });
      handleFirestoreError(error, OperationType.UPDATE, `agents/${editingAgent.id}`);
    }
  };

  const handleSaveOpportunity = async (data: any, selectedType?: any) => {
    try {
      const finalType = selectedType || 'opportunity';
      if (editingOpportunity?.id) {
        await contentService.saveContent(finalType, { ...data, id: editingOpportunity.id, updatedAt: serverTimestamp() }, editingOpportunity.ownerId || (auth.currentUser?.uid || 'admin'));
      } else {
        await contentService.saveContent(finalType, { 
          ...data, 
          ownerId: auth.currentUser?.uid || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, auth.currentUser?.uid || 'admin');
      }
      const opps = await contentService.getAllContent('opportunity');
      setOpportunities(opps as CulturalOpportunity[]);
      setEditingOpportunity(null);
      setStatus({ type: 'success', message: 'Oportunidade salva com sucesso!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'opportunities');
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!window.confirm('Excluir esta oportunidade permanentemente?')) return;
    try {
      await contentService.deleteContent('opportunity', id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
      setStatus({ type: 'success', message: 'Oportunidade excluída.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `opportunities/${id}`);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário permanentemente? Isso removerá o acesso dele ao sistema.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setStatus({ type: 'success', message: 'Usuário excluído com sucesso.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta inscrição permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDoc(doc(db, 'opportunity_registrations', id));
      setRegistrations(prev => prev.filter(r => r.id !== id));
      setStatus({ type: 'success', message: 'Inscrição excluída com sucesso.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `opportunity_registrations/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-tighter text-stone-400">Carregando Painel Administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
              Acesso Restrito
            </div>
          </div>
          <h1 className="text-5xl font-black text-stone-900 tracking-tighter uppercase italic leading-none">
            Administração do Sistema
          </h1>
          <p className="text-stone-400 font-medium text-sm mt-4">Gestão operacional do Mapa Cultural.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation */}
          <aside className="w-full lg:w-64 space-y-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'config' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Settings size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Configuração</span>
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'agents' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Users size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Gestão de Agentes</span>
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'opportunities' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Lightbulb size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Oportunidades</span>
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'registrations' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <FileText size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Inscrições (Editais)</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <User size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Usuários</span>
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'banners' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <ImageIcon size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Banners Topo</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'categories' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Filter size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Banner Seções (5)</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'stats' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Clock size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Relatórios & Dados</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'reports' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <FilePieChart size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Config. Relatórios</span>
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'colors' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Palette size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Cores do Sistema</span>
            </button>
            <button
              onClick={() => setActiveTab('acervo')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'acervo' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <CheckCircle2 size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Acervo (Oficial)</span>
            </button>
            <button
              onClick={() => setActiveTab('footer')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'footer' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Shield size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Rodapé & Social</span>
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'help' ? 'bg-[#141414] text-white shadow-xl translate-x-1' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <HelpCircle size={20} />
              <span className="text-sm font-black uppercase tracking-wider">Ajuda & Privacidade</span>
            </button>
          </aside>

          {/* Content Area */}
          <main className="flex-1" ref={contentAreaRef}>
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
              >
                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <p className="text-xs font-black uppercase tracking-tighter">{status.message}</p>
              </motion.div>
            )}

            {activeTab === 'registrations' && evaluatingRegistration && (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-10">
                <div className="flex items-center justify-between border-b border-stone-50 pb-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setEvaluatingRegistration(null)} className="p-3 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 transition-all">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h3 className="text-xl font-black text-stone-900 uppercase">Gestor de Fases, Notas e Pareceres</h3>
                      <p className="text-xs text-stone-400 font-medium tracking-widest pl-1 uppercase">Inscrição de Edital: {evaluatingRegistration.registrationNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-[#0070BA]/5 border border-[#0070BA]/10 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">Inscrito sob análise técnica</span>
                    <h4 className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic mt-1">{(evaluatingRegistration.data as any)?.identification?.projectName || 'Sem Título'}</h4>
                    <p className="text-xs text-stone-500 font-bold uppercase mt-1">Proponente: {agents.find(a => a.id === evaluatingRegistration.userId)?.name || 'Agente Coletivo/Individual'}</p>
                  </div>
                  <div className="px-6 py-3 bg-white border border-stone-100 rounded-2xl shadow-sm text-center shrink-0">
                    <span className="block text-[8px] font-black text-stone-400 uppercase tracking-widest">Consolidado Geral</span>
                    <span className="block text-xl font-black text-[#0070BA]">
                      {phasesList.reduce((acc, p) => acc + (p.evaluations?.reduce((sum: number, ev: any) => sum + Number(ev.score || 0), 0) || 0), 0)} / {phasesList.reduce((acc, p) => acc + (p.evaluations?.reduce((sum: number, ev: any) => sum + Number(ev.totalPossible || 0), 0) || 0), 0) || 60} Pontos
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  {/* Left Column: 12 Cols - List of Stages/Phases */}
                  <div className="xl:col-span-12 space-y-6">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <h4 className="text-xs font-black text-stone-500 uppercase tracking-widest">1. Fases e Linha de Tempo do Edital</h4>
                      <button 
                        onClick={() => {
                          const newPhase = {
                            id: String(phasesList.length + 1),
                            name: `Fase ${phasesList.length + 1}`,
                            startDate: new Date().toLocaleDateString('pt-BR'),
                            endDate: new Date().toLocaleDateString('pt-BR'),
                            status: 'pending',
                            resultDescription: '',
                            evaluations: []
                          };
                          setPhasesList([...phasesList, newPhase]);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#141414] hover:bg-stone-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <PlusCircle size={14} /> Adicionar Nova Fase
                      </button>
                    </div>

                    <div className="space-y-4">
                      {phasesList.map((phase, idx) => (
                        <div 
                          key={phase.id || idx} 
                          className={`p-6 rounded-3xl border transition-all ${
                            selectedPhaseIndex === idx 
                              ? 'bg-stone-50/50 border-[#0070BA] shadow-sm' 
                              : 'bg-white border-stone-100 hover:border-stone-300'
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            {/* Drag handle / Indicator */}
                            <div className="md:col-span-1 flex items-center justify-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                            </div>

                            {/* Phase Name Input */}
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Nome da Fase</label>
                              <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-black min-h-[38px] flex items-center">
                                {phase.name || ''}
                              </div>
                            </div>

                            {/* Date Inputs */}
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Data Início</label>
                              <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-xs text-stone-950 font-black text-center min-h-[38px] flex items-center justify-center">
                                {formatToBrazilianDateTime(phase.startDate)}
                              </div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Data Fim</label>
                              <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-xs text-stone-950 font-black text-center min-h-[38px] flex items-center justify-center">
                                {formatToBrazilianDateTime(phase.endDate)}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Status</label>
                              <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-xs text-center min-h-[38px] flex items-center justify-center">
                                {phase.status === 'completed' && <span className="text-red-600 font-black uppercase tracking-wider text-[10px] bg-red-50 px-3 py-1 rounded-full border border-red-100">Realizada</span>}
                                {phase.status === 'active' && <span className="text-emerald-600 font-black uppercase tracking-wider text-[10px] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-pulse">Em Andamento</span>}
                                {phase.status === 'pending' && <span className="text-stone-500 font-black uppercase tracking-wider text-[10px] bg-stone-100 px-3 py-1 rounded-full border border-stone-200">Pendente</span>}
                                {phase.status === 'not_selected' && <span className="text-amber-600 font-black uppercase tracking-wider text-[10px] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">Não Habilitado</span>}
                              </div>
                            </div>

                            {/* Actions / Select for details */}
                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-4 md:pt-0">
                              <button 
                                onClick={() => {
                                  setSelectedPhaseIndex(idx);
                                  setTimeout(() => {
                                    document.getElementById('fase-decisao-painel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                type="button"
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                                  selectedPhaseIndex === idx 
                                    ? 'bg-[#0070BA] text-white border-[#0070BA]' 
                                    : 'bg-white text-[#0070BA] border-[#0070BA]/20 hover:bg-stone-50'
                                }`}
                              >
                                Ver Notas/Parecer
                              </button>
                              <button 
                                onClick={() => {
                                  if (phasesList.length === 1) {
                                    alert("Você deve manter pelo menos uma fase.");
                                    return;
                                  }
                                  const newList = phasesList.filter((_, i) => i !== idx);
                                  setPhasesList(newList);
                                  setSelectedPhaseIndex(0);
                                }}
                                type="button"
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                                title="Excluir Fase"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Inline Description/Result Field */}
                          <div className="mt-4 pt-4 border-t border-stone-100/60 grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-12 space-y-1">
                              <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Resultado / Resumo Executivo da Fase</label>
                              <input 
                                type="text"
                                value={phase.resultDescription || ''}
                                onChange={(e) => {
                                  const newList = [...phasesList];
                                  newList[idx].resultDescription = e.target.value;
                                  setPhasesList(newList);
                                }}
                                className="w-full bg-stone-50 border-stone-200 rounded-xl px-4 py-2 text-xs text-stone-900 font-bold outline-none"
                                placeholder="EX: Proponente classificado para próxima etapa com nota expressiva no mérito cultural."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column / Detail Box: Pareceres e Notas Técnicas da Fase selecionada */}
                  <div id="fase-decisao-painel" className="xl:col-span-12 bg-stone-50/50 rounded-[2rem] p-8 border border-stone-100 space-y-6 scroll-mt-20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-stone-100">
                      <div>
                        <span className="text-[9px] font-black text-[#0070BA] uppercase tracking-widest">Painel de Decisão da Etapa</span>
                        <h4 className="text-sm font-black text-stone-900 uppercase">Pareceres e Notas: <span className="text-[#0070BA]">{phasesList[selectedPhaseIndex]?.name || `Fase ${selectedPhaseIndex + 1}`}</span></h4>
                      </div>
                      <button 
                        onClick={() => {
                          const newList = [...phasesList];
                          if (!newList[selectedPhaseIndex].evaluations) {
                            newList[selectedPhaseIndex].evaluations = [];
                          }
                          const newEvaluation = {
                            reviewerId: auth.currentUser?.uid || 'eval',
                            reviewerName: `Parecerista #${newList[selectedPhaseIndex].evaluations.length + 1}`,
                            score: 0,
                            totalPossible: 100,
                            comments: '',
                            criteriaScores: [
                              { label: 'Qualidade Técnica do Projeto', score: 0, maxScore: 20 },
                              { label: 'Impacto Cultural e Social', score: 0, maxScore: 20 },
                              { label: 'Adequação Orçamentária', score: 0, maxScore: 20 },
                              { label: 'Histórico do Proponente', score: 0, maxScore: 20 },
                              { label: 'Exequibilidade do Cronograma', score: 0, maxScore: 20 }
                            ]
                          };
                          newList[selectedPhaseIndex].evaluations.push(newEvaluation);
                          setPhasesList(newList);
                        }}
                        type="button"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0070BA] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-sm"
                      >
                        <PlusCircle size={14} /> Adicionar Parecer Técnico
                      </button>
                    </div>

                    <div className="space-y-6">
                      {(!phasesList[selectedPhaseIndex]?.evaluations || phasesList[selectedPhaseIndex]?.evaluations.length === 0) ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100 border-dashed">
                          <p className="text-stone-400 text-xs font-black uppercase tracking-widest">Nenhum parecer cadastrado nesta fase.</p>
                        </div>
                      ) : (
                        phasesList[selectedPhaseIndex].evaluations.map((ev: any, evIdx: number) => {
                          const computedSum = ev.criteriaScores?.reduce((acc: number, c: any) => acc + Number(c.score || 0), 0) || 0;
                          const computedMax = ev.criteriaScores?.reduce((acc: number, c: any) => acc + Number(c.maxScore || 10), 0) || 100;
                          
                          return (
                            <div key={evIdx} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                              <div className="flex justify-between items-center pb-4 border-b border-stone-50">
                                <div className="flex-1 max-w-sm space-y-1">
                                  <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1 font-bold">Nome do Parecerista / Avaliador</label>
                                  <input 
                                    type="text"
                                    value={ev.reviewerName || ''}
                                    onChange={(e) => {
                                      const newList = [...phasesList];
                                      newList[selectedPhaseIndex].evaluations[evIdx].reviewerName = e.target.value;
                                      setPhasesList(newList);
                                    }}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-900"
                                    placeholder="Nome ou ID da Comissão"
                                  />
                                </div>
                                <div className="text-right flex items-center gap-4 shrink-0">
                                  <div>
                                    <span className="block text-[8px] font-black text-stone-400 uppercase tracking-widest">Soma de Notas</span>
                                    <span className="block text-md font-black text-[#0070BA]">{computedSum} / {computedMax}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newList = [...phasesList];
                                      newList[selectedPhaseIndex].evaluations = newList[selectedPhaseIndex].evaluations.filter((_: any, i: number) => i !== evIdx);
                                      setPhasesList(newList);
                                    }}
                                    type="button"
                                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all"
                                    title="Remover Parecer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Technical Comments */}
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1 font-bold">Consubstanciação Técnica (Parecer Justificativo escrito)</label>
                                <textarea 
                                  value={ev.comments || ''}
                                  onChange={(e) => {
                                    const newList = [...phasesList];
                                    newList[selectedPhaseIndex].evaluations[evIdx].comments = e.target.value;
                                    setPhasesList(newList);
                                  }}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-xs font-medium text-stone-800 outline-none h-24 resize-none focus:ring-1 focus:ring-accent"
                                  placeholder="Detalhes sobre conformidade, mérito de relevância cultural, etc..."
                                />
                              </div>

                              {/* Manual overrides score */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Nota Oferecida Declarada (Atualizada automatico com critérios)</label>
                                  <input 
                                    type="number"
                                    value={ev.score || 0}
                                    onChange={(e) => {
                                      const newList = [...phasesList];
                                      newList[selectedPhaseIndex].evaluations[evIdx].score = Number(e.target.value);
                                      setPhasesList(newList);
                                    }}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-900"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-stone-400 uppercase tracking-widest pl-1">Total Possível nesta Avaliação</label>
                                  <input 
                                    type="number"
                                    value={ev.totalPossible || 100}
                                    onChange={(e) => {
                                      const newList = [...phasesList];
                                      newList[selectedPhaseIndex].evaluations[evIdx].totalPossible = Number(e.target.value);
                                      setPhasesList(newList);
                                    }}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-[#141414]"
                                  />
                                </div>
                              </div>

                              {/* Criteria subform */}
                              <div className="space-y-2 border-t border-stone-100 pt-4">
                                <div className="flex justify-between items-center">
                                  <h5 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Notas Discriminadas por Critério Técnico</h5>
                                  <button 
                                    onClick={() => {
                                      const newList = [...phasesList];
                                      if (!newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores) {
                                        newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores = [];
                                      }
                                      newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.push({
                                        label: 'Novo Critério de Nota',
                                        score: 0,
                                        maxScore: 10
                                      });
                                      const sum = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.score || 0), 0);
                                      const m = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.maxScore || 10), 0);
                                      newList[selectedPhaseIndex].evaluations[evIdx].score = sum;
                                      newList[selectedPhaseIndex].evaluations[evIdx].totalPossible = m;
                                      setPhasesList(newList);
                                    }}
                                    type="button"
                                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-[#0070BA] rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                                  >
                                    + Adicionar Critério
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {ev.criteriaScores?.map((crit: any, critIdx: number) => (
                                    <div key={critIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                      <div className="md:col-span-6">
                                        <input 
                                          type="text"
                                          value={crit.label || ''}
                                          onChange={(e) => {
                                            const newList = [...phasesList];
                                            newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores[critIdx].label = e.target.value;
                                            setPhasesList(newList);
                                          }}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-bold"
                                          placeholder="EX: Consistência do Plano"
                                        />
                                      </div>
                                      <div className="md:col-span-2">
                                        <input 
                                          type="number"
                                          value={crit.score || 0}
                                          onChange={(e) => {
                                            const newList = [...phasesList];
                                            newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores[critIdx].score = Number(e.target.value);
                                            const sum = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.score || 0), 0);
                                            newList[selectedPhaseIndex].evaluations[evIdx].score = sum;
                                            setPhasesList(newList);
                                          }}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-black text-center"
                                          placeholder="Nota"
                                        />
                                      </div>
                                      <div className="md:col-span-1 text-center text-[10px] font-black text-stone-300">
                                        /
                                      </div>
                                      <div className="md:col-span-2">
                                        <input 
                                          type="number"
                                          value={crit.maxScore || 10}
                                          onChange={(e) => {
                                            const newList = [...phasesList];
                                            newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores[critIdx].maxScore = Number(e.target.value);
                                            const m = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.maxScore || 10), 0);
                                            newList[selectedPhaseIndex].evaluations[evIdx].totalPossible = m;
                                            setPhasesList(newList);
                                          }}
                                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-400 font-bold text-center"
                                          placeholder="Máx"
                                        />
                                      </div>
                                      <div className="md:col-span-1 text-right">
                                        <button 
                                          onClick={() => {
                                            const newList = [...phasesList];
                                            newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.filter((_: any, i: number) => i !== critIdx);
                                            const sum = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.score || 0), 0);
                                            const m = newList[selectedPhaseIndex].evaluations[evIdx].criteriaScores.reduce((acc: number, c: any) => acc + Number(c.maxScore || 10), 0);
                                            newList[selectedPhaseIndex].evaluations[evIdx].score = sum;
                                            newList[selectedPhaseIndex].evaluations[evIdx].totalPossible = m;
                                            setPhasesList(newList);
                                          }}
                                          type="button"
                                          className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                          title="Deletar Critério"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Save all button and action strip */}
                <div className="pt-8 border-t border-stone-50 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest pl-1 font-bold">Após preencher as etapas e notas</span>
                    <p className="text-stone-500 text-xs font-medium">Lembre-se de salvar para consolidar todas as fases e pareceres e disponibilizá-los nas consultas de acompanhamento.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        let consolidatedScore = 0;
                        let maxPossibleScore = 0;
                        let scoreCount = 0;

                        phasesList.forEach(phase => {
                          if (phase.evaluations && phase.evaluations.length > 0) {
                            phase.evaluations.forEach((ev: any) => {
                              consolidatedScore += Number(ev.score || 0);
                              maxPossibleScore += Number(ev.totalPossible || 0);
                              scoreCount++;
                            });
                          }
                        });

                        const payload = {
                          phases: phasesList,
                          status: 'under_review',
                          consolidatedScore: scoreCount > 0 ? Math.round(consolidatedScore / scoreCount) : 0,
                          maxPossibleScore: scoreCount > 0 ? Math.round(maxPossibleScore / scoreCount) : 100,
                          updatedAt: serverTimestamp()
                        };

                        await updateDoc(doc(db, 'opportunity_registrations', evaluatingRegistration.id), payload);

                        setStatus({ type: 'success', message: 'Fases, pareceres, critérios e resultados salvos com total sucesso!' });
                        setEvaluatingRegistration(null);
                        fetchData();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `registrations/${evaluatingRegistration.id}`);
                      }
                    }}
                    type="button"
                    className="w-full md:w-auto px-10 py-5 bg-[#0070BA] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005FA3] transition-all shadow-xl active:scale-95 flex items-center gap-2"
                  >
                    <Save size={16} /> Salvar e Publicar Todos os Resultados
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'config' && (
              <form onSubmit={saveConfig} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-10">
                <div className="flex items-center gap-4 border-b border-stone-50 pb-8">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Settings className="text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 uppercase">Identidade Visual & Título</h3>
                    <p className="text-xs text-stone-400 font-medium">Controle a marca do sistema em tempo real.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome do Sistema (Título)</label>
                    <input
                      type="text"
                      value={config?.siteConfig?.siteName || ''}
                      onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, siteName: e.target.value } }) : null)}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none focus:ring-2 focus:ring-stone-100"
                      placeholder="Ex: Mapa Cultural"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">URL ou Upload do Logotipo</label>
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <input
                          type="url"
                          value={config?.siteConfig?.logoUrl || config?.logoUrl || ''}
                          onChange={e => setConfig(prev => prev ? ({ 
                            ...prev, 
                            logoUrl: e.target.value,
                            siteConfig: { ...prev.siteConfig!, logoUrl: e.target.value } 
                          }) : null)}
                          className="flex-1 bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none focus:ring-2 focus:ring-stone-100"
                          placeholder="https://..."
                        />
                        <label className="cursor-pointer bg-[#0070BA] hover:bg-[#005a96] text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 whitespace-nowrap">
                          <Upload size={16} />
                          Upload
                           <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64String = await compressImageToBase64(file);
                                  setConfig(prev => prev ? ({ 
                                    ...prev, 
                                    logoUrl: base64String,
                                    siteConfig: { ...prev.siteConfig!, logoUrl: base64String } 
                                  }) : null);
                                } catch (err) {
                                  console.error("Erro ao comprimir imagem:", err);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                      {(config?.siteConfig?.logoUrl || config?.logoUrl) && (
                        <div className="p-5 bg-stone-50 rounded-3xl border border-stone-100 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-24 bg-white rounded-xl p-2 border border-stone-100 flex items-center justify-center overflow-hidden">
                              <img 
                                src={config?.siteConfig?.logoUrl || config?.logoUrl} 
                                alt="Logotipo Atual" 
                                className="object-contain max-h-full max-w-full origin-center transition-transform duration-100"
                                style={{ 
                                  transform: `scale(${config?.siteConfig?.logoScale || 1})`
                                }}
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Pré-visualização</p>
                              <p className="text-xs text-stone-600 truncate max-w-[150px] font-mono">{config?.siteConfig?.logoUrl || config?.logoUrl}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setConfig(prev => prev ? ({ ...prev, logoUrl: '', siteConfig: { ...prev.siteConfig!, logoUrl: '' } }) : null)}
                              className="p-2.5 bg-stone-100 hover:bg-red-50 hover:text-red-500 text-stone-400 rounded-xl transition-all"
                              title="Remover Logotipo"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="border-t border-stone-150 pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-[#5A5A40] uppercase tracking-tighter">Controle de Tamanho da Logo (Escala)</span>
                              <span className="text-xs font-black text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-100">
                                {Math.round((config?.siteConfig?.logoScale || 1) * 100)}%
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setConfig(prev => {
                                  if (!prev) return null;
                                  const currentScale = prev.siteConfig?.logoScale || 1;
                                  return { ...prev, siteConfig: { ...prev.siteConfig!, logoScale: Math.max(0.3, currentScale - 0.05) } };
                                })}
                                className="w-9 h-9 bg-white border border-stone-100 hover:bg-[#0070BA] hover:text-white rounded-xl flex items-center justify-center font-bold text-stone-600 transition-all shadow-xs"
                                title="Diminuir"
                              >
                                -
                              </button>
                              
                              <input 
                                type="range" 
                                min="0.3" 
                                max="2.0" 
                                step="0.05"
                                value={config?.siteConfig?.logoScale || 1}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, logoScale: val } }) : null);
                                }}
                                className="flex-1 accent-[#0070BA] h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                              />

                              <button
                                type="button"
                                onClick={() => setConfig(prev => {
                                  if (!prev) return null;
                                  const currentScale = prev.siteConfig?.logoScale || 1;
                                  return { ...prev, siteConfig: { ...prev.siteConfig!, logoScale: Math.min(2.0, currentScale + 0.05) } };
                                })}
                                className="w-9 h-9 bg-white border border-stone-100 hover:bg-[#0070BA] hover:text-white rounded-xl flex items-center justify-center font-bold text-stone-600 transition-all shadow-xs"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4 border-t border-stone-50 pt-8">
                    <h3 className="text-sm font-black text-stone-900 uppercase">Boas-vindas (Hero)</h3>
                    <p className="text-[10px] text-stone-400 font-black uppercase tracking-tight">Personalize a mensagem principal da página inicial.</p>
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Título de Boas-vindas</label>
                        <input
                          type="text"
                          value={config?.siteConfig?.heroTitle || ''}
                          onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, heroTitle: e.target.value } }) : null)}
                          className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          placeholder="Ex: Boas-vindas ao Mapa Cultural"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Subtítulo de Boas-vindas</label>
                        <textarea
                          value={config?.siteConfig?.heroSubtitle || ''}
                          onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, heroSubtitle: e.target.value } }) : null)}
                          rows={3}
                          className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-xs font-medium outline-none resize-none"
                          placeholder="Ex: O Mapa Cultural é..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4 border-t border-stone-50 pt-8">
                    <h3 className="text-sm font-black text-stone-900 uppercase">Seção "Em Destaque"</h3>
                    <p className="text-[10px] text-stone-400 font-black uppercase tracking-tight">Personalize o título e a descrição da seção de conteúdos oficiais.</p>
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Título da Seção</label>
                        <input
                          type="text"
                          value={config?.siteConfig?.featuredTitle || ''}
                          onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, featuredTitle: e.target.value } }) : null)}
                          className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          placeholder="Ex: Em destaque"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Descrição / Subtítulo</label>
                        <input
                          type="text"
                          value={config?.siteConfig?.featuredDescription || ''}
                          onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, featuredDescription: e.target.value } }) : null)}
                          className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          placeholder="Ex: Conteúdo exclusivo da SECRETARIA DE CULTURA..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4 border-t border-stone-50 pt-8">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Emails Administrativos (Um por linha)</label>
                    <textarea
                      value={config?.adminEmails?.join('\n') || ''}
                      onChange={e => setConfig(prev => prev ? ({ ...prev, adminEmails: e.target.value.split('\n').filter(em => em.trim()) }) : null)}
                      rows={5}
                      className="w-full bg-stone-100 border-none rounded-[1.5rem] px-6 py-4 text-stone-900 text-sm font-medium outline-none resize-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="px-12 py-5 bg-[#141414] text-white rounded-2xl font-black text-[13px] tracking-[0.2em] uppercase hover:bg-[#5A5A40] transition-all flex items-center gap-3 shadow-2xl"
                  >
                    <Save size={18} />
                    Aplicar Alterações
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'agents' && (
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {editingAgent ? (
                    <motion.div
                      key="edit-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-stone-100 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 px-4">
                          <Edit2 className="text-[#5A5A40]" size={20} />
                          <div>
                            <h3 className="text-sm font-black text-stone-900 uppercase">Modo de Edição Administrativa</h3>
                            <p className="text-[10px] text-stone-400 font-black uppercase tracking-tight">Alterando perfil de: {editingAgent.name}</p>
                          </div>
                        </div>
                      </div>
                      <AgentEditForm 
                        initialData={editingAgent}
                        onSave={handleSaveAgent}
                        onCancel={() => setEditingAgent(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="agents-list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 flex items-center justify-between">
                         <div>
                            <h3 className="text-xl font-black text-stone-900 uppercase">Base de Agentes Culturais</h3>
                            <p className="text-xs text-stone-400 font-medium">Total de {agents.length} registros ativos no sistema.</p>
                         </div>
                         <button 
                           onClick={exportCSV}
                           className="px-6 py-3 bg-stone-50 text-stone-900 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:bg-stone-100 transition-colors"
                         >
                           Relatório Geral (CSV)
                         </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {agents.map(agent => (
                          <motion.div 
                            key={agent.id}
                            className="bg-white rounded-2xl p-4 border border-stone-100 hover:border-stone-300 transition-all group flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-200">
                                 {agent.images?.profile && <img src={agent.images.profile} className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-stone-900 uppercase truncate max-w-[200px]">{agent.name}</h4>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-tight">{agent.type}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <div className="px-3 py-1 bg-stone-50 rounded-lg text-[9px] font-black text-stone-400 uppercase mr-1">ID: {agent.id.slice(-6).toUpperCase()}</div>
                               <button 
                                 onClick={() => generateAgentReport(agent, true)}
                                 className="flex items-center gap-2 p-2 px-3 text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white rounded-lg transition-all text-[9.5px] font-black uppercase tracking-tighter border border-[#5A5A40]"
                                 title="Imprimir Dossiê Administrativo"
                               >
                                  <FileText size={14} />
                                  <span className="hidden sm:inline">Dossiê A4</span>
                               </button>
                               <button 
                                 onClick={() => handleEditAgent(agent)}
                                 className="p-2 text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"
                                 title="Editar Agente"
                               >
                                  <Edit2 size={16} />
                                </button>
                               <button 
                                 onClick={() => handleDeleteAgent(agent.id)}
                                 className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                 title="Excluir Agente"
                               >
                                  <Trash2 size={16} />
                                </button>
                               <button 
                                 onClick={() => window.open(`/perfil/${agent.id}`, '_blank')}
                                 className="p-2 text-stone-300 hover:text-[#0070BA] hover:bg-[#0070BA]/5 rounded-lg transition-all"
                                 title="Ver Perfil Público"
                               >
                                  <ExternalLink size={16} />
                               </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="space-y-8">
                <AnimatePresence mode="wait">
                  {editingOpportunity ? (
                    <motion.div
                      key="edit-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-stone-100 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 px-4">
                          <Edit2 className="text-[#0070BA]" size={20} />
                          <div>
                            <h3 className="text-sm font-black text-stone-900 uppercase">Modo de Edição Administrativa</h3>
                            <p className="text-[10px] text-stone-400 font-black uppercase tracking-tight">Oportunidade: {editingOpportunity.name || 'Nova Oportunidade'}</p>
                          </div>
                        </div>
                      </div>
                      <ContentEditForm 
                        type="opportunity"
                        initialData={editingOpportunity}
                        onSave={handleSaveOpportunity}
                        onCancel={() => setEditingOpportunity(null)}
                        isAdmin={true}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-8"
                    >
                      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm">
                        <div>
                          <h3 className="text-xl font-black text-stone-900 uppercase">Gestão de Oportunidades</h3>
                          <p className="text-xs text-stone-400 font-medium tracking-tighter uppercase mt-1">Crie e gerencie editais, cursos e chamadas culturais.</p>
                        </div>
                        <button 
                          onClick={() => setEditingOpportunity({ type: 'opportunity' } as any)}
                          className="px-6 py-3 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#5A5A40] transition-all shadow-lg"
                        >
                          <PlusCircle size={18} /> Criar Nova Oportunidade
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {opportunities.map(opp => (
                          <div key={opp.id} className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm hover:border-[#0070BA] transition-all group">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase mb-2 ${
                                  isOpportunityOpen(opp) ? 'bg-green-100 text-green-600' : 
                                  opp.status === 'closed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {isOpportunityOpen(opp) ? 'Inscrições Abertas' : 
                                  opp.status === 'closed' ? 'Encerradas' : 'Em breve'}
                                </div>
                                <h4 className="text-lg font-black text-stone-900 uppercase leading-tight truncate">{opp.name}</h4>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => setEditingOpportunity(opp)} className="p-3 bg-stone-50 text-stone-400 hover:text-[#0070BA] hover:bg-[#0070BA]/5 rounded-xl transition-all">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDeleteOpportunity(opp.id)} className="p-3 bg-stone-50 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black text-stone-400 uppercase">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} /> {opp.deadline ? new Date(opp.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users size={14} /> {registrations.filter(r => r.opportunityId === opp.id).length} Inscritos
                              </div>
                            </div>
                          </div>
                        ))}
                        {opportunities.length === 0 && (
                          <div className="md:col-span-2 py-20 text-center bg-white rounded-[2rem] border border-stone-100 border-dashed">
                             <Lightbulb size={40} className="mx-auto text-stone-200 mb-4" />
                             <p className="text-stone-400 text-xs font-black uppercase tracking-widest">Nenhuma oportunidade cadastrada.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase italic">Base de Usuários</h3>
                    <p className="text-xs text-stone-400 font-medium tracking-tighter uppercase mt-1">Visualize todos os perfis cadastrados no sistema.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-stone-900 leading-none">{users.length}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase">Total de Perfis</p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-100">
                            <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Nome / ID</th>
                            <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Email Privado</th>
                            <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">WhatsApp</th>
                            <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Cidade</th>
                            <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {users.map(u => (
                            <tr key={u.uid} className="hover:bg-stone-50/50 transition-colors group">
                               <td className="px-8 py-6">
                                  <div className="font-black text-stone-900 uppercase text-xs">{u.fullName || 'Sem Nome'}</div>
                                  <div className="text-[10px] font-medium text-stone-400 mt-0.5">UID: {u.uid.slice(0, 12)}...</div>
                               </td>
                               <td className="px-8 py-6 text-xs font-bold text-stone-600">{u.privateEmail || '-'}</td>
                               <td className="px-8 py-6 text-xs font-bold text-stone-600">{u.privatePhone || '-'}</td>
                               <td className="px-8 py-6">
                                  <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[9px] font-black uppercase tracking-tighter">BREVES/PA</span>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                      // Quick view of user details or something
                                      alert(`Detalhes do Usuário:\n\nNome: ${u.fullName}\nCPF: ${u.cpf}\nRG/CNPJ: ${u.rgOrCnpj}\n\nEmail: ${u.privateEmail}\nTel: ${u.privatePhone}`);
                                    }} className="p-2 text-stone-400 hover:text-[#0070BA] transition-all">
                                      <Search size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-stone-400 hover:text-red-500 transition-all">
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'registrations' && (
              <div className="space-y-6">
                 <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black text-stone-900 uppercase">Gestão de Inscrições</h3>
                        <p className="text-xs text-stone-400 font-medium">Controle e download de inscrições em editais.</p>
                    </div>
                    <div className="flex bg-stone-50 rounded-2xl px-4 py-2 items-center gap-3 border border-stone-100 flex-1 max-w-md">
                       <Search size={18} className="text-stone-300" />
                       <input 
                         type="text" 
                         placeholder="Buscar por Nº, Projeto ou Proponente..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="bg-transparent border-none outline-none text-sm font-bold text-stone-900 flex-1"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {registrations
                      .filter(reg => {
                        const search = searchTerm.toLowerCase();
                        const project = (reg.data as any)?.identification?.projectName?.toLowerCase() || '';
                        const agent = agents.find(a => a.id === reg.userId)?.name?.toLowerCase() || '';
                        return reg.registrationNumber.toLowerCase().includes(search) || project.includes(search) || agent.includes(search);
                      })
                      .map(reg => {
                        const opportunity = opportunities.find(o => o.id === reg.opportunityId);
                        const agent = agents.find(a => a.id === reg.userId);
                        
                        return (
                          <motion.div 
                            key={reg.id}
                            className="bg-white rounded-2xl p-6 border border-stone-100 hover:border-stone-300 transition-all flex flex-col md:flex-row justify-between gap-6"
                          >
                            <div className="flex-1 space-y-4">
                               <div className="flex items-center gap-3">
                                  <span className="px-3 py-1 bg-red-50 text-red-600 font-mono text-xs font-black rounded-lg"># {reg.registrationNumber}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                                    reg.status === 'submitted' ? 'bg-blue-50 text-blue-600' : 
                                    reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'
                                  }`}>
                                    Status: {reg.status === 'submitted' ? 'Recebido' : reg.status === 'approved' ? 'Aprovado' : reg.status}
                                  </span>
                               </div>
                               <div>
                                 <h4 className="text-lg font-black text-stone-900 uppercase tracking-tighter italic">
                                   {(reg.data as any)?.identification?.projectName || 'Inscrição sem nome'}
                                 </h4>
                                 <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                                       <Users size={14} /> {agent?.name || 'Agente não encontrado'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                                       <Map size={14} /> {opportunity?.name || 'Edital não encontrado'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                                       <Clock size={14} /> {new Date(reg.updatedAt?.seconds * 1000).toLocaleString('pt-BR')}
                                    </div>
                                 </div>
                               </div>
                            </div>

                            <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => {
                                   generatePDF(reg);
                                 }}
                                 disabled={isGenerating === reg.id}
                                 className={`flex items-center gap-2 px-6 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-stone-800 transition-all shadow-xl disabled:opacity-50`}
                               >
                                 <Printer size={18} className={isGenerating === reg.id ? 'animate-bounce' : ''} />
                                 <span>{isGenerating === reg.id ? 'Gerando...' : 'Imprimir'}</span>
                               </button>

                               {/* Hidden PDF component for generation */}
                               {isGenerating === reg.id && (
                                 <RegistrationSummaryPDF 
                                   ref={pdfRef}
                                   registration={reg}
                                   opportunity={opportunity!}
                                   agent={agent!}
                                 />
                               )}
                                <button 
                                 onClick={() => setEvaluatingRegistration(reg)}
                                 className="p-4 bg-stone-50 text-stone-600 rounded-2xl hover:bg-stone-900 hover:text-white transition-all border border-stone-100"
                                 title="Avaliar Inscrição"
                               >
                                  <Clock size={20} />
                               </button>
                               <button 
                                 onClick={() => {
                                   if (window.confirm('Deseja aprovar esta inscrição?')) {
                                     updateDoc(doc(db, 'opportunity_registrations', reg.id), { status: 'approved', updatedAt: serverTimestamp() });
                                     setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'approved' as any } : r));
                                   }
                                 }}
                                 className="p-4 bg-stone-50 text-stone-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
                                 title="Aprovar Inscrição"
                               >
                                  <CheckCircle2 size={20} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteRegistration(reg.id)}
                                 className="p-4 bg-stone-50 text-stone-400 hover:text-red-500 rounded-2xl transition-all border border-stone-100"
                                 title="Excluir Inscrição"
                               >
                                  <Trash2 size={20} />
                               </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    
                    {registrations.length === 0 && (
                      <div className="bg-white rounded-3xl border-2 border-dashed border-stone-100 py-32 text-center">
                         <p className="text-stone-300 font-black uppercase tracking-widest">Nenhuma inscrição processada pelo sistema ainda.</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'banners' && (() => {
              const heroZoom = config?.siteConfig?.heroZoom !== undefined ? config.siteConfig.heroZoom : 100;
              const heroPositionX = config?.siteConfig?.heroPositionX !== undefined ? config.siteConfig.heroPositionX : 50;
              const heroPositionY = config?.siteConfig?.heroPositionY !== undefined ? config.siteConfig.heroPositionY : 50;

              return (
                <form onSubmit={saveConfig} className="space-y-8">
                  <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 mb-8">
                     <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Banner Principal (Fundo do Topo)</h3>
                     <p className="text-xs text-stone-400 font-medium mb-8">A imagem que aparece atrás das boas-vindas. Ajuste a posição e o zoom em tempo real.</p>
                     
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400">URL da Imagem de Fundo / Upload</label>
                            <div className="flex gap-4">
                              <input 
                                placeholder="URL da imagem (ex: Unsplash)"
                                value={config?.siteConfig?.heroBannerImage || ''}
                                onChange={e => {
                                  setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroBannerImage: e.target.value } });
                                }}
                                className="flex-1 bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border border-stone-100"
                              />
                              <div className="relative">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await compressImageToBase64(file);
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroBannerImage: base64 } });
                                      } catch (err) {
                                        console.error("Erro ao comprimir imagem:", err);
                                      }
                                    }
                                  }}
                                />
                                <button type="button" className="h-full px-6 bg-[#5A5A40] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                  <Upload size={14} /> Upload
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Real-time Visualization & Adjustment Box */}
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-stone-100 pt-8">
                          {/* Left: Interactive Preview */}
                          <div className="lg:col-span-7 space-y-3">
                            <span className="text-[10px] font-black uppercase text-stone-400 block">Visualização em Tempo Real (Banner)</span>
                            <div className="relative h-[240px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-900 flex flex-col justify-end p-6">
                              {/* Simulated Background */}
                              <div 
                                className="absolute inset-0 z-0 transition-all duration-200"
                                style={{
                                  backgroundImage: `url("${config?.siteConfig?.heroBannerImage || 'https://i.postimg.cc/ZKnRFWzb/Orla-Breves-ok.jpg'}")`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: `${heroPositionX}% ${heroPositionY}%`,
                                  backgroundRepeat: 'no-repeat',
                                  transform: `scale(${heroZoom / 100})`,
                                  transformOrigin: 'center center'
                                }}
                              />
                              {/* Ambient Overlay to simulate the production CSS */}
                              <div className="absolute inset-0 bg-black/40 z-5" />
                              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-stone-950/20 to-transparent z-5" />

                              {/* Simulated Welcome Text Overlay */}
                              <div className="relative z-10 text-white text-left max-w-xs drop-shadow-lg">
                                <h4 className="text-lg font-black leading-tight uppercase tracking-tight mb-1">
                                  {config?.siteConfig?.heroTitle || 'Boas-vindas ao Mapa Cultural'}
                                </h4>
                                <p className="text-[10px] opacity-90 font-medium line-clamp-2">
                                  {config?.siteConfig?.heroSubtitle || 'O Mapa Cultural é uma ferramenta de gestão cultural...'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right: Controls Panel */}
                          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase text-stone-400 block mb-2">Painel de Ajustes</span>
                              
                              {/* Zoom Control */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs text-stone-600">
                                  <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Zoom da Imagem</span>
                                  <span className="font-mono font-black text-[#0070BA]">{heroZoom}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.max(50, heroZoom - 10);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroZoom: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="range"
                                    min="50"
                                    max="300"
                                    value={heroZoom}
                                    onChange={e => {
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroZoom: parseInt(e.target.value) } });
                                    }}
                                    className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.min(300, heroZoom + 10);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroZoom: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* X Position (Lados) */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs text-stone-600">
                                  <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Posicionamento Lateral (X)</span>
                                  <span className="font-mono font-black text-[#0070BA]">{heroPositionX}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.max(0, heroPositionX - 5);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionX: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    ◀
                                  </button>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={heroPositionX}
                                    onChange={e => {
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionX: parseInt(e.target.value) } });
                                    }}
                                    className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.min(100, heroPositionX + 5);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionX: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    ▶
                                  </button>
                                </div>
                              </div>

                              {/* Y Position (Pra cima / Pra baixo) */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs text-stone-600">
                                  <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Posicionamento Vertical (Y)</span>
                                  <span className="font-mono font-black text-[#0070BA]">{heroPositionY}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.max(0, heroPositionY - 5);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionY: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    ▲
                                  </button>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={heroPositionY}
                                    onChange={e => {
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionY: parseInt(e.target.value) } });
                                    }}
                                    className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newVal = Math.min(100, heroPositionY + 5);
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, heroPositionY: newVal } });
                                    }}
                                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Reset controls button */}
                            <div className="pt-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  setConfig({ 
                                    ...config!, 
                                    siteConfig: { 
                                      ...config!.siteConfig!, 
                                      heroZoom: 100, 
                                      heroPositionX: 50, 
                                      heroPositionY: 50 
                                    } 
                                  });
                                }}
                                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Restaurar Padrão
                              </button>
                            </div>
                          </div>
                        </div>
                     </div>
                  </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 mb-8">
                   <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Pequenos Banners (Cards da Direita)</h3>
                   <p className="text-xs text-stone-400 font-medium mb-8">Edite os cards que aparecem na lateral do topo.</p>
                   
                   <div className="grid grid-cols-1 gap-8">
                     {config?.siteConfig?.banners.map((banner, index) => (
                       <div key={banner.id} className="p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-4">
                         <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                            <span className="text-[10px] font-black uppercase text-stone-400">Banner #{index + 1}</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input 
                             placeholder="Título"
                             value={banner.title}
                             onChange={e => {
                               const newBanners = [...config!.siteConfig!.banners];
                               newBanners[index].title = e.target.value;
                               setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                             }}
                             className="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none"
                           />
                           <input 
                             placeholder="Subtítulo"
                             value={banner.subtitle}
                             onChange={e => {
                               const newBanners = [...config!.siteConfig!.banners];
                               newBanners[index].subtitle = e.target.value;
                               setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                             }}
                             className="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none"
                           />
                           <input 
                             placeholder="Link (URL)"
                             value={banner.url}
                             onChange={e => {
                               const newBanners = [...config!.siteConfig!.banners];
                               newBanners[index].url = e.target.value;
                               setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                             }}
                             className="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none"
                           />
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400">URL da Imagem / Upload</label>
                              <div className="flex gap-4">
                                <input 
                                  placeholder="Cole a URL ou faça upload"
                                  value={banner.image}
                                  onChange={e => {
                                    const newBanners = [...config!.siteConfig!.banners];
                                    newBanners[index].image = e.target.value;
                                    setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                  }}
                                  className="flex-1 bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border border-stone-100"
                                />
                                <div className="relative">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const base64 = await compressImageToBase64(file);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].image = base64;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        } catch (err) {
                                          console.error("Erro ao comprimir imagem:", err);
                                        }
                                      }
                                    }}
                                  />
                                  <button type="button" className="h-full px-6 bg-[#5A5A40] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                    <Upload size={14} /> Upload
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Real-time Visualization & Adjustment Box for Small Banner */}
                          {banner.image && (
                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-stone-200/60 pt-6">
                              {/* Left: Interactive Preview */}
                              <div className="lg:col-span-7 space-y-3">
                                <span className="text-[10px] font-black uppercase text-stone-400 block">Visualização em Tempo Real (Banner)</span>
                                <div className="relative h-[120px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-950 flex items-center justify-center p-4">
                                  {/* Simulated Background */}
                                  <div 
                                    className="absolute inset-0 z-0 transition-all duration-200"
                                    style={{
                                      backgroundImage: `url("${banner.image}")`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: `${banner.positionX !== undefined ? banner.positionX : 50}% ${banner.positionY !== undefined ? banner.positionY : 50}%`,
                                      backgroundRepeat: 'no-repeat',
                                      transform: `scale(${(banner.zoom !== undefined ? banner.zoom : 100) / 100})`,
                                      transformOrigin: 'center center'
                                    }}
                                  />
                                  {/* Ambient Overlay to simulate the production CSS */}
                                  <div className="absolute inset-0 bg-black/20 z-5" />

                                  {/* Simulated Overlay with Title and Subtitle */}
                                  <div className="relative z-10 text-center text-white space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest drop-shadow-md text-amber-300">
                                      {banner.subtitle || "Subtítulo"}
                                    </h4>
                                    <h3 className="text-sm font-black drop-shadow-2xl tracking-tighter uppercase italic max-w-md text-center">
                                      {banner.title || "Título do Banner"}
                                    </h3>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Controls Panel */}
                              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                                <div className="space-y-4">
                                  <span className="text-[10px] font-black uppercase text-stone-400 block">Controle da Imagem (Ajuste)</span>
                                  
                                  {/* Zoom Control */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs text-stone-600">
                                      <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Zoom</span>
                                      <span className="font-mono font-black text-[#0070BA]">{banner.zoom !== undefined ? banner.zoom : 100}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentZoom = banner.zoom !== undefined ? banner.zoom : 100;
                                          const newVal = Math.max(50, currentZoom - 10);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].zoom = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input 
                                        type="range"
                                        min="50"
                                        max="300"
                                        value={banner.zoom !== undefined ? banner.zoom : 100}
                                        onChange={e => {
                                          const newVal = parseInt(e.target.value);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].zoom = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentZoom = banner.zoom !== undefined ? banner.zoom : 100;
                                          const newVal = Math.min(300, currentZoom + 10);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].zoom = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* X Position (Lados) */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs text-stone-600">
                                      <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Mover pros Lados (Horizontal X)</span>
                                      <span className="font-mono font-black text-[#0070BA]">{banner.positionX !== undefined ? banner.positionX : 50}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentX = banner.positionX !== undefined ? banner.positionX : 50;
                                          const newVal = Math.max(0, currentX - 5);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionX = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                      >
                                        ◀
                                      </button>
                                      <input 
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={banner.positionX !== undefined ? banner.positionX : 50}
                                        onChange={e => {
                                          const newVal = parseInt(e.target.value);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionX = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentX = banner.positionX !== undefined ? banner.positionX : 50;
                                          const newVal = Math.min(100, currentX + 5);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionX = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                      >
                                        ▶
                                      </button>
                                    </div>
                                  </div>

                                  {/* Y Position (Pra cima / Pra baixo) */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs text-stone-600">
                                      <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Mover pra Cima/Baixo (Vertical Y)</span>
                                      <span className="font-mono font-black text-[#0070BA]">{banner.positionY !== undefined ? banner.positionY : 50}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentY = banner.positionY !== undefined ? banner.positionY : 50;
                                          const newVal = Math.max(0, currentY - 5);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionY = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                      >
                                        ▲
                                      </button>
                                      <input 
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={banner.positionY !== undefined ? banner.positionY : 50}
                                        onChange={e => {
                                          const newVal = parseInt(e.target.value);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionY = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const currentY = banner.positionY !== undefined ? banner.positionY : 50;
                                          const newVal = Math.min(100, currentY + 5);
                                          const newBanners = [...config!.siteConfig!.banners];
                                          newBanners[index].positionY = newVal;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                      >
                                        ▼
                                      </button>
                                    </div>
                                  </div>

                                  {/* Reset Button */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newBanners = [...config!.siteConfig!.banners];
                                      newBanners[index].zoom = 100;
                                      newBanners[index].positionX = 50;
                                      newBanners[index].positionY = 50;
                                      setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, banners: newBanners } });
                                    }}
                                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Restaurar Padrão
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                   </div>
                   
                   <button type="submit" className="mt-8 px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2">
                     <Save size={16} /> Salvar Banners
                   </button>
                </div>
              </form>
            )})()}`

            {activeTab === 'categories' && (
              <form onSubmit={saveConfig} className="space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
                  <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Banners de Seções (Os 5 Banners)</h3>
                  <p className="text-xs text-stone-400 font-medium mb-8">Edite as 5 seções principais: Oportunidades, Eventos, Espaços, Agentes e Projetos.</p>

                  <div className="space-y-12">
                    {['oportunidades', 'eventos', 'espacos', 'agentes', 'projetos'].map((id, index) => {
                      const banner = config?.siteConfig?.categoryBanners?.find(b => b.id === id) || {
                        id,
                        title: id.charAt(0).toUpperCase() + id.slice(1),
                        description: '',
                        imageUrl: '',
                        linkUrl: id
                      };

                      const bannerZoom = banner.zoom !== undefined ? banner.zoom : 100;
                      const bannerPositionX = banner.positionX !== undefined ? banner.positionX : 50;
                      const bannerPositionY = banner.positionY !== undefined ? banner.positionY : 50;

                      return (
                        <div key={id} className="p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-6">
                          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                             <span className="text-sm font-black uppercase text-stone-900">Seção: {banner.title}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400">Título</label>
                              <input 
                                value={banner.title}
                                onChange={e => {
                                  const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                  const idx = cats.findIndex(b => b.id === id);
                                  if (idx === -1) cats.push({ ...banner, title: e.target.value });
                                  else cats[idx].title = e.target.value;
                                  setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                }}
                                className="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border border-stone-100"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400">Link Destino</label>
                              <input 
                                value={banner.linkUrl}
                                onChange={e => {
                                  const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                  const idx = cats.findIndex(b => b.id === id);
                                  if (idx === -1) cats.push({ ...banner, linkUrl: e.target.value });
                                  else cats[idx].linkUrl = e.target.value;
                                  setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                }}
                                className="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border border-stone-100"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400">Descrição</label>
                              <textarea 
                                value={banner.description}
                                rows={3}
                                onChange={e => {
                                  const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                  const idx = cats.findIndex(b => b.id === id);
                                  if (idx === -1) cats.push({ ...banner, description: e.target.value });
                                  else cats[idx].description = e.target.value;
                                  setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                }}
                                className="w-full bg-white px-4 py-3 rounded-xl text-sm font-medium outline-none resize-none border border-stone-100"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400">URL da Imagem / Upload</label>
                              <div className="flex gap-4">
                                <input 
                                  value={banner.imageUrl}
                                  onChange={e => {
                                    const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                    const idx = cats.findIndex(b => b.id === id);
                                    if (idx === -1) cats.push({ ...banner, imageUrl: e.target.value });
                                    else cats[idx].imageUrl = e.target.value;
                                    setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                  }}
                                  className="flex-1 bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border border-stone-100"
                                />
                                <div className="relative">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const base64 = await compressImageToBase64(file);
                                          const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                          const idx = cats.findIndex(b => b.id === id);
                                          if (idx === -1) cats.push({ ...banner, imageUrl: base64 });
                                          else cats[idx].imageUrl = base64;
                                          setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                        } catch (err) {
                                          console.error("Erro ao comprimir imagem:", err);
                                        }
                                      }
                                    }}
                                  />
                                  <button type="button" className="h-full px-6 bg-[#5A5A40] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                                    <Upload size={14} /> Upload
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Real-time Visualization & Adjustment Box for Categories Banners */}
                          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-stone-200/60 pt-6">
                            {/* Left: Interactive Preview */}
                            <div className="lg:col-span-7 space-y-3">
                              <span className="text-[10px] font-black uppercase text-stone-400 block">Visualização em Tempo Real ({banner.title})</span>
                              <div className="relative h-[160px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-stone-950 flex items-center justify-start gap-4 px-6 md:px-10">
                                {/* Simulated Background */}
                                <div 
                                  className="absolute inset-0 z-0 transition-all duration-200"
                                  style={{
                                    backgroundImage: `url("${banner.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop'}")`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: `${bannerPositionX}% ${bannerPositionY}%`,
                                    backgroundRepeat: 'no-repeat',
                                    transform: `scale(${bannerZoom / 100})`,
                                    transformOrigin: 'center center'
                                  }}
                                />
                                {/* Ambient Overlay to simulate the production CSS */}
                                <div className="absolute inset-0 bg-black/25 z-5" />

                                {/* Simulated Title overlay with same styling as CategoryBanners.tsx */}
                                <div className="relative z-10 flex items-center gap-4 text-white">
                                  <div className="w-12 h-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                                    <ImageIcon size={20} />
                                  </div>
                                  <h3 className="text-xl font-black drop-shadow-2xl tracking-tighter uppercase italic">
                                    {banner.title}
                                  </h3>
                                </div>
                              </div>
                            </div>

                            {/* Right: Controls Panel */}
                            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                              <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase text-stone-400 block">Ajustes da Imagem</span>
                                
                                {/* Zoom Control */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-xs text-stone-600">
                                    <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Zoom</span>
                                    <span className="font-mono font-black text-[#0070BA]">{bannerZoom}%</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.max(50, bannerZoom - 10);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, zoom: newVal });
                                        else cats[idx].zoom = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="range"
                                      min="50"
                                      max="300"
                                      value={bannerZoom}
                                      onChange={e => {
                                        const newVal = parseInt(e.target.value);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, zoom: newVal });
                                        else cats[idx].zoom = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.min(300, bannerZoom + 10);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, zoom: newVal });
                                        else cats[idx].zoom = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* X Position (Lados) */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-xs text-stone-600">
                                    <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Posição Lateral (X)</span>
                                    <span className="font-mono font-black text-[#0070BA]">{bannerPositionX}%</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.max(0, bannerPositionX - 5);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionX: newVal });
                                        else cats[idx].positionX = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      ◀
                                    </button>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={bannerPositionX}
                                      onChange={e => {
                                        const newVal = parseInt(e.target.value);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionX: newVal });
                                        else cats[idx].positionX = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.min(100, bannerPositionX + 5);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionX: newVal });
                                        else cats[idx].positionX = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      ▶
                                    </button>
                                  </div>
                                </div>

                                {/* Y Position (Pra cima / Pra baixo) */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-xs text-stone-600">
                                    <span className="font-bold uppercase text-[9px] tracking-wider text-stone-500">Posição Vertical (Y)</span>
                                    <span className="font-mono font-black text-[#0070BA]">{bannerPositionY}%</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.max(0, bannerPositionY - 5);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionY: newVal });
                                        else cats[idx].positionY = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      ▲
                                    </button>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={bannerPositionY}
                                      onChange={e => {
                                        const newVal = parseInt(e.target.value);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionY: newVal });
                                        else cats[idx].positionY = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="flex-1 accent-[#0070BA] h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newVal = Math.min(100, bannerPositionY + 5);
                                        const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                        const idx = cats.findIndex(b => b.id === id);
                                        if (idx === -1) cats.push({ ...banner, positionY: newVal });
                                        else cats[idx].positionY = newVal;
                                        setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Reset button */}
                              <div className="pt-2">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const cats = [...(config?.siteConfig?.categoryBanners || [])];
                                    const idx = cats.findIndex(b => b.id === id);
                                    const resetBanner = { ...banner, zoom: 100, positionX: 50, positionY: 50 };
                                    if (idx === -1) cats.push(resetBanner);
                                    else cats[idx] = resetBanner;
                                    setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, categoryBanners: cats } });
                                  }}
                                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Restaurar Padrão
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button type="submit" className="mt-12 px-10 py-5 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                    <Save size={18} /> Salvar Configuração de Seções
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'stats' && (
              <form onSubmit={saveConfig} className="space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
                  <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Dados & Relatórios</h3>
                  <p className="text-xs text-stone-400 font-medium mb-8">Atualize os números que aparecem na seção de estatísticas do site.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.keys(config?.siteConfig?.stats || {}).map((key) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-stone-400 pl-1">{key.replace(/Count$/, '').replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input 
                          type="number"
                          value={(config?.siteConfig?.stats as any)[key]}
                          onChange={e => {
                            const newStats = { ...(config?.siteConfig?.stats || {}) };
                            (newStats as any)[key] = parseInt(e.target.value) || 0;
                            setConfig({ ...config!, siteConfig: { ...config!.siteConfig!, stats: newStats as any } });
                          }}
                          className="w-full bg-stone-50 px-5 py-4 rounded-2xl text-lg font-black outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="mt-12 px-10 py-5 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                    <Save size={18} /> Salvar Estatísticas
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'reports' && (
              <form onSubmit={saveConfig} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-10">
                <div className="flex items-center gap-4 border-b border-stone-50 pb-8">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                    <FilePieChart className="text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 uppercase">Configuração de Relatórios</h3>
                    <p className="text-xs text-stone-400 font-medium">Personalize os textos e indicadores do painel de monitoramento.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Título Principal</label>
                    <input
                      type="text"
                      value={config?.siteConfig?.reportsConfig?.title || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, title: val } } }) : null);
                      }}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Tag Superior (Badge)</label>
                    <input
                      type="text"
                      value={config?.siteConfig?.reportsConfig?.badgeText || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, badgeText: val } } }) : null);
                      }}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Descrição do Cabeçalho</label>
                    <textarea
                      value={config?.siteConfig?.reportsConfig?.description || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, description: val } } }) : null);
                      }}
                      rows={3}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-medium outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Label Botão Exportar</label>
                    <input
                      type="text"
                      value={config?.siteConfig?.reportsConfig?.exportLabel || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, exportLabel: val } } }) : null);
                      }}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Label Botão Filtrar</label>
                    <input
                      type="text"
                      value={config?.siteConfig?.reportsConfig?.filterLabel || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, filterLabel: val } } }) : null);
                      }}
                      className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 pt-8 border-t border-stone-50">
                    <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest mb-6 italic">Gráficos Analíticos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Crescimento</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.growthTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, growthTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Subtítulo Crescimento</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.growthSubtitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, growthSubtitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Perfis</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.profilesTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, profilesTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Subtítulo Perfis</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.profilesSubtitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, profilesSubtitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-8 border-t border-stone-50">
                    <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest mb-6 italic">Metas e Mapeamento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Meta</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.goalTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, goalTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Progresso (Texto)</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.goalSubtitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, goalSubtitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Status da Meta</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.goalStatus || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, goalStatus: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Valor da Meta (%)</label>
                          <input
                            type="number"
                            value={config?.siteConfig?.reportsConfig?.goalValue || 75}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, goalValue: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Mapeamento</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.mappingTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, mappingTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Subtítulo Mapeamento</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.mappingSubtitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, mappingSubtitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Info Mapa</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.mappingInfoTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, mappingInfoTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Texto Info Mapa</label>
                          <textarea
                            value={config?.siteConfig?.reportsConfig?.mappingInfoText || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, mappingInfoText: val } } }) : null);
                            }}
                            rows={2}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-medium outline-none resize-none"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-8 border-t border-stone-50">
                    <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest mb-6 italic">Ação Rodapé (Solicitação)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Título Ação</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.footerTitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, footerTitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Texto Ação</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.footerSubtitle || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, footerSubtitle: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase pl-1">Label Botão Ação</label>
                          <input
                            type="text"
                            value={config?.siteConfig?.reportsConfig?.footerButtonLabel || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, reportsConfig: { ...prev.siteConfig!.reportsConfig!, footerButtonLabel: val } } }) : null);
                            }}
                            className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none"
                          />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="px-12 py-5 bg-[#141414] text-white rounded-2xl font-black text-[13px] tracking-[0.2em] uppercase hover:bg-[#5A5A40] transition-all flex items-center gap-3 shadow-2xl"
                  >
                    <Save size={18} />
                    Salvar Relatórios
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'colors' && (
              <form onSubmit={saveConfig} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-10">
                <div className="flex items-center gap-4 border-b border-stone-50 pb-8">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Palette className="text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 uppercase">Controle Mestre de Cores</h3>
                    <p className="text-xs text-stone-400 font-medium">Personalize toda a paleta visual do Mapa Cultural.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {config?.siteConfig?.themeColors && Object.entries(config.siteConfig.themeColors).map(([key, value]) => (
                    <div key={key} className="space-y-3 p-4 bg-stone-50 rounded-2xl">
                      <label className="text-[10px] font-black uppercase text-stone-400 block pl-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={value}
                          onChange={e => {
                            const newColors = { ...config.siteConfig!.themeColors!, [key]: e.target.value };
                            setConfig({ ...config, siteConfig: { ...config.siteConfig!, themeColors: newColors } });
                          }}
                          className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                        />
                        <input 
                          type="text"
                          value={value}
                          onChange={e => {
                            const newColors = { ...config.siteConfig!.themeColors!, [key]: e.target.value };
                            setConfig({ ...config, siteConfig: { ...config.siteConfig!, themeColors: newColors } });
                          }}
                          className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-mono font-bold outline-none border border-stone-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="px-12 py-5 bg-[#141414] text-white rounded-2xl font-black text-[13px] tracking-[0.2em] uppercase hover:bg-[#5A5A40] transition-all flex items-center gap-3 shadow-2xl"
                  >
                    <Save size={18} />
                    Salvar Paleta de Cores
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'acervo' && (
              <div className="space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase">Gestão de Acervo Oficial</h3>
                    <p className="text-xs text-stone-400 font-medium">Marque conteúdos como "Oficial" ou "Verificado" para aparecerem nos destaques da página inicial.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-1 max-w-xl">
                    <button 
                      onClick={() => window.print()}
                      className="px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center gap-2 print:hidden whitespace-nowrap"
                    >
                      <Download size={14} />
                      Imprimir Lista
                    </button>
                    <button 
                      onClick={() => {
                        const allItems = [...agents, ...spaces, ...events, ...projects, ...opportunities];
                        const csv = [
                          ['Tipo', 'Nome', 'URL', 'Status'].join(','),
                          ...allItems.map(i => [
                            i.type || 'agente',
                            `"${i.name || i.title || ''}"`,
                            `"${i.id}"`,
                            i.official || i.certified ? 'Oficial' : 'Normal'
                          ].join(','))
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.setAttribute('hidden', '');
                        a.setAttribute('href', url);
                        a.setAttribute('download', 'mapeamento_cultural_breves.csv');
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="px-6 py-4 bg-stone-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0070BA] transition-all flex items-center gap-2 shadow-xl print:hidden whitespace-nowrap"
                    >
                      <FilePieChart size={14} />
                      Exportar CSV
                    </button>
                    <div className="flex bg-stone-50 rounded-2xl px-4 py-3 items-center gap-3 border border-stone-100 flex-1">
                      <Search size={18} className="text-stone-300" />
                    <input 
                      type="text" 
                      placeholder="Filtrar conteúdos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-bold text-stone-900 flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Badge Configuration Card */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100 space-y-6">
                <div className="flex items-center gap-4 border-b border-stone-50 pb-4">
                  <div className="w-12 h-12 bg-[#0070BA]/10 rounded-xl flex items-center justify-center text-[#0070BA]">
                    <Award size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-stone-900 uppercase">Personalizar Selo de Destaque / Oficial</h4>
                    <p className="text-xs text-stone-400 font-medium">Altere a imagem oficial do selo que aparece nas fotos, listas e perfis em destaque.</p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  {/* Badge Preview */}
                  <div className="flex flex-col items-center gap-2 bg-stone-50 p-6 rounded-3xl border border-stone-100 shrink-0 w-full lg:w-48">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Visualização</p>
                    <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center p-2 border border-stone-100 relative group overflow-hidden">
                      {config?.siteConfig?.featuredBadgeUrl ? (
                        <img 
                          src={config.siteConfig.featuredBadgeUrl} 
                          alt="Selo de destaque" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Award className="w-10 h-10 text-[#0070BA]" />
                      )}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-4 w-full">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">URL da Imagem ou Enviar Arquivo</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        type="url"
                        value={config?.siteConfig?.featuredBadgeUrl || ''}
                        onChange={e => setConfig(prev => prev ? ({ 
                          ...prev, 
                          siteConfig: { ...prev.siteConfig!, featuredBadgeUrl: e.target.value } 
                        }) : null)}
                        className="flex-1 bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-sm font-black outline-none focus:ring-2 focus:ring-stone-100"
                        placeholder="https://..."
                      />
                      <label className="cursor-pointer bg-[#0070BA] hover:bg-[#005a96] text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                        <Upload size={16} />
                        Upload do Selo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64String = await compressImageToBase64(file);
                                setConfig(prev => prev ? ({ 
                                  ...prev, 
                                  siteConfig: { ...prev.siteConfig!, featuredBadgeUrl: base64String } 
                                }) : null);
                              } catch (err) {
                                console.error("Erro ao comprimir imagem:", err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={async () => {
                          if (!config) return;
                          try {
                            const updatePayload = {
                              ...config,
                              siteConfig: {
                                ...config.siteConfig!,
                                featuredBadgeUrl: config.siteConfig?.featuredBadgeUrl || ''
                              },
                              updatedAt: serverTimestamp()
                            };
                            await updateDoc(doc(db, 'config', 'app'), updatePayload as any);
                            setStatus({ type: 'success', message: 'Selo de destaque salvo com sucesso!' });
                            setTimeout(() => setStatus(null), 3000);
                          } catch (error) {
                            setStatus({ type: 'error', message: 'Falha ao salvar selo de destaque.' });
                          }
                        }}
                        className="px-6 py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0070BA] transition-all flex items-center gap-2 shadow-lg"
                      >
                        <Save size={14} />
                        Salvar Selo
                      </button>
                      {config?.siteConfig?.featuredBadgeUrl && (
                        <button
                          onClick={async () => {
                            if (!config) return;
                            try {
                              const updatePayload = {
                                ...config,
                                siteConfig: {
                                  ...config.siteConfig!,
                                  featuredBadgeUrl: ""
                                },
                                updatedAt: serverTimestamp()
                              };
                              await updateDoc(doc(db, 'config', 'app'), updatePayload as any);
                              setConfig(updatePayload);
                              setStatus({ type: 'success', message: 'Selo restaurado para o padrão.' });
                              setTimeout(() => setStatus(null), 3000);
                            } catch (error) {
                              setStatus({ type: 'error', message: 'Falha ao restaurar selo.' });
                            }
                          }}
                          className="px-6 py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <X size={14} />
                          Restaurar Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                  {[
                    { title: 'Agentes Culturais', items: agents, type: 'agent' },
                    { title: 'Espaços Culturais', items: spaces, type: 'space' },
                    { title: 'Eventos', items: events, type: 'event' },
                    { title: 'Projetos', items: projects, type: 'project' },
                    { title: 'Oportunidades', items: opportunities, type: 'opportunity' }
                  ].map(group => (
                    <div key={group.type} className="space-y-4">
                      <h4 className="text-sm font-black text-stone-400 uppercase tracking-widest pl-4">{group.title}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.items
                          .filter(item => (item.name || item.title)?.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(item => {
                            const isCertified = group.type === 'agent' ? !!item.certified : !!item.official;
                            return (
                              <div key={item.id} className="bg-white p-6 rounded-3xl border border-stone-100 flex items-center justify-between group hover:border-[#0070BA] transition-all">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h5 className="text-xs font-black text-stone-900 uppercase truncate">{item.name || item.title}</h5>
                                  <p className="text-[10px] text-stone-400 font-medium truncate mt-1">ID: {item.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`Tem certeza que deseja excluir "${item.name || item.title}" permanentemente?`)) return;
                                      try {
                                        const collectionName = group.type === 'agent' ? 'agents' : contentService.getCollectionName(group.type);
                                        await deleteDoc(doc(db, collectionName, item.id));
                                        
                                        const updateStateMap: Record<string, any> = {
                                          'agent': setAgents,
                                          'space': setSpaces,
                                          'event': setEvents,
                                          'project': setProjects,
                                          'opportunity': setOpportunities
                                        };
                                        updateStateMap[group.type](prev => prev.filter(i => i.id !== item.id));
                                        setStatus({ type: 'success', message: `Conteúdo "${item.name || item.title}" foi removido com sucesso.` });
                                        setTimeout(() => setStatus(null), 3000);
                                      } catch (error) {
                                        const collName = group.type === 'agent' ? 'agents' : contentService.getCollectionName(group.type);
                                        handleFirestoreError(error, OperationType.DELETE, `${collName}/${item.id}`);
                                      }
                                    }}
                                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all print:hidden"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const newValue = !isCertified;
                                        const fieldName = group.type === 'agent' ? 'certified' : 'official';
                                        const collectionName = group.type === 'agent' ? 'agents' : contentService.getCollectionName(group.type);
                                        
                                        await updateDoc(doc(db, collectionName, item.id), { 
                                          [fieldName]: newValue,
                                          updatedAt: serverTimestamp()
                                        });
                                        
                                        // Update local state
                                        const updateStateMap: Record<string, any> = {
                                          'agent': setAgents,
                                          'space': setSpaces,
                                          'event': setEvents,
                                          'project': setProjects,
                                          'opportunity': setOpportunities
                                        };
                                        updateStateMap[group.type](prev => prev.map(i => i.id === item.id ? { ...i, [fieldName]: newValue } : i));
                                        setStatus({ type: 'success', message: `Conteúdo "${item.name || item.title}" ${newValue ? 'marcado como oficial/verificado' : 'removido dos oficiais/verificados'}.` });
                                        setTimeout(() => setStatus(null), 3000);
                                      } catch (error) {
                                        const collName = group.type === 'agent' ? 'agents' : contentService.getCollectionName(group.type);
                                        handleFirestoreError(error, OperationType.UPDATE, `${collName}/${item.id}`);
                                      }
                                    }}
                                    className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all ${isCertified ? 'bg-white shadow-lg border-2 border-[#0070BA]' : 'bg-stone-50 grayscale opacity-40 hover:opacity-100'}`}
                                    title={isCertified ? "Remover Selo" : "Dar Selo Oficial"}
                                  >
                                    {config?.siteConfig?.featuredBadgeUrl ? (
                                      <img 
                                        src={config.siteConfig.featuredBadgeUrl} 
                                        alt="Selo"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-amber-600 fill-amber-400">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <form onSubmit={saveConfig} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-8">
                 <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Configuração do Rodapé</h3>
                 <p className="text-xs text-stone-400 font-medium mb-8">Personalize as informações de contato e redes sociais.</p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Visão da Instituição</label>
                       <textarea 
                         value={config?.siteConfig?.footer.vision}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, vision: e.target.value } } }) : null)}
                         rows={3}
                         className="w-full bg-stone-50 px-5 py-4 rounded-2xl text-sm font-medium outline-none resize-none"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Instagram</label>
                       <input 
                         value={config?.siteConfig?.footer.instagram}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, instagram: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="URL completa"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Facebook</label>
                       <input 
                         value={config?.siteConfig?.footer.facebook}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, facebook: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="URL completa"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Endereço (Texto)</label>
                       <input 
                         value={config?.siteConfig?.footer.addressText}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, addressText: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">E-mail de Contato</label>
                       <input 
                         value={config?.siteConfig?.footer.email}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, email: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Título do Rodapé (ex: SECULTE)</label>
                       <input 
                         value={config?.siteConfig?.footer.footerTitle || ''}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, footerTitle: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="Ex: SECULTE"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Subtítulo do Rodapé</label>
                       <input 
                         value={config?.siteConfig?.footer.footerSubtitle || ''}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, footerSubtitle: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="Ex: Secretaria de Cultura, Turismo e Eventos"
                       />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">URL da Logo do Rodapé</label>
                       <input 
                         value={config?.siteConfig?.footer.footerLogoUrl || ''}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, footerLogoUrl: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="Ex: https://i.postimg.cc/L6F2L3yw/logo-breves.png"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Texto do Rodapé Centralizado Esquerdo</label>
                       <input 
                         value={config?.siteConfig?.footer.systemTitle || ''}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, systemTitle: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="Ex: SISTEMA INTEGRATIVO"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Texto do Rodapé Centralizado Direito</label>
                       <input 
                         value={config?.siteConfig?.footer.systemSubtitle || ''}
                         onChange={e => setConfig(prev => prev ? ({ ...prev, siteConfig: { ...prev.siteConfig!, footer: { ...prev.siteConfig!.footer, systemSubtitle: e.target.value } } }) : null)}
                         className="w-full bg-stone-50 px-5 py-3 rounded-2xl text-sm outline-none"
                         placeholder="Ex: BREVES - PARÁ"
                       />
                    </div>
                    {/* Copyright field removed from editing form as requested */}
                 </div>

                 <button type="submit" className="mt-4 px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2">
                   <Save size={16} /> Salvar Rodapé
                 </button>
              </form>
            )}

            {activeTab === 'help' && (
              <div className="space-y-8">
                {/* Sub-tabs header */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 flex flex-wrap gap-2">
                  <button
                    onClick={() => setHelpSubTab('faq')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      helpSubTab === 'faq'
                        ? 'bg-[#0070BA] text-white shadow-lg shadow-[#0070BA]/20'
                        : 'bg-stone-50 text-stone-400 hover:text-stone-900 border border-stone-100'
                    }`}
                  >
                    Dúvidas Frequentes (FAQ)
                  </button>
                  <button
                    onClick={() => setHelpSubTab('terms')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      helpSubTab === 'terms'
                        ? 'bg-[#0070BA] text-white shadow-lg shadow-[#0070BA]/20'
                        : 'bg-stone-50 text-stone-400 hover:text-stone-900 border border-stone-100'
                    }`}
                  >
                    Termos de Uso
                  </button>
                  <button
                    onClick={() => setHelpSubTab('privacy')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      helpSubTab === 'privacy'
                        ? 'bg-[#0070BA] text-white shadow-lg shadow-[#0070BA]/20'
                        : 'bg-stone-50 text-stone-400 hover:text-stone-900 border border-stone-100'
                    }`}
                  >
                    Política de Privacidade
                  </button>
                  <button
                    onClick={() => setHelpSubTab('image')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      helpSubTab === 'image'
                        ? 'bg-[#0070BA] text-white shadow-lg shadow-[#0070BA]/20'
                        : 'bg-stone-50 text-stone-400 hover:text-stone-900 border border-stone-100'
                    }`}
                  >
                    Autorização de Uso de Imagem
                  </button>
                </div>

                {/* FAQ Content Panel */}
                {helpSubTab === 'faq' && (
                  <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-8">
                    <div>
                      <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Edição de Dúvidas Frequentes (FAQ)</h3>
                      <p className="text-xs text-stone-400 font-medium mb-6">Cadastre, edite ou remova categorias e tópicos de ajuda.</p>
                    </div>

                    <div className="space-y-8">
                      {config?.helpConfig?.faqCategories?.map((category, catIdx) => (
                        <div key={catIdx} className="bg-stone-50 rounded-3xl p-6 md:p-8 border border-stone-100 relative space-y-6">
                          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div className="w-full md:w-1/2 space-y-2">
                              <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Título da Categoria #{catIdx + 1}</label>
                              <input
                                type="text"
                                value={category.title || ''}
                                onChange={(e) => {
                                  const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                  updatedCats[catIdx] = { ...updatedCats[catIdx], title: e.target.value };
                                  setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                                }}
                                className="w-full bg-white border border-stone-100 px-5 py-3 rounded-2xl text-sm font-bold outline-none shadow-sm"
                                placeholder="Ex: 1 - Cadastro no Mapa Cultural"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedCats = (config?.helpConfig?.faqCategories || []).filter((_, idx) => idx !== catIdx);
                                setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                              }}
                              className="text-red-500 hover:text-red-700 text-xs font-black uppercase tracking-wider flex items-center gap-1 mt-2 md:mt-0"
                            >
                              <Trash2 size={14} /> Excluir Categoria
                            </button>
                          </div>

                          {/* Topics List */}
                          <div className="space-y-4 pl-0 md:pl-6 border-l-2 border-stone-200">
                            <h4 className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Perguntas e Respostas desta categoria</h4>
                            
                            {(category.topics || []).map((topic, topIdx) => (
                              <div key={topIdx} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm relative space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase text-[#0070BA] tracking-wider">Pergunta #{topIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                      const updatedTopics = (updatedCats[catIdx].topics || []).filter((_, idx) => idx !== topIdx);
                                      updatedCats[catIdx] = { ...updatedCats[catIdx], topics: updatedTopics };
                                      setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                  >
                                    <Trash2 size={12} /> Excluir Pergunta
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Pergunta</label>
                                  <input
                                    type="text"
                                    value={topic.title || ''}
                                    onChange={(e) => {
                                      const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                      const updatedTopics = [...(updatedCats[catIdx].topics || [])];
                                      updatedTopics[topIdx] = { ...updatedTopics[topIdx], title: e.target.value };
                                      updatedCats[catIdx] = { ...updatedCats[catIdx], topics: updatedTopics };
                                      setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                                    }}
                                    className="w-full bg-stone-50 px-4 py-3 rounded-xl text-sm outline-none"
                                    placeholder="Ex: Como faço para atualizar as informações do meu perfil?"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Resposta / Conteúdo</label>
                                  <textarea
                                    value={topic.content || ''}
                                    onChange={(e) => {
                                      const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                      const updatedTopics = [...(updatedCats[catIdx].topics || [])];
                                      updatedTopics[topIdx] = { ...updatedTopics[topIdx], content: e.target.value };
                                      updatedCats[catIdx] = { ...updatedCats[catIdx], topics: updatedTopics };
                                      setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                                    }}
                                    rows={4}
                                    className="w-full bg-stone-50 px-4 py-3 rounded-xl text-sm outline-none resize-none whitespace-pre-wrap"
                                    placeholder="Explique detalhadamente as instruções..."
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Tags (separadas por vírgula)</label>
                                  <input
                                    type="text"
                                    value={(topic.tags || []).join(', ')}
                                    onChange={(e) => {
                                      const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                      const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                      const updatedTopics = [...(updatedCats[catIdx].topics || [])];
                                      updatedTopics[topIdx] = { ...updatedTopics[topIdx], tags: tagsArray };
                                      updatedCats[catIdx] = { ...updatedCats[catIdx], topics: updatedTopics };
                                      setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                                    }}
                                    className="w-full bg-stone-50 px-4 py-3 rounded-xl text-xs outline-none"
                                    placeholder="Ex: cadastro, perfil, dados"
                                  />
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                const updatedCats = [...(config?.helpConfig?.faqCategories || [])];
                                const updatedTopics = [...(updatedCats[catIdx].topics || []), { title: 'Nova Pergunta', content: 'Insira a resposta aqui...', tags: [] }];
                                updatedCats[catIdx] = { ...updatedCats[catIdx], topics: updatedTopics };
                                setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                              }}
                              className="w-full py-4 border-2 border-dashed border-stone-200 hover:border-[#0070BA] rounded-2xl flex items-center justify-center gap-2 text-stone-400 hover:text-[#0070BA] text-xs font-black uppercase tracking-wider transition-colors"
                            >
                              <PlusCircle size={16} /> Adicionar Nova Pergunta
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const updatedCats = [...(config?.helpConfig?.faqCategories || []), { title: 'Nova Categoria', topics: [] }];
                          setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, faqCategories: updatedCats } }) : null);
                        }}
                        className="w-full py-5 border-2 border-dashed border-stone-300 hover:border-stone-900 rounded-3xl flex items-center justify-center gap-2 text-stone-500 hover:text-stone-900 text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        <PlusCircle size={18} /> Adicionar Nova Categoria de FAQ
                      </button>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updatedPayload = {
                              ...config,
                              helpConfig: {
                                ...config!.helpConfig!,
                                faqCategories: config!.helpConfig!.faqCategories
                              },
                              updatedAt: serverTimestamp()
                            };
                            await updateDoc(doc(db, 'config', 'app'), updatedPayload as any);
                            setStatus({ type: 'success', message: 'Perguntas frequentes salvas com sucesso!' });
                            setTimeout(() => setStatus(null), 3000);
                          } catch (err) {
                            setStatus({ type: 'error', message: 'Erro ao salvar perguntas frequentes.' });
                          }
                        }}
                        className="px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2 shadow-lg hover:bg-stone-800 transition-all"
                      >
                        <Save size={16} /> Salvar FAQs
                      </button>
                    </div>
                  </div>
                )}

                {/* Terms Content Panel */}
                {helpSubTab === 'terms' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const updatedPayload = {
                          ...config,
                          helpConfig: {
                            ...config!.helpConfig!,
                            termsOfUse: config!.helpConfig!.termsOfUse
                          },
                          updatedAt: serverTimestamp()
                        };
                        await updateDoc(doc(db, 'config', 'app'), updatedPayload as any);
                        setStatus({ type: 'success', message: 'Termos de Uso salvos com sucesso!' });
                        setTimeout(() => setStatus(null), 3000);
                      } catch (err) {
                        setStatus({ type: 'error', message: 'Erro ao salvar Termos de Uso.' });
                      }
                    }}
                    className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-8"
                  >
                    <div>
                      <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Edição de Termos de Uso</h3>
                      <p className="text-xs text-stone-400 font-medium mb-6">Personalize as regras e termos de utilização do Mapa Cultural.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Termos de Uso (Texto Completo)</label>
                      <textarea
                        value={config?.helpConfig?.termsOfUse || ''}
                        onChange={(e) => setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, termsOfUse: e.target.value } }) : null)}
                        rows={20}
                        className="w-full bg-stone-50 px-5 py-4 rounded-2xl text-sm font-medium outline-none resize-none font-sans"
                        placeholder="Insira o texto dos termos de uso..."
                      />
                    </div>

                    <button type="submit" className="px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2 shadow-lg hover:bg-stone-800 transition-all">
                      <Save size={16} /> Salvar Termos de Uso
                    </button>
                  </form>
                )}

                {/* Privacy Content Panel */}
                {helpSubTab === 'privacy' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const updatedPayload = {
                          ...config,
                          helpConfig: {
                            ...config!.helpConfig!,
                            privacyPolicy: config!.helpConfig!.privacyPolicy
                          },
                          updatedAt: serverTimestamp()
                        };
                        await updateDoc(doc(db, 'config', 'app'), updatedPayload as any);
                        setStatus({ type: 'success', message: 'Política de Privacidade salva com sucesso!' });
                        setTimeout(() => setStatus(null), 3000);
                      } catch (err) {
                        setStatus({ type: 'error', message: 'Erro ao salvar política de privacidade.' });
                      }
                    }}
                    className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-8"
                  >
                    <div>
                      <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Edição de Política de Privacidade</h3>
                      <p className="text-xs text-stone-400 font-medium mb-6">Personalize o tratamento, direitos e responsabilidades com os dados pessoais.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Política de Privacidade (Texto Completo)</label>
                      <textarea
                        value={config?.helpConfig?.privacyPolicy || ''}
                        onChange={(e) => setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, privacyPolicy: e.target.value } }) : null)}
                        rows={20}
                        className="w-full bg-stone-50 px-5 py-4 rounded-2xl text-sm font-medium outline-none resize-none font-sans"
                        placeholder="Insira o texto da política de privacidade..."
                      />
                    </div>

                    <button type="submit" className="px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2 shadow-lg hover:bg-stone-800 transition-all">
                      <Save size={16} /> Salvar Política de Privacidade
                    </button>
                  </form>
                )}

                {/* Image Authorization Content Panel */}
                {helpSubTab === 'image' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const updatedPayload = {
                          ...config,
                          helpConfig: {
                            ...config!.helpConfig!,
                            imageAuthorization: config!.helpConfig!.imageAuthorization
                          },
                          updatedAt: serverTimestamp()
                        };
                        await updateDoc(doc(db, 'config', 'app'), updatedPayload as any);
                        setStatus({ type: 'success', message: 'Autorização de Uso de Imagem salva com sucesso!' });
                        setTimeout(() => setStatus(null), 3000);
                      } catch (err) {
                        setStatus({ type: 'error', message: 'Erro ao salvar Autorização de Uso de Imagem.' });
                      }
                    }}
                    className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100 space-y-8"
                  >
                    <div>
                      <h3 className="text-xl font-black text-stone-900 uppercase mb-2">Edição de Autorização de Uso de Imagem</h3>
                      <p className="text-xs text-stone-400 font-medium mb-6">Personalize os termos e condições de cessão e veiculação de imagem, áudio e vídeo.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-400 pl-1">Autorização de Imagem (Texto Completo)</label>
                      <textarea
                        value={config?.helpConfig?.imageAuthorization || ''}
                        onChange={(e) => setConfig(prev => prev ? ({ ...prev, helpConfig: { ...prev.helpConfig!, imageAuthorization: e.target.value } }) : null)}
                        rows={20}
                        className="w-full bg-stone-50 px-5 py-4 rounded-2xl text-sm font-medium outline-none resize-none font-sans"
                        placeholder="Insira o texto da autorização de imagem..."
                      />
                    </div>

                    <button type="submit" className="px-10 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2 shadow-lg hover:bg-stone-800 transition-all">
                      <Save size={16} /> Salvar Autorização de Imagem
                    </button>
                  </form>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
