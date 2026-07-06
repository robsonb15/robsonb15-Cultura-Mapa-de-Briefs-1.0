import { useState, useEffect } from 'react';
import { sanitizeText } from '../lib/auth-utils';
import { compressImageToBase64 } from '../lib/storage-utils';
import { 
  Save, 
  X, 
  MapPin, 
  Calendar, 
  Accessibility, 
  Tag, 
  Type, 
  FileText,
  Clock,
  Link as LinkIcon,
  CheckCircle2,
  Upload,
  CloudUpload,
  Shield,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageCropperModal from './ImageCropperModal';
import { 
  CulturalSpace, 
  CulturalEvent, 
  CulturalOpportunity, 
  CulturalProject,
  MediaGallery
} from '../types';

type ContentType = 'space' | 'event' | 'opportunity' | 'project';

export const DEFAULT_MODELS = [
  { id: 'representation', defaultLabel: 'Declaração de Representação' },
  { id: 'noCnpj', defaultLabel: 'Declaração Coletivo sem CNPJ' },
  { id: 'ethnicRacial', defaultLabel: 'Declaração Étnico Racial' },
  { id: 'disability', defaultLabel: 'Declaração de PCD' },
  { id: 'report', defaultLabel: 'Relatório de Execução' },
  { id: 'form', defaultLabel: 'Formulário de Recurso' },
  { id: 'term', defaultLabel: 'Termo de Execução' },
  { id: 'plan', defaultLabel: 'Plano de Trabalho' },
];

interface ContentEditFormProps {
  type: ContentType;
  initialData?: any;
  onSave: (data: any, selectedType?: ContentType) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
}

export default function ContentEditForm({ type, initialData, onSave, onCancel, isAdmin }: ContentEditFormProps) {
  const [contentType, setContentType] = useState<ContentType>(type);
  const [loading, setLoading] = useState(false);
  const [pendingCropperSrc, setPendingCropperSrc] = useState<string | null>(null);
  const [pendingCropperInfo, setPendingCropperInfo] = useState<{ file: File; field: 'imageUrl' | 'bannerUrl' } | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    type: '',
    address: { text: '', lat: -1.68, lng: -50.48 },
    images: { gallery: [] },
    official: false,
    ...initialData
  });

  const getTitle = () => {
    const isNew = !initialData?.id;
    const prefix = isNew ? 'Novo' : 'Editar';
    switch (contentType) {
      case 'space': return `${prefix} Espaço`;
      case 'event': return `${prefix} Evento`;
      case 'opportunity': return `${prefix} Oportunidade`;
      case 'project': return `${prefix} Projeto`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sanitize user inputs
      const sanitizedData = {
        ...formData,
        name: sanitizeText(formData.name || ''),
        description: sanitizeText(formData.description || ''),
        presentation: sanitizeText(formData.presentation || ''),
        type: sanitizeText(formData.type || '')
      };

      // Automatically geocode Space address if it exists
      if (contentType === 'space' && sanitizedData.address?.text) {
        try {
          const q = `${sanitizedData.address.text}, Breves, Pará, Brasil`;
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'User-Agent': 'MapaCulturalBrevesApp/1.0'
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              sanitizedData.address = {
                ...sanitizedData.address,
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
              };
            }
          }
        } catch (err) {
          console.error("Erro ao geocodificar o espaço:", err);
        }
      }
      
      await onSave(sanitizedData, contentType);
    } finally {
      setLoading(false);
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCropConfirm = async (croppedImageUrl: string) => {
    if (!pendingCropperInfo) return;
    const { field } = pendingCropperInfo;

    setPendingCropperSrc(null);
    setPendingCropperInfo(null);
    setLoading(true);

    try {
      setFormData({ ...formData, [field]: croppedImageUrl });
    } catch (error) {
      console.error('Erro ao salvar imagem cortada:', error);
      alert('Erro ao salvar imagem cortada.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'bannerUrl') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingCropperSrc(reader.result as string);
        setPendingCropperInfo({ file, field });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    try {
      if (file.type.startsWith('image/')) {
        const base64 = await compressImageToBase64(file);
        setFormData({ ...formData, [field]: base64 });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, [field]: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    }
  };

  const handleModelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, modelId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const base64 = await compressImageToBase64(file);
        setFormData({ 
          ...formData, 
          modelFiles: { ...(formData.modelFiles || {}), [modelId]: base64 } 
        });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ 
            ...formData, 
            modelFiles: { ...(formData.modelFiles || {}), [modelId]: reader.result as string } 
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Erro ao carregar arquivo de modelo:", err);
    }
  };

  const handleGenericFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const base64 = await compressImageToBase64(file);
        const newFiles = [...(formData.files || [])];
        newFiles[index] = {
          name: file.name,
          url: base64
        };
        setFormData({ ...formData, files: newFiles });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newFiles = [...(formData.files || [])];
          newFiles[index] = {
            name: file.name,
            url: reader.result as string
          };
          setFormData({ ...formData, files: newFiles });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Erro ao carregar arquivo:", err);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-stone-100 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-10 border-b border-stone-50 pb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter">{getTitle()}</h2>
          <p className="text-stone-400 text-xs font-black uppercase tracking-tighter mt-1">Preencha as informações obrigatórias (*)</p>
        </div>
        <button onClick={onCancel} className="p-3 bg-stone-50 text-stone-400 hover:text-stone-900 rounded-2xl transition-all">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* INFORMAÇÕES DE APRESENTAÇÃO Section */}
        <div className="space-y-8 bg-stone-50/30 rounded-[2.5rem] p-8 md:p-12 border border-stone-100">
          <h3 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter mb-4">INFORMAÇÕES DE APRESENTAÇÃO</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Banner Image Cover - Full Width */}
            <div className="md:col-span-12 space-y-4">
               <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">IMAGEM DE CAPA (BANNER - URL OU UPLOAD)*</label>
               <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden bg-stone-50 border-2 border-dashed border-stone-200 transition-all hover:border-stone-300">
                  {formData.bannerUrl ? (
                     <img src={formData.bannerUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-50">
                        <CloudUpload size={48} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-tighter mt-2">PRÉVIO DO BANNER</span>
                     </div>
                  )}
               </div>
               <div className="flex gap-3">
                  <div className="flex-[3]">
                      <input 
                        type="url" 
                        placeholder="Link da imagem (URL)..."
                        className="w-full bg-white border border-stone-100 rounded-xl px-5 py-3.5 text-stone-900 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                        value={formData.bannerUrl || ''}
                        onChange={e => setFormData({ ...formData, bannerUrl: e.target.value })}
                     />
                  </div>
                  <label className="shrink-0 bg-[#F5F5F3] hover:bg-stone-250 text-stone-600 px-6 rounded-xl font-black text-[11px] uppercase tracking-tighter flex items-center justify-center gap-2 transition-all cursor-pointer">
                     <CloudUpload size={18} />
                     <span>UPLOAD</span>
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl')} />
                  </label>
               </div>
            </div>

            {/* Profile Image - left bottom */}
            <div className="md:col-span-4 space-y-4">
               <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">FOTO DE PERFIL (URL OU UPLOAD)*</label>
               <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-stone-50 border-2 border-dashed border-stone-200 transition-all hover:border-stone-300 mb-2">
                  {formData.imageUrl ? (
                     <img src={formData.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-50">
                        <CloudUpload size={32} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-tighter mt-2 text-center px-4">FOTO</span>
                     </div>
                  )}
               </div>
               <div className="space-y-3">
                  <input 
                    type="url" 
                    placeholder="Link da foto..."
                    className="w-full bg-white border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                    value={formData.imageUrl || ''}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                  <label className="w-full bg-[#F5F5F3] hover:bg-stone-250 text-stone-600 py-4 rounded-xl font-black text-[11px] uppercase tracking-tighter flex items-center justify-center gap-2 transition-all cursor-pointer">
                     <CloudUpload size={18} />
                     UPLOAD DO DESKTOP
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'imageUrl')} />
                  </label>
               </div>
            </div>

            {/* Right side fields - layout aligned with screenshots */}
            <div className="md:col-span-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">NOME DE EXIBIÇÃO / TÍTULO*</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-black outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  placeholder="Seu nome artístico, edital ou nome do projeto/espaço"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">CATEGORIA / TIPO*</label>
                <input
                  type="text"
                  required
                  value={formData.type || ''}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-black outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  placeholder="Ex: Auditório, Workshop, Edital, Produção..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">LINK EXTERNO (SITE, REDE SOCIAL, ETC)*</label>
                <input
                  type="url"
                  value={formData.link || formData.website || ''}
                  onChange={e => setFormData({ ...formData, link: e.target.value, website: e.target.value })}
                  className="w-full bg-white border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-medium outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  placeholder="Seu link principal ou site"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">TIPO DE CONTEÚDO*</label>
                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value as ContentType)}
                  className="w-full bg-white border border-stone-100 rounded-xl px-5 py-4 text-stone-900 text-xs font-black outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all cursor-pointer"
                >
                  <option value="space">Espaço Cultural</option>
                  <option value="event">Evento Cultural</option>
                  <option value="opportunity">Oportunidade / Edital</option>
                  <option value="project">Projeto</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Specific Date & Status fields for Events/Opportunities */}
        {(contentType === 'event' || contentType === 'opportunity') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-stone-50/20 rounded-[2.5rem] p-8 md:p-10 border border-stone-100">
            {contentType === 'event' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Data e Hora*</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date || ''}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                />
              </div>
            )}

            {contentType === 'opportunity' && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Data de Início*</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate || ''}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Prazo de Inscrição*</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.deadline || ''}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Status</label>
                  <select
                    value={formData.status || 'open'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all appearance-none"
                  >
                    <option value="open">Inscrições Abertas</option>
                    <option value="closed">Inscrições Encerradas</option>
                    <option value="future">Inscrições Futuras</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Agente Vinculado</label>
                  <input
                    type="text"
                    value={formData.agentLabel || ''}
                    onChange={e => setFormData({ ...formData, agentLabel: e.target.value })}
                    className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                    placeholder="EX: PREFEITURA MUNICIPAL..."
                  />
                </div>

                {/* Linha de Tempo das Fases / Cronograma */}
                <div className="md:col-span-2 bg-stone-50 p-6 md:p-8 rounded-[2rem] border border-stone-200/60 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-stone-900 uppercase tracking-tighter">Cronograma de Fases (Linha de Tempo)</h4>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight mt-0.5">Defina as datas das etapas/fases para ordenar o andamento</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const standardPhases = [
                          { name: 'Fase de Inscrições', startDate: formData.startDate || '', endDate: formData.deadline || '' },
                          { name: 'Fase de Seleção / Avaliação', startDate: '', endDate: '' },
                          { name: 'Habilitação Documental', startDate: '', endDate: '' },
                          { name: 'Publicação final do resultado', startDate: '', endDate: '' }
                        ];
                        setFormData({ ...formData, timelinePhases: standardPhases });
                      }}
                      className="px-4 py-2.5 bg-[#0070BA]/5 hover:bg-[#0070BA]/10 text-[#0070BA] rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer border border-[#0070BA]/10"
                    >
                      Preencher Fases Padrão
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(formData.timelinePhases || []).map((phase: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-2xl border border-stone-150 relative shadow-xs">
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome da Fase*</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Fase de Inscrições"
                            value={phase.name || ''}
                            onChange={e => {
                              const updated = [...(formData.timelinePhases || [])];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setFormData({ ...formData, timelinePhases: updated });
                            }}
                            className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all text-stone-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 shrink-0 sm:w-80">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-tighter pl-1">Início</label>
                            <input
                              type="datetime-local"
                              value={phase.startDate || ''}
                              onChange={e => {
                                const updated = [...(formData.timelinePhases || [])];
                                updated[index] = { ...updated[index], startDate: e.target.value };
                                setFormData({ ...formData, timelinePhases: updated });
                              }}
                              className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all text-stone-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-stone-400 uppercase tracking-tighter pl-1">Fim</label>
                            <input
                              type="datetime-local"
                              value={phase.endDate || ''}
                              onChange={e => {
                                const updated = [...(formData.timelinePhases || [])];
                                updated[index] = { ...updated[index], endDate: e.target.value };
                                setFormData({ ...formData, timelinePhases: updated });
                              }}
                              className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all text-stone-800"
                            />
                          </div>
                        </div>

                        <div className="flex items-end justify-end gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              if (index === 0) return;
                              const updated = [...(formData.timelinePhases || [])];
                              const temp = updated[index];
                              updated[index] = updated[index - 1];
                              updated[index - 1] = temp;
                              setFormData({ ...formData, timelinePhases: updated });
                            }}
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Mover para cima"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={index === (formData.timelinePhases || []).length - 1}
                            onClick={() => {
                              if (index === (formData.timelinePhases || []).length - 1) return;
                              const updated = [...(formData.timelinePhases || [])];
                              const temp = updated[index];
                              updated[index] = updated[index + 1];
                              updated[index + 1] = temp;
                              setFormData({ ...formData, timelinePhases: updated });
                            }}
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Mover para baixo"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.timelinePhases || []).filter((_: any, i: number) => i !== index);
                              setFormData({ ...formData, timelinePhases: updated });
                            }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover Fase"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(formData.timelinePhases || []).length === 0 && (
                      <div className="text-center py-6 bg-white rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 text-xs font-bold uppercase tracking-tighter">
                        Nenhuma fase adicionada. Use o botão acima para carregar as fases padrão ou adicione manualmente.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.timelinePhases || []), { name: '', startDate: '', endDate: '' }];
                        setFormData({ ...formData, timelinePhases: updated });
                      }}
                      className="text-[11px] font-black text-[#0070BA] uppercase tracking-tighter hover:underline flex items-center gap-1 mt-2 pl-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      Adicionar Nova Fase
                    </button>
                  </div>
                </div>

                <div id="segment-selector" className="md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1 flex items-center justify-between">
                    <span>Áreas de Interesse / Segmentos</span>
                    <span className="text-[9px] text-[#0070BA] font-black uppercase">Clique para selecionar</span>
                  </label>
                  
                  {/* Selected items overview */}
                  <div className="flex flex-wrap gap-2 min-h-12 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    {formData.areas && formData.areas.length > 0 ? (
                      formData.areas.map((area: string, index: number) => (
                        <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E30613] text-white rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">
                          {area}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.areas.filter((_: any, i: number) => i !== index);
                              setFormData({ ...formData, areas: updated });
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
                      const isSelected = formData.areas?.includes(seg);
                      return (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => {
                            const currentAreas = formData.areas || [];
                            let updated;
                            if (isSelected) {
                              updated = currentAreas.filter((a: string) => a !== seg);
                            } else {
                              updated = [...currentAreas, seg];
                            }
                            setFormData({ ...formData, areas: updated });
                          }}
                          className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tighter text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-[#0070BA]/10 border-[#0070BA] text-[#0070BA]'
                              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-105 hover:border-stone-300'
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
                      id="custom-interest-input"
                      placeholder="Adicionar outro segmento personalizado..."
                      className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0070BA]/25 focus:bg-white transition-all text-stone-800 font-bold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            const currentAreas = formData.areas || [];
                            if (!currentAreas.includes(val)) {
                              setFormData({ ...formData, areas: [...currentAreas, val] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('custom-interest-input') as HTMLInputElement;
                        const val = input?.value.trim();
                        if (val) {
                          const currentAreas = formData.areas || [];
                          if (!currentAreas.includes(val)) {
                            setFormData({ ...formData, areas: [...currentAreas, val] });
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
              </>
            )}
          </div>
        )}

        {/* Administrative Section (Admin only) */}
        {isAdmin && (
          <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100 space-y-4">
            <h3 className="text-sm font-black text-[#0070BA] uppercase tracking-tighter flex items-center gap-2">
              <Shield size={16} />
              Configurações Administrativas
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.official || false}
                    onChange={e => setFormData({ ...formData, official: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${formData.official ? 'bg-[#0070BA]' : 'bg-stone-200'}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.official ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <span className="text-xs font-black text-stone-700 uppercase tracking-tighter group-hover:text-stone-900 transition-colors">
                  Conteúdo Oficial (Selo de Verificação)
                </span>
              </label>
            </div>
            <p className="text-[10px] text-blue-600/80 font-medium leading-relaxed">
              Ao ativar esta opção, o conteúdo será exibido com o selo oficial e poderá ser filtrado na seção "Em Destaque".
            </p>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">
            {contentType === 'opportunity' ? 'Introdução / Resumo*' : 'Descrição / Detalhes*'}
          </label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-stone-50 border-none rounded-[2rem] px-8 py-8 text-stone-900 text-sm font-medium outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all resize-none leading-relaxed"
            placeholder="Breve introdução que aparece no topo..."
          />
        </div>

        {contentType === 'opportunity' && (
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Apresentação Detalhada</label>
            <textarea
              rows={12}
              value={formData.presentation || ''}
              onChange={e => setFormData({ ...formData, presentation: e.target.value })}
              className="w-full bg-stone-50 border-none rounded-[2rem] px-8 py-8 text-stone-900 text-sm font-medium outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all resize-none leading-relaxed"
              placeholder="Conteúdo principal da página de informações..."
            />
          </div>
        )}

        {/* Location (for spaces and events) */}
        {(contentType === 'space' || contentType === 'event') && (
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Localização / Endereço*</label>
            <div className="relative">
               <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
               <input
                 type="text"
                 required
                 value={contentType === 'space' ? formData.address.text : formData.location}
                 onChange={e => contentType === 'space' ? setFormData({ ...formData, address: { ...formData.address, text: e.target.value } }) : setFormData({ ...formData, location: e.target.value })}
                 className="w-full bg-stone-50 border-none rounded-2xl pl-14 pr-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                 placeholder="Rua, Número, Bairro - Breves/PA"
               />
            </div>
          </div>
        )}



        {/* Social Media Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="md:col-span-2">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter mb-4">Presença Online & Redes Sociais</h3>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Instagram (@usuario)</label>
            <input
              type="text"
              value={formData.social?.instagram || ''}
              onChange={e => setFormData({ ...formData, social: { ...(formData.social || {}), instagram: e.target.value } })}
              className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
              placeholder="@seu.perfil"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Facebook</label>
            <input
              type="text"
              value={formData.social?.facebook || ''}
              onChange={e => setFormData({ ...formData, social: { ...(formData.social || {}), facebook: e.target.value } })}
              className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
              placeholder="Link ou nome do perfil"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">YouTube</label>
            <input
              type="text"
              value={formData.social?.youtube || ''}
              onChange={e => setFormData({ ...formData, social: { ...(formData.social || {}), youtube: e.target.value } })}
              className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
              placeholder="Link do canal ou @usuario"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-stone-400 uppercase tracking-tighter pl-1">Site Oficial</label>
            <input
              type="url"
              value={formData.social?.website || ''}
              onChange={e => setFormData({ ...formData, social: { ...(formData.social || {}), website: e.target.value } })}
              className="w-full bg-stone-50 border-none rounded-2xl px-6 py-5 text-stone-900 text-sm font-bold outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
              placeholder="https://suapagina.com.br"
            />
          </div>
        </div>

        {/* Files Section */}
        {contentType === 'opportunity' && (
          <div className="space-y-8 pt-10 border-t border-stone-100">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter">Modelos de Documentos (Obrigatórios)</h3>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-tight">Insira os links dos modelos que os proponentes devem baixar. Você pode clicar e alterar os nomes de exibição de qualquer um dos modelos de documentos se quiser.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {DEFAULT_MODELS.map((model) => {
                const currentLabel = formData.modelLabels?.[model.id] || model.defaultLabel;
                const fileUrl = formData.modelFiles?.[model.id] || '';
                return (
                  <div key={model.id} className="bg-stone-50/40 border border-stone-150 p-6 rounded-[2rem] space-y-4 shadow-sm relative transition-all hover:bg-stone-50/80">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome do Modelo (Editável)</label>
                      <input
                        type="text"
                        value={currentLabel}
                        onChange={e => setFormData({ 
                          ...formData, 
                          modelLabels: { ...(formData.modelLabels || {}), [model.id]: e.target.value } 
                        })}
                        className="w-full bg-white border border-stone-100 rounded-xl px-4 py-2.5 text-stone-900 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                        placeholder="Nome do modelo..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Arquivo (URL ou Upload)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fileUrl}
                          onChange={e => setFormData({ 
                            ...formData, 
                            modelFiles: { ...(formData.modelFiles || {}), [model.id]: e.target.value } 
                          })}
                          className="flex-1 bg-white border border-stone-100 rounded-xl px-4 py-3 text-stone-900 text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                          placeholder="Cole o link ou faça upload..."
                        />
                        <label className="shrink-0 bg-[#F5F5F3] hover:bg-stone-250 text-stone-600 px-4 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-stone-150">
                          <CloudUpload size={14} />
                          <span>UPLOAD</span>
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => handleModelFileUpload(e, model.id)} />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="space-y-6 pt-10 border-t border-stone-100">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-tighter">Arquivos para Download (Livre)</h3>
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-tight">Adicione arquivos adicionais para download, como editais completos, manuais ou anexos livres.</p>
          </div>
          
          <div className="space-y-4">
            {(formData.files || []).map((file: any, index: number) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 bg-stone-50/40 p-5 rounded-3xl border border-stone-150 relative">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Nome do Arquivo</label>
                  <input
                    type="text"
                    placeholder="Ex: EDITAL-COMPLETO-BREVES.PDF"
                    value={file.name}
                    onChange={e => {
                      const newFiles = [...(formData.files || [])];
                      newFiles[index].name = e.target.value;
                      setFormData({ ...formData, files: newFiles });
                    }}
                    className="w-full bg-white border border-stone-100 rounded-xl px-4 py-2.5 text-xs font-black shadow-xs outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                  />
                </div>
                
                <div className="flex-[2] space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-tighter pl-1">Link ou Upload de Arquivo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cole o link ou clique em Upload..."
                      value={file.url}
                      onChange={e => {
                        const newFiles = [...(formData.files || [])];
                        newFiles[index].url = e.target.value;
                        setFormData({ ...formData, files: newFiles });
                      }}
                      className="flex-1 bg-white border border-stone-100 rounded-xl px-4 py-3 text-xs font-bold shadow-xs outline-none focus:ring-2 focus:ring-[#0070BA]/20 transition-all"
                    />
                    <label className="shrink-0 bg-[#F5F5F3] hover:bg-stone-250 text-stone-600 px-4 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-stone-150">
                      <CloudUpload size={14} />
                      <span>UPLOAD</span>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => handleGenericFileUpload(e, index)} />
                    </label>
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      const newFiles = (formData.files || []).filter((_: any, i: number) => i !== index);
                      setFormData({ ...formData, files: newFiles });
                    }}
                    className="p-3 text-red-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                    title="Remover arquivo"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, files: [...(formData.files || []), { name: '', url: '' }] })}
              className="text-[11px] font-black text-[#0070BA] uppercase tracking-tighter hover:underline flex items-center gap-1 mt-2 pl-1"
            >
              + Adicionar Arquivo para Download
            </button>
          </div>
        </div>

        <div className="pt-10 flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#0070BA] text-white py-5 rounded-2xl font-black text-[13px] tracking-tighter uppercase hover:bg-[#005ea6] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            Salvar Registro
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-stone-100 text-stone-600 py-5 rounded-2xl font-black text-[13px] tracking-tighter uppercase hover:bg-stone-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>

      <AnimatePresence>
        {pendingCropperSrc && (
          <ImageCropperModal
            imageSrc={pendingCropperSrc}
            onConfirm={handleCropConfirm}
            onCancel={() => {
              setPendingCropperSrc(null);
              setPendingCropperInfo(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
