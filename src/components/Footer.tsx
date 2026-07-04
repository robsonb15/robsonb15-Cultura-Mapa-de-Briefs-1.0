import { MapPin, Mail, Phone, Facebook, Instagram, Twitter, Youtube, Globe, Lightbulb, Calendar, Users, Building2, FileText } from 'lucide-react';
import { FooterConfig } from '../types';

interface FooterProps {
  config?: FooterConfig;
  logoUrl?: string;
  setView?: (view: any) => void;
}

export default function Footer({ config, logoUrl, setView }: FooterProps) {
  const vision = config?.vision || "Fortalecendo a identidade cultural da nossa região através da transparência, conectividade e valorização de nossos talentos locais.";
  const fb = config?.facebook || "#";
  const ig = config?.instagram || "#";
  const yt = config?.youtube || "#";
  const email = config?.email || "contato@mapaculturalbreves.pa.gov.br";
  const address = config?.addressText || "Secretaria de Cultura, Turismo e Eventos, Breves - PA, 68800-000";
  const copyright = config?.copyrightText || "© 2026 MAPA CULTURAL • DESENVOLVIDO PARA A GESTÃO PÚBLICA";
  
  const footerLogo = config?.footerLogoUrl || logoUrl || "https://i.postimg.cc/L6F2L3yw/logo-breves.png";
  const footerTitle = config?.footerTitle || "SECULTE";
  const footerSubtitle = config?.footerSubtitle || "Secretaria de Cultura, Turismo e Eventos";

  const handleNav = (view: any) => {
    if (setView) setView(view);
  };

  return (
    <div className="print:hidden">
      <div className="bg-white py-20 border-t border-stone-100 pb-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col items-center mb-24 cursor-pointer" onClick={() => handleNav('map')}>
            <img src={logoUrl || "https://i.postimg.cc/L6F2L3yw/logo-breves.png"} alt="Logo" className="h-24 md:h-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-stone-900">
            {/* Acesse */}
            <div className="space-y-8 text-left px-8 md:px-0 animate-fade-in">
              <h3 className="text-2xl font-medium text-[#0070BA] tracking-tight">Acesse</h3>
              <ul className="space-y-5">
                <li onClick={() => handleNav('oportunidades')} className="flex items-center gap-4 justify-start cursor-pointer hover:translate-x-1 transition-transform group">
                   <Lightbulb size={20} className="text-stone-950 group-hover:text-[#0070BA]" />
                   <span className="text-sm font-medium text-stone-800 group-hover:text-[#0070BA] lowercase">editais e oportunidade</span>
                </li>
                <li onClick={() => handleNav('eventos')} className="flex items-center gap-4 justify-start cursor-pointer hover:translate-x-1 transition-transform group">
                   <Calendar size={20} className="text-stone-950 group-hover:text-[#0070BA]" />
                   <span className="text-sm font-medium text-stone-800 group-hover:text-[#0070BA] lowercase">eventos</span>
                </li>
                <li onClick={() => handleNav('agentes')} className="flex items-center gap-4 justify-start cursor-pointer hover:translate-x-1 transition-transform group">
                   <Users size={20} className="text-stone-950 group-hover:text-[#0070BA]" />
                   <span className="text-sm font-medium text-stone-800 group-hover:text-[#0070BA] lowercase">agentes</span>
                </li>
                <li onClick={() => handleNav('espacos')} className="flex items-center gap-4 justify-start cursor-pointer hover:translate-x-1 transition-transform group">
                   <Building2 size={20} className="text-stone-950 group-hover:text-[#0070BA]" />
                   <span className="text-sm font-medium text-stone-800 group-hover:text-[#0070BA] lowercase">espaços</span>
                </li>
                <li onClick={() => handleNav('projetos')} className="flex items-center gap-4 justify-start cursor-pointer hover:translate-x-1 transition-transform group">
                   <FileText size={20} className="text-stone-950 group-hover:text-[#0070BA]" />
                   <span className="text-sm font-medium text-stone-800 group-hover:text-[#0070BA] lowercase">projetos</span>
                </li>
              </ul>
            </div>

            {/* Painel */}
            <div className="space-y-8 text-left px-8 md:px-0">
              <h3 className="text-2xl font-medium text-[#0070BA] tracking-tight">Painel</h3>
              <ul className="space-y-5">
                <li onClick={() => handleNav('user_dashboard')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Editais e oportunidades</li>
                <li onClick={() => handleNav('user_dashboard')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Meus eventos</li>
                <li onClick={() => handleNav('user_dashboard')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Meus agentes</li>
                <li onClick={() => handleNav('user_dashboard')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Meus espaços</li>
              </ul>
            </div>

            {/* Ajuda e privacidade */}
            <div className="space-y-8 text-left px-8 md:px-0">
              <h3 className="text-2xl font-medium text-[#0070BA] tracking-tight">Ajuda e privacidade</h3>
              <ul className="space-y-5">
                <li onClick={() => handleNav('help')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Dúvidas frequentes</li>
                <li onClick={() => handleNav('help')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Termos de Uso</li>
                <li onClick={() => handleNav('help')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Política de Privacidade</li>
                <li onClick={() => handleNav('help')} className="text-sm font-medium text-stone-800 cursor-pointer hover:text-[#0070BA] transition-colors">Autorização de uso de imagem</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-[#141414] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <div className="flex items-center gap-4">
                <img src={footerLogo} alt="Logo" className="h-20 md:h-24 brightness-0 invert" />
                <div className="h-12 w-px bg-white/10 hidden md:block" />
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tighter">{footerTitle}</h4>
                  <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{footerSubtitle}</p>
                </div>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed max-w-md">
                {vision}
              </p>
              <div className="flex items-center gap-4">
                {fb && fb !== '#' && (
                  <a href={fb} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#0070BA] transition-all group">
                    <Facebook size={18} className="text-stone-400 group-hover:text-white" />
                  </a>
                )}
                {ig && ig !== '#' && (
                  <a href={ig} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#E30613] transition-all group">
                    <Instagram size={18} className="text-stone-400 group-hover:text-white" />
                  </a>
                )}
                {yt && yt !== '#' && (
                  <a href={yt} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 transition-all group">
                    <Youtube size={18} className="text-stone-400 group-hover:text-white" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-8 text-left">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#0070BA]">Contato</h4>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 group">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#0070BA]/20 transition-colors">
                    <MapPin size={16} className="text-[#0070BA]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-stone-500 tracking-tighter mb-1">Localização</p>
                    <p className="text-[13px] font-medium text-stone-300 leading-relaxed">{address}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#0070BA]/20 transition-colors">
                    <Mail size={16} className="text-[#0070BA]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-stone-500 tracking-tighter mb-1">E-mail</p>
                    <a href={`mailto:${email}`} className="text-[13px] font-medium text-stone-300 hover:text-white transition-colors">{email}</a>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
      
      <div className="bg-[#141414] py-8 border-t border-white/5 pb-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
             <p className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-500 text-center md:text-left">
               {copyright}
             </p>
             <div className="flex items-center gap-6">
                <span className="text-[9px] font-black text-stone-500 uppercase tracking-tighter">
                  {config?.systemTitle || "SISTEMA INTEGRATIVO"}
                </span>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-[9px] font-black text-stone-500 uppercase tracking-tighter text-[#0070BA]">
                  {config?.systemSubtitle || "BREVES - PARÁ"}
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
