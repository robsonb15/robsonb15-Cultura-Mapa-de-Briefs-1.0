import React from 'react';
import { OpportunityRegistration, CulturalOpportunity, CulturalAgent } from '../types';

interface RegistrationSummaryPDFProps {
  registration: Partial<OpportunityRegistration>;
  opportunity: CulturalOpportunity;
  agent: CulturalAgent;
}

export const RegistrationSummaryPDF = React.forwardRef<HTMLDivElement, RegistrationSummaryPDFProps>(
  ({ registration, opportunity, agent }, ref) => {
    const data = registration.data as any;

    return (
      <div 
        ref={ref} 
        className="print-only p-8 font-sans w-full max-w-[800px] mx-auto bg-white text-stone-900"
        style={{ 
          backgroundColor: '#ffffff',
          color: '#1c1917'
        }}
      >
        <div className="pb-8 mb-12 flex justify-between items-end" style={{ borderBottom: '4px solid #1c1917' }}>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2" style={{ color: '#1c1917' }}>Comprovante de Inscrição</h1>
            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: '#78716c' }}>Mapa Cultural</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: '#a8a29e' }}>Status da Inscrição</p>
              <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full" style={{ 
                backgroundColor: registration.status === 'approved' ? '#d1fae5' : registration.status === 'rejected' ? '#fee2e2' : '#f5f5f4',
                color: registration.status === 'approved' ? '#065f46' : registration.status === 'rejected' ? '#991b1b' : '#57534e'
              }}>
                {registration.status === 'approved' ? 'Aprovado' : registration.status === 'rejected' ? 'Rejeitado' : 'Enviado'}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: '#a8a29e' }}>Nº da Inscrição</p>
              <p className="text-2xl font-mono font-black" style={{ color: '#dc2626' }}>{registration.registrationNumber}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>Oportunidade / Edital</h3>
              <p className="text-lg font-black uppercase leading-tight">{opportunity?.name || 'Não informado'}</p>
            </section>
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>Tipo de Proponente</h3>
              <p className="text-lg font-black uppercase">{registration?.proponentType || 'Não informado'}</p>
            </section>
          </div>
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>Data da Inscrição</h3>
              <p className="text-lg font-black uppercase">{registration?.updatedAt ? new Date(registration.updatedAt.seconds * 1000).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p>
            </section>
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#a8a29e' }}>Agente Responsável</h3>
              <p className="text-lg font-black uppercase">{agent?.name || 'Não informado'}</p>
            </section>
          </div>
        </div>

        <div className="space-y-12">
          {/* 1. IDENTIFICAÇÃO */}
          <section className="p-8 rounded-2xl" style={{ backgroundColor: '#fafaf9', border: '1px solid #f5f5f4' }}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 pb-2" style={{ color: '#1c1917', borderBottom: '1px solid #e7e5e4' }}>1. Identificação do Projeto</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Nome do Projeto</span>
                <p className="font-bold" style={{ color: '#292524' }}>{data?.identification?.projectName || 'Não informado'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Concorre a Cotas?</span>
                <p className="font-bold" style={{ color: '#292524' }}>{data?.identification?.isQuota || 'Não'}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
               <div>
                 <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Comprovante de Endereço</span>
                 <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.identification?.addressProof || 'Não enviado'}</p>
               </div>
               <div>
                 <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Documentos Pessoais</span>
                 <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.identification?.personalDocs || 'Não enviado'}</p>
               </div>
            </div>
          </section>

          {/* 2. TRAJETÓRIA */}
          <section className="p-8 border-l-4" style={{ borderColor: '#e7e5e4' }}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1c1917' }}>2. Trajetória Cultural</h3>
            <div>
              <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Portfólio / Currículo</span>
              <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.trajectory?.portfolio || 'Não enviado'}</p>
            </div>
          </section>

          {/* 3. DECLARAÇÕES */}
          <section className="p-8 rounded-2xl" style={{ backgroundColor: '#fafaf9', border: '1px solid #f5f5f4' }}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 pb-2" style={{ color: '#1c1917', borderBottom: '1px solid #e7e5e4' }}>3. Declarações e Termos</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Representação (Coletivo)</span>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.declarations?.representation || 'Não se aplica'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Coletivo sem CNPJ</span>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.declarations?.noCnpj || 'Não enviado'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Étnico-Racial</span>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.declarations?.ethnicRacial || 'Não enviado'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Pessoa com Deficiência</span>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.declarations?.disability || 'Não enviado'}</p>
              </div>
            </div>
          </section>

          {/* 4. EXECUÇÃO, 5. RECURSOS, 6. TERMO */}
          <div className="grid grid-cols-3 gap-8 p-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#1c1917' }}>4. Execução</h3>
              <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.execution?.report || 'Não enviado'}</p>
            </section>
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#1c1917' }}>5. Recursos</h3>
              <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.resources?.form || 'Não enviado'}</p>
            </section>
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#1c1917' }}>6. Termo de Premiação</h3>
              <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.awardingTerm?.term || 'Não enviado'}</p>
            </section>
          </div>

          {/* 7. PLANO DE TRABALHO */}
          <section className="p-8 border-t-2" style={{ borderTopColor: '#e7e5e4' }}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 pb-2" style={{ color: '#1c1917', borderBottom: '1px solid #e7e5e4' }}>7. Plano de Trabalho / Projeto</h3>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Duração</span>
                <p className="font-bold" style={{ color: '#292524' }}>{data?.workPlan?.duration} meses</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Segmento Artístico</span>
                <p className="font-bold" style={{ color: '#292524' }}>{data?.workPlan?.artisticSegment}</p>
              </div>
            </div>

            <div className="mb-8">
              <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Arquivo do Plano</span>
              <p className="text-[10px] font-mono truncate mb-4" style={{ color: 'rgba(28, 25, 23, 0.6)' }}>{data?.workPlan?.plan || 'Não enviado'}</p>
              
              <span className="text-[10px] font-black uppercase block mb-1" style={{ color: '#a8a29e' }}>Justificativa</span>
              <p className="text-sm leading-relaxed italic" style={{ color: '#44403c' }}>{data?.workPlan?.justification}</p>
            </div>
            
            <div className="mt-8">
              <span className="text-[10px] font-black uppercase block mb-4" style={{ color: '#a8a29e' }}>Metas e Entregas</span>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f4' }}>
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase" style={{ color: '#78716c' }}>Descrição da Meta</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase" style={{ color: '#78716c' }}>Entrega Prevista</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.workPlan?.goals?.map((goal: any, idx: number) => (
                    <tr key={idx} className="italic" style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td className="px-4 py-4 text-xs font-medium" style={{ color: '#292524' }}>{goal.description}</td>
                      <td className="px-4 py-4 text-xs font-medium" style={{ color: '#292524' }}>{goal.delivery}</td>
                    </tr>
                  ))}
                  {(!data?.workPlan?.goals || data?.workPlan?.goals.length === 0) && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-xs text-stone-400 italic">Nenhuma meta cadastrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-20 pt-12 text-center space-y-4" style={{ borderTop: '1px solid #f5f5f4' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#d6d3d1' }}>Autenticação Digital</p>
          <p className="text-[9px] font-mono break-all" style={{ color: 'rgba(168, 162, 158, 0.5)' }}>
            {btoa(registration.registrationNumber || 'BREVES').slice(0, 40)}-{Date.now()}
          </p>
        </div>
      </div>
    );
  }
);
