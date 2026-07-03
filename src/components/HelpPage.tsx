import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, ArrowLeft, Tag, Shield, FileText, Camera, HelpCircle } from 'lucide-react';
import { HELP_CONTENT, PRIVACY_POLICY, IMAGE_AUTHORIZATION, TERMS_OF_USE } from '../constants/helpContent';
import { HelpConfig } from '../types';

interface HelpPageProps {
  onBack: () => void;
  helpConfig?: HelpConfig;
}

type HelpSection = 'faq' | 'privacy' | 'terms' | 'image';

export default function HelpPage({ onBack, helpConfig }: HelpPageProps) {
  const [activeSection, setActiveSection] = useState<HelpSection>('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

  const toggleTopic = (title: string) => {
    setExpandedTopics(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    );
  };

  const currentFAQ = helpConfig?.faqCategories || HELP_CONTENT;
  const currentPrivacy = helpConfig?.privacyPolicy ?? PRIVACY_POLICY;
  const currentTerms = helpConfig?.termsOfUse ?? TERMS_OF_USE;
  const currentImage = helpConfig?.imageAuthorization ?? IMAGE_AUTHORIZATION;

  const filteredFAQ = currentFAQ.map(category => ({
    ...category,
    topics: (category.topics || []).filter(topic => 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(category => category.topics.length > 0);

  const TABS = [
    { id: 'faq', label: 'Dúvidas Frequentes', icon: HelpCircle },
    { id: 'terms', label: 'Termos de Uso', icon: FileText },
    { id: 'privacy', label: 'Privacidade', icon: Shield },
    { id: 'image', label: 'Uso de Imagem', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors font-black uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 className="text-sm font-black text-stone-900 uppercase tracking-tighter italic">Ajuda e Privacidade</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-stone-900 uppercase tracking-tighter italic mb-4">Central de Ajuda</h2>
          <p className="text-stone-400 font-medium max-w-xl mx-auto">Tudo o que você precisa saber sobre o Mapa Cultural.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as HelpSection)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSection === tab.id 
                    ? 'bg-[#0070BA] text-white shadow-lg shadow-[#0070BA]/20' 
                    : 'bg-white text-stone-400 hover:text-stone-900 border border-stone-100'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeSection === 'faq' ? (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Search */}
              <div className="relative max-w-2xl mx-auto mb-16">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
                <input 
                  type="text"
                  placeholder="Pesquisar por tema, dúvida ou palavra-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-stone-100 rounded-full px-16 py-6 text-stone-900 font-medium outline-none focus:ring-4 focus:ring-[#0070BA]/5 transition-all shadow-sm"
                />
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-12">
                {filteredFAQ.length > 0 ? (
                  filteredFAQ.map((category, catIdx) => (
                    <section key={catIdx} className="space-y-6">
                      <h3 className="text-xl font-black text-stone-900 uppercase italic border-l-4 border-[#0070BA] pl-4">
                        {category.title}
                      </h3>
                      <div className="space-y-4">
                        {category.topics.map((topic, topIdx) => (
                          <div 
                            key={topIdx}
                            className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden"
                          >
                            <button 
                              onClick={() => toggleTopic(topic.title)}
                              className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
                            >
                              <span className="text-lg font-bold text-stone-800 leading-tight pr-8">{topic.title}</span>
                              <ChevronDown 
                                size={20} 
                                className={`text-stone-300 transition-transform duration-300 ${expandedTopics.includes(topic.title) ? 'rotate-180' : ''}`} 
                              />
                            </button>
                            
                            <AnimatePresence>
                              {expandedTopics.includes(topic.title) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="px-8 pb-8 pt-2">
                                    <div className="h-px bg-stone-50 mb-6" />
                                    <div className="prose prose-stone max-w-none text-stone-600 font-medium leading-relaxed whitespace-pre-wrap">
                                      {topic.content}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border border-stone-100">
                    <p className="text-stone-400 font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[2.5rem] border border-stone-100 p-8 md:p-16"
            >
              <div className="prose prose-stone max-w-none prose-h1:text-center prose-h1:font-black prose-h1:uppercase prose-h1:italic prose-h1:tracking-tighter prose-h1:mb-12 prose-headings:text-stone-900 prose-p:text-stone-600 prose-p:font-medium prose-p:leading-relaxed whitespace-pre-wrap">
                {activeSection === 'privacy' && currentPrivacy}
                {activeSection === 'image' && currentImage}
                {activeSection === 'terms' && currentTerms}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Support */}
        <div className="mt-20 bg-[#0070BA] rounded-[2.5rem] p-10 text-center text-white">
          <h4 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Ainda precisa de ajuda?</h4>
          <p className="text-white/80 font-medium mb-8 max-w-md mx-auto">Se você não encontrou o que procurava, entre em contato com nosso suporte técnico.</p>
          <a 
            href="mailto:portalseculte@gmail.com"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-[#0070BA] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Falar com Suporte
          </a>
        </div>
      </main>
    </div>
  );
}
