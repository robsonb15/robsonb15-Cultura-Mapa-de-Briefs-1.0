import React, { useState } from 'react';
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
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OpportunityRegistration, RegistrationPhase, RegistrationEvaluation } from '../types';

interface RegistrationTrackingProps {
  registration: OpportunityRegistration;
  onBack: () => void;
}

export default function RegistrationTracking({ registration, onBack }: RegistrationTrackingProps) {
  const [activeTab, setActiveTab] = useState<'tracking' | 'form'>('tracking');
  const [selectedPhase, setSelectedPhase] = useState<RegistrationPhase | null>(null);

  // Default phases if none provided
  const phases: RegistrationPhase[] = registration.phases || [
    { 
      id: '1', 
      name: 'Fase de inscrições', 
      startDate: '18/02/2025', 
      endDate: '12/03/2025', 
      status: 'completed' 
    },
    { 
      id: '2', 
      name: 'Etapa de Avaliação de Mérito Cultural', 
      startDate: '25/03/2025', 
      endDate: '10/04/2025', 
      status: 'completed',
      resultDescription: 'Não selecionada',
      evaluations: [
        {
          reviewerId: 'rev1',
          reviewerName: 'Parecerista #1',
          score: 40,
          totalPossible: 60,
          comments: 'A proposta de publicação do livro VERSOS E POESIAS DOM JOSÉ LUIZ AZCONA é um livro de memória que mostra os 37 anos de episcopado de Dom Azcona...',
          criteriaScores: [
            { label: 'Qualidade do Projeto', score: 8, maxScore: 10 },
            { label: 'Relevância da ação proposta', score: 7, maxScore: 10 },
            { label: 'Aspectos de integração comunitária', score: 6, maxScore: 10 },
            { label: 'Coerência da planilha orçamentária', score: 9, maxScore: 10 },
            { label: 'Coerência do Plano de Divulgação', score: 5, maxScore: 10 },
            { label: 'Trajetória artística e cultural', score: 5, maxScore: 10 },
          ]
        },
        {
          reviewerId: 'rev2',
          reviewerName: 'Parecerista #2',
          score: 40,
          totalPossible: 60,
          comments: 'Identificação: Vanderlei Lobato de Castro... O projeto possui relevância para a esfera educacional e cultural paraense...',
          criteriaScores: [
            { label: 'Qualidade do Projeto', score: 10, maxScore: 10 },
            { label: 'Relevância da ação proposta', score: 10, maxScore: 10 },
            { label: 'Aspectos de integração comunitária', score: 10, maxScore: 10 },
            { label: 'Coerência da planilha orçamentária', score: 10, maxScore: 10 },
            { label: 'Coerência do Plano de Divulgação', score: 10, maxScore: 10 },
            { label: 'Trajetória artística e cultural', score: 5, maxScore: 10 },
          ]
        }
      ]
    },
    { 
      id: '3', 
      name: 'Etapa de Habilitação - Anexos', 
      startDate: '19/12/2025', 
      endDate: '25/12/2025', 
      status: 'pending' 
    },
    { 
      id: '4', 
      name: 'Etapa de Habilitação - Avaliação', 
      startDate: '29/12/2025', 
      endDate: '13/01/2027', 
      status: 'pending' 
    },
    { 
      id: '5', 
      name: 'Publicação final do resultado', 
      startDate: '31/01/2027', 
      endDate: '31/01/2027', 
      status: 'pending' 
    },
  ];

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
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-[#0070BA] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all">
              <Printer size={16} />
              Imprimir
            </button>
            <button className="flex items-center gap-2 bg-[#0070BA] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all">
              <FileDown size={16} />
              Exportar PDF
            </button>
            <button className="flex items-center gap-2 bg-[#0070BA] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all">
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
                      <div className="mt-6 bg-white border border-stone-100 rounded-2xl p-6 shadow-xl max-w-sm">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">RESULTADO DA FASE:</p>
                            <div className="flex items-center gap-3">
                               <div className="w-3 h-3 rounded-full bg-[#BF0B0B]" />
                               <span className="text-sm font-black text-stone-900 uppercase">{phase.resultDescription}</span>
                            </div>
                            <button 
                               onClick={() => setSelectedPhase(phase)}
                               className="w-full flex items-center justify-center gap-2 bg-[#0070BA] text-white py-3 rounded-xl font-black uppercase text-[11px] hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                               Exibir detalhamento
                            </button>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-12 shadow-2xl border border-stone-100 flex flex-col items-center justify-center py-40">
             <FileText size={64} className="text-stone-200 mb-6" />
             <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Visualização da Ficha</h3>
             <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mt-2">Você pode ver os detalhes preenchidos na sua inscrição.</p>
             <button className="mt-8 px-10 py-4 bg-[#0070BA] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-all">
                Gerar Comprovante
             </button>
          </div>
        )}
      </div>

      {/* Result Details Modal */}
      <AnimatePresence>
        {selectedPhase && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4\">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedPhase(null)}
               className="absolute inset-0 bg-stone-900/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-4xl relative z-10 flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">{selectedPhase.name}</h3>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Inscrição: {registration.registrationNumber}</p>
                 </div>
                 <button 
                   onClick={() => setSelectedPhase(null)}
                   className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 shadow-lg border border-stone-100 transition-all"
                 >
                   <ChevronRight />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12">
                 {/* Summary Scores */}
                 <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-10 flex items-center justify-between">
                    <div>
                       <h4 className="text-xl font-black text-[#0070BA] uppercase tracking-tighter mb-1">Resultado Consolidado</h4>
                       <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">Média ponderada das avaliações</p>
                    </div>
                    <div className="text-right">
                       <p className="text-4xl font-black text-[#0070BA] tracking-tighter">40 <span className="text-lg text-blue-400">/ 60</span></p>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Pontos totais</p>
                    </div>
                 </div>

                 {/* Evaluations List */}
                 {selectedPhase.evaluations?.map((evalItem, idx) => (
                   <div key={evalItem.reviewerId} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 0.2}s` }}>
                      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                         <div className="flex items-center gap-4\">
                            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400">
                               <User size={20} />
                            </div>
                            <h5 className="text-lg font-black text-stone-900 uppercase tracking-tighter">{evalItem.reviewerName}</h5>
                         </div>
                         <p className="text-xl font-black text-stone-900 tracking-tighter">{evalItem.score} <span className="text-[10px] text-stone-400 uppercase">/ {evalItem.totalPossible} pts</span></p>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-12">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">PARECER TÉCNICO:</p>
                            <div className="bg-stone-50 rounded-3xl p-8 border border-stone-100 relative">
                               <div className="absolute -left-1.5 top-8 w-3 h-3 bg-stone-50 border-l border-t border-stone-100 rotate-[-45deg]\" />
                               <p className="text-xs leading-relaxed text-stone-600 font-medium whitespace-pre-wrap">{evalItem.comments}</p>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">DETALHAMENTOS DE PONTUAÇÃO:</p>
                            <div className="bg-white border border-stone-100 rounded-3xl p-8 space-y-6 shadow-sm">
                               {evalItem.criteriaScores.map((criteria, cIdx) => (
                                 <div key={cIdx} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-black text-stone-600 uppercase tracking-tight max-w-[70%]">{criteria.label}</span>
                                       <span className="text-xs font-black text-[#0070BA]">{criteria.score}/{criteria.maxScore}</span>
                                    </div>
                                    <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                                       <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(criteria.score / criteria.maxScore) * 100}%` }}
                                          transition={{ duration: 1, delay: 0.5 + (cIdx * 0.1) }}
                                          className="h-full bg-[#0070BA] shadow-[0_0_8px_rgba(0,112,186,0.5)]" 
                                       />
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex justify-end">
                 <button 
                   onClick={() => setSelectedPhase(null)}
                   className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 transition-all"
                 >
                   Fechar Visualização
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
