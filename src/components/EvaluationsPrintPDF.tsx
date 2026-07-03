import React from 'react';
import { OpportunityRegistration, CulturalOpportunity, CulturalAgent } from '../types';

interface EvaluationsPrintPDFProps {
  registration: Partial<OpportunityRegistration>;
  opportunity: CulturalOpportunity;
  agent: CulturalAgent;
  phase: {
    name: string;
    evaluations?: Array<{
      reviewerId?: string;
      reviewerName?: string;
      score?: number;
      totalPossible?: number;
      comments?: string;
      criteriaScores?: Array<{
        label: string;
        score: number;
        maxScore: number;
      }>;
    }>;
  };
}

export const EvaluationsPrintPDF = React.forwardRef<HTMLDivElement, EvaluationsPrintPDFProps>(
  ({ registration, opportunity, agent, phase }, ref) => {
    return (
      <div 
        ref={ref} 
        className="print-only p-8 font-sans w-full max-w-[800px] mx-auto bg-white text-stone-900"
        style={{ 
          backgroundColor: '#ffffff',
          color: '#1c1917'
        }}
      >
        {/* Simple Clean Header */}
        <div className="pb-6 mb-8 flex justify-between items-end" style={{ borderBottom: '3px solid #1c1917' }}>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-1" style={{ color: '#1c1917' }}>
              Relatório de Pareceres e Notas
            </h1>
            <p className="font-bold uppercase tracking-widest text-[9px]" style={{ color: '#78716c' }}>
              Mapa Cultural • Etapa: {phase.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-stone-400 mb-0.5">Nº da Inscrição</p>
            <p className="text-lg font-mono font-black text-red-600">{registration.registrationNumber}</p>
          </div>
        </div>

        {/* Mini Identification Meta */}
        <div className="grid grid-cols-2 gap-6 mb-8 bg-stone-50 p-5 rounded-2xl border border-stone-100 text-xs">
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-black uppercase text-stone-400 block">Proponente</span>
              <span className="font-bold text-stone-800 uppercase">{agent?.name || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-stone-400 block">Edital / Oportunidade</span>
              <span className="font-bold text-stone-800 uppercase">{opportunity?.name || 'Não informado'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-black uppercase text-stone-400 block">Data da Emissão</span>
              <span className="font-bold text-stone-800">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-stone-400 block">Categoria</span>
              <span className="font-bold text-stone-800 uppercase">{registration.category || 'Não definida'}</span>
            </div>
          </div>
        </div>

        {/* Reviewers Evaluations */}
        <div className="space-y-8">
          {phase.evaluations && phase.evaluations.length > 0 ? (
            phase.evaluations.map((evaluation, idx) => (
              <div key={idx} className="border border-stone-200 rounded-2xl p-6 space-y-4 page-break-inside-avoid">
                {/* Header for Reviewer */}
                <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white font-black text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-stone-900 uppercase text-xs">
                        {evaluation.reviewerName || `Parecerista #${idx + 1}`}
                      </h3>
                      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">
                        Avaliação Técnica Homologada
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 bg-stone-100 border border-stone-200 rounded-lg font-black text-stone-900 text-xs shrink-0">
                    Soma: <span className="text-[#0070BA] font-black">{evaluation.score}</span> / {evaluation.totalPossible} pts
                  </div>
                </div>

                {/* Justification Comments */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">
                    Parecer Técnico:
                  </span>
                  <div className="bg-stone-50/50 border border-stone-100 p-4 rounded-xl text-stone-700 text-xs leading-relaxed font-medium">
                    {evaluation.comments || "Sem observações adicionais registradas para este parecerista."}
                  </div>
                </div>

                {/* Detailed Criteria Scores */}
                {evaluation.criteriaScores && evaluation.criteriaScores.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">
                      Detalhamento por Critério:
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {evaluation.criteriaScores.map((criterion: any, cidx: number) => (
                        <div key={cidx} className="bg-white p-3 rounded-xl border border-stone-100 flex justify-between items-center">
                          <span className="font-bold text-stone-600 uppercase text-[9px] max-w-[80%] leading-tight">
                            {criterion.label}
                          </span>
                          <span className="font-mono font-black text-[#0070BA] text-xs shrink-0">
                            {criterion.score}/{criterion.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-stone-400 border border-dashed border-stone-200 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-widest">Nenhum parecer disponível.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-6 text-center space-y-2" style={{ borderTop: '1px solid #f5f5f4' }}>
          <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: '#d6d3d1' }}>Autenticação de Pareceres</p>
          <p className="text-[8px] font-mono break-all" style={{ color: 'rgba(168, 162, 158, 0.5)' }}>
            PARECERES-{btoa(registration.registrationNumber || 'BREVES').slice(0, 20)}-{Date.now()}
          </p>
        </div>
      </div>
    );
  }
);
