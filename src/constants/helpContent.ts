export interface HelpTopic {
  title: string;
  content: string;
  tags: string[];
}

export interface HelpCategory {
  title: string;
  topics: HelpTopic[];
}

export const HELP_CONTENT: HelpCategory[] = [
  {
    title: "1 - Cadastro no Mapa Cultural",
    topics: [
      {
        title: "Como faço para atualizar as informações do meu perfil?",
        content: "O perfil do seu agente é a sua identidade digital no Mapas Culturais.\n\nComo editar meu perfil:\n1. Faça login no Mapas Culturais;\n2. No painel de controle, clique em Acessar meu perfil;\n3. Na barra inferior, clique em Editar agente;\n4. Faça suas modificações;\n5. Na barra inferior, clique em Salvar para atualizar os dados do seu perfil;\nLembre-se: No seu perfil contém informações que o identificam dentro do sistema, lembre-se de preencher de forma completa e precisa.",
        tags: ["cadastro", "usuário", "atualização", "perfil"]
      },
      {
        title: "Como posso cadastrar o MEI?",
        content: "O MEI serve para lhe identificar como um Microempreendedor Individual dentro do Mapas Culturais.\n\nVocê pode cadastrar seu CNPJ no cadastro do seu Perfil.\n\nComo inserir meu MEI:\n1. Acesse seu perfil;\n2. Clique em Editar agente na barra inferior;\n3. Preencha o campo MEI;\n4. Clique em Salvar na barra inferior;\nLembre-se: O MEI não é um campo obrigatório.",
        tags: ["cadastro", "coletivo", "CNPJ", "MEI"]
      },
      {
        title: "Posso criar o cadastro de outra pessoa?",
        content: "Não é possível criar um cadastro em nome de outra pessoa.\n\nConforme a Lei Geral de Proteção de Dados (LGPD), o cadastro é pessoal e intransferível e cada pessoa precisa criar o seu cadastro no Mapas Culturais, utilizando um email pessoal e senha.",
        tags: ["acesso", "cadastro", "dados pessoais"]
      },
      {
        title: "Por que o Mapas Culturais solicita o seu CPF?",
        content: "O CPF é o seu documento de identidade nacional e garante a segurança e a transparência em todas as ações realizadas por você na plataforma.\n\nAo solicitar o CPF, estamos assegurando que:\n- Seu cadastro seja único: Cada pessoa tem direito a apenas um CPF, evitando duplicidades e fraudes.\n- Seus dados sejam protegidos: O CPF é utilizado para confirmar sua identidade e evitar que outras pessoas se cadastrem em seu nome.\n\nImportante: Uma vez cadastrado, o CPF não poderá ser alterado. Por isso, verifique cuidadosamente todas as informações antes de confirmar o cadastro.",
        tags: ["acesso", "cadastro", "dados pessoais", "CPF"]
      },
      {
        title: "Como faço meu cadastro no Mapas Culturais?",
        content: "Ao efetuar o seu cadastro no Mapas Culturais, será criado um Perfil do seu Agente que o identificará dentro do sistema.\n\nComo criar um novo cadastro:\n1. Clique em Entrar, na barra superior;\n2. Na tela de login, clique no botão Fazer cadastro;\n3. Preencha todos os dados solicitados;\n4. Aceite os Termos de uso, Politicas de privacidade e Autorização de uso de imagem;\n5. Informe os dados do seu Perfil, como Nome, Mini Bio e suas Áreas de atuação;\n6. Clique em Criar cadastro;\nPronto! Agora você faz parte da nossa comunidade e está preparado para iniciar a sua jornada no Mapas Culturais!\n\nLembre-se: Para que outros possam te encontrar e conhecer seu trabalho, não se esqueça de clicar no botão Publicar na barra inferior.",
        tags: ["cadastro", "usuário", "novo usuário"]
      },
      {
        title: "O que é a 'Mini Bio'?",
        content: "O campo Mini Bio é sua apresentação na plataforma. Ele serve para você se apresentar de forma concisa e destacar os principais aspectos da sua trajetória profissional em até 400 caracteres.\n\nO que você pode incluir:\n- Histórico profissional: Quais são as suas principais experiências de trabalho? Em quais empresas ou projetos você já atuou?\n- Formação acadêmica: Quais são os seus títulos e certificações? Onde você estudou?\n- Habilidades e competências: Quais são as suas principais habilidades e competências? O que você faz de melhor?\n- Demais informações relevantes: Você pode incluir qualquer outra informação que considere relevante para sua apresentação, como participação em eventos, publicações, projetos voluntários etc.\n\nDicas:\n- Seja conciso: Use palavras-chave e frases curtas para transmitir as informações de forma clara e objetiva.\n- Destaque seus diferenciais: O que te torna único? Quais são os seus pontos fortes?\n- Utilize uma linguagem profissional: Evite gírias e abreviações.\n- Revise o texto: Certifique-se de que não há erros de ortografia ou gramática.\n\nLembre-se: O campo Mini Bio é uma oportunidade de mostrar quem você é e o que você tem a oferecer. Utilize-o de forma estratégica para se destacar e atrair as oportunidades que você busca.",
        tags: ["cadastro", "usuário", "mini biografia"]
      }
    ]
  },
  {
    title: "2 - Editais e oportunidades",
    topics: [
      {
        title: "O que é uma avaliação técnica de editais?",
        content: "A avaliação técnica é um processo que analisa detalhadamente os aspectos técnicos de um edital. A configuração dessa avaliação tem como objetivo definir os critérios técnicos que fazem uma inscrição ser aprovada ou não.",
        tags: ["oportunidade", "edital", "avaliações", "avaliação técnica"]
      },
      {
        title: "O que são cotas?",
        content: "As cotas são uma modalidade de política afirmativa que reserva uma porcentagem de vagas no edital/oportunidade para grupos historicamente marginalizados e subrepresentados. O objetivo é promover a inclusão e a diversidade, corrigindo as desigualdades sociais e econômicas existentes.",
        tags: ["oportunidade", "edital", "avaliações", "avaliação técnica", "cotas"]
      },
      {
        title: "O que são políticas afirmativas?",
        content: "Políticas afirmativas são um conjunto de medidas que visam combater a desigualdade e a discriminação, promovendo da inclusão de grupos historicamente marginalizados.\n\nObservação: Ao habilitar as políticas afirmativas, será liberada a opção para o candidato se autoidentificar para cotas ou políticas afirmativas.",
        tags: ["oportunidade", "edital", "avaliações", "avaliação técnica", "políticas afirmativas"]
      }
    ]
  },
  {
    title: "3 - Inscrições em editais e oportunidades",
    topics: [
      {
        title: "Como ver o andamento da inscrição?",
        content: "Você pode acompanhar o andamento de sua inscrição acessando a Oportunidade que você se inscreveu e clicando em Acompanhar inscrição.\n\nPor lá, você pode:\n- Verificar os detalhes da sua inscrição;\n- Acompanhar as próximas etapas;\n- Ver o resultado final.",
        tags: ["oportunidade", "edital", "inscrição"]
      },
      {
        title: "Como saber se fui aprovado?",
        content: "A divulgação dos resultados da oportunidade será divulgada no site da Prefeitura Municipal de Breves e rede social da secretaria. Fique atento à publicação da lista de selecionados.\n\nApós o período de recurso/diligência, os responsáveis pela oportunidade poderão disponibilizar a lista de selecionados na guia de Resultados na página do edital, na plataforma Mapa Cultural.",
        tags: ["edital", "oportunidade", "aprovado", "inscrição"]
      },
      {
        title: "Não fui aprovado no edital o que eu faço?",
        content: "Calma! Antes de desistir, dê uma olhada no regulamento do edital. Talvez tenha alguma chance de recorrer durante o período de Recurso/Diligência.\n\nSe precisar de ajuda, entre em contato com a Organização ou com o Suporte.",
        tags: ["edital", "oportunidade", "inscrição", "Resultado", "Recurso", "Diligência"]
      }
    ]
  },
  {
    title: "4 - Mapas Culturais",
    topics: [
      {
        title: "O que são os administradores de uma entidade?",
        content: "Os administradores de uma entidade são pessoas autorizadas pelo proprietário a gerenciar e realizar alterações nessa entidade. Eles possuem acesso e permissões específicas para editar a entidade sem a necessidade de passar pelo perfil do proprietário.",
        tags: ["acesso", "cadastro", "administradores", "administradores de entidades"]
      },
      {
        title: "O que são Dados Pessoais Sensíveis?",
        content: "São dados que revelam aspectos mais profundos da vida de uma pessoa e que exigem um cuidado especial na coleta, armazenamento e tratamento. São dados mais íntimos e delicados, como origem racial ou étnica, convicção religiosa, opinião política, dados de saúde e orientação sexual.",
        tags: ["acesso", "cadastro", "dados pessoais", "dados sensíveis"]
      }
    ]
  }
];

export const PRIVACY_POLICY = `
Quando você acessar o Mapa Cultural, estará fornecendo alguns dados pessoais com o objetivo de viabilizar a sua operação. A Secretaria de Cultura, Turismo e Eventos (SECULTE) preza pela segurança dos seus dados, pelo respeito à sua privacidade e pela transparência com você e, por isso, dedicamos este documento para explicar como os seus dados pessoais serão tratados pela SECULTE e quais são as medidas que aplicamos para mantê-los seguros.

Este documento foi criado por nós, considerando as seguintes normas:
- Lei nº 13.709, de 14 de agosto de 2018: dispõe sobre a proteção de dados pessoais (LGPD);
- Lei nº 12.965, de 23 de abril de 2014: Marco Civil da Internet – estabelece princípios, garantias, direitos e deveres para o uso da Internet no Brasil;
- Lei nº 12.527, de 18 de novembro de 2011: Lei de Acesso à Informação – regula o acesso a informações previsto na Constituição Federal;

A SECULTE é um órgão da Administração Direta que visa promover e executar a política cultural do município, promovendo ações para mobilizar o apoio técnico necessário à produção cultural deste território. A sede localiza-se em Breves/PA e, segundo a definição trazida pela Lei Geral de Proteção de Dados (LGPD), na maior parte do tempo seremos o controlador das suas informações. Sendo assim, responsável por definir o que acontece com estes dados e protegê-los.

Sendo assim, sempre que encontrar os termos SECULTE, “nós” ou “nossos”, estamos nos referindo ao controlador dos seus dados pessoais. E sempre que ler “usuário”, “você”, “seu” ou “sua”, nos referimos a você, titular dos dados.

DEFINIÇÕES:
- Dado pessoal: informação relacionada à pessoa natural identificada ou identificável;
- Dado pessoal sensível: dado pessoal sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou à organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico;
- Titular: pessoa natural a quem se referem os dados pessoais;
- Controlador: a quem competem as decisões referentes ao tratamento de dados pessoais;
- Encarregado: canal de comunicação entre o controlador, os titulares e a ANPD.

QUAIS DADOS SÃO COLETADOS PELA SECULTE:
Durante sua experiência no Mapa Cultural, coletamos:
- Dados cadastrais (Nome, CPF/CNPJ, Gênero, Raça, E-mail, Telefone, Município).
- Dados de navegação (Endereço IP, Informações do dispositivo).
- Dados sensíveis (Orientação sexual, raça ou gênero) para execução de políticas públicas e cumprimento de obrigações legais.

COMO NÓS UTILIZAMOS OS SEUS DADOS PESSOAIS:
- Viabilizar a prestação de serviços e a formulação de políticas culturais.
- Comunicação direta com o usuário.
- Segurança e prevenção de fraudes.

COM QUEM NÓS PODEMOS COMPARTILHAR OS DADOS PESSOAIS:
- Prestadores de serviço (tecnologia e sustentação da plataforma).
- Autoridades governamentais (em atendimento a ordens judiciais ou obrigações legais).

ARMAZENAMENTO E SEGURANÇA:
Seus dados são armazenados de forma segura, respeitando os direitos dos cidadãos. Adotamos as melhores técnicas para proteger as informações de acessos não autorizados.

SEUS DIREITOS:
Você pode exercer seus direitos de acesso, correção, eliminação e revogação do consentimento enviando um e-mail para portalseculte@gmail.com.

ALTERAÇÕES:
Toda vez que alguma condição relevante desta Política de Privacidade for alterada, a nova versão será publicada em nosso site.

FALE CONOSCO:
Dúvidas? Entre em contato pelo e-mail portalseculte@gmail.com.
`;

export const IMAGE_AUTHORIZATION = `
Autorização de uso de imagem

Autorizo, para todos os fins em direito admitidos, a publicização de minha imagem, áudio, fotografias e vídeos, na Plataforma Mapa Cultural. A autorização neste termo especificada é gratuita e irá perdurar enquanto meu cadastro estiver ativo no sistema. Por ser esta expressão de minha vontade, nada terei a reclamar a título de direitos conexos à minha imagem e áudio. Meu consentimento pode ser revogado a qualquer momento mediante manifestação expressa, por procedimento gratuito e facilitado, através do e-mail do Encarregado da SECULTE, localizado no canal de comunicação disponível na tela inicial da Plataforma.

Versão atualizada em 13 de maio de 2026
ÓRGÃO – SECULTE
`;

export const TERMS_OF_USE = `
Termos de Uso

Ao utilizar o Mapa Cultural, você concorda com as seguintes diretrizes:

1. Responsabilidade do Cadastro
O usuário é responsável pela veracidade das informações fornecidas e pela segurança de suas credenciais de acesso.

2. Propriedade Intelectual
Todo o conteúdo publicado pelos usuários permanece sob sua responsabilidade, concedendo ao Mapa Cultural apenas o direito de exibição na plataforma.

3. Uso Adequado
A plataforma deve ser utilizada exclusivamente para fins culturais, de fomento e transparência pública.

4. Modificações
A SECULTE reserva-se o direito de atualizar estes termos periodicamente, informando aos usuários por e-mail ou aviso na plataforma.

Última atualização: 13 de maio de 2026.
`;

