/**
 * Texto padrão do PGR — itens 1 a 15 (e encerramento).
 * Conteúdo editável: é apenas a base sugerida ao criar um documento novo.
 * Chave = `chave_automatica` (para blocos automáticos) ou o número da seção.
 */

export interface PgrTextoPadraoItem {
  numero: string;
  titulo: string;
  conteudo: string;
}

export const PGR_TEXTO_PADRAO: PgrTextoPadraoItem[] = [
  {
    numero: "1",
    titulo: "Objetivo",
    conteudo: `Este Programa de Gerenciamento de Riscos (PGR) tem por objetivo estabelecer as diretrizes, os critérios e as ações para o gerenciamento dos riscos ocupacionais existentes nos ambientes e nas atividades da organização, em atendimento à Norma Regulamentadora nº 01 (NR-01) — Disposições Gerais e Gerenciamento de Riscos Ocupacionais.

O programa contempla a identificação dos perigos, a avaliação dos riscos ocupacionais (físicos, químicos, biológicos, ergonômicos, de acidentes e psicossociais), a definição das medidas de prevenção e o acompanhamento da sua implementação, com foco na preservação da saúde, da segurança e da integridade física e mental dos trabalhadores.`,
  },
  {
    numero: "2",
    titulo: "Base legal e normativa",
    conteudo: `- Consolidação das Leis do Trabalho (CLT), Capítulo V — Da Segurança e da Medicina do Trabalho.
- NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (GRO/PGR).
- NR-05 — Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA).
- NR-06 — Equipamento de Proteção Individual (EPI).
- NR-07 — Programa de Controle Médico de Saúde Ocupacional (PCMSO).
- NR-09 — Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos.
- NR-17 — Ergonomia.
- Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho (MTE).
- Nota Técnica SEI nº 36/2022 — Fatores de risco psicossociais.
- ISO 45001 e ISO 45003 — Gestão de saúde e segurança ocupacional e saúde psicológica no trabalho.`,
  },
  {
    numero: "3",
    titulo: "Termos e definições",
    conteudo: `- **Perigo**: fonte com potencial de causar lesão ou agravo à saúde.
- **Risco ocupacional**: combinação entre a probabilidade de ocorrência de um evento perigoso e a severidade da lesão ou agravo dele decorrente.
- **GHE (Grupo Homogêneo de Exposição)**: grupo de trabalhadores que experimenta exposição semelhante, de modo que o resultado da avaliação de um deles seja representativo dos demais.
- **Medida de prevenção**: ação adotada para eliminar o perigo ou reduzir o risco.
- **Nível de risco**: resultado da combinação probabilidade × severidade, conforme matriz adotada neste programa.
- **Inventário de riscos**: consolidação das informações de identificação de perigos e avaliação de riscos.
- **Plano de ação**: conjunto de medidas de prevenção com prazos, responsáveis e forma de acompanhamento.`,
  },
  {
    numero: "4",
    titulo: "Responsabilidades",
    conteudo: `**Da organização**: garantir os recursos necessários à implementação do PGR, assegurar a participação dos trabalhadores, implementar as medidas de prevenção definidas e manter o programa atualizado.

**Do SESMT / responsável técnico**: elaborar, revisar e acompanhar tecnicamente o programa, orientar a implementação das medidas e registrar as evidências.

**Das lideranças**: assegurar o cumprimento das medidas de prevenção nas suas áreas, comunicar novos perigos e apoiar a participação da equipe.

**Dos trabalhadores**: cumprir as disposições do programa, utilizar corretamente os EPIs e dispositivos de proteção, comunicar situações de risco e participar dos treinamentos e das consultas realizadas.

**Da CIPA**: participar da identificação de perigos e da avaliação dos riscos, acompanhar o plano de ação e apoiar as ações de prevenção.`,
  },
  {
    numero: "5",
    titulo: "Campo de aplicação",
    conteudo: `Este programa aplica-se a todos os ambientes, unidades, setores, funções e atividades da organização, alcançando empregados próprios, aprendizes, estagiários e, no que couber, prestadores de serviço e terceiros que exerçam atividades nas dependências da empresa ou sob sua coordenação.`,
  },
  {
    numero: "6",
    titulo: "Identificação da empresa",
    conteudo: `Razão social, CNPJ, endereço, CNAE principal e grau de risco são apresentados na folha de identificação deste documento, conforme dados cadastrados na Plataforma Gestão Ativa.

Responsável técnico pela elaboração: identificado no encerramento deste documento, com número de registro no conselho de classe e ART anexa quando aplicável.`,
  },
  {
    numero: "9",
    titulo: "Metodologia de identificação de perigos",
    conteudo: `A identificação de perigos e a avaliação dos riscos ocupacionais foram conduzidas com base em:

1. Levantamento documental (organograma, descrições de cargo, relação de EPIs, laudos e programas anteriores).
2. Inspeções nos ambientes de trabalho, com registro fotográfico quando aplicável.
3. Entrevistas com trabalhadores e lideranças, assegurando a participação dos envolvidos.
4. Análise das tarefas prescritas e das tarefas reais por GHE.
5. Consulta ao histórico de acidentes, afastamentos e atendimentos de saúde ocupacional.
6. Aplicação de questionários estruturados pela Plataforma Gestão Ativa para os fatores de risco psicossociais.

Os perigos identificados foram agrupados por GHE e classificados nas categorias física, química, biológica, ergonômica, de acidentes e psicossocial.`,
  },
  {
    numero: "10",
    titulo: "Critérios de avaliação de riscos (matriz 5x5)",
    conteudo: `A avaliação dos riscos utiliza matriz 5×5, resultante do produto entre **Probabilidade** (1 a 5) e **Severidade** (1 a 5).

**Probabilidade**: 1 — Raro; 2 — Improvável; 3 — Possível; 4 — Provável; 5 — Quase certo.

**Severidade**: 1 — Insignificante; 2 — Leve; 3 — Moderada; 4 — Grave; 5 — Catastrófica.

O produto define o nível de risco (1 a 25), classificado em faixas: Irrelevante, Baixo, Moderado, Alto e Crítico.`,
  },
  {
    numero: "11",
    titulo: "Níveis de risco e priorização",
    conteudo: `- **Irrelevante (1–2)**: manter as condições atuais e monitorar.
- **Baixo (3–6)**: medidas de melhoria contínua, sem prazo crítico.
- **Moderado (8–12)**: implementar medidas de controle em prazo definido e reavaliar.
- **Alto (15–16)**: ação prioritária, com prazo curto e acompanhamento formal.
- **Crítico (20–25)**: ação imediata, com possibilidade de interrupção da atividade até a adoção de controles eficazes.

A priorização considera, além do nível de risco, o número de trabalhadores expostos, a gravidade potencial dos agravos e as exigências legais aplicáveis.`,
  },
  {
    numero: "12",
    titulo: "Medidas de prevenção e controle",
    conteudo: `As medidas de prevenção seguem a hierarquia estabelecida na NR-01:

1. Eliminação dos fatores de risco.
2. Redução dos fatores de risco na fonte.
3. Medidas de proteção coletiva.
4. Medidas administrativas ou de organização do trabalho.
5. Medidas de proteção individual (EPI).

Para cada medida definida são registrados o responsável, o prazo, a forma de acompanhamento e o critério de verificação da eficácia.`,
  },
  {
    numero: "13",
    titulo: "Monitoramento e reavaliação",
    conteudo: `O PGR é reavaliado, no mínimo, a cada dois anos, e antecipadamente sempre que:

- ocorrer alteração significativa de processos, instalações, máquinas ou métodos de trabalho;
- forem identificados novos perigos ou novas evidências de risco;
- ocorrer acidente grave ou fatal, ou doença relacionada ao trabalho;
- houver alteração legal ou normativa aplicável;
- as medidas de prevenção se mostrarem ineficazes no acompanhamento.

O acompanhamento das medidas é realizado de forma contínua pela Plataforma Gestão Ativa, com registro de status, prazos e evidências.`,
  },
  {
    numero: "14",
    titulo: "Emergências e situações especiais",
    conteudo: `A organização mantém procedimentos de resposta a emergências compatíveis com os riscos identificados, contemplando rotas de fuga, pontos de encontro, brigada de emergência, primeiros socorros, comunicação de acidentes e simulados periódicos.

Situações especiais — trabalho em altura, espaço confinado, eletricidade, movimentação de cargas e atividades em ambientes de terceiros — são tratadas em procedimentos específicos, complementares a este programa.`,
  },
  {
    numero: "15",
    titulo: "Registro, documentação e retenção",
    conteudo: `Os documentos que integram o PGR — inventário de riscos, plano de ação, laudos, relatórios de inspeção, listas de presença de treinamento e registros de entrega de EPI — são mantidos de forma organizada e acessíveis à fiscalização, aos trabalhadores e aos seus representantes.

O inventário de riscos ocupacionais é mantido por, no mínimo, 20 (vinte) anos, ou pelo período determinado em norma específica. Os registros são armazenados eletronicamente na Plataforma Gestão Ativa, com histórico de alterações e controle de versões.`,
  },
  {
    numero: "19",
    titulo: "Encerramento e responsável técnico",
    conteudo: `Este Programa de Gerenciamento de Riscos foi elaborado com base nas informações levantadas nos ambientes de trabalho e nas consultas realizadas com trabalhadores e lideranças, sendo válido para o período de vigência indicado na capa.

Elaborado por: (nome do responsável técnico), (formação/especialidade), registro no conselho de classe nº (…), NIT (…). ART anexa quando aplicável.`,
  },
];

export const PGR_TEXTO_PADRAO_POR_NUMERO: Record<string, PgrTextoPadraoItem> =
  PGR_TEXTO_PADRAO.reduce((acc, item) => {
    acc[item.numero] = item;
    return acc;
  }, {} as Record<string, PgrTextoPadraoItem>);

/** Texto sugerido para os campos de detalhe de risco, por categoria. */
export const PGR_RISCO_DETALHE_PADRAO: Record<
  string,
  {
    fundamentacao_legal: string;
    lesoes_agravos: string;
    fontes_circunstancias: string;
    meio_propagacao: string;
    acoes_necessarias: string;
  }
> = {
  fisico: {
    fundamentacao_legal: "NR-09; NR-15, Anexos 1 a 3 e 5 a 10.",
    lesoes_agravos:
      "Perda auditiva induzida por ruído, fadiga, distúrbios do sono, estresse térmico e desconforto.",
    fontes_circunstancias:
      "Máquinas, equipamentos, ferramentas, sistemas de climatização e características do ambiente construído.",
    meio_propagacao: "Ar, estruturas e contato direto com superfícies.",
    acoes_necessarias:
      "Manutenção preventiva, enclausuramento/isolamento da fonte, controle de tempo de exposição e fornecimento de EPI adequado com treinamento.",
  },
  quimico: {
    fundamentacao_legal: "NR-09; NR-15, Anexos 11, 12 e 13; NR-26.",
    lesoes_agravos:
      "Dermatites, irritação de vias aéreas, intoxicações agudas e crônicas.",
    fontes_circunstancias:
      "Manipulação, transporte e armazenamento de produtos químicos e atividades de limpeza.",
    meio_propagacao: "Via respiratória, cutânea e digestiva.",
    acoes_necessarias:
      "Substituição por produtos menos agressivos, ventilação adequada, FISPQ acessível, rotulagem preventiva e EPI específico.",
  },
  biologico: {
    fundamentacao_legal: "NR-09; NR-15, Anexo 14; NR-32 quando aplicável.",
    lesoes_agravos: "Infecções, parasitoses e doenças transmissíveis.",
    fontes_circunstancias:
      "Contato com pessoas, materiais contaminados, resíduos e superfícies de uso comum.",
    meio_propagacao: "Contato direto, gotículas, aerossóis e perfurocortantes.",
    acoes_necessarias:
      "Higienização das mãos e do ambiente, gestão de resíduos, imunização, procedimentos de biossegurança e EPI.",
  },
  ergonomico: {
    fundamentacao_legal: "NR-17 e Análise Ergonômica do Trabalho.",
    lesoes_agravos:
      "Lombalgias, LER/DORT, fadiga muscular e desconforto visual.",
    fontes_circunstancias:
      "Postos de trabalho inadequados, posturas forçadas, movimentos repetitivos, levantamento manual de cargas e ritmo intenso.",
    meio_propagacao: "Exposição direta durante a execução das tarefas.",
    acoes_necessarias:
      "Adequação do mobiliário e do posto, pausas programadas, revezamento, treinamento postural e Análise Ergonômica do Trabalho.",
  },
  acidente: {
    fundamentacao_legal: "NR-01; NR-06; NR-12; NR-23; NR-35 quando aplicável.",
    lesoes_agravos: "Cortes, fraturas, quedas, queimaduras e choque elétrico.",
    fontes_circunstancias:
      "Máquinas sem proteção, pisos escorregadios, circulação, eletricidade, trabalho em altura e movimentação de materiais.",
    meio_propagacao: "Contato direto com a fonte do perigo.",
    acoes_necessarias:
      "Proteções fixas e intertravadas, sinalização, ordem e limpeza, procedimentos de bloqueio, permissões de trabalho e EPI.",
  },
  psicossocial: {
    fundamentacao_legal:
      "NR-01, item 1.5.3.2; Guia de Fatores de Riscos Psicossociais (MTE); Nota Técnica SEI nº 36/2022; ISO 45003.",
    lesoes_agravos:
      "Estresse ocupacional, ansiedade, depressão, burnout, absenteísmo e presenteísmo.",
    fontes_circunstancias:
      "Sobrecarga de trabalho, prazos, autonomia reduzida, conflitos interpessoais, assédio, insegurança e desequilíbrio trabalho-vida.",
    meio_propagacao: "Organização do trabalho e relações socioprofissionais.",
    acoes_necessarias:
      "Revisão da carga e da organização do trabalho, canal de escuta, capacitação de lideranças, política antiassédio e acompanhamento por pesquisas periódicas.",
  },
};
