import { useState, useRef } from 'react';
import { CulturalAgent, AgentType } from '../types';
import { uploadFile } from '../lib/storage-utils';
import { sanitizeText } from '../lib/auth-utils';
import { 
  Plus, 
  Trash2, 
  X, 
  MapPin, 
  Image as ImageIcon, 
  Video, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube,
  CloudUpload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AgentEditFormProps {
  initialData?: Partial<CulturalAgent>;
  onSave: (data: Partial<CulturalAgent>) => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export default function AgentEditForm({ initialData, onSave, onCancel, isAdmin }: AgentEditFormProps) {
  const [formData, setFormData] = useState<Partial<CulturalAgent>>({
    id: initialData?.id,
    ownerId: initialData?.ownerId,
    createdAt: initialData?.createdAt,
    name: initialData?.name || '',
    socialName: initialData?.socialName || '',
    type: initialData?.type || AgentType.INDIVIDUAL,
    description: initialData?.description || '',
    shortDescription: initialData?.shortDescription || '',
    areasOfActivity: initialData?.areasOfActivity || [],
    tags: initialData?.tags || [],
    address: initialData?.address || { text: '', lat: 0, lng: 0 },
    contactInfo: initialData?.contactInfo || { email: '', phone: '', website: '' },
    socialLinks: initialData?.socialLinks || [],
    images: initialData?.images || { gallery: [] },
    videos: initialData?.videos || [],
    certified: initialData?.certified || false,
    birthDate: initialData?.birthDate || '',
    isSenior: initialData?.isSenior || false,
    gender: initialData?.gender || '',
    sexualOrientation: initialData?.sexualOrientation || '',
    itinerantAgent: initialData?.itinerantAgent || false,
    raceColor: initialData?.raceColor || '',
    education: initialData?.education || '',
    disability: initialData?.disability || false,
    traditionalCommunities: initialData?.traditionalCommunities || '',
    externalLink: initialData?.externalLink || '',
  });

  const [activeTab, setActiveTab] = useState('apresentacao');
  const [newArea, setNewArea] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [newGalleryImg, setNewGalleryImg] = useState('');
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const geocodeAddress = async (customFormData?: Partial<CulturalAgent>) => {
    const dataToUse = customFormData || formData;
    const addr = dataToUse.address;
    if (!addr) return null;

    const street = addr.street?.trim() || '';
    const number = addr.number?.trim() || '';
    const neighborhood = addr.neighborhood?.trim() || '';
    const cityState = addr.text?.trim() || 'Breves / PA';
    const zipCode = addr.zipCode?.trim() || '';

    if (!street && !neighborhood && !zipCode) {
      return null;
    }

    setGeocodingStatus('searching');
    setGeocodingError(null);

    // Build query variations
    const queries = [];
    if (street) {
      queries.push(`${street}, ${number ? number + ',' : ''} ${neighborhood ? neighborhood + ',' : ''} Breves, Pará, Brasil`);
      queries.push(`${street}, Breves, Pará, Brasil`);
    }
    if (neighborhood) {
      queries.push(`${neighborhood}, Breves, Pará, Brasil`);
    }
    queries.push(`Breves, Pará, Brasil`);

    for (const q of queries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'User-Agent': 'MapaCulturalBrevesApp/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            setGeocodingStatus('success');
            return {
              ...addr,
              lat,
              lng
            };
          }
        }
      } catch (err) {
        console.error("Erro na busca de geocodificação para:", q, err);
      }
    }

    setGeocodingStatus('error');
    setGeocodingError('Não foi possível localizar o endereço exato nas ruas conhecidas de Breves. Mostrando localização central aproximada.');
    
    // Default fallback to Breves central coordinates
    return {
      ...addr,
      lat: -1.681123,
      lng: -50.480234
    };
  };

  const handleGeocodeTrigger = async () => {
    const coords = await geocodeAddress();
    if (coords) {
      setFormData(prev => ({
        ...prev,
        address: coords
      }));
    }
  };

  const bannerRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, path: string, type: 'banner' | 'profile' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    try {
      const url = await uploadFile(file, path);
      setFormData(prev => {
        const oldImages = prev.images || { gallery: [] };
        if (type === 'banner') {
          return { ...prev, images: { ...oldImages, banner: url } };
        } else if (type === 'profile') {
          return { ...prev, images: { ...oldImages, profile: url } };
        } else {
          return { ...prev, images: { ...oldImages, gallery: [...(oldImages.gallery || []), url] } };
        }
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo.');
    } finally {
      setIsUploading(null);
    }
  };


  const sections = [
    { id: 'apresentacao', label: 'Apresentação' },
    { id: 'dados_pessoais', label: 'Dados Pessoais' },
    { id: 'dados_sensiveis', label: 'Dados Sensíveis' },
    { id: 'publico', label: 'Conteúdo Público' },
    { id: 'multimidia', label: 'Multimídia' }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Sanitize user inputs before saving
    const sanitizedData = {
      ...formData,
      name: sanitizeText(formData.name || ''),
      socialName: sanitizeText(formData.socialName || ''),
      description: sanitizeText(formData.description || ''),
      shortDescription: sanitizeText(formData.shortDescription || '')
    };

    // Automatically geocode the address during save
    try {
      const coords = await geocodeAddress(sanitizedData);
      if (coords) {
        sanitizedData.address = coords;
      }
    } catch (err) {
      console.error("Erro na geocodificação final do salvamento:", err);
    }
    
    onSave(sanitizedData);
    setIsSaving(false);
  };

  const addItem = (field: 'areasOfActivity' | 'tags' | 'videos' | 'gallery', value: any, setter: (v: any) => void) => {
    if (!value) return;
    if (field === 'gallery') {
      setFormData(prev => {
        const oldImages = prev.images || { gallery: [] };
        return {
          ...prev,
          images: {
            ...oldImages,
            gallery: [...(oldImages.gallery || []), value]
          }
        };
      });
      setter('');
      return;
    }
    setFormData({ ...formData, [field]: [...(formData[field] as any[]), value] });
    setter('');
  };

  const removeItem = (field: 'areasOfActivity' | 'tags' | 'videos' | 'gallery', index: number) => {
    if (field === 'gallery') {
       const list = [...(formData.images?.gallery || [])];
       list.splice(index, 1);
       setFormData(prev => {
         const oldImages = prev.images || { gallery: [] };
         return {
           ...prev,
           images: {
             ...oldImages,
             gallery: list
           }
         };
       });
       return;
    }
    const list = [...(formData[field] as any[])];
    list.splice(index, 1);
    setFormData({ ...formData, [field]: list });
  };

  const updateSocial = (platform: string, value: string) => {
    const others = formData.socialLinks?.filter(s => s.platform.toLowerCase() !== platform.toLowerCase()) || [];
    
    let url = value.trim();
    if (url && !url.startsWith('http')) {
      if (platform.toLowerCase() === 'instagram') {
        const handle = url.startsWith('@') ? url.substring(1) : url;
        url = `https://instagram.com/${handle}`;
      } else if (platform.toLowerCase() === 'facebook') {
        url = `https://facebook.com/${url}`;
      } else if (platform.toLowerCase() === 'youtube') {
        if (!url.includes('/')) {
          url = `https://youtube.com/@${url}`;
        } else {
          url = `https://youtube.com/${url}`;
        }
      }
    }

    // Check if it's just a base URL without a handle
    const isBaseUrlOnly = (
      (platform.toLowerCase() === 'instagram' && (url.toLowerCase() === 'https://instagram.com/' || url.toLowerCase() === 'https://instagram.com')) ||
      (platform.toLowerCase() === 'facebook' && (url.toLowerCase() === 'https://facebook.com/' || url.toLowerCase() === 'https://facebook.com')) ||
      (platform.toLowerCase() === 'youtube' && (url.toLowerCase() === 'https://youtube.com/' || url.toLowerCase() === 'https://youtube.com' || url.toLowerCase() === 'https://youtube.com/@'))
    );

    if (url && !isBaseUrlOnly) {
      setFormData({ ...formData, socialLinks: [...others, { platform, url }] });
    } else {
      setFormData({ ...formData, socialLinks: others });
    }
  };

  const getSocialValue = (platform: string) => {
    const link = formData.socialLinks?.find(s => s.platform.toLowerCase() === platform.toLowerCase());
    if (!link) return '';
    
    // For editing, we might want to show the handle if it's a known platform
    const url = link.url;
    if (platform.toLowerCase() === 'instagram' && url.includes('instagram.com/')) {
      return '@' + url.split('instagram.com/').pop()?.replace(/\/$/, '') || url;
    }
    if (platform.toLowerCase() === 'facebook' && url.includes('facebook.com/')) {
      return url.split('facebook.com/').pop()?.replace(/\/$/, '') || url;
    }
    if (platform.toLowerCase() === 'youtube' && url.includes('youtube.com/@')) {
      return url.split('youtube.com/@').pop()?.replace(/\/$/, '') || url;
    }
    
    return url;
  };

  return (
    <div className="max-w-[1200px] mx-auto min-h-screen bg-[#FDFDFD] font-sans flex flex-col md:flex-row gap-8 py-10 px-4">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 h-fit sticky top-24 space-y-4">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors font-black text-xs uppercase tracking-tighter mb-6"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 overflow-hidden">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-4 pl-2">Seções do Perfil</p>
          <div className="space-y-1">
            {sections.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveTab(section.id);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-[12px] font-black transition-all uppercase tracking-wider block ${activeTab === section.id ? 'bg-[#5A5A40] text-white shadow-lg translate-x-1' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Form Area */}
      <main className="flex-1 space-y-8">
        {isAdmin && (
          <div className="bg-blue-50/50 rounded-[2.5rem] p-6 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0070BA] text-white rounded-2xl flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter">Gestão de Selo de Verificação</h3>
                <p className="text-[10px] text-stone-500 font-medium uppercase tracking-tight">Ative para validar a autenticidade deste agente cultural.</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group bg-white px-6 py-3 rounded-2xl border border-stone-100 shadow-sm">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.certified || false}
                  onChange={e => setFormData({ ...formData, certified: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${formData.certified ? 'bg-[#0070BA]' : 'bg-stone-200'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.certified ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-[10px] font-black text-stone-600 uppercase tracking-tighter group-hover:text-[#0070BA] transition-colors">
                Agente Verificado (Selo Oficial)
              </span>
            </label>
          </div>
        )}

        <header className="mb-10">
           <h1 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter uppercase italic leading-none mb-2">
             {formData.type === AgentType.INDIVIDUAL ? 'Edição do Agente Individual' : 'Edição do Coletivo Cultural'}
           </h1>
           <p className="text-stone-400 font-medium text-sm">As informações marcadas com asterisco (*) serão visíveis publicamente.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-12 pb-32">
          {/* APRESENTAÇÃO */}
          <section id="apresentacao" className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100 space-y-8">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              Informações de Apresentação
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-12 space-y-4">
                 <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Imagem de Capa (Banner - URL ou Upload)*</label>
                 <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden bg-stone-50 border-2 border-dashed border-stone-100 transition-all hover:border-stone-200">
                    {isUploading === 'banner' && (
                       <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Loader2 size={32} className="animate-spin text-[#5A5A40]" />
                          <span className="text-[10px] font-black uppercase tracking-tighter mt-2">Enviando...</span>
                       </div>
                    )}
                    {formData.images?.banner ? (
                       <img src={formData.images.banner} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                          <CloudUpload size={48} strokeWidth={1} />
                          <span className="text-[10px] font-black uppercase tracking-tighter mt-2">Prévio do Banner</span>
                       </div>
                    )}
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="file" 
                      ref={bannerRef}
                      onChange={(e) => handleFileUpload(e, 'banners', 'banner')}
                      className="hidden"
                      accept="image/*"
                    />
                    <div className="flex-[2] space-y-2">
                        <input 
                          type="url" 
                          placeholder="Link da imagem (URL)..."
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-5 py-3.5 text-stone-900 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                          value={formData.images?.banner || ''}
                          onChange={e => setFormData(prev => ({ ...prev, images: { ...(prev.images || { gallery: [] }), banner: e.target.value } }))}
                        />
                    </div>
                    <button 
                      type="button"
                      onClick={() => bannerRef.current?.click()}
                      className="shrink-0 bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 rounded-xl font-black text-[11px] uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"
                    >
                      <CloudUpload size={18} />
                      Upload
                    </button>
                 </div>
              </div>

              <div className="md:col-span-4 space-y-4">
                 <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Foto de Perfil (URL ou Upload)*</label>
                 <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-stone-50 border-2 border-dashed border-stone-100 transition-all hover:border-stone-200 mb-2">
                    {isUploading === 'profile' && (
                       <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-[#5A5A40]" />
                       </div>
                    )}
                    {formData.images?.profile ? (
                       <img src={formData.images.profile} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
                          <CloudUpload size={32} strokeWidth={1} />
                          <span className="text-[10px] font-black uppercase tracking-tighter mt-2 text-center px-4">Foto</span>
                       </div>
                    )}
                 </div>
                 <div className="space-y-3">
                    <input 
                      type="file" 
                      ref={profileRef}
                      onChange={(e) => handleFileUpload(e, 'profiles', 'profile')}
                      className="hidden"
                      accept="image/*"
                    />
                    <input 
                      type="url" 
                      placeholder="Link da foto..."
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                      value={formData.images?.profile || ''}
                      onChange={e => setFormData(prev => ({ ...prev, images: { ...(prev.images || { gallery: [] }), profile: e.target.value } }))}
                    />
                    <button 
                      type="button"
                      onClick={() => profileRef.current?.click()}
                      className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 py-4 rounded-xl font-black text-[11px] uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"
                    >
                      <CloudUpload size={18} />
                      Upload do Desktop
                    </button>
                 </div>
              </div>

              <div className="md:col-span-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome de exibição*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-black outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                    placeholder="Seu nome artístico ou do coletivo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Descrição Curta*</label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                    placeholder="Resumo do perfil em uma frase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Link Externo (Site, Rede Social, etc)*</label>
                  <input
                    type="text"
                    value={formData.externalLink || ''}
                    onChange={e => setFormData({ ...formData, externalLink: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-medium outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                    placeholder="Seu link principal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Tipo de Agente*</label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as AgentType })}
                        className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-black outline-none focus:ring-2 focus:ring-stone-200 transition-all appearance-none"
                      >
                         <option value={AgentType.INDIVIDUAL}>Individual</option>
                         <option value={AgentType.COLLECTIVE}>Coletivo / Organização</option>
                      </select>
                   </div>
                </div>
              </div>
            </div>

            {formData.address?.text && (
              <div className="space-y-6 pt-6 border-t border-stone-50">
                <div>
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1 mb-4 block">Redes Sociais</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 pl-1"><Instagram size={14} /> Instagram</div>
                          <input 
                            type="text" 
                            value={getSocialValue('instagram')}
                            onChange={e => updateSocial('instagram', e.target.value)}
                            placeholder="@seuuser ou link"
                            className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[13px] outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 pl-1"><Facebook size={14} /> Facebook</div>
                          <input 
                            type="text" 
                            value={getSocialValue('facebook')}
                            onChange={e => updateSocial('facebook', e.target.value)}
                            placeholder="Link ou nome do perfil"
                            className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[13px] outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 pl-1"><Youtube size={14} /> Youtube</div>
                          <input 
                            type="text" 
                            value={getSocialValue('youtube')}
                            onChange={e => updateSocial('youtube', e.target.value)}
                            placeholder="Link do canal"
                            className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[13px] outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 pl-1"><Globe size={14} /> Site / Portfólio</div>
                          <input 
                            type="text" 
                            value={getSocialValue('website')}
                            onChange={e => updateSocial('website', e.target.value)}
                            placeholder="Link do seu site"
                            className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[13px] outline-none" 
                          />
                      </div>
                    </div>
                </div>
              </div>
            )}
          </section>

          {/* DADOS PESSOAIS */}
          <section id="dados_pessoais" className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100 space-y-8">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              Dados Pessoais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome Social</label>
                 <input
                    type="text"
                    value={formData.socialName}
                    onChange={e => setFormData({ ...formData, socialName: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-medium outline-none"
                    placeholder="Se preferir usar seu nome social"
                  />
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">CPF</label>
                 <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full bg-stone-50 border-stone-100 rounded-2xl px-6 py-4 text-stone-900 text-[14px] font-black shadow-sm outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                    placeholder="000.000.000-00"
                 />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-stone-50">
               <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-stone-900 uppercase tracking-tighter mb-4">Contatos Públicos</h4>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Email Público*</label>
                        <input
                          type="email"
                          value={formData.contactInfo?.email}
                          onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo!, email: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Telefone Público*</label>
                        <input
                          type="tel"
                          value={formData.contactInfo?.phone}
                          onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo!, phone: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-stone-900 uppercase tracking-tighter mb-4">Endereço do Agente Cultural*</h4>
                  <div className="grid grid-cols-4 gap-4">
                     <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">CEP</label>
                        <input
                          type="text"
                          value={formData.address?.zipCode}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address!, zipCode: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                          placeholder="68800-000"
                        />
                     </div>
                     <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Número</label>
                        <input
                          type="text"
                          value={formData.address?.number}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address!, number: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                        />
                     </div>
                     <div className="col-span-4 space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Logradouro / Rua</label>
                        <input
                          type="text"
                          value={formData.address?.street}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                        />
                     </div>
                     <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Bairro</label>
                        <input
                          type="text"
                          value={formData.address?.neighborhood}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address!, neighborhood: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                        />
                     </div>
                     <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Cidade / UF</label>
                        <input
                          type="text"
                          value={formData.address?.text}
                          onChange={e => setFormData({ ...formData, address: { ...formData.address!, text: e.target.value } })}
                          className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                          placeholder="Breves / PA"
                        />
                     </div>

                     <div className="col-span-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Localização no Mapa</span>
                          <button
                            type="button"
                            onClick={handleGeocodeTrigger}
                            disabled={geocodingStatus === 'searching'}
                            className="px-5 py-2.5 bg-stone-900 hover:bg-[#5A5A40] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 pointer-events-auto shadow-sm"
                          >
                            {geocodingStatus === 'searching' ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Buscando...
                              </>
                            ) : (
                              <>
                                <MapPin size={12} />
                                Buscar no Mapa
                              </>
                            )}
                          </button>
                        </div>

                        {geocodingError && (
                          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100 font-medium mb-3">
                            ⚠️ {geocodingError}
                          </p>
                        )}

                        {/* Map preview */}
                        <div className="h-[250px] w-full bg-[#FAF9F6] border border-stone-200 relative overflow-hidden rounded-2xl group">
                           {/* Leaflet controls mockup */}
                           <div className="absolute top-3 left-3 z-[11] flex flex-col bg-white border border-stone-200 rounded shadow-sm divide-y divide-stone-150 select-none pointer-events-auto">
                             <div className="w-7 h-7 flex items-center justify-center text-[16px] font-black text-stone-700 cursor-pointer hover:bg-stone-50" title="Como usar: arraste e use rolagem para zoom">+</div>
                             <div className="w-7 h-7 flex items-center justify-center text-[16px] font-black text-stone-700 cursor-pointer hover:bg-stone-50" title="Como usar: arraste e use rolagem para zoom">-</div>
                           </div>

                           <iframe
                             width="100%"
                             height="100%"
                             style={{ border: 0 }}
                             loading="lazy"
                             allowFullScreen
                             referrerPolicy="no-referrer-when-downgrade"
                             src={
                               formData.address?.lat && formData.address?.lng
                                 ? `https://www.google.com/maps?q=${formData.address.lat},${formData.address.lng}&output=embed`
                                 : `https://www.google.com/maps?q=${encodeURIComponent((formData.address?.street || '') + ' ' + (formData.address?.number || '') + ' ' + (formData.address?.neighborhood || '') + ' Breves, PA, Brasil')}&output=embed`
                             }
                             title="Visualização da localização do agente"
                             className="contrast-[1.02]"
                           ></iframe>

                           {/* Custom Pin Overlay */}
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[10]">
                             <div className="relative flex flex-col items-center -translate-y-4">
                               <div className="w-8 h-8 rounded-full bg-[#E16238] border-[3px] border-white flex items-center justify-center shadow-lg animate-pulse">
                                 <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] text-white fill-current">
                                   <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                 </svg>
                               </div>
                               <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-white -mt-[1px]" />
                               <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] border-t-[#E16238] -mt-[7px]" />
                             </div>
                           </div>

                           {/* Leaflet attribution */}
                           <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur px-1.5 py-0.5 text-[8px] font-bold text-stone-400 uppercase tracking-tighter select-none border border-stone-200/50 rounded pointer-events-none">
                             Leaflet
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </section>

          {/* DADOS SENSÍVEIS */}
          <section id="dados_sensiveis" className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100 space-y-8">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              Dados Pessoais Sensíveis
            </h2>
            <p className="text-[11px] text-stone-400 font-medium italic -mt-6">Estas informações são coletadas por lei e NÃO serão exibidas publicamente.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Data de Nascimento</label>
                     <input
                       type="date"
                       value={formData.birthDate || ''}
                       onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                       className="w-full bg-stone-50 border-none rounded-2xl px-5 py-3 text-[14px] outline-none"
                     />
                  </div>
                  <div className="flex flex-col gap-4 pt-4">
                    <div className="flex items-center gap-3">
                       <input 
                         type="checkbox" 
                         checked={formData.isSenior || false}
                         onChange={e => setFormData({ ...formData, isSenior: e.target.checked })}
                         className="w-5 h-5 rounded-lg border-stone-200 accent-[#5A5A40]"
                       />
                       <span className="text-[11px] font-black text-stone-500 uppercase tracking-tighter">Pessoa Idosa</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <input 
                         type="checkbox" 
                         checked={formData.disability || false}
                         onChange={e => setFormData({ ...formData, disability: e.target.checked })}
                         className="w-5 h-5 rounded-lg border-stone-200 accent-[#5A5A40]"
                       />
                       <span className="text-[11px] font-black text-stone-500 uppercase tracking-tighter">Pessoa com Deficiência (PCD)</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Gênero</label>
                  <select 
                    value={formData.gender || ''}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-[14px] outline-none appearance-none font-medium"
                  >
                     <option value="">Selecione...</option>
                     <option value="Homem Cis">Homem Cis</option>
                     <option value="Mulher Cis">Mulher Cis</option>
                     <option value="Homem Trans">Homem Trans</option>
                     <option value="Mulher Trans">Mulher Trans</option>
                     <option value="Não-binário">Não-binário</option>
                     <option value="Outro">Outro</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Orientação Sexual</label>
                  <select 
                    value={formData.sexualOrientation || ''}
                    onChange={e => setFormData({ ...formData, sexualOrientation: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-[14px] outline-none appearance-none font-medium"
                  >
                     <option value="">Selecione...</option>
                     <option value="Heterossexual">Heterossexual</option>
                     <option value="Homossexual">Homossexual</option>
                     <option value="Bissexual">Bissexual</option>
                     <option value="Outro">Outro</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Raça / Cor</label>
                  <select 
                    value={formData.raceColor || ''}
                    onChange={e => setFormData({ ...formData, raceColor: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-[14px] outline-none appearance-none font-medium"
                  >
                     <option value="">Selecione...</option>
                     <option value="Parda">Parda</option>
                     <option value="Preta">Preta</option>
                     <option value="Branca">Branca</option>
                     <option value="Indígena">Indígena</option>
                     <option value="Amarela">Amarela</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Grau de Escolaridade</label>
                  <select 
                    value={formData.education || ''}
                    onChange={e => setFormData({ ...formData, education: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-[14px] outline-none appearance-none font-medium"
                  >
                     <option value="">Selecione...</option>
                     <option value="Fundamental Incompleto">Fundamental Incompleto</option>
                     <option value="Fundamental Completo">Fundamental Completo</option>
                     <option value="Médio Incompleto">Médio Incompleto</option>
                     <option value="Médio Completo">Médio Completo</option>
                     <option value="Superior Incompleto">Superior Incompleto</option>
                     <option value="Superior Completo">Superior Completo</option>
                     <option value="Pós-graduação">Pós-graduação</option>
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Povos ou Comunidades Tradicionais</label>
                  <select 
                    value={formData.traditionalCommunities || ''}
                    onChange={e => setFormData({ ...formData, traditionalCommunities: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 text-[14px] outline-none appearance-none font-medium"
                  >
                     <option value="">Não pertenço</option>
                     <option value="Indígena">Indígena</option>
                     <option value="Quilombola">Quilombola</option>
                     <option value="Ribeirinha">Ribeirinha</option>
                     <option value="Gitano">Cigano/Gitano</option>
                     <option value="Outro">Outro</option>
                  </select>
               </div>

               <div className="flex items-center gap-3 pl-2 pt-6">
                  <input 
                    type="checkbox" 
                    checked={formData.itinerantAgent || false}
                    onChange={e => setFormData({ ...formData, itinerantAgent: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-stone-200 accent-[#5A5A40]"
                  />
                  <span className="text-[11px] font-black text-stone-500 uppercase tracking-tighter">Agente Itinerante</span>
               </div>

            </div>
          </section>

          {/* CONTEUDO PUBLICO */}
          <section id="publico" className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100 space-y-8">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              Conteúdo Público & Atuação
            </h2>

            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Áreas de Atuação*</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newArea} 
                        onChange={e => setNewArea(e.target.value)}
                        className="flex-1 px-5 py-3 bg-stone-50 border-none rounded-2xl text-sm outline-none"
                        placeholder="Música, Teatro, Design..."
                      />
                      <button 
                        type="button" 
                        onClick={() => addItem('areasOfActivity', newArea, setNewArea)}
                        className="w-12 h-12 bg-[#141414] text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.areasOfActivity?.map((item, id) => (
                        <span key={id} className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full text-[10px] font-black text-stone-800 uppercase tracking-tighter border border-stone-200">
                          {item} 
                          <button type="button" onClick={() => removeItem('areasOfActivity', id)} className="text-stone-400 hover:text-red-500">
                             <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Tags (Segmentos)*</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTag} 
                        onChange={e => setNewTag(e.target.value)}
                        className="flex-1 px-5 py-3 bg-stone-50 border-none rounded-2xl text-sm outline-none"
                        placeholder="Ex: #ArteModerna #Breves"
                      />
                      <button 
                        type="button" 
                        onClick={() => addItem('tags', newTag, setNewTag)}
                        className="w-12 h-12 bg-[#141414] text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags?.map((item, id) => (
                        <span key={id} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40]/10 rounded-full text-[10px] font-black text-[#5A5A40] uppercase tracking-tighter border border-[#5A5A40]/10">
                          #{item} 
                          <button type="button" onClick={() => removeItem('tags', id)} className="text-[#5A5A40]/40 hover:text-red-500">
                             <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">
                    {formData.type === AgentType.COLLECTIVE ? 'Histórico do Coletivo*' : 'Descrição Detalhada*'}
                  </label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={12}
                    className="w-full px-8 py-8 bg-stone-50 border-none rounded-[2rem] text-stone-800 text-[15px] font-medium outline-none focus:ring-2 focus:ring-stone-100 resize-none leading-relaxed"
                    placeholder={formData.type === AgentType.COLLECTIVE ? "Conte a história do coletivo, fundação, principais marcos..." : "Conte sua trajetória, projetos realizados, portfólio..."}
                  />
               </div>
            </div>
          </section>

          {/* MULTIMIDIA */}
          <section id="multimidia" className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100 space-y-12">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              Galeria Multimídia
            </h2>

            <div className="space-y-8">
               <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                     <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter">Vídeos (Youtube/Vimeo)*</label>
                     <span className="text-[9px] font-black text-stone-300 italic">Insira links um por um</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={newVideo} 
                      onChange={e => setNewVideo(e.target.value)}
                      className="flex-1 px-6 py-4 bg-stone-50 border-none rounded-2xl text-[13px] outline-none"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <button 
                      type="button" 
                      onClick={() => addItem('videos', newVideo, setNewVideo)}
                      className="px-8 bg-[#141414] text-white rounded-2xl font-black text-[12px] uppercase tracking-tighter hover:bg-[#5A5A40] transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.videos?.map((item, id) => (
                      <div key={id} className="flex justify-between items-center p-4 bg-[#F8F9FA] rounded-2xl border border-stone-100 group">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                              <Video size={18} />
                           </div>
                           <span className="text-[12px] font-black text-stone-600 truncate max-w-[200px]">{item}</span>
                        </div>
                        <button type="button" onClick={() => removeItem('videos', id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                           <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                     <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter">Galeria de Fotos*</label>
                     <span className="text-[9px] font-black text-stone-300 italic">Upload local ou URL direta</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-2">
                        <input 
                          type="url" 
                          value={newGalleryImg} 
                          onChange={e => setNewGalleryImg(e.target.value)}
                          className="flex-1 px-5 py-4 bg-stone-50 border-none rounded-2xl text-[12px] outline-none"
                          placeholder="Link da imagem..."
                        />
                        <button 
                          type="button" 
                          onClick={() => addItem('gallery', newGalleryImg, setNewGalleryImg)}
                          className="px-6 bg-[#141414] text-white rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-[#5A5A40] transition-colors"
                        >
                          Adicionar URL
                        </button>
                    </div>
                    <div>
                        <input 
                          type="file" 
                          ref={galleryRef}
                          multiple
                          onChange={(e) => handleFileUpload(e, 'gallery', 'gallery')}
                          className="hidden"
                          accept="image/*"
                        />
                        <button 
                          type="button"
                          disabled={isUploading === 'gallery'}
                          onClick={() => galleryRef.current?.click()}
                          className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all shadow-md disabled:opacity-50"
                        >
                          {isUploading === 'gallery' ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                          Carregar Fotos Locais
                        </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {formData.images?.gallery?.map((item, id) => (
                      <div key={id} className="relative aspect-square rounded-3xl overflow-hidden border border-stone-100 group">
                        <img src={item} className="w-full h-full object-cover transition-transform group-hover:scale-110 shadow-sm" />
                        <div className="absolute inset-0 bg-red-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                              type="button" 
                              onClick={() => removeItem('gallery', id)}
                              className="w-10 h-10 bg-white text-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </section>

          {/* Footer Actions */}
          <footer className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-3xl border-t border-stone-100 p-6 z-50">
             <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="hidden md:block">
                   <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em]">Status de Edição</p>
                   <p className="text-xs font-black text-stone-500 italic">Modo de rascunho em tempo real</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   <button 
                    type="button" 
                    onClick={onCancel}
                    className="flex-1 md:flex-none px-8 py-3.5 border border-stone-200 text-stone-400 rounded-2xl font-black text-[11px] tracking-tighter uppercase hover:bg-stone-50 transition-all active:scale-95"
                   >
                     Cancelar
                   </button>
                   <button 
                    type="submit" 
                    className="flex-1 md:flex-none px-8 py-3.5 bg-[#141414] text-white rounded-2xl font-black text-[11px] tracking-[0.15em] uppercase hover:bg-[#5A5A40] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                   >
                     <CheckCircle2 size={18} />
                     Salvar Perfil Completo
                   </button>
                </div>
             </div>
          </footer>
        </form>
      </main>
    </div>
  );
}
