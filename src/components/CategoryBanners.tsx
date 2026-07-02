import { motion } from 'motion/react';
import { Lightbulb, Calendar, Building2, Users, FileText, ArrowRight } from 'lucide-react';
import { CategoryBanner } from '../types';

interface CategoryBannersProps {
  banners?: CategoryBanner[];
  onSectionClick: (section: string) => void;
}

export default function CategoryBanners({ banners, onSectionClick }: CategoryBannersProps) {
  const defaultBanners: CategoryBanner[] = [
    {
      id: 'oportunidades',
      title: 'Oportunidades',
      description: 'Faça sua inscrição ou acesse o resultado de diversas convocatórias como editais, oficinas, prêmios e concursos. Você também pode criar o seu próprio formulário e divulgar uma oportunidade para outros agentes culturais.',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop',
      linkUrl: 'oportunidades',
      icon: 'Lightbulb'
    },
    {
      id: 'eventos',
      title: 'Eventos',
      description: 'Você pode pesquisar eventos culturais nos campos de busca do seu interesse que ajudam na precisão da sua pesquisa. Como usuário cadastrado, você pode incluir seus eventos na plataforma e divulgá-los gratuitamente.',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2670&auto=format&fit=crop',
      linkUrl: 'eventos',
      icon: 'Calendar'
    },
    {
      id: 'espacos',
      title: 'Espaços',
      description: 'Procure por espaços culturais incluídos na plataforma, acessando os campos de busca combinada que ajudam na precisão de sua pesquisa. Cadastre também os espaços onde desenvolve suas atividades artísticas e culturais.',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2670&auto=format&fit=crop',
      linkUrl: 'espacos',
      icon: 'Building2'
    },
    {
      id: 'agentes',
      title: 'Agentes',
      description: 'Neste espaço, estão registrados artistas, gestores e produtores; uma rede de atores envolvidos na cena cultural da região. Você pode cadastrar um ou mais agentes (grupos, coletivos, bandas, instituições, empresas, associações, cooperativas e etc).',
      imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2670&auto=format&fit=crop',
      linkUrl: 'agentes',
      icon: 'Users'
    },
    {
      id: 'projetos',
      title: 'Projetos',
      description: 'Aqui você encontra leis de fomento, mostras, convocatórias, chamadas públicas e editais criados, além de diversas iniciativas cadastradas pelos usuários da plataforma.',
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2670&auto=format&fit=crop',
      linkUrl: 'projetos',
      icon: 'FileText'
    }
  ];

  const bannersToRender = banners && banners.length > 0 ? banners : defaultBanners;

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Lightbulb': return <Lightbulb size={32} strokeWidth={2.5} />;
      case 'Calendar': return <Calendar size={32} strokeWidth={2.5} />;
      case 'Building2': return <Building2 size={32} strokeWidth={2.5} />;
      case 'Users': return <Users size={32} strokeWidth={2.5} />;
      case 'FileText': return <FileText size={32} strokeWidth={2.5} />;
      default: return <FileText size={32} strokeWidth={2.5} />;
    }
  };

  const getIconBg = (id: string) => {
    switch (id) {
      case 'oportunidades': return 'bg-cat-oportunidades';
      case 'eventos': return 'bg-cat-eventos';
      case 'espacos': return 'bg-cat-espacos';
      case 'agentes': return 'bg-cat-agentes';
      case 'projetos': return 'bg-cat-projetos';
      default: return 'bg-primary';
    }
  };

  const getLinkColor = (id: string) => {
    switch (id) {
      case 'oportunidades': return 'text-cat-oportunidades';
      case 'eventos': return 'text-cat-eventos';
      case 'espacos': return 'text-cat-espacos';
      case 'agentes': return 'text-cat-agentes';
      case 'projetos': return 'text-cat-projetos';
      default: return 'text-primary';
    }
  };

  return (
    <section className="bg-[#f0f0f0] py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-left mb-10">
          <h2 className="text-3xl font-bold text-stone-900 mb-2">Aqui você encontra as informações da cultura de sua região!</h2>
          <p className="text-stone-600 text-lg">Mas para isso, precisamos da sua ajuda!!! Faça parte você também: cadastre seus projetos, espaços e eventos.</p>
        </div>
        
        <div className="space-y-6">
          {bannersToRender.map((banner, index) => (
            <motion.div 
              key={banner.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col md:flex-row w-full bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
            >
              {/* Left Side: Image with icon/overlay */}
              <div className="relative w-full md:w-[420px] h-[190px] md:h-[220px] shrink-0 overflow-hidden cursor-pointer" onClick={() => onSectionClick(banner.linkUrl)}>
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />
                
                <div className="absolute inset-0 flex items-center justify-start gap-4 px-6 md:px-10">
                  <div className={`w-14 h-14 md:w-16 md:h-16 ${getIconBg(banner.id)} text-white rounded-full flex items-center justify-center shadow-xl shrink-0 group-hover:scale-110 transition-transform`}>
                    {getIcon(banner.icon)}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white drop-shadow-2xl tracking-tighter uppercase italic">
                    {banner.title}
                  </h3>
                </div>
              </div>

              {/* Right Side: Description and link */}
              <div className="flex-1 p-6 md:p-10 flex flex-col justify-between bg-white">
                <p className="text-stone-600 text-sm md:text-base leading-snug font-medium line-clamp-4 md:line-clamp-3">
                  {banner.description}
                </p>
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => onSectionClick(banner.linkUrl)}
                    className={`flex items-center gap-1 font-bold text-[10px] md:text-xs uppercase tracking-widest ${getLinkColor(banner.id)} hover:opacity-80 transition-opacity`}
                  >
                    Ver todos <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoIcon({ size }: { size: number }) {
  return <FileText size={size} />;
}
