import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CulturalAgent, AgentType } from '../types';

export const generateAgentReport = async (agent: CulturalAgent, isAdminView = false) => {
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.padding = '15mm';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#141414';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const renderSection = async (html: string, pageNum: number) => {
    container.innerHTML = `
      <div style="border: 2px solid #5A5A40; padding: 8mm; box-sizing: border-box; min-height: 277mm; position: relative; background: white;">
        ${html}
        <div style="position: absolute; bottom: 8mm; left: 8mm; right: 8mm; border-top: 1px solid #E7E5E4; padding-top: 3mm; display: flex; justify-content: space-between; align-items: center;">
           <p style="font-size: 6pt; color: #A8A29E; text-transform: uppercase; font-weight: 700; margin: 0;">© Mapa Cultural (Padrão) - Sistema de Gestão Cultural</p>
           <p style="font-size: 6pt; color: #5A5A40; font-weight: 900; text-transform: uppercase; margin: 0;">Página ${pageNum}</p>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#FFFFFF' });
    const imgData = canvas.toDataURL('image/png');
    if (pageNum > 1) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    document.body.removeChild(container);
  };

  // Section 1: Header + Basic Data
  await renderSection(`
    <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #5A5A40; padding-bottom: 5mm; margin-bottom: 8mm;">
      <div>
        <h1 style="font-size: 24pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -1px;">Mapa Cultural (Padrão)</h1>
        <p style="font-size: 9pt; font-weight: 700; color: #5A5A40; margin: 1mm 0 0 0; text-transform: uppercase; letter-spacing: 2px;">
          ${isAdminView ? 'Dossiê Administrativo de Agente' : 'Relatório Oficial de Agente'}
        </p>
      </div>
      <div style="text-align: right;">
        <p style="font-size: 7pt; font-weight: 700; color: #A8A29E; margin: 0; text-transform: uppercase;">Emissão: ${new Date().toLocaleDateString()}</p>
        <p style="font-size: 7pt; font-weight: 700; color: #A8A29E; margin: 0; text-transform: uppercase;">ID: ${agent.id.toUpperCase()}</p>
      </div>
    </div>

    <div style="display: flex; gap: 8mm; margin-bottom: 8mm;">
      <div style="width: 45mm; height: 45mm; background-color: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 4px; overflow: hidden;">
        ${agent.images?.profile ? `<img src="${agent.images.profile}" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="height: 100%; display: flex; align-items: center; justify-content: center; font-size: 30pt; color: #D6D3D1;">👤</div>'}
      </div>
      <div style="flex: 1;">
        <h2 style="font-size: 18pt; font-weight: 900; text-transform: uppercase; margin: 0 0 2mm 0;">${agent.name}</h2>
        ${agent.socialName ? `<p style="font-size: 10pt; color: #78716C; font-weight: 700; text-transform: uppercase; margin: 0 0 4mm 0; font-style: italic;">${agent.socialName}</p>` : ''}
        
        <div style="display: flex; gap: 4mm; margin-bottom: 4mm;">
           <span style="background-color: #5A5A40; color: white; padding: 2px 8px; border-radius: 2px; font-size: 7pt; font-weight: 900; text-transform: uppercase;">${agent.type === AgentType.INDIVIDUAL ? 'Individual' : 'Coletivo'}</span>
           <span style="color: #5A5A40; border: 1px solid #5A5A40; padding: 2px 8px; border-radius: 2px; font-size: 7pt; font-weight: 900; text-transform: uppercase;">Agente Oficial</span>
        </div>

        <div style="font-size: 8.5pt; line-height: 1.5; color: #444;">
          <p><strong>Descrição Curta:</strong> ${agent.shortDescription || 'Não informado.'}</p>
          ${isAdminView && agent.cpf ? `<p><strong>CPF/CNPJ:</strong> ${agent.cpf}</p>` : ''}
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-bottom: 8mm;">
      <div>
        <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">Áreas de Atuação</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 1.5mm;">
          ${agent.areasOfActivity.map(area => `<span style="background-color: #F5F5F4; padding: 3px 6px; border-radius: 2px; font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #57534E;">${area}</span>`).join('')}
        </div>
      </div>
      <div>
        <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">Contatos</h3>
        <div style="font-size: 8pt; color: #444; line-height: 1.6;">
          <p><strong>Telefone:</strong> ${agent.contactInfo?.phone || 'Não informado'}</p>
          <p><strong>E-mail:</strong> ${agent.contactInfo?.email || 'Não informado'}</p>
          <p><strong>Website:</strong> ${agent.contactInfo?.website || 'Não informado'}</p>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 8mm;">
      <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">Endereço</h3>
      <div style="font-size: 8pt; color: #444; line-height: 1.6;">
         <p>${agent.address?.text || 'Não informado'}</p>
         ${agent.address?.zipCode ? `<p><strong>CEP:</strong> ${agent.address.zipCode}</p>` : ''}
      </div>
    </div>

    ${isAdminView ? `
    <div style="margin-bottom: 8mm; background-color: #F8F8F8; padding: 4mm; border-radius: 4px;">
      <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; color: #9B511E; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">Dados Sensíveis (Privados)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; font-size: 8pt; color: #444;">
        <p><strong>Nascimento:</strong> ${agent.birthDate || 'Não informado'}</p>
        <p><strong>Gênero:</strong> ${agent.gender || 'Não informado'}</p>
        <p><strong>Raça/Cor:</strong> ${agent.raceColor || 'Não informado'}</p>
        <p><strong>Escolaridade:</strong> ${agent.education || 'Não informado'}</p>
        <p><strong>Orientação:</strong> ${agent.sexualOrientation || 'Não informado'}</p>
        <p><strong>Deficiência:</strong> ${agent.disability ? 'Sim' : 'Não'}</p>
        <p><strong>Agente Itinerante:</strong> ${agent.itinerantAgent ? 'Sim' : 'Não'}</p>
        <p><strong>Comunidade Tradicional:</strong> ${agent.traditionalCommunities || 'Não'}</p>
        <p><strong>CPF/CNPJ:</strong> ${agent.cpf || 'Não informado'}</p>
      </div>
    </div>
    ` : ''}
  `, 1);

  // Section 2: Biography (consumed in chunks)
  const desc = agent.description || 'Nenhuma descrição fornecida.';
  const chunks = [];
  for (let i = 0; i < desc.length; i += 2500) {
    chunks.push(desc.substring(i, i + 2500));
  }

  for (let i = 0; i < chunks.length; i++) {
    await renderSection(`
      <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">
        ${i === 0 ? 'Trajetória / Biografia' : 'Trajetória (Continuação)'}
      </h3>
      <div style="font-size: 8.5pt; line-height: 1.6; color: #333; text-align: justify; white-space: pre-wrap;">
        ${chunks[i]}
      </div>
    `, 2 + i);
  }

  // Section 3: Media
  if (agent.images.gallery.length > 0 || agent.videos.length > 0) {
    const galleryChunks = [];
    for (let i = 0; i < agent.images.gallery.length; i += 9) {
      galleryChunks.push(agent.images.gallery.slice(i, i + 9));
    }

    for (let i = 0; i < galleryChunks.length; i++) {
      await renderSection(`
        <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">
           Galeria de Fotos ${i > 0 ? `(Parte ${i + 1})` : ''}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm;">
          ${galleryChunks[i].map(img => `
            <div style="aspect-ratio: 1; border: 1px solid #EEE; border-radius: 4px; overflow: hidden; background: #F9F9F9;">
               <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          `).join('')}
        </div>
        ${i === galleryChunks.length - 1 && agent.videos.length > 0 ? `
          <div style="margin-top: 10mm;">
             <h3 style="font-size: 9pt; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #E7E5E4; padding-bottom: 2mm; margin-bottom: 3mm;">Vídeos e Links</h3>
             <div style="font-size: 7.5pt; color: #555;">
                ${agent.videos.map(v => `<p style="margin-bottom: 1mm; border-left: 2px solid #5A5A40; padding-left: 2mm;">${v}</p>`).join('')}
             </div>
          </div>
        ` : ''}
      `, 2 + chunks.length + i);
    }
  }

  pdf.save(`${isAdminView ? 'DOSSIE' : 'RELATORIO'}_${agent.name.replace(/\s+/g, '_')}.pdf`);
};

