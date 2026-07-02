import { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Upload, 
  Download, 
  AlertCircle, 
  User, 
  FileText, 
  History, 
  ScrollText, 
  Package, 
  FileCheck, 
  ClipboardList,
  Loader2,
  Trash2,
  Edit2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CulturalOpportunity, CulturalAgent, OpportunityRegistration } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RegistrationSummaryPDF } from './RegistrationSummaryPDF';

interface OpportunityRegistrationProps {
  opportunity: CulturalOpportunity;
  agent: CulturalAgent;
  registration?: OpportunityRegistration;
  onBack: () => void;
  onSave: (data: Partial<OpportunityRegistration>) => Promise<void>;
}

interface RegistrationData {
  identification: {
    isQuota: string;
    projectName: string;
    profileImage: string | null;
    addressProof: string | null;
    personalDocs: string | null;
    taxCertificates: string | null;
  };
  trajectory: {
    portfolio: string | null;
  };
  declarations: {
    representation: string | null;
    noCnpj: string | null;
    ethnicRacial: string | null;
    disability: string | null;
  };
  execution: {
    report: string | null;
  };
  resources: {
    form: string | null;
  };
  awardingTerm: {
    term: string | null;
  };
  workPlan: {
    plan: string | null;
    justification: string;
    duration: string;
    artisticSegment: string;
    goals: { description: string, delivery: string }[];
  };
}

export default function OpportunityRegistrationFlow({ opportunity, agent, registration, onBack, onSave }: OpportunityRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSelection, setShowSelection] = useState(!registration);
  const [proponentType, setProponentType] = useState(registration?.proponentType || '');
  
  const defaultData: RegistrationData = {
    identification: {
      isQuota: 'Não',
      projectName: '',
      profileImage: agent.images.profile || null,
      addressProof: null,
      personalDocs: null,
      taxCertificates: null,
    },
    trajectory: {
      portfolio: null,
    },
    declarations: {
      representation: null,
      noCnpj: null,
      ethnicRacial: null,
      disability: null,
    },
    execution: {
      report: null,
    },
    resources: {
      form: null,
    },
    awardingTerm: {
      term: null,
    },
    workPlan: {
      plan: null,
      justification: '',
      duration: '',
      artisticSegment: '',
      goals: []
    }
  };

  const initialData: RegistrationData = registration?.data 
    ? { 
        ...defaultData, 
        ...registration.data,
        identification: { ...defaultData.identification, ...(registration.data as any).identification },
        trajectory: { ...defaultData.trajectory, ...(registration.data as any).trajectory },
        declarations: { ...defaultData.declarations, ...(registration.data as any).declarations },
        execution: { ...defaultData.execution, ...(registration.data as any).execution },
        resources: { ...defaultData.resources, ...(registration.data as any).resources },
        awardingTerm: { ...defaultData.awardingTerm, ...(registration.data as any).awardingTerm },
        workPlan: { ...defaultData.workPlan, ...(registration.data as any).workPlan },
      } 
    : defaultData;

  const [formData, setFormData] = useState<RegistrationData>(initialData);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount if not editing existing registration
  useEffect(() => {
    if (!registration) {
      const saved = localStorage.getItem(`draft_reg_${opportunity.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed.formData);
          setProponentType(parsed.proponentType);
          setShowSelection(false);
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, [opportunity.id, registration]);

  // Save to localStorage every time formData changes
  useEffect(() => {
    if (!registration && !showSelection) {
      localStorage.setItem(`draft_reg_${opportunity.id}`, JSON.stringify({
        formData,
        proponentType
      }));
    }
  }, [formData, proponentType, opportunity.id, registration, showSelection]);

  const [newGoal, setNewGoal] = useState({ description: '', delivery: '' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const steps = [
    { id: 1, label: 'IDENTIFICAÇÃO', section: 'identification' },
    { id: 2, label: 'TRAJETÓRIA CULTURAL', section: 'trajectory' },
    { id: 3, label: 'DECLARAÇÕES', section: 'declarations' },
    { id: 4, label: 'EXECUÇÃO DO OBJETO', section: 'execution' },
    { id: 5, label: 'RECURSOS', section: 'resources' },
    { id: 6, label: 'TERMO DE PREMIAÇÃO CULTURAL', section: 'awardingTerm' },
    { id: 7, label: 'PLANO DE TRABALHO/PROJETO', section: 'workPlan' },
  ];

  const validateStep = (stepId: number) => {
    const missing = [];
    if (stepId === 1) {
      if (!formData.identification.projectName) missing.push('Nome do Projeto');
      if (!formData.identification.addressProof) missing.push('Comprovante de Endereço');
      if (!formData.identification.profileImage) missing.push('Imagem de Perfil');
    }
    if (stepId === 2) {
      if (!formData.trajectory.portfolio) missing.push('Portfólio');
    }
    if (stepId === 3) {
      if (proponentType === 'Coletivo') {
        if (!formData.declarations.representation) missing.push('Declaração de Representação');
      }
    }
    if (stepId === 4) {
      if (!formData.execution.report) missing.push('Relatório de Execução');
    }
    if (stepId === 5) {
      if (!formData.resources.form) missing.push('Formulário de Recurso');
    }
    if (stepId === 6) {
      if (!formData.awardingTerm.term) missing.push('Termo de Execução');
    }
    if (stepId === 7) {
      if (!formData.workPlan.plan) missing.push('Plano de Trabalho (Arquivo)');
      if (!formData.workPlan.duration) missing.push('Duração do Projeto');
      if (!formData.workPlan.artisticSegment) missing.push('Segmento Artístico');
      if (!formData.workPlan.justification) missing.push('Justificativa');
      if (!formData.workPlan.goals || formData.workPlan.goals.length === 0) missing.push('Pelo menos uma Meta no Plano de Metas');
    }
    
    if (missing.length > 0) {
      return { isValid: false, missingFields: missing };
    }
    return { isValid: true, missingFields: [] };
  };

  const handleFileUpload = (section: string, field: string, fileName: string) => {
     setFormData(prev => ({
       ...prev,
       [section]: {
         ...(prev as any)[section],
         [field]: fileName
       }
     }));
  };

  const handleRemoveFile = (section: string, field: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: null
      }
    }));
  };

  const nextStep = () => {
    const { isValid, missingFields } = validateStep(currentStep);
    if (!isValid) {
      alert(`Por favor, preencha os seguintes campos obrigatórios:\n\n- ${missingFields.join('\n- ')}`);
      return;
    }
    if (currentStep < 7) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleAddGoal = () => {
    if (!newGoal.description || !newGoal.delivery) {
      alert('Preencha a descrição e a entrega da meta.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      workPlan: {
        ...prev.workPlan,
        goals: [...(prev.workPlan.goals || []), newGoal]
      }
    }));
    setNewGoal({ description: '', delivery: '' });
  };

  const handleRemoveGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workPlan: {
        ...prev.workPlan,
        goals: prev.workPlan.goals.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async () => {
    // Validate all steps before submission
    const allMissing: string[] = [];
    for (let i = 1; i <= 7; i++) {
       const { isValid, missingFields } = validateStep(i);
       if (!isValid) {
         allMissing.push(...missingFields);
       }
    }

    if (allMissing.length > 0) {
      alert(`Erro: Complete todos os campos obrigatórios antes de finalizar:\n\n- ${[...new Set(allMissing)].join('\n- ')}`);
      return;
    }
    setIsSubmitting(true);
    try {
      let pdfUrl = registration?.pdfUrl;

      // Generate PDF if it doesn't exist or we are finishing
      if (pdfRef.current) {
        const canvas = await html2canvas(pdfRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdfUrl = pdf.output('datauristring');
      }

      await onSave({
        opportunityId: opportunity.id,
        proponentType,
        status: 'submitted',
        pdfUrl,
        data: formData as any,
      });
      // Clear draft after successful submission
      localStorage.removeItem(`draft_reg_${opportunity.id}`);
      alert('Inscrição realizada com sucesso!');
      onBack();
    } catch (error) {
      console.error("Error submitting registration", error);
      alert('Erro ao enviar inscrição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSelection) {
    return (
      <div className="bg-[#FDFDFD] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter">Inscreva-se</h1>
            <p className="text-stone-500 font-medium text-lg">Selecione uma opções abaixo e clique no botão para se inscrever</p>
          </div>

          <div className="space-y-8">
            <select 
              value={proponentType}
              onChange={(e) => setProponentType(e.target.value)}
              className="w-full bg-white border-2 border-stone-100 rounded-xl px-6 py-5 text-stone-600 text-lg font-medium outline-none focus:border-[#0070BA] appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Selecione o tipo de proponente</option>
              <option value="Individual">Pessoa Física (Individual)</option>
              <option value="Coletivo">Grupo ou Coletivo sem CNPJ</option>
              <option value="Juridica">Pessoa Jurídica (com ou sem fins lucrativos)</option>
            </select>

            <button 
              onClick={() => proponentType && setShowSelection(false)}
              disabled={!proponentType}
              className="w-full bg-[#0070BA] text-white py-8 rounded-[1.5rem] font-black text-3xl tracking-tight shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fazer inscrição
            </button>
          </div>

          <button 
            onClick={onBack}
            className="text-stone-400 font-black text-xs uppercase tracking-widest hover:text-stone-900 transition-colors"
          >
            Voltar para o edital
          </button>
        </div>
      </div>
    );
  }

  const FileUploadField = ({ label, description, section, field, required = false, modelKey }: { label: string, description: string, section: string, field: string, required?: boolean, modelKey?: string }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileName = (formData as any)[section]?.[field];
    const modelUrl = modelKey ? (opportunity as any).modelFiles?.[modelKey] : null;

    const currentLabel = modelKey && (opportunity as any).modelLabels?.[modelKey]
      ? (opportunity as any).modelLabels[modelKey].toUpperCase()
      : label;

    return (
      <div className="bg-white border-t border-stone-100 p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[12px] font-black text-stone-900 uppercase tracking-tight">
              {currentLabel} {required && <span className="text-red-500 font-normal ml-1 lowercase italic">*obrigatório</span>}
            </h4>
          </div>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tight leading-relaxed">
            {description}
          </p>
        </div>
 
        <div className="flex flex-col gap-4">
          {modelUrl && (
            <button 
              onClick={() => {
                window.open(modelUrl, '_blank');
              }}
              className="flex items-center gap-2 text-[#0070BA] font-black text-[12px] uppercase tracking-tight hover:underline w-fit"
            >
              <Download size={18} />
              Baixar modelo
            </button>
          )}

          {!fileName ? (
            <>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(section, field, file.name);
                }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3.5 border-2 border-[#0070BA] text-[#0070BA] rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#0070BA] hover:text-white transition-all w-fit shadow-sm"
              >
                <Upload size={16} />
                Enviar
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-xl border border-emerald-100 group w-fit">
              <CheckCircle2 size={18} className="shrink-0" />
              <div className="flex flex-col">
                <p className="text-[11px] font-black uppercase truncate max-w-[250px]">{fileName}</p>
                <span className="text-[9px] font-bold opacity-70">Arquivo enviado com sucesso</span>
              </div>
              <button 
                onClick={() => handleRemoveFile(section, field)}
                className="p-2 text-emerald-400 hover:text-red-500 transition-colors ml-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-40 font-sans">
      {/* Top Header */}
      <div className="bg-white px-8 md:px-20 py-16 border-b border-stone-200">
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-[44px] md:text-[56px] font-black text-stone-900 leading-tight tracking-[calc(-0.04em)]">Formulário de inscrição</h1>
          <p className="text-[18px] md:text-[22px] font-black text-stone-900 uppercase tracking-tighter opacity-80">{opportunity.name}</p>
        </div>
      </div>

      {/* Progress bar matching exactly screenshot style */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-8 md:px-20 py-12">
          <div className="relative flex items-center justify-between">
              {/* Progress Line Background */}
              <div className="absolute left-4 right-4 top-[14px] h-[3px] bg-stone-100 z-0" />
              {/* Active Progress Line */}
              <div 
                className="absolute left-4 top-[14px] h-[3px] bg-red-600 transition-all duration-700 ease-in-out z-0" 
                style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 8px)` }}
              />

              {steps.map((step) => (
                <div 
                  key={step.id}
                  className="relative z-10 flex flex-col items-center"
                >
                  <button 
                    onClick={() => {
                      if (step.id < currentStep) {
                        setCurrentStep(step.id);
                      } else {
                        const { isValid, missingFields } = validateStep(currentStep);
                        if (isValid && step.id === currentStep + 1) {
                          setCurrentStep(step.id);
                        }
                      }
                    }}
                    className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      step.id < currentStep 
                        ? 'bg-red-600 shadow-md transform hover:scale-110 cursor-pointer' 
                        : step.id === currentStep 
                          ? 'bg-red-600 scale-110 shadow-lg ring-4 ring-red-100' 
                          : 'bg-white border-2 border-stone-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                     <span className={`text-[10px] font-black ${step.id <= currentStep ? 'text-white' : 'text-stone-300'}`}>{step.id}</span>
                  </button>
                  {step.id === currentStep && (
                     <div className="absolute top-10 flex flex-col items-center w-40">
                       <span className="text-[10px] font-black text-stone-900 uppercase tracking-tight text-center leading-tight">
                         {step.id}. {step.label}
                       </span>
                     </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 md:px-20 mt-12 space-y-12">
        {/* Info Box: Registration Data */}
        <section className="bg-white rounded-[5px] border border-stone-100 shadow-sm p-10 flex flex-wrap gap-12 md:gap-20">
          <div className="flex flex-col gap-2">
            <span className="text-stone-400 text-[11px] font-bold uppercase tracking-tight">Inscrição</span>
            <span className="text-red-600 font-mono font-black text-[22px] tracking-tight">{registration?.registrationNumber || 'bv-270286670'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-stone-400 text-[11px] font-bold uppercase tracking-tight">Data</span>
            <span className="text-stone-900 font-black text-[22px]">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </section>

        {/* Info Box: Proponent Type */}
        <section className="bg-white rounded-[5px] border border-stone-100 shadow-sm p-10 flex flex-col gap-2">
          <span className="text-stone-400 text-[11px] font-bold uppercase tracking-tight">Tipo de proponente</span>
          <span className="text-red-600 font-black text-[22px] uppercase tracking-tighter italic">{proponentType}</span>
        </section>

        {/* Form Body - Card container */}
        <div className="bg-[#FDFDFD] rounded-[5px] border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
           <div className="p-8 md:p-12 space-y-12">
              <h2 className="text-[32px] md:text-[40px] font-black text-stone-900 uppercase tracking-tighter italic">
                {currentStep}. {steps.find(s => s.id === currentStep)?.label}
              </h2>

              <div className="flex flex-col gap-4">
                <div className="bg-[#FFF4E5] border border-orange-100 rounded-lg p-6 flex items-start gap-4 shadow-sm">
                   <div className="bg-stone-900 text-white rounded-full p-1.5 shrink-0"><AlertCircle size={16} /></div>
                   <p className="text-stone-900 text-[13px] font-semibold leading-relaxed">
                     Os dados da sua inscrição serão salvos automaticamente a cada 60 segundos, exceto o plano de metas.
                   </p>
                </div>

                {validateStep(currentStep).missingFields.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-6 flex items-start gap-4 animate-pulse">
                    <div className="bg-red-500 text-white rounded-full p-1.5 shrink-0"><AlertCircle size={16} /></div>
                    <div>
                      <p className="text-red-900 text-[13px] font-black uppercase tracking-tight">Campos obrigatórios pendentes:</p>
                      <ul className="list-disc list-inside text-red-700 text-[12px] font-medium mt-1">
                        {validateStep(currentStep).missingFields.map((field, i) => (
                          <li key={i}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Persistent Fields inside body - matching screenshots 1-7 */}
              <div className="space-y-10">
                {/* Agent card - matching Robson's profile style */}
                <div className="bg-white border border-stone-100 rounded-xl p-8 flex items-center gap-8 shadow-sm group">
                   <div className="relative">
                     <img 
                        src={formData.identification.profileImage || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=200"} 
                        className="w-32 h-32 rounded-xl object-cover shadow-inner"
                     />
                     <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-lg shadow-md">
                        <User size={14} className="text-stone-400" />
                     </div>
                   </div>
                   <div className="flex-1 space-y-1">
                      <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Agente responsável</h3>
                      <p className="text-xl font-black text-stone-900 uppercase tracking-tight">{agent.name}</p>
                      <input 
                        type="file" 
                        className="hidden" 
                        id="profile-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('identification', 'profileImage', file.name);
                        }}
                      />
                      <button 
                        onClick={() => document.getElementById('profile-upload')?.click()}
                        className={`text-stone-800 text-[11px] font-black mt-4 flex items-center gap-2 hover:text-red-600 transition-colors uppercase tracking-tight bg-stone-50 px-4 py-2 rounded-lg border border-stone-100 ${formData.identification.profileImage ? 'text-emerald-600 border-emerald-100' : ''}`}
                      >
                         {formData.identification.profileImage ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Edit2 size={12} className="text-stone-900" />}
                         {formData.identification.profileImage ? 'Imagem de perfil adicionada' : 'Adicionar imagem de perfil'} <span className="text-red-500 font-bold ml-1 lowercase italic">*obrigatório</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-10">
                   <div className="space-y-4">
                      <label className="text-[15px] font-black text-stone-900 tracking-tight uppercase">Vai concorrer às cotas?</label>
                      <div className="relative">
                        <select 
                           value={formData.identification.isQuota}
                           onChange={e => setFormData(prev => ({ ...prev, identification: { ...prev.identification, isQuota: e.target.value } }))}
                           className="w-full bg-white border border-stone-200 rounded-lg px-5 py-4 text-stone-700 font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 focus:bg-white appearance-none transition-all shadow-sm"
                        >
                           <option>Não</option>
                           <option>Sim</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-300">
                          <ChevronRight size={20} className="rotate-90" />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[15px] font-black text-stone-900 tracking-tight uppercase">Nome do Projeto <span className="text-red-500 font-bold ml-1 lowercase italic">*obrigatório</span></label>
                      <input 
                         type="text"
                         placeholder="Digite o nome do seu projeto cultural"
                         value={formData.identification.projectName}
                         onChange={e => setFormData(prev => ({ ...prev, identification: { ...prev.identification, projectName: e.target.value } }))}
                         className="w-full bg-white border border-stone-200 rounded-lg px-5 py-4 text-stone-800 font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-sm placeholder:text-stone-300"
                      />
                   </div>
                </div>
              </div>

              {/* Step specific fields */}
              <div className="space-y-0 pt-10">
                {currentStep === 1 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="COMPROVANTE DE ENDEREÇO" description="ANEXAR COMPROVANTE DE ENDEREÇO CONFORME DOCUMENTO EM ANEXO." section="identification" field="addressProof" required />
                    <FileUploadField label="DOCUMENTOS PESSOAIS" description="ANEXAR RG OU CNH" section="identification" field="personalDocs" />
                    <FileUploadField label="CERTIDOES NEGATIVAS" description="ANEXAR CERTIDOES NEGATIVAS PESSOA FISICA OU JURIDICA." section="identification" field="taxCertificates" />
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="PORTIFÓLIO" description="ANEXAR PORTIFOLIO DO COLETIVO" section="trajectory" field="portfolio" required />
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="DECLARAÇÃO DE REPRESENTAÇÃO DE GRUPO COLETIVO" description="ANEXAR DECLARAÇÃO CONFORME MODELO EM ANEXO." section="declarations" field="representation" required={proponentType === 'Coletivo'} modelKey="representation" />
                    <FileUploadField label="DECLARAÇÃO DE COLETIVO SEM CNPJ" description="ANEXAR DECLARAÇÃO CONFORME MODELO EM ANEXO." section="declarations" field="noCnpj" modelKey="noCnpj" />
                    <FileUploadField label="DECLARAÇÃO ETNICO RACIAL" description="ANEXAR DECLARAÇÃO CONFORME MODELO EM ANEXO." section="declarations" field="ethnicRacial" modelKey="ethnicRacial" />
                    <FileUploadField label="DECLARAÇÃO DE PESSOA COM DEFICIÊNCIA" description="ANEXAR DECLARAÇÃO CONFORME MODELO EM ANEXO." section="declarations" field="disability" modelKey="disability" />
                  </div>
                )}
                {currentStep === 4 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="RELATORIO DE EXECUÇÃO DO OBJETO" description="ANEXAR RELATÓRIO DE EXECUÇÃO DO OBJETO CONFORME MODELO EM ANEXO." section="execution" field="report" required modelKey="report" />
                  </div>
                )}
                {currentStep === 5 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="FORMULÁRIO DE RECURSO" description="PREENCHA O FORMULÁRIO DE RECURSO CONFORME DOCUMENTO EM ANEXO." section="resources" field="form" required modelKey="form" />
                  </div>
                )}
                {currentStep === 6 && (
                  <div className="border-b border-stone-100">
                    <FileUploadField label="TERMO DE EXECUÇÃO CULTURAL" description="FAZER O UPLOAD DO TERMO ASSINADO." section="awardingTerm" field="term" required modelKey="term" />
                  </div>
                )}
                {currentStep === 7 && (
                  <div className="space-y-12">
                    <FileUploadField label="PLANO DE TRABALHO / PROJETO" description="ANEXAR PLANO DE TRABALHO CONFORME DOCUMENTO EM ANEXO." section="workPlan" field="plan" required modelKey="plan" />
                    
                    <div className="p-8 md:p-12 pt-0 space-y-10">
                       <div className="flex items-center gap-3 border-b border-stone-100 pb-6">
                          <h3 className="text-[28px] md:text-[34px] font-black text-stone-900 tracking-tighter uppercase italic">JUSTIFICATIVA</h3>
                          <div className="bg-[#0070BA] text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] font-black cursor-help hover:scale-110 transition-transform">?</div>
                       </div>
                       
                       <div className="space-y-6">
                         <div className="space-y-3">
                           <p className="text-stone-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                             <Info size={14} className="text-[#0070BA]" />
                             Descrição do JUSTIFICATIVA <span className="text-red-500 font-bold ml-1 lowercase italic">*obrigatório</span>
                           </p>
                           <textarea 
                             value={formData.workPlan.justification}
                             onChange={e => setFormData(prev => ({ ...prev, workPlan: { ...prev.workPlan, justification: e.target.value } }))}
                             placeholder="Descreva a justificativa do seu projeto aqui..."
                             className="w-full bg-white border border-stone-200 rounded-xl p-6 text-stone-800 font-medium min-h-[200px] outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-sm resize-none"
                           />
                         </div>
                         
                         <div className="bg-[#FFF4E5] border border-orange-100 rounded-xl p-8 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-orange-400" />
                             <div className="flex items-start gap-4">
                                <div className="bg-stone-900 text-white rounded-full p-1.5 shadow-sm shrink-0"><AlertCircle size={16} /></div>
                                <div className="space-y-2">
                                   <p className="text-stone-900 text-[14px] font-black uppercase tracking-tight">Atenção - Preenchimento do plano de metas</p>
                                   <p className="text-stone-800 text-[13px] font-medium leading-relaxed opacity-90">
                                     Para registrar as metas e entregas do plano de metas, preencha os campos obrigatórios e clique no botão <span className="font-black text-stone-900">"Salvar Meta"</span>.
                                   </p>
                                </div>
                             </div>
                         </div>
                       </div>

                       {/* Metas/Goals Section */}
                       <div className="space-y-8 bg-stone-50 rounded-2xl p-8 border border-stone-100">
                          <h4 className="text-[14px] font-black text-stone-900 uppercase tracking-widest">Registrar Metas</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[12px] font-black text-stone-400 uppercase">Descrição da Meta</label>
                                <input 
                                  type="text"
                                  value={newGoal.description}
                                  onChange={e => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Ex: Realização de oficinas"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3 text-stone-700 outline-none focus:border-[#0070BA]"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[12px] font-black text-stone-400 uppercase">Entrega da Meta</label>
                                <input 
                                  type="text"
                                  value={newGoal.delivery}
                                  onChange={e => setNewGoal(prev => ({ ...prev, delivery: e.target.value }))}
                                  placeholder="Ex: Fotos e listas de presença"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3 text-stone-700 outline-none focus:border-[#0070BA]"
                                />
                             </div>
                          </div>
                          
                          <button 
                            onClick={handleAddGoal}
                            className="bg-[#0070BA] text-white px-8 py-3 rounded-xl font-black text-[12px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                          >
                            Salvar Meta
                          </button>

                          {formData.workPlan.goals && formData.workPlan.goals.length > 0 && (
                            <div className="space-y-4 pt-4">
                               {formData.workPlan.goals.map((goal, idx) => (
                                 <div key={idx} className="bg-white border border-stone-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="space-y-1">
                                       <p className="text-[13px] font-black text-stone-900">{goal.description}</p>
                                       <p className="text-[11px] text-stone-500 font-medium">{goal.delivery}</p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveGoal(idx)} 
                                      className="text-red-500 hover:text-red-700 p-2"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                          <div className="space-y-4">
                             <label className="text-[14px] font-black text-stone-900 tracking-tight uppercase">Duração do projeto (meses) <span className="text-red-500 font-bold ml-1 lowercase italic">*obrigatório</span></label>
                             <div className="relative">
                               <select 
                                  value={formData.workPlan.duration}
                                  onChange={e => setFormData(prev => ({ ...prev, workPlan: { ...prev.workPlan, duration: e.target.value } }))}
                                  className="w-full bg-white border border-stone-200 rounded-lg px-5 py-4 text-stone-700 font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 appearance-none transition-all shadow-sm"
                               >
                                  <option value="">Selecione a duração</option>
                                  <option value="1">1 mês</option>
                                  <option value="2">2 meses</option>
                                  <option value="3">3 meses</option>
                                  <option value="6">6 meses</option>
                                  <option value="12">12 meses</option>
                               </select>
                               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-300">
                                 <ChevronRight size={20} className="rotate-90" />
                               </div>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <label className="text-[14px] font-black text-stone-900 tracking-tight uppercase">Segmento artistico-cultural <span className="text-red-500 font-bold ml-1 lowercase italic">*obrigatório</span></label>
                             <div className="relative">
                               <select 
                                  value={formData.workPlan.artisticSegment}
                                  onChange={e => setFormData(prev => ({ ...prev, workPlan: { ...prev.workPlan, artisticSegment: e.target.value } }))}
                                  className="w-full bg-white border border-stone-200 rounded-lg px-5 py-4 text-stone-700 font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 appearance-none transition-all shadow-sm"
                               >
                                  <option value="">Selecione o segmento</option>
                                  <option value="Multilinguagem">Multilinguagem</option>
                                  <option value="Musica">Música</option>
                                  <option value="Artes Cenicas">Artes Cênicas</option>
                                  <option value="Audiovisual">Audiovisual</option>
                                  <option value="Literatura">Literatura</option>
                               </select>
                               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-300">
                                 <ChevronRight size={20} className="rotate-90" />
                               </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Hidden PDF component */}
        <RegistrationSummaryPDF 
          ref={pdfRef}
          registration={{
            registrationNumber: registration?.registrationNumber || 'bv-' + Math.random().toString(36).substr(2, 9),
            proponentType,
            status: registration?.status || 'submitted',
            data: formData as any
          }}
          opportunity={opportunity}
          agent={agent}
        />

        {/* Navigation Actions below form body */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 pb-20">
           <button 
             onClick={currentStep === 1 ? onBack : prevStep}
             className="px-8 py-5 text-stone-400 font-black text-[11px] uppercase tracking-[0.2em] hover:text-stone-900 transition-colors flex items-center gap-3 group"
           >
             <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
             {currentStep === 1 ? 'Sair do Formulário' : 'Anterior'}
           </button>

           <div className="flex gap-4 w-full md:w-auto">
              {currentStep < 7 ? (
                <button 
                  onClick={nextStep}
                  className="w-full md:w-auto bg-[#0070BA] text-white px-12 py-6 rounded-xl font-black text-[13px] uppercase tracking-widest shadow-[0_10px_30px_rgba(0,112,186,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  Próxima Etapa
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full md:w-auto bg-stone-900 text-white px-12 py-6 rounded-xl font-black text-[13px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Finalizar Inscrição
                      <CheckCircle2 size={18} />
                    </>
                  )}
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
