import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CulturalAgent, AgentType } from '../types';
import { generateAgentReport } from '../lib/pdf-utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube, 
  Share2, 
  Plus, 
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Send,
  Printer
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgentProfileProps {
  agent: CulturalAgent;
  onEdit?: () => void;
  isOwner?: boolean;
}

export default function AgentProfile({ agent, onEdit, isOwner }: AgentProfileProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  const galleryImages = agent.images?.gallery || [];
  const galleryVideos = agent.videos || [];

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex + 1) % galleryImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex - 1 + galleryImages.length) % galleryImages.length);
  };

  const nextVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedVideoIndex === null) return;
    setSelectedVideoIndex((selectedVideoIndex + 1) % galleryVideos.length);
  };

  const prevVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedVideoIndex === null) return;
    setSelectedVideoIndex((selectedVideoIndex - 1 + galleryVideos.length) % galleryVideos.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Photo Keyboard Nav
      if (selectedImageIndex !== null) {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'Escape') setSelectedImageIndex(null);
      }
      // Video Keyboard Nav
      if (selectedVideoIndex !== null) {
        if (e.key === 'ArrowRight') nextVideo();
        if (e.key === 'ArrowLeft') prevVideo();
        if (e.key === 'Escape') setSelectedVideoIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, selectedVideoIndex]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let lat = agent.address?.lat || -1.6891195;
    let lng = agent.address?.lng || -50.4843378;

    // Smart override: if coordinates are old fallback, or if address contains "rio branco" / "aeroporto" or agent name contains "teste"
    const addressStr = JSON.stringify(agent.address || {}).toLowerCase();
    const agentNameLower = (agent.name || '').toLowerCase();
    const isRioBranco = addressStr.includes('rio branco') || addressStr.includes('aeroporto') || agentNameLower.includes('teste');
    const isOldFallback = (Math.abs(lat - (-1.681123)) < 0.005 && Math.abs(lng - (-50.480234)) < 0.005) || !agent.address?.lat;

    if (isRioBranco && isOldFallback) {
      lat = -1.6891195;
      lng = -50.4843378;
    }

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 17);

      const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });

      const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: 'Google Satellite'
      });

      // Default layer to Satellite (Camadas)
      satellite.addTo(map);

      // Add layer control
      L.control.layers({
        "Satélite (Camadas)": satellite,
        "Mapa": streets
      }, {}, { position: 'topright' }).addTo(map);

      // Custom marker icon using the beautiful orange center pin styling
      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-8px, -8px);">
          <div style="background-color: #E16238; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
            <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: white;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid white; margin-top: -1px;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'profile-leaflet-marker',
        iconSize: [34, 40],
        iconAnchor: [17, 40]
      });

      L.marker([lat, lng], { icon: customIcon }).addTo(map);

      mapRef.current = map;
    } else {
      mapRef.current.setView([lat, lng], 17);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [agent.address?.lat, agent.address?.lng, agent.name]);

  // Helper to get embed URL
  const getVideoEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <Instagram size={20} />;
    if (p.includes('facebook')) return <Facebook size={20} />;
    if (p.includes('twitter')) return <Twitter size={20} />;
    if (p.includes('youtube')) return <Youtube size={20} />;
    return <Globe size={20} />;
  };

  const shareUrl = () => {
    if (navigator.share) {
      navigator.share({
        title: agent.name,
        text: `Confira o perfil de ${agent.name} no Mapa Cultural`,
        url: window.location.href,
      });
    }
  };

  const getFormattedAddress = () => {
    const addr = agent.address;
    if (!addr) return "Avenida Rio Branco, nº 2022, Bairro Aeroporto, Breves, PA - CEP: 68800-000";
    
    const parts: string[] = [];
    if (addr.street) {
      if (addr.number) {
        parts.push(`${addr.street}, ${addr.number}`);
      } else {
        parts.push(addr.street);
      }
    }
    if (addr.neighborhood) {
      parts.push(addr.neighborhood);
    }
    if (addr.text) {
      parts.push(addr.text);
    } else {
      parts.push("Breves - PA");
    }
    if (addr.zipCode) {
      parts.push(`CEP: ${addr.zipCode}`);
    }
    
    if (parts.length > 0) {
      return parts.join(' - ').toUpperCase();
    }
    
    return "Avenida Rio Branco, nº 2022, Bairro Aeroporto, Breves, PA - CEP: 68800-000".toUpperCase();
  };

  // Filter unique social links by platform to avoid duplications in UI
  const uniqueSocialLinks = agent.socialLinks?.reduce((acc: any[], current) => {
    const platform = current.platform.toLowerCase();
    const exists = acc.find(item => item.platform.toLowerCase() === platform);
    
    // Check if URL is more than just a base domain
    const url = current.url.toLowerCase().trim();
    const isBaseUrlOnly = (
      (platform === 'instagram' && (url === 'https://instagram.com/' || url === 'https://instagram.com')) ||
      (platform === 'facebook' && (url === 'https://facebook.com/' || url === 'https://facebook.com')) ||
      (platform === 'youtube' && (url === 'https://youtube.com/' || url === 'https://youtube.com' || url === 'https://youtube.com/@'))
    );

    if (!exists && current.url && !isBaseUrlOnly) {
      acc.push(current);
    }
    return acc;
  }, []) || [];

  return (
    <div className="bg-white min-h-screen text-[#141414] font-sans">
      {/* Breadcrumbs (Screenshot Style) */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto pl-20 md:pl-28 pr-4 md:pr-8 py-3 flex items-center gap-1 text-[11px] font-black uppercase tracking-tight text-stone-900">
          <button onClick={() => window.location.reload()} className="hover:text-stone-600 transition-colors">INICIO</button>
          <span className="text-stone-900 font-bold mx-1">›</span>
          <button className="hover:text-stone-600 transition-colors uppercase">AGENTES</button>
          <span className="text-stone-900 font-bold mx-1">›</span>
          <span className="text-stone-900">{agent.name.toUpperCase()}</span>
        </div>
      </div>

      {/* Hero Banner Section */}
      <div className="relative h-64 md:h-[480px] w-full overflow-hidden bg-stone-200">
        {agent.images?.banner ? (
          <img src={agent.images.banner} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#5A5A40]/10 flex items-center justify-center">
             <div className="text-[#5A5A40]/5 font-black text-[180px] select-none tracking-tighter uppercase italic">Mapa Cultural</div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        {/* Profile Card Header with overlap matching screenshot */}
        <div className="flex flex-col md:flex-row items-start md:items-start -mt-20 md:-mt-24 mb-10 relative z-10 px-4 md:px-0">
          {/* Avatar Area */}
          <div className="shrink-0 mb-6 md:mb-0 flex flex-col items-center">
             <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-[6px] border-white shadow-xl bg-white">
              <img 
                src={agent.images?.profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=5A5A40&color=fff&size=512`} 
                alt={agent.name} 
                className="w-full h-full object-cover"
              />
            </div>
            {agent.address?.text && (
              <div className="mt-8 flex justify-center gap-6">
                {uniqueSocialLinks.slice(0, 3).map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-stone-800 hover:text-[#5A5A40] transition-colors"
                    title={link.platform}
                  >
                    {getSocialIcon(link.platform)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Title Area */}
          <div className="flex-1 md:ml-12 md:pt-28">
            <h1 className="text-3xl md:text-[56px] font-black text-[#141414] uppercase tracking-tighter leading-none mb-1 flex items-center gap-4">
              {agent.name}
              {agent.certified && (
                <img 
                  src="https://i.postimg.cc/Zq16HdkJ/pefil.png" 
                  alt="Agente Certificado" 
                  className="w-10 h-10 md:w-16 md:h-16 rounded-full object-contain bg-white shadow-2xl shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
            </h1>
            {agent.socialName && (
              <p className="text-lg font-black text-stone-400 uppercase tracking-tighter mb-4 italic">
                {agent.socialName}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-6 mb-6 text-[11px] font-black text-stone-500 uppercase tracking-tighter">
              <div className="flex items-center gap-1.5 focus-within:ring-0">
                <span className="text-stone-400 font-black uppercase">ID:</span>
                <span className="text-stone-900 font-black">{agent.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5 focus-within:ring-0">
                <span className="text-stone-400 font-black uppercase">TIPO:</span>
                <span className="text-[#9B511E] font-black uppercase">{agent.type === AgentType.INDIVIDUAL ? 'INDIVIDUAL' : 'COLETIVO'}</span>
              </div>
            </div>

            <div className="text-[13px] md:text-[14px] text-stone-700 leading-relaxed font-normal max-w-4xl">
              {agent.shortDescription && (!agent.description || !agent.description.toLowerCase().includes(agent.shortDescription.toLowerCase())) && (
                <div className="mb-6">
                  <p className="text-stone-700 font-normal mb-1 border-l-4 border-[#5A5A40] pl-4 py-1 italic">
                    {agent.shortDescription}
                  </p>
                </div>
              )}
              {agent.externalLink && (
                <div className="mb-6">
                  <a 
                    href={agent.externalLink.startsWith('http') ? agent.externalLink : `https://${agent.externalLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#9B511E] hover:text-[#5A5A40] transition-colors font-bold group mt-2"
                  >
                    <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="border-b border-transparent group-hover:border-[#5A5A40] pb-0.5">{agent.externalLink}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selection matching screenshot icon/style */}
        <div className="mb-10 flex items-center border-b border-stone-200">
            <div className="px-6 py-4 flex items-center gap-2 border-b-4 border-stone-900 -mb-[2px]">
              <div className="w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center">
                 <div className="w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center text-white text-[10px] font-black">i</div>
              </div>
              <span className="font-black text-stone-900 uppercase tracking-tighter text-[13px]">Informações</span>
            </div>
        </div>

        {/* Content Layout matching screenshot grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 pb-24">
          {/* Left Side */}
          <div className="lg:col-span-8 space-y-16">
            
             {/* Dados pessoais matching screenshot */}
             <section className="space-y-4">
               <div>
                 <h2 className="text-[16px] font-black text-stone-900 uppercase tracking-tight">Dados pessoais</h2>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                 <div>
                   <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-tight mb-2">Telefone público</h3>
                   <div className="bg-[#FAF9F6] border-none rounded-sm px-6 py-4 text-stone-950 font-bold text-sm tracking-wide shadow-sm min-h-[52px] flex items-center">
                     {agent.contactInfo?.phone || '(91) 99103-2228'}
                   </div>
                 </div>
                 <div>
                   <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-tight mb-2">E-mail público</h3>
                   <div className="bg-[#FAF9F6] border-none rounded-sm px-6 py-4 text-stone-950 font-bold text-sm select-all min-h-[52px] flex items-center break-all">
                     {agent.contactInfo?.email || 'robsonstudio15@gmail.com'}
                   </div>
                 </div>
               </div>
             </section>

             {/* Endereço matching screenshot */}
             <section className="space-y-4">
               <div>
                 <h3 className="text-[16px] font-black text-[#141414] uppercase tracking-tight">Endereço</h3>
               </div>
               <p className="text-[13px] font-bold text-stone-800 uppercase tracking-tight leading-relaxed">
                 {getFormattedAddress()}
               </p>
               
               {/* Enhanced map container with Real Leaflet Map */}
               <div className="h-[420px] w-full bg-[#FAF9F6] border border-stone-200 relative overflow-hidden rounded-md group">
                 {/* Leaflet Zoom Control overlay */}
                 <div className="absolute top-4 left-4 z-[1000] flex flex-col bg-white border border-stone-300 rounded shadow-md divide-y divide-stone-250 select-none pointer-events-auto">
                   <div className="w-8 h-8 flex items-center justify-center text-[18px] font-black text-stone-700 cursor-pointer hover:bg-stone-50" title="Aproximar" onClick={() => mapRef.current?.zoomIn()}>+</div>
                   <div className="w-8 h-8 flex items-center justify-center text-[18px] font-black text-stone-700 cursor-pointer hover:bg-stone-50" title="Afastar" onClick={() => mapRef.current?.zoomOut()}>-</div>
                 </div>

                 <div
                   ref={mapContainerRef}
                   className="w-full h-full z-0"
                 />

                 {/* Leaflet attribution watermark */}
                 <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur px-2 py-0.5 text-[9px] font-bold text-stone-500 uppercase tracking-tighter select-none border border-stone-200/50 rounded pointer-events-none z-[1000]">
                   Leaflet
                 </div>
               </div>
             </section>

            {/* Detailed Description */}
            <section>
               <div className="flex flex-col gap-1 mb-8">
                 <h2 className="text-[32px] font-black text-[#141414] uppercase tracking-tighter">
                    {agent.type === AgentType.COLLECTIVE ? 'Histórico do Coletivo' : 'Descrição Detalhada'}
                 </h2>
                 <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] leading-none">
                    INFORMAÇÕES E TRAJETÓRIA
                 </span>
               </div>
               <div className="prose prose-stone max-w-none text-stone-800 font-medium text-[15px] leading-relaxed">
                 <ReactMarkdown>{agent.description || '_Nenhuma descrição detalhada fornecida._'}</ReactMarkdown>
               </div>
            </section>

            {/* Multimedia Galleries */}
            {galleryVideos.length > 0 && (
              <section className="mt-16">
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-[28px] font-black text-[#141414] uppercase tracking-tighter">Galeria de Vídeo</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {galleryVideos.map((url, idx) => (
                    <div key={idx} className="cursor-pointer group" onClick={() => setSelectedVideoIndex(idx)}>
                      <div className="aspect-video relative rounded-lg bg-black overflow-hidden shadow-sm">
                        <img src={`https://img.youtube.com/vi/${url.split('v=')[1]?.split('&')[0] || url.split('/').pop()}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Video" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play size={24} className="text-white fill-white opacity-60 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {galleryImages.length > 0 && (
              <section className="mt-16">
                <div className="flex flex-col gap-1 mb-8">
                  <h2 className="text-[28px] font-black text-[#141414] uppercase tracking-tighter">Galeria de Fotos</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {galleryImages.map((url, idx) => (
                    <div key={idx} className="aspect-square rounded-lg bg-stone-100 overflow-hidden shadow-sm border border-stone-200 cursor-pointer" onClick={() => setSelectedImageIndex(idx)}>
                      <img src={url} alt={`Gallery item ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Actuation Areas */}
            <div className="focus-within:ring-0">
              <h3 className="text-[12px] font-black text-stone-900 uppercase tracking-tight mb-3">Áreas de atuação</h3>
              <div className="flex flex-wrap gap-2">
                {agent.areasOfActivity && agent.areasOfActivity.length > 0 ? (
                  agent.areasOfActivity.map((area, idx) => (
                    <span key={idx} className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                      {area}
                    </span>
                  ))
                ) : (
                  <span className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                    Design
                  </span>
                )}
              </div>
            </div>

            {/* Segmento cultural */}
            <div className="focus-within:ring-0">
              <h3 className="text-[12px] font-black text-stone-900 uppercase tracking-tight mb-2">
                Segmento cultural <span className="text-red-500 font-bold lowercase italic text-[11px]">*obrigatório</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.tags && agent.tags.length > 0 ? (
                  agent.tags.slice(0, 1).map((tag, idx) => (
                    <span key={idx} className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                    Artes Visuais
                  </span>
                )}
              </div>
            </div>

            {/* Funções */}
            <div className="focus-within:ring-0">
              <h3 className="text-[12px] font-black text-stone-900 uppercase tracking-tight mb-3">Funções</h3>
              <div className="flex flex-wrap gap-2">
                {agent.tags && agent.tags.length > 1 ? (
                  agent.tags.slice(1).map((tag, idx) => (
                    <span key={idx} className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="px-5 py-2 bg-[#E16238] text-white rounded-[25px] text-[12px] font-bold tracking-tight shadow-sm">
                    {agent.tags && agent.tags.length === 1 ? agent.tags[0] : 'Design de Montagem'}
                  </span>
                )}
              </div>
            </div>

            {/* Share Section */}
            <div className="pt-8 border-t border-stone-100 focus-within:ring-0">
              <h3 className="text-[12px] font-black text-stone-900 uppercase tracking-tight mb-4">Compartilhar</h3>
              <div className="flex gap-4">
                <button onClick={shareUrl} className="text-[#1da1f2] hover:scale-110 transition-transform" title="Twitter"><Twitter size={20} /></button>
                <button onClick={shareUrl} className="text-[#3b5998] hover:scale-110 transition-transform" title="Facebook"><Facebook size={20} /></button>
                <button onClick={shareUrl} className="text-[#25d366] hover:scale-110 transition-transform" title="WhatsApp"><Phone size={20} /></button>
                <button onClick={shareUrl} className="text-[#0088cc] hover:scale-110 transition-transform" title="Telegram"><Send size={20} /></button>
              </div>
            </div>

            {isOwner && (
              <div className="pt-8 border-t border-stone-100">
                 <button 
                  onClick={onEdit}
                  className="w-full bg-stone-900 text-white px-6 py-4 rounded-xl font-black text-[12px] tracking-tighter uppercase hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-3 focus-within:ring-0"
                >
                  <Edit3 size={18} />
                  Editar Perfil
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Lightboxes */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-md p-4 md:p-10"
            onClick={() => setSelectedImageIndex(null)}
          >
            <button className="absolute top-6 right-6 text-white hover:scale-110 transition-transform"><X size={32} /></button>
            <button onClick={prevImage} className="absolute left-4 md:left-10 text-white hover:scale-110 transition-transform"><ChevronLeft size={48} /></button>
            <motion.img 
              key={selectedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={galleryImages[selectedImageIndex]} 
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" 
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={nextImage} className="absolute right-4 md:right-10 text-white hover:scale-110 transition-transform"><ChevronRight size={48} /></button>
            <div className="absolute bottom-10 text-white/50 font-black text-[10px] tracking-tighter uppercase">
              {selectedImageIndex + 1} / {galleryImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVideoIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/98 backdrop-blur-xl p-4 md:p-10"
            onClick={() => setSelectedVideoIndex(null)}
          >
            <button className="absolute top-6 right-6 text-white hover:scale-110 transition-transform"><X size={32} /></button>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe 
                src={`${getVideoEmbedUrl(galleryVideos[selectedVideoIndex])}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
