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
      status: 'pending'
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
    </div>
  );
}
