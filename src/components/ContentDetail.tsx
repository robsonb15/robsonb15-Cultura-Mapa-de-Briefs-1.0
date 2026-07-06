import { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Tag, 
  Download, 
  Share2, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube,
  Globe,
  ChevronRight,
  Info,
  Link as LinkIcon,
  CheckCircle2,
  Users,
  ShieldCheck,
  Edit3,
  Trash2,
  Clock,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CulturalOpportunity } from '../types';

interface ContentDetailProps {
  content: any;
  type?: 'space' | 'event' | 'opportunity' | 'project';
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegister?: () => void;
  isOwnerOrAdmin?: boolean;
  badgeUrl?: string;
}

export default function ContentDetail({ content, type, onBack, onEdit, onDelete, onRegister, isOwnerOrAdmin, badgeUrl }: ContentDetailProps) {
  const [activeTab, setActiveTab] = useState('info');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPhaseDates = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Data a definir';
    
    const parseAndFormat = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const dStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const hasTime = hours !== 0 || minutes !== 0;
        
        if (hasTime) {
          const tStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return `${dStr} às ${tStr}`;
        }
        return dStr;
      } catch (e) {
        return dateStr;
      }
    };

    if (startDate && endDate) {
      return `de ${parseAndFormat(startDate)} a ${parseAndFormat(endDate)}`;
    } else if (startDate) {
      return `Início em ${parseAndFormat(startDate)}`;
    } else {
      return `Prazo final: ${parseAndFormat(endDate!)}`;
    }
  };

  const downloadFile = async (url: string, defaultName: string) => {
    if (!url || url === '#' || url === '') return;

    const sanitizeFilename = (name: string, contentType?: string) => {
      let ext = '';
      if (contentType) {
        if (contentType.includes('pdf')) ext = '.pdf';
        else if (contentType.includes('word') || contentType.includes('officedocument.wordprocessing')) ext = '.docx';
        else if (contentType.includes('sheet') || contentType.includes('officedocument.spreadsheetml')) ext = '.xlsx';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
        else if (contentType.includes('png')) ext = '.png';
        else if (contentType.includes('text/plain')) ext = '.txt';
      }

      let finalName = name;
      const hasExt = name.includes('.') && name.lastIndexOf('.') > name.length - 6;
      if (!hasExt && ext) {
        finalName = `${name}${ext}`;
      }
      return finalName;
    };

    if (url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      // 1. Try to fetch the URL (handles data: URLs and CORS-enabled HTTP/HTTPS URLs natively)
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const finalName = sanitizeFilename(defaultName, blob.type || '');
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 150);
    } catch (err) {
      console.warn('Direct fetch download failed, using fallback:', err);
      
      // 2. Fallback for data URLs if native fetch failed
      if (url.startsWith('data:')) {
        try {
          const parts = url.split(';base64,');
          if (parts.length >= 2) {
            let contentType = 'application/octet-stream';
            const mimeMatch = parts[0].match(/^data:(.*?)(;|$)/);
            if (mimeMatch && mimeMatch[1]) {
              contentType = mimeMatch[1];
            }

            let base64Data = parts[1].trim().replace(/\s/g, '');
            if (base64Data.includes('%')) {
              base64Data = decodeURIComponent(base64Data);
            }
            
            const paddingNeeded = (4 - (base64Data.length % 4)) % 4;
            if (paddingNeeded > 0) {
              base64Data += '='.repeat(paddingNeeded);
            }

            const raw = window.atob(base64Data);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i);
            }
            
            const blob = new Blob([uInt8Array], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            const finalName = sanitizeFilename(defaultName, contentType);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 150);
            return;
          }
        } catch (manualErr) {
          console.error('Manual base64 decode failed:', manualErr);
        }
      }

      // 3. Third fallback for standard cross-origin URLs blocked by CORS
      if (!url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        console.error('Data URL could not be processed.');
      }
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto pl-20 md:pl-28 pr-4 md:pr-8 py-3 flex items-center gap-1 text-[11px] font-black uppercase tracking-tight text-stone-900">
          <button onClick={onBack} className="hover:text-stone-600 transition-colors uppercase">OPORTUNIDADES</button>
          <span className="text-stone-900 font-bold mx-1">›</span>
          <span className="text-stone-500">{content.name.toUpperCase()}</span>
        </div>
      </div>

      {/* Hero Banner Section */}
      <div className="relative h-64 md:h-[400px] w-full overflow-hidden bg-stone-200">
        {content.bannerUrl ? (
          <img src={content.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#0070BA]/10 flex items-center justify-center">
             <div className="text-[#0070BA]/5 font-black text-[140px] select-none tracking-tighter uppercase italic">Cultura</div>
             <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        {/* Profile Header Overlap */}
        <div className="flex flex-col md:flex-row items-start -mt-20 md:-mt-24 mb-16 relative z-10">
          {/* Avatar Area */}
          <div className="shrink-0 mb-6 md:mb-0">
             <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-[6px] border-white shadow-2xl bg-white flex items-center justify-center">
              <img 
                src={content.imageUrl || "https://i.postimg.cc/L6F2L3yw/logo-breves.png"} 
                alt={content.name} 
                className={`w-full h-full ${content.imageUrl ? 'object-cover' : 'object-contain p-4 opacity-40'}`}
              />
            </div>
            {content.social && (
              <div className="mt-6 flex justify-center gap-6 text-stone-400">
                 {content.social.instagram && (
                   <a href={`https://instagram.com/${content.social.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors">
                     <Instagram size={20} />
                   </a>
                 )}
                 {content.social.facebook && (
                   <a href={content.social.facebook.startsWith('http') ? content.social.facebook : `https://facebook.com/${content.social.facebook}`} target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors">
                     <Facebook size={20} />
                   </a>
                 )}
                 {content.social.youtube && (
                   <a href={content.social.youtube.startsWith('http') ? content.social.youtube : `https://youtube.com/@${content.social.youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors">
                     <Youtube size={20} />
                   </a>
                 )}
                 {content.social.website && (
                   <a href={content.social.website.startsWith('http') ? content.social.website : `https://${content.social.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors">
                     <Globe size={20} />
                   </a>
                 )}
              </div>
            )}
          </div>

          {/* Title Area */}
          <div className="flex-1 md:ml-12 md:pt-28">
            <h1 className="text-3xl md:text-[52px] font-black text-stone-900 uppercase tracking-tighter leading-[0.9] mb-4 italic flex items-center gap-4">
              {content.name}
              {content.official && (
                badgeUrl ? (
                  <img 
                    src={badgeUrl} 
                    alt="Selo oficial" 
                    className="w-10 h-10 md:w-16 md:h-16 rounded-full object-contain bg-white shadow-2xl shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-amber-50 border-2 border-amber-500 shadow-xl flex items-center justify-center shrink-0" title="Selo Oficial">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 md:w-8 md:h-8 text-amber-600 fill-amber-400">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )
              )}
            </h1>
            
            <div className="flex flex-wrap items-center gap-8 mb-8 text-[11px] font-black text-stone-400 uppercase tracking-[0.2em]">
               <div className="flex flex-col">
                  <span className="text-stone-300 mb-1">ID:</span>
                  <span className="text-stone-900">{content.id.slice(-6).toUpperCase()}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-stone-300 mb-1">TIPO:</span>
                  <span className="text-red-600">{(content.type || 'CULTURAL').toUpperCase()}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-stone-300 mb-1">AGENTE VINCULADO:</span>
                  <span className="text-[#0070BA]">{content.agentLabel || 'PREFEITURA MUNICIPAL'}</span>
               </div>
            </div>

            <p className="text-stone-500 text-sm md:text-base leading-relaxed max-w-4xl font-medium">
               {content.description}
            </p>
            
            {(content.address?.text || content.location) && (
              <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                <MapPin size={14} className="text-[#0070BA]" />
                <span>LOCAL: <span className="text-stone-900">{content.address?.text || content.location}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mb-10 flex border-b border-stone-100">
           <button 
             onClick={() => setActiveTab('info')}
             className={`px-8 py-4 text-xs font-black uppercase tracking-tighter transition-all relative ${activeTab === 'info' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`}
           >
             Informações
             {activeTab === 'info' && <motion.div layoutId="tab-opt" className="absolute bottom-0 left-0 right-0 h-1 bg-stone-900" />}
           </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 pb-24">
          <div className="lg:col-span-8 space-y-16">
             {/* Timeline Section for Opportunities/Events */}
             {((content.startDate || content.deadline) || (content.timelinePhases && content.timelinePhases.length > 0)) && (
               <section>
                  <div className="flex flex-col gap-1 mb-8">
                    <h2 className="text-[32px] font-black text-stone-900 uppercase tracking-tighter italic leading-none">Cronograma</h2>
                    <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.4em] mb-6">Etapas e Fases</span>
                  </div>

                  {content.timelinePhases && content.timelinePhases.length > 0 ? (
                    <div className="bg-stone-50 rounded-[2.5rem] p-8 md:p-12 border border-stone-100 shadow-inner relative overflow-hidden">
                      <div className="relative pl-8 border-l-2 border-stone-300/80 space-y-12 py-2">
                        {content.timelinePhases.map((phase: any, index: number) => (
                          <div key={index} className="relative group">
                            {/* Dot */}
                            <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-stone-700 border-4 border-stone-50 transition-all group-hover:bg-stone-900 group-hover:scale-110 shadow-xs" />
                            
                            {/* Content */}
                            <div className="space-y-1">
                              <h3 className="text-stone-900 font-bold font-sans text-sm md:text-base tracking-tight leading-snug">
                                {phase.name}
                              </h3>
                              <p className="text-stone-600 text-xs md:text-sm font-medium">
                                {formatPhaseDates(phase.startDate, phase.endDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 rounded-[2rem] p-10 border border-stone-100 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Calendar size={120} className="text-stone-900" />
                       </div>
                       <p className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight leading-tight">
                         {content.startDate && <>De <span className="text-[#0070BA]">{formatDate(content.startDate)}</span></>}
                         {content.deadline && <> a <span className="text-[#0070BA]">{formatDateTime(content.deadline)}</span></>}
                       </p>
                    </div>
                  )}
               </section>
             )}

             {/* Registration Card for Opportunities */}
             {type === 'opportunity' && (
               <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-stone-100 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#0070BA]" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-[32px] font-black text-stone-900 uppercase tracking-tighter italic mb-2">Inscreva-se</h2>
                      <p className="text-stone-400 text-sm font-medium">Selecione uma opção abaixo e clique no botão para se inscrever</p>
                    </div>
                    {content.status && (
                      <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight ${content.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                         STATUS: {content.status === 'open' ? 'Inscrições Abertas' : 'Encerrado'}
                      </div>
                    )}

                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                     <div className="md:col-span-8">
                        <select className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-5 text-stone-900 text-sm font-black outline-none focus:ring-2 focus:ring-[#0070BA]/20 appearance-none">
                           <option>Selecione o tipo de proponente</option>
                           <option>Pessoa Física</option>
                           <option>Pessoa Jurídica</option>
                        </select>
                     </div>
                     <div className="md:col-span-4">
                        <button 
                          onClick={onRegister}
                          className="w-full h-full bg-[#0070BA] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-[#005FA3] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                        >
                           Fazer inscrição
                        </button>
                     </div>
                  </div>
               </section>
             )}

             {/* Presentation Section */}
             <section>
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-[32px] font-black text-stone-900 uppercase tracking-tighter italic leading-none">Apresentação</h2>
                </div>
                <div className="prose prose-stone max-w-none text-stone-600 font-medium text-[16px] leading-[1.8] space-y-6">
                   {content.presentation || content.description || 'Nenhuma apresentação detalhada disponível.'}
                </div>
             </section>

             {/* Downloads Section */}
             <section>
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-[32px] font-black text-stone-900 uppercase tracking-tighter italic leading-none">Arquivos para download</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Model Files first for opportunities */}
                   {type === 'opportunity' && content.modelFiles && Object.entries(content.modelFiles).map(([key, url]) => {
                      if (!url) return null;
                      const label = content.modelLabels?.[key] || (key === 'representation' ? 'Declaração de Representação' :
                               key === 'noCnpj' ? 'Declaração Coletivo sem CNPJ' :
                               key === 'ethnicRacial' ? 'Declaração Étnico Racial' :
                               key === 'disability' ? 'Declaração de PCD' :
                               key === 'report' ? 'Relatório de Execução' :
                               key === 'form' ? 'Formulário de Recurso' :
                               key === 'term' ? 'Termo de Execução' :
                               key === 'plan' ? 'Plano de Trabalho' : key.toUpperCase());
                      return (
                        <button 
                          key={`model-${key}`} 
                          onClick={() => downloadFile(url as string, label)} 
                          className="flex items-center text-left w-full gap-6 p-6 bg-[#0070BA]/5 hover:bg-[#0070BA]/10 rounded-3xl border border-[#0070BA]/10 transition-all group shadow-sm cursor-pointer"
                        >
                           <div className="shrink-0 w-12 h-12 bg-[#0070BA] text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Download size={24} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-stone-900 uppercase tracking-tight truncate">
                                {label}
                              </p>
                              <p className="text-[9px] font-black text-[#0070BA] uppercase tracking-tighter mt-0.5">MODELO PARA DOWNLOAD</p>
                           </div>
                        </button>
                      );
                   })}
                   {(content.files || []).map((file: any, i: number) => {
                      if (!file || !file.url || file.url === '#') return null;
                      return (
                        <button 
                          key={i} 
                          onClick={() => downloadFile(file.url, file.name)} 
                          className="flex items-center text-left w-full gap-6 p-6 bg-stone-50 hover:bg-stone-100 rounded-3xl border border-stone-100 transition-all group shadow-sm cursor-pointer"
                        >
                           <div className="shrink-0 w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Download size={24} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-stone-900 uppercase tracking-tight truncate">{file.name}</p>
                              <p className="text-[9px] font-black text-stone-400 uppercase tracking-tighter mt-0.5">ARQUIVO ADICIONAL</p>
                           </div>
                        </button>
                      );
                   })}
                </div>
             </section>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-12">
             {/* Timeline Sidebar Vertical */}
             {(content.startDate || content.deadline) && (
               <div className="relative pl-8 space-y-10">
                  <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-stone-100" />
                  
                  {content.startDate && (
                    <div className="relative">
                       <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-lg shadow-emerald-200" />
                       <p className="text-[11px] font-black text-stone-900 uppercase tracking-tighter mb-1">Início</p>
                       <p className="text-[11px] text-stone-400 font-black uppercase tracking-tight">{formatDate(content.startDate)}</p>
                    </div>
                  )}

                  {content.deadline && (
                    <div className="relative">
                       <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-stone-200 border-4 border-white shadow-md shadow-stone-100" />
                       <p className="text-[11px] font-black text-stone-900 uppercase tracking-tighter leading-none mb-1">Prazo Final</p>
                       <p className="text-[11px] text-stone-400 font-black">{formatDateTime(content.deadline)}</p>
                    </div>
                  )}
               </div>
             )}

             {/* Interest Areas Tags */}
             <div>
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-6">Informações Adicionais</h3>
                <div className="flex flex-wrap gap-2">
                   {(content.areas || content.areasOfActivity || []).map((area: string, i: number) => (
                      <span key={i} className="px-4 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-tight shadow-md">
                         {area}
                      </span>
                   ))}
                </div>
             </div>

             {/* Social Feed */}
             {content.social && (content.social.instagram || content.social.facebook || content.social.youtube || content.social.website) && (
               <div>
                  <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-6">Redes sociais</h3>
                  <div className="space-y-2">
                    {content.social.instagram && (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-400 shadow-sm">
                            <Instagram size={16} />
                         </div>
                         <span className="text-xs font-black text-stone-600 tracking-tight">{content.social.instagram.startsWith('@') ? content.social.instagram : `@${content.social.instagram}`}</span>
                      </div>
                    )}
                    {content.social.facebook && (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-400 shadow-sm">
                            <Facebook size={16} />
                         </div>
                         <span className="text-xs font-black text-stone-600 tracking-tight">Facebook</span>
                      </div>
                    )}
                    {content.social.youtube && (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-400 shadow-sm">
                            <Youtube size={16} />
                         </div>
                         <span className="text-xs font-black text-stone-600 tracking-tight">YouTube Canal</span>
                      </div>
                    )}
                    {content.social.website && (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-400 shadow-sm">
                            <Globe size={16} />
                         </div>
                         <span className="text-xs font-black text-stone-600 tracking-tight truncate">{content.social.website.replace('https://', '').replace('http://', '')}</span>
                      </div>
                    )}
                  </div>
               </div>
             )}

             {/* Action Tags */}
             {content.link && (
               <div>
                  <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-6 focus-within:ring-0">Site / Link</h3>
                  <a href={content.link} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-700 transition-all shadow-xl truncate px-6 mb-3 text-center">
                     {content.link.replace('https://', '').replace('http://', '')}
                  </a>
               </div>
             )}

             {/* Admin Controls */}
             <div className="pt-8 border-t border-stone-100 space-y-6">
                <div>
                   <h4 className="text-[10px] font-black text-stone-300 uppercase tracking-tighter mb-4">Administrado por</h4>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center text-white font-black text-sm shadow-xl">
                         <ShieldCheck size={24} />
                      </div>
                      <p className="text-xs font-black text-stone-900 uppercase tracking-tight">Administrador do Sistema</p>
                   </div>
                </div>

                {isOwnerOrAdmin && (
                   <div className="flex flex-col gap-3 pt-6">
                      <button 
                        onClick={onEdit}
                        className="w-full bg-[#0070BA] text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-tighter hover:bg-[#005FA3] transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                         <Edit3 size={18} />
                         Editar Registro
                      </button>
                      <button 
                        onClick={onDelete}
                        className="w-full bg-white text-red-600 border-2 border-red-50 py-4 rounded-xl font-black text-[11px] uppercase tracking-tighter hover:bg-red-50 transition-all flex items-center justify-center gap-3"
                      >
                         <Trash2 size={18} />
                         Remover Registro
                      </button>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
