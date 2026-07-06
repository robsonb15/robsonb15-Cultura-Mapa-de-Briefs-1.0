import { motion } from 'motion/react';
import { ArrowRight, Map, Users, Info, Leaf, Accessibility, Lightbulb } from 'lucide-react';

interface HeroBannerProps {
  onDiscover: () => void;
  onRegister: () => void;
  onOpportunities?: () => void;
  config?: any[];
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroUrl?: string;
  heroZoom?: number;
  heroPositionX?: number;
  heroPositionY?: number;
}

export default function HeroBanner({ 
  onDiscover, 
  onRegister, 
  onOpportunities, 
  config, 
  heroImage, 
  heroTitle, 
  heroSubtitle,
  heroZoom,
  heroPositionX,
  heroPositionY
}: HeroBannerProps) {
  const defaultBanners = [
    { id: '1', title: 'Caderno de Orientações da Lei Paulo Gustavo', subtitle: 'CLIQUE AQUI', url: '#', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2669&auto=format&fit=crop', bgColor: 'bg-[#2D45B3]', textColor: 'text-white' },
    { id: '2', title: 'Cultura, sustentabilidade e Mudanças Climáticas', subtitle: 'DAS IDEIAS À AÇÃO', url: '#', image: '', bgColor: 'bg-[#E5E9D6]', textColor: 'text-[#1F4125]' },
    { id: '3', title: 'GUIA DE ACESSIBILIDADE, INCLUSÃO E PROTAGONISMO', subtitle: 'PESSOA COM DEFICIÊNCIA', url: '#', image: '', bgColor: 'bg-[#0047AB]', textColor: 'text-white' }
  ];

  const bannersToRender = (config && config.length > 0) ? config : defaultBanners;
  const backgroundImage = heroImage || "https://i.postimg.cc/ZKnRFWzb/Orla-Breves-ok.jpg";
  const title = heroTitle || "Boas-vindas ao Mapa Cultural";
  const subtitle = heroSubtitle || "O Mapa Cultural é uma ferramenta de gestão cultural que garante a estruturação de Sistemas de Informações e Indicadores.";

  const zoom = heroZoom !== undefined ? heroZoom : 100;
  const posX = heroPositionX !== undefined ? heroPositionX : 50;
  const posY = heroPositionY !== undefined ? heroPositionY : 50;

  return (
    <section className="relative min-h-[600px] md:h-[560px] w-full overflow-hidden flex flex-col">
      {/* Background with Ambient Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div 
          className="w-full h-full bg-cover transition-all duration-200"
          style={{ 
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: `${posX}% ${posY}%`,
            backgroundRepeat: 'no-repeat',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex items-start pt-8 md:pt-24 text-white pb-16 md:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* Left Column: Welcome Message */}
          <div className="lg:col-span-6 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6 drop-shadow-2xl">
                {title}
              </h1>
              <p className="text-xl md:text-xl font-medium opacity-100 max-w-xl leading-relaxed drop-shadow-md">
                {subtitle}
              </p>
            </motion.div>
          </div>

          {/* Right Column: Small Featured Banners */}
          <div className="lg:col-span-6 flex flex-col gap-3 w-full">
             {bannersToRender.map((banner, idx) => (
                <motion.a 
                  key={banner.id}
                  href={banner.url}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${banner.bgColor} h-[100px] md:h-[120px] rounded-2xl flex items-center group hover:scale-[1.02] transition-transform relative overflow-hidden shadow-2xl border-2 border-white/10`}
                >
                   {banner.image ? (
                     <div className="absolute inset-0 z-0 overflow-hidden">
                        <div 
                          className="w-full h-full transition-all duration-300 group-hover:brightness-110"
                          style={{
                            backgroundImage: `url("${banner.image}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: `${banner.positionX !== undefined ? banner.positionX : 50}% ${banner.positionY !== undefined ? banner.positionY : 50}%`,
                            backgroundRepeat: 'no-repeat',
                            transform: `scale(${(banner.zoom !== undefined ? banner.zoom : 100) / 100})`,
                            transformOrigin: 'center center'
                          }}
                        />
                      </div>
                   ) : (
                     <div className="flex-1 flex items-center justify-center p-4">
                        <h3 className={`text-sm md:text-base font-black leading-tight uppercase text-center ${banner.textColor}`}>{banner.title}</h3>
                     </div>
                   )}
                </motion.a>
             ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
