import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Lightbulb, 
  Users, 
  Calendar, 
  Building2, 
  FileText, 
  FilePieChart,
  Accessibility, 
  LogIn, 
  LogOut, 
  PlusCircle, 
  Settings, 
  UserCircle,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';
import { UserProfile, AgentType } from '../types';

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  activeView: string;
  setView: (view: any) => void;
  hasAgent: boolean;
  logoUrl?: string;
  logoScale?: number;
  siteName?: string;
  isAdmin?: boolean;
  onToggleAccessibility?: () => void;
  isAccessibilityOpen?: boolean;
  onCreateAction?: (type: 'agent' | 'space' | 'event' | 'opportunity' | 'project') => void;
}

const NAV_ITEMS = [
  { id: 'map', label: 'Início', icon: Home, baseColor: 'bg-nav-item-active', hoverColor: 'group-hover:bg-accent', activeTextColor: 'text-nav-item-active' },
  { id: 'oportunidades', label: 'Oportunidades', icon: Lightbulb, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#E30613]', activeTextColor: 'text-[#E30613]' },
  { id: 'list', label: 'Agentes', icon: Users, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#F2994A]', activeTextColor: 'text-[#F2994A]' },
  { id: 'eventos', label: 'Eventos', icon: Calendar, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#9B51E0]', activeTextColor: 'text-[#9B51E0]' },
  { id: 'espacos', label: 'Espaços', icon: Building2, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#4F9B1B]', activeTextColor: 'text-[#4F9B1B]' },
  { id: 'projetos', label: 'Projetos', icon: FileText, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#0070BA]', activeTextColor: 'text-[#0070BA]' },
  { id: 'reports', label: 'Relatórios', icon: FilePieChart, baseColor: 'bg-nav-item-bg', hoverColor: 'group-hover:bg-[#0070BA]', activeTextColor: 'text-[#0070BA]' },
];

export default function Navbar({ 
  user, 
  profile, 
  onLogin, 
  onLogout, 
  activeView, 
  setView, 
  hasAgent, 
  logoUrl, 
  logoScale: globalLogoScale,
  siteName,
  isAdmin,
  onToggleAccessibility,
  isAccessibilityOpen,
  onCreateAction
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    
    // Initial offline / cache status fetch
    if (typeof window !== 'undefined') {
      setIsOffline((window as any).__firestore_offline__ === true || !navigator.onLine);
    }

    const handleOfflineChange = (e: Event) => {
      const isOff = (e as CustomEvent)?.detail?.offline;
      setIsOffline(!!isOff);
    };

    const handleBrowserOffline = () => setIsOffline(true);
    const handleBrowserOnline = () => {
      if (typeof window !== 'undefined' && !(window as any).__firestore_offline__) {
        setIsOffline(false);
      }
    };

    window.addEventListener('firestore-offline-change', handleOfflineChange);
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('firestore-offline-change', handleOfflineChange);
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
    };
  }, []);

  const displayLogo = logoUrl || 'https://i.postimg.cc/L6F2L3yw/logo-breves.png';

  const logoScale = globalLogoScale || 1;

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <nav className="h-20 md:h-24 bg-white border-b border-stone-100 flex items-center justify-between px-4 md:px-8 shadow-sm transition-colors relative">
        {/* LOGO SECTION */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-stone-900"
          >
            <Menu size={28} />
          </button>
          
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => { setView('map'); closeMenu(); }}
              style={{ 
                transform: isDesktop ? `scale(${logoScale})` : 'none', 
                transformOrigin: 'left center' 
              }}
              title={siteName || "Logo"}
            >
              <div className="h-16 md:h-24 flex items-center justify-center overflow-hidden shrink-0">
                <img src={displayLogo} alt={siteName || "Logo"} className="h-full object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE NAVIGATION - DESKTOP ONLY */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-4">
          {NAV_ITEMS.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setView(item.id as any);
              }}
              className="flex flex-col items-center group gap-1 transition-all p-1 shrink-0"
            >
              <div className={`w-12 h-12 rounded-full ${activeView === item.id || (item.id === 'map' && activeView === 'map') ? item.hoverColor.replace('group-hover:', '') : item.baseColor} ${item.hoverColor} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 active:scale-95`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${activeView === item.id || (item.id === 'map' && activeView === 'map') ? item.activeTextColor : 'text-stone-400 group-hover:text-stone-900'} transition-colors whitespace-nowrap`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button 
            onClick={onToggleAccessibility}
            className="hidden md:flex flex-col items-center group gap-1 transition-all p-1 cursor-pointer"
            title="Acessibilidade"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110 active:scale-95 ${isAccessibilityOpen ? 'bg-[#ffcc00] text-stone-950' : 'bg-stone-500 text-white hover:bg-[#ffcc00] hover:text-stone-950'}`}>
              <Accessibility size={20} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${isAccessibilityOpen ? 'text-[#ffcc00]' : 'text-stone-400 group-hover:text-stone-900'} transition-colors whitespace-nowrap`}>
              Acessibilidade
            </span>
          </button>

          {isAdmin && (
            <button 
              onClick={() => setView('admin')}
              className={`p-3 rounded-2xl transition-all hidden md:block cursor-pointer ${activeView === 'admin' ? 'bg-secondary text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
              title="Painel Administrativo"
            >
              <Settings size={22} className="opacity-80" />
            </button>
          )}
          
          <div className="w-px h-10 bg-stone-100 mx-1 hidden xl:block" />

          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('user_dashboard')}
                className={`hidden md:flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black transition-all shadow-xl active:scale-95 whitespace-nowrap bg-accent text-white hover:opacity-90 shadow-accent/20 cursor-pointer`}
              >
                <UserCircle size={18} />
                <span className="hidden xl:inline uppercase tracking-tighter leading-none">Minha Conta</span>
              </button>

              <button 
                onClick={() => setView(hasAgent ? 'profile' : 'edit')}
                className={`hidden md:flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black transition-all border border-stone-200 active:scale-95 whitespace-nowrap bg-white text-stone-700 hover:bg-stone-50 shadow-sm cursor-pointer`}
              >
                <UserIcon size={18} />
                <span className="hidden xl:inline uppercase tracking-tighter leading-none">Meu Agente</span>
              </button>

              <button 
                onClick={onLogout}
                className="hidden md:block p-3 text-stone-300 hover:text-stone-600 transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut size={22} className="rotate-180" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-3 bg-nav-item-bg text-white rounded-xl text-[10px] sm:px-8 sm:py-4 sm:rounded-full sm:text-[11px] font-black uppercase tracking-tighter hover:bg-accent transition-all shadow-xl active:scale-95 min-w-max cursor-pointer"
            >
              <LogIn size={16} />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </nav>
      {isOffline && (
        <div className="bg-[#E16238]/95 backdrop-blur text-white px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-inner transition-all border-b border-[#E16238]/20 animate-pulse">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span>Sincronizando / Modo Cache Offline Seguro Ativo — Carregando dados locais instantaneamente</span>
        </div>
      )}

      {/* MOBILE DRAWER MENU - Based on reference image */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white z-[60] lg:hidden flex flex-col shadow-2xl"
            >
              {/* Header with Logo & Close button */}
              <div className="h-24 flex items-center justify-between px-6 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-4 flex-1">
                   <img src={displayLogo} alt="Logo" className="h-16 object-contain" />
                </div>
                <button onClick={closeMenu} className="text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={28} />
                </button>
              </div>

              {/* Menu Items List - Structured like example 3 */}
              <div className="flex-1 overflow-y-auto py-6 px-6 space-y-8">
                {/* SECTION: USER/ACCOUNT PROFILE INSIDE SIDEBAR */}
                {user && (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0070BA] text-white flex items-center justify-center font-black uppercase text-sm">
                        {user.displayName ? user.displayName.slice(0, 2) : 'US'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black uppercase tracking-tight text-stone-900 truncate">{user.displayName || 'Usuário'}</p>
                        <p className="text-[10px] text-stone-500 truncate">{user.email || ''}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-stone-200 flex flex-col gap-1.5">
                      <button 
                        onClick={() => { setView('user_dashboard'); closeMenu(); }}
                        className="w-full flex items-center gap-2.5 py-1.5 text-stone-700 hover:text-[#0070BA] text-xs font-black uppercase tracking-tight transition-colors text-left"
                      >
                        <UserCircle size={16} className="text-[#0070BA]" />
                        Minha Conta
                      </button>

                      <button 
                        onClick={() => { setView(hasAgent ? 'profile' : 'edit'); closeMenu(); }}
                        className="w-full flex items-center gap-2.5 py-1.5 text-stone-700 hover:text-[#0070BA] text-xs font-black uppercase tracking-tight transition-colors text-left"
                      >
                        <UserIcon size={16} className="text-[#0070BA]" />
                        Meu Agente
                      </button>

                      {isAdmin && (
                        <button 
                          onClick={() => { setView('admin'); closeMenu(); }}
                          className="w-full flex items-center gap-2.5 py-1.5 text-stone-700 hover:text-[#0070BA] text-xs font-black uppercase tracking-tight transition-colors text-left"
                        >
                          <Settings size={16} className="text-secondary" />
                          Painel Administrativo
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* SECTION: ACESSE */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest pl-1">Acesse</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'oportunidades', label: 'editais e oportunidade', icon: Lightbulb },
                      { id: 'eventos', label: 'eventos', icon: Calendar },
                      { id: 'list', label: 'agentes', icon: Users },
                      { id: 'espacos', label: 'espaços', icon: Building2 },
                      { id: 'projetos', label: 'projetos', icon: FileText },
                    ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setView(item.id as any); closeMenu(); }}
                        className="w-full flex items-center gap-3 py-2 text-stone-600 hover:text-[#0070BA] transition-colors"
                      >
                        <item.icon size={18} />
                        <span className="text-sm font-bold lowercase">{item.label}</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => { onToggleAccessibility?.(); closeMenu(); }}
                      className="w-full flex items-center gap-3 py-2 text-stone-600 hover:text-[#0070BA] transition-colors"
                    >
                      <Accessibility size={18} />
                      <span className="text-sm font-bold lowercase">acessibilidade</span>
                    </button>
                  </div>
                </div>

                {/* SECTION: PAINEL */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest pl-1">Painel</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'oportunidades', label: 'Editais e oportunidades' },
                      { id: 'user_dashboard', label: 'Meus eventos' },
                      { id: 'user_dashboard', label: 'Meus agentes' },
                      { id: 'user_dashboard', label: 'Meus espaços' },
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => { setView(item.id as any); closeMenu(); }}
                        className="w-full flex text-left py-2 text-stone-600 hover:text-[#0070BA] transition-colors text-sm font-bold"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION: AJUDA E PRIVACIDADE */}
                <div className="space-y-4 pb-8">
                  <h3 className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest pl-1">Ajuda e privacidade</h3>
                  <div className="space-y-2">
                    {['Dúvidas frequentes', 'Termos de Uso', 'Política de Privacidade', 'Autorização de uso de imagem'].map(label => (
                      <button 
                        key={label}
                        onClick={() => { setView('help'); closeMenu(); }}
                        className="w-full flex text-left py-2 text-stone-600 hover:text-[#0070BA] transition-colors text-sm font-bold"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Sair Button */}
              <div className="p-6 border-t border-stone-100">
                {user ? (
                   <button 
                    onClick={() => { onLogout(); closeMenu(); }}
                    className="w-full flex items-center gap-3 py-4 text-stone-400 hover:text-red-500 transition-colors font-bold text-sm"
                  >
                    <LogOut size={20} /> SAIR
                  </button>
                ) : (
                  <button 
                    onClick={() => { onLogin(); closeMenu(); }}
                    className="w-full py-4 bg-[#0070BA] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <LogIn size={20} /> ENTRAR USUÁRIOS
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
