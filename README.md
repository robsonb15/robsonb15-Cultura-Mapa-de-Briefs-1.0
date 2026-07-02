# Mapa Cultural de Breves

Este é um sistema de gestão cultural robusto construído com React, Vite e Firebase.

## Funcionalidades Principais

- **Mapa interativo** de agentes culturais.
- **Dossiê A4 Administrativo** com geração de PDF profissional.
- **Upload de arquivos** para fotos de perfil, banners e galeria.
- **Regras de segurança robustas** no Firestore.
- **Painel Administrativo** para gestão de agentes e configurações.

## Como Executar Localmente

1. **Pré-requisitos**:
   - Node.js instalado (v18 ou superior).
   - NPM ou Yarn.

2. **Instalação**:
   ```bash
   npm install
   ```

3. **Configuração**:
   Certifique-se de que o arquivo `firebase-applet-config.json` na raiz contém as credenciais corretas do seu projeto Firebase.

4. **Execução**:
   ```bash
   npm run dev
   ```
   O sistema estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

- `/src/components`: Componentes da interface.
- `/src/lib`: Serviços, utilitários e integração Firebase.
- `/src/types.ts`: Definições de tipos TypeScript.
- `/firestore.rules`: Regras de segurança para deploy no Firebase.

## Deploy

Para gerar a versão de produção:
```bash
npm run build
```
Os arquivos gerados na pasta `dist/` podem ser hospedados em qualquer serviço de estáticos (Firebase Hosting, Vercel, Netlify, etc).
