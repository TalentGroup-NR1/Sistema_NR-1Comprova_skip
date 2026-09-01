// Estrutura compartilhada do Questionário de Análise de Cargos
// Usada tanto no modelo (aba Questionários) quanto no snapshot da descrição de cargo.

export type QPerguntaTipo =
  | 'texto_curto'
  | 'texto_longo'
  | 'escolha_unica'
  | 'multipla_escolha'
  | 'sim_nao'
  | 'atividades';

export const TIPOS_PERGUNTA: { value: QPerguntaTipo; label: string }[] = [
  { value: 'texto_curto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto longo' },
  { value: 'escolha_unica', label: 'Escolha única' },
  { value: 'multipla_escolha', label: 'Múltipla escolha' },
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'atividades', label: 'Bloco de atividades (repetível)' },
];

/** Campos da descrição de cargo que uma pergunta pode alimentar na consolidação. */
export type QMapeamento =
  | 'descricao_sumaria'
  | 'responsabilidades'
  | 'formacao_academica'
  | 'cursos_necessarios'
  | 'cursos_desejaveis'
  | 'fator_experiencia'
  | 'fator_responsabilidade_sigilo'
  | 'fator_responsabilidade_erros'
  | 'habilidades_comportamentais';

export const MAPEAMENTOS: { value: QMapeamento | 'nenhum'; label: string }[] = [
  { value: 'nenhum', label: 'Não importar' },
  { value: 'descricao_sumaria', label: 'Descrição sumária' },
  { value: 'responsabilidades', label: 'Responsabilidades / atividades' },
  { value: 'formacao_academica', label: 'Formação acadêmica' },
  { value: 'cursos_necessarios', label: 'Cursos necessários' },
  { value: 'cursos_desejaveis', label: 'Cursos desejáveis' },
  { value: 'fator_experiencia', label: 'Fator experiência' },
  { value: 'fator_responsabilidade_sigilo', label: 'Fator sigilo' },
  { value: 'fator_responsabilidade_erros', label: 'Fator erros' },
  { value: 'habilidades_comportamentais', label: 'Atitudes / comportamentais' },
];

export interface QPergunta {
  id: string;
  tipo: QPerguntaTipo;
  titulo: string;
  texto_ajuda?: string | null;
  obrigatorio: boolean;
  opcoes: string[];
  mapeamento?: QMapeamento | null;
}

export interface QSecao {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo: string;
  perguntas: QPergunta[];
}

export interface QCustomizacao {
  secoes: QSecao[];
}

export const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `q-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function parseCustomizacao(raw: unknown): QCustomizacao {
  if (raw && typeof raw === 'object' && Array.isArray((raw as QCustomizacao).secoes)) {
    return { secoes: (raw as QCustomizacao).secoes };
  }
  return { secoes: [] };
}

/** Resposta do bloco de atividades. */
export interface QAtividade {
  o_que_faz: string;
  como_faz: string;
  para_que: string;
  complexidade: string;
  frequencia: string;
}

export const COMPLEXIDADES_Q = ['Alta', 'Média', 'Baixa'];
export const FREQUENCIAS_Q = ['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral', 'Anual'];

export const atividadeVazia = (): QAtividade => ({
  o_que_faz: '',
  como_faz: '',
  para_que: '',
  complexidade: '',
  frequencia: '',
});

export const INSTRUCOES_PADRAO = `Este formulário visa colher informações sobre as atividades dos cargos existentes na organização e dele resultará o catálogo de descrição e especificação dos cargos.

1. Antes de iniciar o preenchimento, leia todas as perguntas com atenção. Em caso de dúvida, procure a área de Recursos Humanos (DHO).
2. O questionário não se refere à sua pessoa, mas ao cargo que você ocupa e às funções que desempenha.
3. Responda a todas as perguntas. Se alguma não se aplicar ao seu cargo, escreva "não aplicável".
4. Você pode salvar e continuar depois; o envio só acontece quando você clicar em "Enviar respostas".
5. Se necessário, valide o conteúdo com seu gestor antes de enviar.

Exemplos de atividade:
• O que faz? Triagem de currículos.
• Como faz? Buscando nos arquivos os currículos recebidos e em sites específicos.
• Para que é feito? Para selecionar candidatos dentro do perfil e iniciar os contatos.`;

/** Modelo padrão baseado no Questionário de Análise de Cargos (NR1-Pronto). */
export function modeloPadraoSecoes(): QSecao[] {
  const p = (
    titulo: string,
    tipo: QPerguntaTipo,
    extras: Partial<QPergunta> = {},
  ): QPergunta => ({
    id: novoId(),
    tipo,
    titulo,
    texto_ajuda: null,
    obrigatorio: false,
    opcoes: [],
    mapeamento: null,
    ...extras,
  });

  return [
    {
      id: novoId(),
      titulo: 'Descrição sumária',
      descricao:
        'Descreva em um único parágrafo qual o principal objetivo (missão) do seu cargo dentro da organização.',
      tipo: 'padrao',
      perguntas: [
        p('Qual o principal objetivo (missão) do seu cargo?', 'texto_longo', {
          texto_ajuda:
            'Exemplo 1: Desenvolver o processo de recrutamento e seleção de profissionais. Exemplo 2: Elaborar requisitos e programar aplicativos mobile.',
          obrigatorio: true,
          mapeamento: 'descricao_sumaria',
        }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Descrição das atividades',
      descricao:
        'Descreva as atividades sob sua responsabilidade, na sequência em que são realizadas ou por ordem de importância.',
      tipo: 'padrao',
      perguntas: [
        p('Atividades que você realiza', 'atividades', {
          texto_ajuda:
            'Para cada atividade informe: o que faz, como faz, para que é feito, a complexidade e a frequência.',
          obrigatorio: true,
          mapeamento: 'responsabilidades',
        }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Formação acadêmica',
      descricao: 'Formação necessária para o desempenho satisfatório do cargo.',
      tipo: 'padrao',
      perguntas: [
        p('Nível de formação necessário', 'escolha_unica', {
          opcoes: [
            'Ensino Médio',
            'Técnico',
            'Graduação Incompleta',
            'Graduação Completa',
            'Pós-Graduação',
            'MBA',
            'Mestrado',
            'Doutorado',
          ],
          mapeamento: 'formacao_academica',
        }),
        p('Curso / área de formação', 'texto_curto'),
        p('Situação', 'escolha_unica', { opcoes: ['Cursando', 'Completo'] }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Conhecimentos, cursos, certificações e habilitações',
      descricao:
        'Relacione os conhecimentos, cursos, certificações e habilitações necessários para um melhor desempenho das atividades.',
      tipo: 'padrao',
      perguntas: [
        p('Cursos / certificações indispensáveis', 'texto_longo', {
          mapeamento: 'cursos_necessarios',
        }),
        p('Cursos / certificações desejáveis', 'texto_longo', {
          mapeamento: 'cursos_desejaveis',
        }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Experiência',
      descricao:
        'Tempo de experiência mínimo necessário para o desempenho satisfatório da função (não é o tempo que você possui).',
      tipo: 'padrao',
      perguntas: [
        p('Tempo mínimo de experiência', 'escolha_unica', {
          opcoes: [
            'Até 3 meses',
            '6 a 12 meses',
            '2 a 3 anos',
            '4 a 5 anos',
            '7 a 10 anos',
            'Acima de 10 anos',
          ],
          mapeamento: 'fator_experiencia',
        }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Atitudes e competências comportamentais',
      descricao: 'Comportamentos e atitudes esperados de quem ocupa o cargo.',
      tipo: 'padrao',
      perguntas: [
        p('Quais atitudes e competências comportamentais o cargo exige?', 'texto_longo', {
          texto_ajuda: 'Exemplos: comunicação, organização, negociação, trabalho em equipe.',
          mapeamento: 'habilidades_comportamentais',
        }),
      ],
    },
    {
      id: novoId(),
      titulo: 'Responsabilidades',
      tipo: 'padrao',
      perguntas: [
        p(
          'Durante o exercício das suas atividades você tem acesso a informações confidenciais da empresa?',
          'sim_nao',
          { mapeamento: 'fator_responsabilidade_sigilo' },
        ),
        p('Se sim, quais informações confidenciais?', 'texto_longo'),
        p(
          'Os erros decorrentes das suas atividades podem representar prejuízo à empresa (despesas, retrabalho, imagem institucional)?',
          'sim_nao',
        ),
        p('Se sim, quais prejuízos?', 'texto_longo', {
          mapeamento: 'fator_responsabilidade_erros',
        }),
      ],
    },
  ];
}

/** Texto legível de uma resposta, usado na consolidação. */
export function respostaToTexto(pergunta: QPergunta, valor: unknown): string {
  if (valor == null || valor === '') return '';
  if (pergunta.tipo === 'atividades' && Array.isArray(valor)) {
    return (valor as QAtividade[])
      .filter((a) => a && (a.o_que_faz || a.como_faz || a.para_que))
      .map((a, i) => {
        const partes = [
          `Atividade ${i + 1}`,
          a.o_que_faz && `O que faz: ${a.o_que_faz}`,
          a.como_faz && `Como faz: ${a.como_faz}`,
          a.para_que && `Para que é feito: ${a.para_que}`,
          a.complexidade && `Complexidade: ${a.complexidade}`,
          a.frequencia && `Frequência: ${a.frequencia}`,
        ].filter(Boolean);
        return partes.join(' · ');
      })
      .join('\n');
  }
  if (Array.isArray(valor)) return valor.join(', ');
  return String(valor);
}

/** Lista de responsabilidades a partir do bloco de atividades. */
export function atividadesToResponsabilidades(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return (valor as QAtividade[])
    .filter((a) => a && a.o_que_faz?.trim())
    .map((a) =>
      [a.o_que_faz, a.como_faz && `Como: ${a.como_faz}`, a.para_que && `Para: ${a.para_que}`]
        .filter(Boolean)
        .join(' — '),
    );
}
