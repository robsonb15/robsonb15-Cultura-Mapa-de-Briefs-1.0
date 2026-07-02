import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Shield, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Save, 
  LogOut, 
  ChevronLeft,
  LayoutDashboard,
  Users,
  Building2,
  Calendar as CalendarIcon,
  Lightbulb,
  FileText,
  Settings,
  ChevronRight,
  PlusCircle,
  Bell,
  Clock,
  Edit2,
  Trash2,
  UserCircle,
  Printer,
  X
} from 'lucide-react';
import { UserProfile, CulturalAgent, CulturalSpace, CulturalEvent, CulturalOpportunity, CulturalProject } from '../types';
import AgentEditForm from './AgentEditForm';
import ContentEditForm from './ContentEditForm';
import { agentService } from '../lib/agentService';
import { contentService } from '../lib/contentService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import { RegistrationSummaryPDF } from './RegistrationSummaryPDF';
import RegistrationTracking from './RegistrationTracking';

interface UserDashboardProps {
  setView: (view: any) => void;
  setSelectedContent: (content: any) => void;
  hasAgent: boolean;
  initialCreateType?: 'space' | 'event' | 'opportunity' | 'project' | 'agent' | null;
  clearCreateType?: () => void;
}

type DashboardTab = 'dashboard' | 'my_profile' | 'my_agents' | 'my_spaces' | 'my_events' | 'my_opportunities' | 'my_published_opportunities' | 'my_projects' | 'settings';

export default function UserDashboard({ setView, setSelectedContent, hasAgent, initialCreateType, clearCreateType }: UserDashboardProps) {
  const { profile, user, logout, refreshProfile, appConfig } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myAgent, setMyAgent] = useState<CulturalAgent | null>(null);

  const isAdmin = user && (appConfig?.adminEmails?.includes(user.email || '') || user.email === 'robsonstudio15hd@gmail.com' || user.email === 'portalseculte@gmail.com');
  
  // Lists for management
  const [agents, setAgents] = useState<CulturalAgent[]>([]);
  const [spaces, setSpaces] = useState<CulturalSpace[]>([]);
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [opportunities, setOpportunities] = useState<CulturalOpportunity[]>([]);
  const [projects, setProjects] = useState<CulturalProject[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  
  // Form handling
  const [editingContent, setEditingContent] = useState<{ type: any; data?: any } | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<string | null>(null); // Opportunity ID
  const [trackingRegistration, setTrackingRegistration] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // Registration ID
  const pdfRef = useRef<HTMLDivElement>(null);

  const effectiveProfile = profile || {
    uid: user?.uid || '',
    fullName: user?.displayName || user?.email?.split('@')[0] || 'Usuário',
    socialName: '',
    privateEmail: user?.email || '',
    miniBio: '',
    areas: [],
    createdAt: null,
    updatedAt: null,
  };

  useEffect(() => {
    if (user) {
      setFormData(profile || {
        uid: user.uid,
        fullName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        socialName: '',
        privateEmail: user.email || '',
        miniBio: '',
        areas: [],
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      agentService.getAgent(user.uid).then(setMyAgent);
      fetchContent();
      fetchRegistrations();
      if (isAdmin) {
        agentService.getAllAgents().then(setAgents);
      }
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (initialCreateType) {
      if (initialCreateType === 'space') {
        setActiveTab('my_spaces');
        setEditingContent({ type: 'space' });
      } else if (initialCreateType === 'event') {
        setActiveTab('my_events');
        setEditingContent({ type: 'event' });
      } else if (initialCreateType === 'opportunity') {
        setActiveTab('my_published_opportunities');
        setEditingContent({ type: 'opportunity' });
      } else if (initialCreateType === 'project') {
        setActiveTab('my_projects');
        setEditingContent({ type: 'project' });
      }
      if (clearCreateType) {
        clearCreateType();
      }
    }
  }, [initialCreateType, clearCreateType]);

  const fetchRegistrations = async () => {
    if (!user) return;
    const regs = isAdmin 
      ? await contentService.getAllRegistrations()
      : await contentService.getUserRegistrations(user.uid);
    setRegistrations(regs);
  };

  const fetchContent = async () => {
    if (!user) return;
    
    // If admin, fetch everything, otherwise fetch only owner content
    const fetchFunc = isAdmin ? contentService.getAllContent.bind(contentService) : contentService.getMyContent.bind(contentService);
    const userId = user.uid;

    const [s, e, o, p] = await Promise.all([
      isAdmin ? contentService.getAllContent('space') : contentService.getMyContent('space', userId),
      isAdmin ? contentService.getAllContent('event') : contentService.getMyContent('event', userId),
      isAdmin ? contentService.getAllContent('opportunity') : contentService.getMyContent('opportunity', userId),
      isAdmin ? contentService.getAllContent('project') : contentService.getMyContent('project', userId)
    ]);
    setSpaces(s as any);
    setEvents(e as any);
    setOpportunities(o as any);
    setProjects(p as any);
  };

  const generatePDF = async (reg: any) => {
    setIsGenerating(reg.id);
    
    // Tiny delay to ensure React has rendered the hidden component with current data
    setTimeout(async () => {
      if (!pdfRef.current) {
        console.error("PDF Ref not found after delay");
        setIsGenerating(null);
        return;
      }
      try {
        const canvas = await html2canvas(pdfRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Subsequent pages
        let pageCount = 1;
        while (heightLeft > 0) {
          position = - (pageCount * pdfHeight);
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
          pageCount++;
        }

        pdf.autoPrint();
        const url = pdf.output('bloburl');
        const printWindow = window.open(url, '_blank');
        
        if (!printWindow) {
          // Fallback if popup is blocked
          pdf.save(`inscricao-${reg.registrationNumber}.pdf`);
          alert("O PDF foi baixado automaticamente. Por favor, permita popups para abrir a tela de impressão direta.");
        }
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Erro ao gerar PDF. Por favor, tente novamente.");
      } finally {
        setIsGenerating(null);
      }
    }, 800);
  };

  const handleSaveContent = async (data: any, selectedType?: any) => {
    if (!user || !editingContent) return;
    try {
      const finalType = selectedType || editingContent.type;
      await contentService.saveContent(finalType, data, user.uid);
      setEditingContent(null);
      fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleDeleteContent = async (type: string, id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await contentService.deleteContent(type, id);
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar e excluir esta inscrição permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      // Direct call to delete from collection
      await deleteDoc(doc(db, 'opportunity_registrations', id));
      setRegistrations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccess(false);

    try {
      const docRef = doc(db, 'users', user.uid);
      const updateData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };
      // Remove createdAt/uid/areas_input from update
      delete (updateData as any).createdAt;
      delete (updateData as any).uid;
      delete (updateData as any).areas_input;

      await setDoc(docRef, updateData, { merge: true });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Central', icon: LayoutDashboard, color: 'text-stone-900' },
    { id: 'my_profile', label: 'Dados do Usuário', icon: User, color: 'text-stone-900' },
    { id: 'my_agents', label: 'Meus Agentes', icon: Users, color: 'text-stone-900' },
    { id: 'my_spaces', label: 'Meus Espaços', icon: Building2, color: 'text-stone-900' },
    { id: 'my_events', label: 'Meus Eventos', icon: CalendarIcon, color: 'text-stone-900' },
    { id: 'my_projects', label: 'Meus Projetos', icon: FileText, color: 'text-stone-900' },
    { id: 'my_published_opportunities', label: 'Minhas Oportunidades', icon: Lightbulb, color: 'text-stone-900' },
    { id: 'my_opportunities', label: 'Minhas Inscrições', icon: FileText, color: 'text-stone-900' },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-stone-900' },
  ];

  if (trackingRegistration) {
    return (
      <RegistrationTracking 
        registration={trackingRegistration} 
        onBack={() => setTrackingRegistration(null)}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-20 min-h-[60vh]">
        <div className="text-stone-500 font-bold uppercase tracking-widest">Acesso não autorizado. Por favor faça login.</div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-12 pb-20">
            <header className="space-y-2">
              <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tighter italic">Bem-vindo, {effectiveProfile.socialName || effectiveProfile.fullName || 'Usuário'}</h2>
              <p className="text-stone-400 font-medium">Gerencie suas oportunidades e produções culturais com facilidade.</p>
            </header>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: 'my_published_opportunities', label: 'Minhas Oportunidades', desc: 'Editais e chamadas que você publica', icon: Lightbulb, count: opportunities.length, color: 'bg-amber-50 text-amber-600' },
                { id: 'my_opportunities', label: 'Minhas Inscrições', desc: 'Sua participação em editais', icon: FileText, count: registrations.length, color: 'bg-red-50 text-red-600' },
                { id: 'my_agents', label: 'Meus Agentes', desc: 'Identidades culturais', icon: Users, count: myAgent ? 1 : 0, color: 'bg-stone-50 text-stone-600' },
                { id: 'my_spaces', label: 'Meus Espaços', desc: 'Locais gerenciados', icon: Building2, count: spaces.length, color: 'bg-stone-50 text-stone-600' },
                { id: 'my_events', label: 'Meus Eventos', desc: 'Agenda cultural própria', icon: CalendarIcon, count: events.length, color: 'bg-stone-50 text-stone-600' },
                { id: 'my_projects', label: 'Meus Projetos', desc: 'Iniciativas cadastradas', icon: FileText, count: projects.length, color: 'bg-stone-50 text-stone-600' },
                { id: 'my_profile', label: 'Configurações', desc: 'Dados e segurança', icon: Settings, count: null, color: 'bg-stone-50 text-stone-600' },
              ].map((card) => (
                <button
                  key={card.id}
                  onClick={() => setActiveTab(card.id as any)}
                  className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col items-start group"
                >
                  <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <card.icon size={24} />
                  </div>
                  <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight mb-2">{card.label}</h3>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-tighter mb-4">{card.desc}</p>
                  {card.count !== null && (
                    <div className="mt-auto px-4 py-1 bg-stone-100 text-stone-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {card.count} {card.count === 1 ? 'Item' : 'Items'}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#0070BA] opacity-0 group-hover:opacity-100 transition-opacity">
                    Acessar Seção <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>

            {registrations.length > 0 && (
              <section className="bg-white rounded-[2.5rem] p-10 border border-stone-100 shadow-sm">
                <h3 className="text-xl font-black text-stone-900 uppercase italic mb-8">Últimas Inscrições</h3>
                <div className="space-y-4">
                  {registrations.slice(0, 3).map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between p-6 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-stone-400 border border-stone-100 shadow-sm">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mb-1">Inscrição {reg.registrationNumber}</p>
                          <h4 className="text-sm font-black text-stone-900 uppercase tracking-tighter truncate max-w-xs">{reg.data?.identification?.projectName || 'Inscrição Sem Título'}</h4>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        reg.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                        reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {reg.status === 'submitted' ? 'Enviada' : reg.status === 'approved' ? 'Aprovada' : 'Rascunho'}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setActiveTab('my_opportunities')}
                  className="w-full mt-6 py-4 border-2 border-dashed border-stone-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:border-[#0070BA] hover:text-[#0070BA] transition-all"
                >
                  Ver Todas as Inscrições
                </button>
              </section>
            )}
          </div>
        );
      case 'my_profile':
        return (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-8 space-y-8">
              {/* Basic Info */}
              <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-stone-100">
                <h2 className="text-xl font-black text-stone-900 tracking-tight mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E9F1F9] flex items-center justify-center text-[#0070BA]">
                    <User size={18} />
                  </div>
                  Dados Pessoais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome completo</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName || ''}
                      onChange={handleChange}
                      className="w-full bg-[#F8F9FA] border-none rounded-xl px-5 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome social</label>
                    <input
                      type="text"
                      name="socialName"
                      value={formData.socialName || ''}
                      onChange={handleChange}
                      className="w-full bg-[#F8F9FA] border-none rounded-xl px-5 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Mini Bio</label>
                    <textarea
                      name="miniBio"
                      value={formData.miniBio || ''}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-[#F8F9FA] border-none rounded-xl px-5 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Link Externo (Instagram, Site, etc)</label>
                    <input
                      type="text"
                      name="externalLink"
                      value={formData.externalLink || ''}
                      onChange={handleChange}
                      className="w-full bg-[#F8F9FA] border-none rounded-xl px-5 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                      placeholder="Ex: instagram.com/usuario"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1 flex items-center justify-between">
                      <span>Áreas de Atuação (Segmentos)</span>
                      <span className="text-[9px] text-[#0070BA] font-black uppercase">Clique para selecionar</span>
                    </label>

                    {/* Selected items overview */}
                    <div className="flex flex-wrap gap-2 min-h-12 p-4 bg-[#F8F9FA] rounded-2xl border border-stone-100">
                      {Array.isArray(formData.areas) && formData.areas.length > 0 ? (
                        formData.areas.map((area: string, index: number) => (
                          <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E30613] text-white rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">
                            {area}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.areas.filter((_: any, i: number) => i !== index);
                                setFormData(prev => ({
                                  ...prev,
                                  areas: updated,
                                  areas_input: updated.join(', ')
                                }));
                              }}
                              className="bg-black/10 hover:bg-black/20 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic py-1 pl-1">Nenhum segmento selecionado. Clique nas opções abaixo ou adicione um personalizado.</span>
                      )}
                    </div>

                    {/* Predefined segment options */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                      {[
                        "Artesanato",
                        "Artes Visuais",
                        "Audiovisual",
                        "Carimbó & Ritmos",
                        "Cultura Popular",
                        "Dança",
                        "Cultura e Educação",
                        "Gastronomia",
                        "Literatura",
                        "Moda & Design",
                        "Música",
                        "Patrimônio",
                        "Teatro & Circo",
                        "Capoeira",
                        "Culturas Indígenas",
                        "Cultura Reggae"
                      ].map((seg) => {
                        const isSelected = Array.isArray(formData.areas) && formData.areas.includes(seg);
                        return (
                          <button
                            key={seg}
                            type="button"
                            onClick={() => {
                              const currentAreas = Array.isArray(formData.areas) ? formData.areas : [];
                              let updated;
                              if (isSelected) {
                                updated = currentAreas.filter((a: string) => a !== seg);
                              } else {
                                updated = [...currentAreas, seg];
                              }
                              setFormData(prev => ({
                                ...prev,
                                areas: updated,
                                areas_input: updated.join(', ')
                              }));
                            }}
                            className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tighter text-left transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-[#0070BA]/10 border-[#0070BA] text-[#0070BA]'
                                : 'bg-[#F8F9FA] border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                          >
                            <span className="flex items-center justify-between">
                              <span>{seg}</span>
                              {isSelected && <span className="font-black text-[10px]">✓</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom segment adder */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        id="user-custom-interest-input"
                        placeholder="Adicionar outro segmento personalizado..."
                        className="flex-1 px-4 py-3 bg-[#F8F9FA] border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0070BA]/25 focus:bg-white transition-all text-stone-800 font-bold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              const currentAreas = Array.isArray(formData.areas) ? formData.areas : [];
                              if (!currentAreas.includes(val)) {
                                const updated = [...currentAreas, val];
                                setFormData(prev => ({
                                  ...prev,
                                  areas: updated,
                                  areas_input: updated.join(', ')
                                }));
                              }
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('user-custom-interest-input') as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val) {
                            const currentAreas = Array.isArray(formData.areas) ? formData.areas : [];
                            if (!currentAreas.includes(val)) {
                              const updated = [...currentAreas, val];
                              setFormData(prev => ({
                                ...prev,
                                areas: updated,
                                areas_input: updated.join(', ')
                              }));
                            }
                            input.value = '';
                          }
                        }}
                        className="px-4 py-3 bg-stone-900 hover:bg-[#0070BA] hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact Info */}
              <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-stone-100">
                <h2 className="text-xl font-black text-stone-900 tracking-tight mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E9F1F9] flex items-center justify-center text-[#0070BA]">
                    <Phone size={18} />
                  </div>
                  Contatos Privados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">E-mail privado</label>
                    <input
                      type="email"
                      name="privateEmail"
                      value={formData.privateEmail || ''}
                      onChange={handleChange}
                      className="w-full bg-[#F8F9FA] border-none rounded-xl px-5 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Save */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100 sticky top-8">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0070BA] text-white py-5 rounded-2xl font-black text-[14px] tracking-tighter uppercase hover:bg-[#005ea6] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Alterações
                    </>
                  )}
                </button>
                {success && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center text-green-600 text-[11px] font-black uppercase"
                  >
                    Perfil atualizado!
                  </motion.p>
                )}
              </div>
            </div>
          </form>
        );

      case 'my_agents':
        return (
          <div className="space-y-8">
            <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-2 tracking-tighter">Meus Agentes Culturais</h2>
                    <p className="text-stone-400 text-sm font-medium">Gerencie suas identidades culturais no sistema.</p>
                  </div>
                  <button 
                    onClick={() => setView('edit')}
                    className="flex items-center gap-2 px-6 py-4 bg-[#5A5A40] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform shadow-xl"
                  >
                    <PlusCircle size={18} />
                    {hasAgent ? 'Novo Agente' : 'Criar Perfil de Agente'}
                  </button>
               </div>

               {myAgent ? (
                 <div className="bg-stone-50 rounded-3xl p-6 border border-stone-100 flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 bg-stone-200 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                          {myAgent.images?.profile ? (
                            <img src={myAgent.images.profile} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400"><User size={32} /></div>
                          )}
                       </div>
                       <div>
                          <h4 className="text-xl font-black text-stone-900 uppercase tracking-tighter">{myAgent.name}</h4>
                          <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-tighter">{myAgent.type}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setView('edit')} className="p-3 bg-white text-stone-600 rounded-xl hover:text-stone-900 shadow-sm transition-all">
                          <Settings size={20} />
                       </button>
                       <button onClick={() => setView('profile')} className="px-6 py-3 bg-white text-stone-900 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm hover:shadow-lg transition-all">
                          Ver Público
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="bg-stone-50 rounded-[2.5rem] border border-dashed border-stone-200 py-20 text-center">
                    <p className="text-stone-400 font-black text-xs uppercase tracking-[0.2em]">Você ainda não possui um agente cultural cadastrado.</p>
                 </div>
               )}
            </section>
          </div>
        );

      case 'my_spaces':
      case 'my_events':
      case 'my_projects': {
        const typeMap: Record<string, any> = {
          my_spaces: 'space',
          my_events: 'event',
          my_projects: 'project'
        };
        const type = typeMap[activeTab];
        const list = activeTab === 'my_spaces' ? spaces : 
                     activeTab === 'my_events' ? events : projects;
        
        if (editingContent && editingContent.type === type) {
          return (
            <ContentEditForm 
              type={type}
              initialData={editingContent.data}
              onSave={handleSaveContent}
              onCancel={() => setEditingContent(null)}
              isAdmin={isAdmin}
            />
          );
        }

        return (
          <div className="space-y-8">
            <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-2 tracking-tighter">
                      {isAdmin ? 'Gerenciar' : 'Meus'} {menuItems.find(i => i.id === activeTab)?.label.split(' ').pop()}
                    </h2>
                    <p className="text-stone-400 text-sm font-medium">
                      {isAdmin ? 'Controle administrativo de todo o conteúdo.' : 'Gerencie seus arquivos culturais cadastrados.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingContent({ type })}
                    className="flex items-center gap-2 px-6 py-4 bg-[#0070BA] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform shadow-xl"
                  >
                    <PlusCircle size={18} />
                    Criar Novo
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {list.length > 0 ? (
                   list.map((item: any) => (
                     <div key={item.id} className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">ID: {item.id.slice(0, 8).toUpperCase()}</span>
                              <span className="px-2 py-0.5 bg-stone-50 border border-stone-100 rounded text-[9px] font-black text-stone-400 uppercase tracking-tight">{item.type}</span>
                           </div>
                           <h4 className="text-xl font-black text-stone-900 uppercase tracking-tighter group-hover:text-[#0070BA] transition-colors">{item.name}</h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                           <button 
                             onClick={() => setEditingContent({ type, data: item })}
                             className="flex items-center gap-2 px-5 py-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-900 hover:text-white transition-all text-[10px] font-black uppercase tracking-tighter border border-stone-100 shadow-sm"
                           >
                              <Edit2 size={16} />
                              Editar
                           </button>
                           <button 
                             onClick={() => handleDeleteContent(type, item.id)}
                             className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                           >
                              <Trash2 size={20} />
                           </button>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="bg-stone-50 rounded-[2.5rem] border border-dashed border-stone-200 py-20 text-center">
                      <p className="text-stone-400 font-black text-xs uppercase tracking-[0.2em]">Nenhum item cadastrado nesta categoria.</p>
                   </div>
                 )}
               </div>
            </section>
          </div>
        );
      }

      case 'my_published_opportunities': {
        if (viewingRegistrations) {
          const opportunity = opportunities.find(o => o.id === viewingRegistrations);
          const regs = registrations.filter(r => r.opportunityId === viewingRegistrations);

          return (
            <div className="space-y-8">
               <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setViewingRegistrations(null)} className="p-4 bg-white rounded-2xl text-stone-400 hover:text-stone-900 shadow-sm transition-all border border-stone-100">
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter">Inscrições Recebidas</h2>
                    <p className="text-stone-400 text-sm font-medium">{opportunity?.name}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {regs.length > 0 ? (
                   regs.map((reg) => (
                     <div key={reg.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-100 group">
                        <div className="flex flex-col md:flex-row justify-between gap-8">
                           <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                 <span className="px-3 py-1 bg-red-50 text-red-600 font-mono text-xs font-black rounded-lg">{reg.registrationNumber}</span>
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                                   reg.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                                   reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                                 }`}>
                                   {reg.status === 'submitted' ? 'Recebido' : reg.status === 'approved' ? 'Aprovado' : reg.status}
                                 </span>
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-stone-900 uppercase tracking-tighter">{reg.data?.identification?.projectName || 'Sem Título'}</h4>
                                <div className="flex flex-wrap gap-4 mt-2">
                                   <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                                      <UserCircle size={14} />
                                      {reg.proponentType}
                                   </div>
                                   <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                                      <Clock size={14} />
                                      {new Date(reg.updatedAt?.seconds * 1000).toLocaleString('pt-BR')}
                                   </div>
                                </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => {
                                  if (reg.pdfUrl) {
                                    window.open(reg.pdfUrl, '_blank');
                                  } else {
                                    generatePDF(reg);
                                  }
                                }}
                                disabled={isGenerating === reg.id}
                                className="flex items-center gap-2 px-6 py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-stone-800 transition-all shadow-sm group disabled:opacity-50"
                              >
                                <Printer size={18} className={`${isGenerating === reg.id ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform`} />
                                {isGenerating === reg.id ? 'Gerando...' : 'Imprimir'}
                              </button>

                              {/* Hidden PDF component for generation */}
                              {isGenerating === reg.id && (
                                <RegistrationSummaryPDF 
                                  ref={pdfRef}
                                  registration={reg}
                                  opportunity={opportunities.find(o => o.id === reg.opportunityId) || { name: reg.data?.opportunityName || 'Edital' } as any}
                                  agent={myAgent || agents.find(a => a.id === reg.userId)!}
                                />
                              )}
                              <button 
                                onClick={() => {
                                  contentService.getContentById('opportunity', reg.opportunityId).then(opp => {
                                    if (opp) {
                                      setSelectedContent({ ...opp, registration: reg });
                                      setView('opportunity_registration');
                                    }
                                  });
                                }}
                                className="flex items-center gap-2 px-6 py-4 bg-stone-50 text-stone-900 rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-stone-900 hover:text-white transition-all shadow-sm"
                              >
                                Detalhes
                                <ChevronRight size={18} />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="bg-white rounded-[2rem] border border-dashed border-stone-200 py-20 text-center">
                     <p className="text-stone-400 font-black text-xs uppercase tracking-[0.2em]">Nenhuma inscrição recebida para este edital ainda.</p>
                   </div>
                 )}
               </div>
            </div>
          );
        }

        if (editingContent && editingContent.type === 'opportunity') {
          return (
            <ContentEditForm 
              type="opportunity"
              initialData={editingContent.data}
              onSave={handleSaveContent}
              onCancel={() => setEditingContent(null)}
              isAdmin={isAdmin}
            />
          );
        }

        return (
          <div className="space-y-8">
            <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                 <div>
                   <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-2 tracking-tighter">
                     {isAdmin ? 'Gerenciar Oportunidades' : 'Minhas Oportunidades'}
                   </h2>
                   <p className="text-stone-400 text-sm font-medium">Editais e oportunidades que você gerencia no sistema.</p>
                 </div>
                 <button 
                   onClick={() => setEditingContent({ type: 'opportunity' })}
                   className="flex items-center gap-2 px-6 py-4 bg-[#0070BA] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform shadow-xl"
                 >
                   <PlusCircle size={18} />
                   Criar Nova Oportunidade
                 </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {opportunities.length > 0 ? (
                  opportunities.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="flex-1">
                          <h4 className="text-xl font-black text-stone-900 uppercase tracking-tighter group-hover:text-[#0070BA] transition-colors">{item.name}</h4>
                          <div className="flex gap-4 mt-2">
                             <span className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">ID: {item.id.slice(0, 8).toUpperCase()}</span>
                             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                               item.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                             }`}>
                               {item.status === 'open' ? 'Aberto' : 'Encerrado'}
                             </span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          {isAdmin && (
                            <button 
                              onClick={() => setViewingRegistrations(item.id)}
                              className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-tighter border border-blue-100 shadow-sm"
                            >
                               <Users size={16} />
                               Inscrições ({registrations.filter(r => r.opportunityId === item.id).length})
                            </button>
                          )}
                          <button onClick={() => setEditingContent({ type: 'opportunity', data: item })} className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-900 hover:text-white transition-all">
                             <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteContent('opportunity', item.id)} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-stone-50 rounded-3xl border border-dashed border-stone-200 py-16 text-center">
                    <p className="text-stone-400 font-black text-[10px] uppercase tracking-[0.2em]">Você ainda não publicou nenhuma oportunidade.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      }

      case 'my_opportunities': {
        return (
          <div className="space-y-8">
            {/* Minhas Inscrições em Outras Oportunidades */}
            <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-stone-100">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-2 tracking-tighter">Editais e Inscrições</h2>
                    <p className="text-stone-400 text-sm font-medium">Acompanhe o status e edite suas inscrições ativas.</p>
                  </div>
                  <button 
                    onClick={() => setView('oportunidades')}
                    className="flex items-center gap-2 px-6 py-4 bg-[#5A5A40] text-white rounded-2xl font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform shadow-xl"
                  >
                    <Lightbulb size={18} />
                    Explorar Oportunidades
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {registrations.length > 0 ? (
                   registrations.map((reg) => (
                     <div key={reg.id} className="bg-stone-50 rounded-3xl p-6 border border-stone-100 group">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                           <div>
                              <div className="flex items-center gap-3 mb-2">
                                 <span className="text-[10px] font-black text-red-500 font-mono">{reg.registrationNumber}</span>
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                                   reg.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                                   reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                                 }`}>
                                   {reg.status === 'submitted' ? 'Enviada' : reg.status === 'approved' ? 'Aprovada' : 'Rascunho'}
                                 </span>
                              </div>
                              <h4 className="text-lg font-black text-stone-900 uppercase tracking-tighter">
                                {reg.data?.identification?.projectName || 'Inscrição Sem Título'}
                              </h4>
                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter mt-1">
                                {new Date(reg.updatedAt?.seconds * 1000).toLocaleDateString('pt-BR')}
                              </p>
                           </div>
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => {
                                  if (reg.pdfUrl) {
                                    window.open(reg.pdfUrl, '_blank');
                                  } else {
                                    generatePDF(reg);
                                  }
                                }}
                                disabled={isGenerating === reg.id}
                                className="px-6 py-3 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                              >
                                <Printer size={14} className={isGenerating === reg.id ? 'animate-bounce' : ''} />
                                {isGenerating === reg.id ? 'Gerando...' : 'Imprimir'}
                              </button>

                              {/* Hidden PDF component for generation */}
                              {isGenerating === reg.id && (
                                <RegistrationSummaryPDF 
                                  ref={pdfRef}
                                  registration={reg}
                                  opportunity={opportunities.find(o => o.id === reg.opportunityId) || { name: reg.data?.opportunityName || 'Edital' } as any}
                                  agent={myAgent || agents.find(a => a.id === reg.userId)!}
                                />
                              )}
                              <button 
                                onClick={() => setTrackingRegistration(reg)}
                                className="px-6 py-3 bg-[#0070BA] text-white rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                              >
                                Acompanhar
                                <ChevronRight size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRegistration(reg.id)}
                                className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                title="Excluir Inscrição"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="bg-stone-50 rounded-3xl border border-dashed border-stone-200 py-16 text-center">
                     <p className="text-stone-400 font-black text-[10px] uppercase tracking-[0.2em]">Você ainda não realizou nenhuma inscrição.</p>
                   </div>
                 )}
               </div>
            </section>
          </div>
        );
      }

      default:
        return (
          <div className="bg-white rounded-[2.5rem] border border-stone-100 p-20 text-center shadow-lg">
             <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
                <LayoutDashboard size={40} />
             </div>
             <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic mb-4">Seção em Desenvolvimento</h3>
             <p className="text-stone-500 max-w-sm mx-auto mb-10">Você poderá gerenciar seus {activeTab.replace('my_', '')} diretamente por este painel em breve.</p>
             <div className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-full text-[10px] font-black uppercase tracking-tighter">
                <Bell size={14} className="animate-bounce" />
                Novidades chegando
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 bg-white border-r border-stone-100 p-6 md:p-8 flex flex-col pt-24 md:pt-32">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-[#0070BA] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 font-black text-xl italic uppercase">
              {effectiveProfile.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Painel do Usuário</p>
              <h3 className="text-lg font-black text-stone-900 uppercase tracking-tighter leading-tight italic truncate max-w-[140px]">
                {effectiveProfile.socialName || effectiveProfile.fullName || 'Usuário'}
              </h3>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${
                  activeTab === item.id 
                    ? 'bg-[#5A5A40] text-white shadow-xl translate-x-2' 
                    : 'text-stone-400 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-stone-300 group-hover:text-stone-600'} />
                <span className="text-[11px] font-black uppercase tracking-tighter whitespace-nowrap">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-10 border-t border-stone-50">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-red-500 transition-colors uppercase font-black text-[11px] tracking-tighter"
          >
            <LogOut size={20} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-[#F8F9FA] pt-24 md:pt-32">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-stone-400 mb-2 pl-32 md:pl-48 lg:pl-0">
              <button onClick={() => window.location.href = '/'} className="hover:text-stone-900 transition-colors">INICIO</button>
              <span>›</span>
              <span className="text-stone-900">{menuItems.find(i => i.id === activeTab)?.label.toUpperCase()}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter uppercase italic">{menuItems.find(i => i.id === activeTab)?.label}</h1>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
