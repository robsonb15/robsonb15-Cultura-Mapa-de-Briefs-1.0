import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  Printer, 
  FileDown, 
  Archive, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  ExternalLink,
  Info,
  X,
  Award,
  BookOpen,
  Download,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OpportunityRegistration, RegistrationPhase, RegistrationEvaluation } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RegistrationSummaryPDF } from './RegistrationSummaryPDF';
import { EvaluationsPrintPDF } from './EvaluationsPrintPDF';

interface RegistrationTrackingProps {
  registration: OpportunityRegistration;
  opportunity?: any;
  agent?: any;
  onBack: () => void;
}

const getMockEvaluationsForPhase = (phaseName: string): any[] => {
  return [];
};

export default function RegistrationTracking({ registration, opportunity, agent, onBack }: RegistrationTrackingProps) {
  const [activeTab, setActiveTab] = useState<'tracking' | 'form'>('tracking');
  const [selectedPhaseForDetails, setSelectedPhaseForDetails] = useState<RegistrationPhase | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingEvaluations, setIsGeneratingEvaluations] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const evalPdfRef = useRef<HTMLDivElement>(null);

  const triggerToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrint = () => {
    setIsGenerating(true);
    triggerToast('info', 'Preparando o comprovante de inscrição para impressão...');
    
    const cleanup = () => {
      setIsGenerating(false);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    // Give a short delay to ensure React renders the RegistrationSummaryPDF element
    setTimeout(() => {
      window.print();
      // Safe fallback unmount after 2 seconds
      setTimeout(() => {
        setIsGenerating(false);
      }, 2000);
      triggerToast('success', 'Documento enviado para a fila de impressão!');
    }, 500);
  };

  const handlePrintEvaluations = () => {
    setIsGeneratingEvaluations(true);
    triggerToast('info', 'Preparando os pareceres técnicos para impressão...');
    
    const cleanup = () => {
      setIsGeneratingEvaluations(false);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    // Give a short delay to ensure React renders the EvaluationsPrintPDF element
    setTimeout(() => {
      window.print();
      // Safe fallback unmount after 2 seconds
      setTimeout(() => {
        setIsGeneratingEvaluations(false);
      }, 2000);
      triggerToast('success', 'Documento enviado para a fila de impressão!');
    }, 500);
  };

  const handleExportPDF = async () => {
    setIsGenerating(true);
    triggerToast('info', 'Exportando o comprovante em PDF de alta resolução...');
    
    setTimeout(async () => {
      if (!pdfRef.current) {
        console.error("PDF Ref not found after delay");
        setIsGenerating(false);
        triggerToast('error', 'Não foi possível encontrar a referência do documento.');
        return;
      }
      try {
        const canvas = await html2canvas(pdfRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Subsequent pages
        let pageCount = 1;
        while (heightLeft > 0) {
          position = - (pageCount * pdfHeight);
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
          pageCount++;
        }

        pdf.save(`inscricao-${registration.registrationNumber}.pdf`);
        triggerToast('success', 'PDF exportado com sucesso!');
      } catch (error) {
        console.error("Error exporting PDF:", error);
        triggerToast('error', 'Erro ao exportar PDF. Tente novamente.');
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  const handleDownloadZIP = () => {
    triggerToast('info', 'Compactando anexos e arquivos da inscrição...');
    setTimeout(() => {
      // Mock ZIP file download
      const element = document.createElement("a");
      const file = new Blob(["Anexos de Inscrição consolidados."], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `anexos_inscricao_${registration.registrationNumber}.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast('success', 'Todos os anexos foram baixados em um pacote ZIP!');
    }, 1200);
  };

  // Default phases matching the requested timelines and results perfectly
  const defaultPhases: RegistrationPhase[] = [
    { 
      id: '1', 
      name: 'Fase de inscrições', 
      startDate: '18/02/2025', 
      endDate: '12/03/2025', 
      status: 'completed',
      resultDescription: 'relevância cultural'
    },
    { 
      id: '2', 
      name: 'Etapa de Avaliação de Mérito Cultural', 
      startDate: '25/03/2025', 
      endDate: '10/04/2025', 
      status: 'completed',
      resultDescription: 'mérito positivo'
    },
    { 
      id: '3', 
      name: 'Etapa de Habilitação - Anexos', 
      startDate: '19/12/2025', 
      endDate: '25/12/2025', 
      status: 'completed',
      resultDescription: 'positivo'
    },
    { 
      id: '4', 
      name: 'Etapa de Habilitação - Avaliação', 
      startDate: '29/12/2025', 
      endDate: '13/01/2027', 
      status: 'completed',
      resultDescription: 'Habilitação - Avaliação deferido'
    },
    { 
      id: '5', 
      name: 'Publicação final do resultado', 
      startDate: '31/01/2027', 
      endDate: '31/01/2027', 
      status: 'completed',
      resultDescription: 'final do resultado deferido'
    },
  ];

  // Map phases and ensure evaluations are populated
  const rawPhases = registration.phases && registration.phases.length > 0 
    ? registration.phases 
    : defaultPhases;

  const phases = rawPhases.map(phase => ({
    ...phase,
    evaluations: phase.evaluations && phase.evaluations.length > 0
      ? phase.evaluations
      : getMockEvaluationsForPhase(phase.name)
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <span className="bg-black text-white px-6 py-1 rounded-full text-[11px] font-black uppercase">Enviada</span>;
      case 'approved': return <span className="bg-green-500 text-white px-6 py-1 rounded-full text-[11px] font-black uppercase">Aprovada</span>;
      case 'rejected': return <span className="bg-red-500 text-white px-6 py-1 rounded-full text-[11px] font-black uppercase">Reprovada</span>;
      case 'draft': return <span className="bg-stone-200 text-stone-500 px-6 py-1 rounded-full text-[11px] font-black uppercase">Rascunho</span>;
      default: return <span className="bg-blue-500 text-white px-6 py-1 rounded-full text-[11px] font-black uppercase tracking-widest">Em Análise</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] pb-20">
      {/* Top Navbar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-bold uppercase text-[11px] tracking-widest"
            >
              <ChevronLeft size={20} />
              Voltar
            </button>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`py-5 border-b-4 transition-all font-bold uppercase tracking-wider text-[11px] ${activeTab === 'tracking' ? 'border-[#0070BA] text-[#0070BA]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
              >
                Acompanhamento
              </button>
              <button 
                onClick={() => setActiveTab('form')}
                className={`py-5 border-b-4 transition-all font-bold uppercase tracking-wider text-[11px] ${activeTab === 'form' ? 'border-[#0070BA] text-[#0070BA]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
              >
                Ficha de inscrição
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button 
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-[#0070BA] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer size={16} className={isGenerating ? 'animate-pulse' : ''} />
              {isGenerating ? 'Processando...' : 'Imprimir'}
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-[#0070BA] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileDown size={16} className={isGenerating ? 'animate-pulse' : ''} />
              Exportar PDF
            </button>
            <button 
              onClick={handleDownloadZIP}
              className="flex items-center gap-2 bg-[#0070BA] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Archive size={16} />
              Baixar Anexos (ZIP)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Header Summary */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 border-4 border-stone-50 shadow-inner">
                {registration.agentImage ? (
                  <img src={registration.agentImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <User size={40} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">{registration.agentName}</h2>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Inscrição realizada em 01/03/2025 às 07:49:39</p>
              </div>
            </div>
            {getStatusBadge(registration.status)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10 pt-8 border-t border-stone-50">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Nº DE INSCRIÇÃO</p>
              <p className="text-lg font-black text-stone-900 tracking-tighter uppercase">{registration.registrationNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">CATEGORIA DE INSCRIÇÃO</p>
              <p className="text-lg font-black text-stone-900 tracking-tighter uppercase">{registration.category || 'Não definida'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">FAIXA</p>
              <p className="text-lg font-black text-stone-900 tracking-tighter uppercase">{registration.range || 'Não definida'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">TIPO DE PROPONENTE</p>
              <p className="text-lg font-black text-stone-900 tracking-tighter uppercase">{registration.proponentType}</p>
            </div>
          </div>
        </div>

        {activeTab === 'tracking' ? (
          <div className="bg-white rounded-[2rem] p-12 shadow-2xl border border-stone-100 min-h-[600px] flex justify-center">
            <div className="relative max-w-2xl w-full">
              {phases.map((phase, idx) => (
                <div key={phase.id} className="relative pl-12 pb-16 last:pb-0">
                  {/* Dynamic Vertical Connection Line Segment */}
                  {idx < phases.length - 1 && (
                    <div 
                      className={`absolute left-[21px] top-[16px] bottom-[-16px] w-[4px] transition-colors duration-500 z-0 ${
                        phases[idx + 1].status === 'completed' ? 'bg-[#BF0B0B]' : 'bg-stone-200'
                      }`} 
                    />
                  )}

                  {/* Timeline Node */}
                  <div className={`absolute left-[11px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 transition-colors ${phase.status === 'completed' ? 'bg-[#BF0B0B]' : 'bg-stone-400'}`} />
                  
                  <div className="space-y-2">
                    <h3 className={`text-xl font-black uppercase tracking-tight ${phase.status === 'completed' ? 'text-stone-900' : 'text-stone-400'}`}>
                      {phase.name}
                    </h3>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      de {phase.startDate} a {phase.endDate}
                    </p>

                    {phase.resultDescription && (
                      <div 
                        onClick={() => setSelectedPhaseForDetails(phase)}
                        className="mt-6 bg-white border border-stone-100 rounded-2xl p-6 shadow-xl max-w-sm cursor-pointer hover:border-[#0070BA] hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                      >
                         <div className="absolute top-0 left-0 w-2 h-full bg-[#BF0B0B] group-hover:bg-[#0070BA] transition-colors" />
                         <div className="space-y-4 pl-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">RESULTADO DA FASE:</p>
                              <span className="text-[9px] font-black text-[#0070BA] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Ver Parecer &rarr;</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-3 h-3 rounded-full bg-[#BF0B0B] group-hover:bg-[#0070BA] transition-colors shrink-0" />
                               <span className="text-sm font-black text-stone-900 uppercase group-hover:text-[#0070BA] transition-colors">{phase.resultDescription}</span>
                            </div>
                            <div className="pt-2 border-t border-stone-50 flex items-center gap-1.5 text-stone-400 group-hover:text-stone-600 transition-colors">
                              <Info size={12} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Clique para ver notas e parecer</span>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Card */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-850 text-white rounded-[2rem] p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Ficha de Inscrição Homologada</h3>
                <p className="text-xs font-medium text-stone-400 mt-1 uppercase tracking-wider">Abaixo constam todos os dados preenchidos pelo proponente no ato de submissão do edital.</p>
              </div>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-[#0070BA] hover:bg-[#005fa3] text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <Printer size={16} />
                Gerar Comprovante de Inscrição
              </button>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Section 1: Identificação */}
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100 space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">Seção 1</span>
                  <h4 className="text-lg font-black text-stone-900 uppercase">Identificação do Projeto</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Nome do Projeto</label>
                    <p className="text-sm font-bold text-stone-900 uppercase">{(registration.data as any)?.identification?.projectName || 'Não informado'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Concorre a Cotas?</label>
                      <p className="text-sm font-bold text-stone-900 uppercase">{(registration.data as any)?.identification?.isQuota || 'Não'}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Tipo de Proponente</label>
                      <p className="text-sm font-bold text-stone-900 uppercase">{registration.proponentType || 'Pessoa Física'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Comprovante de Residência</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.identification?.addressProof || 'Não enviado'}</span>
                      <span className="text-[8px] font-black bg-stone-200 text-stone-600 px-2 py-0.5 rounded uppercase">anexo</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Documento de Identificação (RG/CPF ou CNPJ)</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.identification?.personalDocs || 'Não enviado'}</span>
                      <span className="text-[8px] font-black bg-stone-200 text-stone-600 px-2 py-0.5 rounded uppercase">anexo</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Plano de Trabalho */}
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100 space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">Seção 2</span>
                  <h4 className="text-lg font-black text-stone-900 uppercase">Plano de Trabalho</h4>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Segmento Artístico</label>
                      <p className="text-sm font-bold text-stone-900 uppercase">{(registration.data as any)?.workPlan?.artisticSegment || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Duração Prevista</label>
                      <p className="text-sm font-bold text-stone-900 uppercase">{(registration.data as any)?.workPlan?.duration ? `${(registration.data as any).workPlan.duration} Meses` : 'Não informado'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Resumo das Metas e Atividades</label>
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-stone-700 text-xs leading-relaxed font-medium max-h-[160px] overflow-y-auto">
                      {(registration.data as any)?.workPlan?.goals || 'Descrição de metas e cronograma executivo preenchido com sucesso de acordo com as exigências técnicas e balizadoras do edital municipal.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Trajetória & Orçamento */}
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100 space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">Seção 3</span>
                  <h4 className="text-lg font-black text-stone-900 uppercase">Trajetória & Orçamento</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Portfólio / Histórico do Agente</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.trajectory?.portfolio || 'portfólio_cultural.pdf'}</span>
                      <span className="text-[8px] font-black bg-stone-200 text-stone-600 px-2 py-0.5 rounded uppercase">PDF</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Planilha Orçamentária e Recursos</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.resources?.form || 'planilha_custos_recursos.xlsx'}</span>
                      <span className="text-[8px] font-black bg-green-200 text-green-700 px-2 py-0.5 rounded uppercase">Excel</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Relatório de Execução anterior (se aplicável)</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.execution?.report || 'Não exigido nesta categoria'}</span>
                      <span className="text-[8px] font-black bg-stone-100 text-stone-400 px-2 py-0.5 rounded uppercase">Opcional</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Declarações e Termos */}
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100 space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-widest">Seção 4</span>
                  <h4 className="text-lg font-black text-stone-900 uppercase">Declarações Homologadas</h4>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      <Check className="text-emerald-500 shrink-0" size={16} />
                      <div className="min-w-0">
                        <span className="block text-[8px] font-black text-stone-400 uppercase tracking-wider">Étnico-Racial</span>
                        <span className="text-[10px] font-bold text-stone-800 uppercase block truncate">Sim (Autodeclarado)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      <Check className="text-emerald-500 shrink-0" size={16} />
                      <div className="min-w-0">
                        <span className="block text-[8px] font-black text-stone-400 uppercase tracking-wider">Acessibilidade Pcd</span>
                        <span className="text-[10px] font-bold text-stone-800 uppercase block truncate">Sim (Autodeclarado)</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Termo de Premiação de Edital</label>
                    <p className="text-xs font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-100 text-stone-600 truncate flex items-center justify-between gap-2">
                      <span>{(registration.data as any)?.awardingTerm?.term || 'termo_assinatura_breves.pdf'}</span>
                      <span className="text-[8px] font-black bg-blue-100 text-[#0070BA] px-2 py-0.5 rounded uppercase">Termo Assinado</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Stage Decision Panel Modal */}
      <AnimatePresence>
        {selectedPhaseForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhaseForDetails(null)}
              className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-40"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-4xl relative z-50 flex flex-col overflow-hidden border border-stone-100 max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div>
                  <span className="text-[10px] font-black text-[#0070BA] uppercase tracking-[0.2em]">Painel de Decisão da Etapa</span>
                  <h3 className="text-xl md:text-2xl font-black text-stone-900 uppercase tracking-tighter mt-1">
                    Pareceres e Notas: <span className="text-[#0070BA] font-black italic">{selectedPhaseForDetails.name}</span>
                  </h3>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                    Inscrição de Edital: {registration.registrationNumber} • Categoria: {registration.category || 'Não definida'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrintEvaluations}
                    className="flex items-center gap-2 bg-[#0070BA] hover:bg-[#005fa3] text-white px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-md transition-all cursor-pointer whitespace-nowrap print:hidden"
                  >
                    <Printer size={14} />
                    Imprimir Parecer
                  </button>
                  <button
                    onClick={() => setSelectedPhaseForDetails(null)}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 shadow-md border border-stone-100 transition-all cursor-pointer shrink-0 print:hidden"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-8 space-y-8 overflow-y-auto">
                {/* Consolidado Geral Banner */}
                <div className="bg-stone-900 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full pointer-events-none" />
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Resultado Consolidado</span>
                    <h4 className="text-3xl font-black uppercase tracking-tighter italic text-stone-100">
                      {selectedPhaseForDetails.resultDescription}
                    </h4>
                    <p className="text-xs font-bold text-[#0070BA] uppercase tracking-widest mt-1">
                      Fase concluída com êxito
                    </p>
                  </div>
                  
                  {selectedPhaseForDetails.evaluations && selectedPhaseForDetails.evaluations.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center shrink-0 min-w-[200px] z-10">
                      <span className="block text-[9px] font-black text-stone-300 uppercase tracking-widest">Média ponderada das avaliações</span>
                      <span className="block text-3xl font-black text-white mt-1">
                        {Math.round(selectedPhaseForDetails.evaluations.reduce((acc, ev) => acc + (ev.score || 0), 0) / selectedPhaseForDetails.evaluations.length)} / {Math.round(selectedPhaseForDetails.evaluations.reduce((acc, ev) => acc + (ev.totalPossible || 0), 0) / selectedPhaseForDetails.evaluations.length)}
                      </span>
                      <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-1">Pontos totais médios</span>
                    </div>
                  )}
                </div>

                {/* Reviewers List */}
                <div className="space-y-8">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] pb-2 border-b border-stone-100">
                    Avaliações dos Pareceristas
                  </h4>

                  {selectedPhaseForDetails.evaluations && selectedPhaseForDetails.evaluations.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8">
                      {selectedPhaseForDetails.evaluations.map((evaluation, idx) => (
                        <div key={evaluation.reviewerId || idx} className="bg-stone-50/50 border border-stone-100 rounded-[2rem] p-8 space-y-6">
                          {/* Reviewer Header */}
                          <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white font-black text-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <h5 className="font-black text-stone-900 uppercase text-sm tracking-tight">{evaluation.reviewerName}</h5>
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Avaliação Técnica Homologada</p>
                              </div>
                            </div>
                            <div className="px-5 py-2.5 bg-white border border-stone-150 rounded-xl font-black text-stone-900 text-sm shadow-sm shrink-0">
                              <span className="text-[#0070BA] font-black">{evaluation.score}</span> / {evaluation.totalPossible} pts
                            </div>
                          </div>

                          {/* Technical Opinion / Comments */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block">Parecer Técnico:</span>
                            <div className="bg-white border border-stone-100 p-6 rounded-2xl shadow-inner text-stone-700 text-xs leading-relaxed font-medium">
                              {evaluation.comments || "Sem observações adicionais registradas para este parecerista."}
                            </div>
                          </div>

                          {/* Detailed Criteria Scores */}
                          {evaluation.criteriaScores && evaluation.criteriaScores.length > 0 && (
                            <div className="space-y-4 pt-2">
                              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block">Detalhamentos de Pontuação:</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {evaluation.criteriaScores.map((criterion: any, cidx: number) => {
                                  const percentage = (criterion.score / criterion.maxScore) * 100;
                                  return (
                                    <div key={cidx} className="bg-white p-5 rounded-2xl border border-stone-100 space-y-3 shadow-sm">
                                      <div className="flex justify-between items-start">
                                        <span className="text-xs font-black text-stone-800 uppercase tracking-tighter leading-tight max-w-[80%]">
                                          {criterion.label}
                                        </span>
                                        <span className="text-xs font-mono font-black text-[#0070BA]">
                                          {criterion.score}/{criterion.maxScore}
                                        </span>
                                      </div>
                                      {/* Bar progress */}
                                      <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-[#0070BA] rounded-full transition-all duration-500" 
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-stone-400">
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhuma avaliação detalhada foi cadastrada para esta fase.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex justify-end">
                <button
                  onClick={() => setSelectedPhaseForDetails(null)}
                  className="px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black uppercase text-[11px] tracking-wider shadow-lg transition-all cursor-pointer"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-xs uppercase tracking-wider ${
              toast.type === 'success' ? 'bg-[#0070BA]' : toast.type === 'error' ? 'bg-red-500' : 'bg-stone-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Clock className="animate-spin" size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden container for printing/PDF generation */}
      {isGenerating && (
        <RegistrationSummaryPDF 
          ref={pdfRef}
          registration={registration}
          opportunity={opportunity || { name: 'Edital Geral de Fomento' }}
          agent={agent || { name: registration.agentName }}
        />
      )}

      {isGeneratingEvaluations && selectedPhaseForDetails && (
        <EvaluationsPrintPDF
          ref={evalPdfRef}
          registration={registration}
          opportunity={opportunity || { name: 'Edital Geral de Fomento' }}
          agent={agent || { name: registration.agentName }}
          phase={selectedPhaseForDetails}
        />
      )}
    </div>
  );
}
