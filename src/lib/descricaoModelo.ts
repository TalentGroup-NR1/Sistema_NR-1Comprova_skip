// Estrutura configurável do formulário de Descrição de Cargo.
// O mesmo modelo alimenta o formulário do RH, o questionário do colaborador e o PDF.

import { novoId, type QPergunta, type QPerguntaTipo, type QSecao } from './questionarioCargo';

export type DCampoTipo =
  | 'texto_curto'
  | 'texto_longo'
  | 'selecao'
  | 'sim_nao'
  | 'lista'
  | 'atividades';

export const TIPOS_CAMPO: { value: DCampoTipo; label: string }[] = [
  { value: 'texto_curto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto longo' },
  { value: 'selecao', label: 'Lista de opções' },
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'lista', label: 'Lista de itens (repetível)' },
  { value: 'atividades', label: 'Bloco de atividades' },
];

/** Colunas fixas de descricoes_cargo que um campo pode alimentar. */
export type DCampoFixo =
  | 'descricao_sumaria'
  | 'grupo_organizacional'
  | 'nivel_maturidade'
  | 'responsabilidades'
  | 'formacao_academica'
  | 'cursos_necessarios'
  | 'cursos_desejaveis'
  | 'habilidades_comportamentais'
  | 'fator_experiencia'
  | 'fator_complexidade'
  | 'fator_responsabilidade_erros'
  | 'fator_responsabilidade_sigilo';

export const CAMPOS_FIXOS: { value: DCampoFixo | 'nenhum'; label: string }[] = [
  { value: 'nenhum', label: 'Campo personalizado' },
  { value: 'descricao_sumaria', label: 'Descrição sumária' },
  { value: 'grupo_organizacional', label: 'Grupo organizacional' },
  { value: 'nivel_maturidade', label: 'Nível / maturidade' },
  { value: 'responsabilidades', label: 'Principais responsabilidades' },
  { value: 'formacao_academica', label: 'Formação acadêmica' },
  { value: 'cursos_necessarios', label: 'Cursos necessários' },
  { value: 'cursos_desejaveis', label: 'Cursos desejáveis' },
  { value: 'habilidades_comportamentais', label: 'Habilidades comportamentais' },
  { value: 'fator_experiencia', label: 'Fator experiência' },
  { value: 'fator_complexidade', label: 'Fator complexidade' },
  { value: 'fator_responsabilidade_erros', label: 'Fator responsabilidade por erros' },
  { value: 'fator_responsabilidade_sigilo', label: 'Fator responsabilidade por sigilo' },
];

export interface DCampo {
  id: string;
  label: string;
  tipo: DCampoTipo;
  ajuda?: string | null;
  opcoes: string[];
  obrigatorio: boolean;
  /** Quando preenchido, o valor é gravado na coluna correspondente de descricoes_cargo. */
  campo_fixo?: DCampoFixo | null;
  /** Não é perguntado ao colaborador (uso interno do RH). */
  oculto_colaborador?: boolean;
}

export interface DBloco {
  id: string;
  titulo: string;
  descricao?: string | null;
  oculto_colaborador?: boolean;
  campos: DCampo[];
}

export interface DEstrutura {
  blocos: DBloco[];
}

export function parseEstrutura(raw: unknown): DEstrutura {
  if (raw && typeof raw === 'object' && Array.isArray((raw as DEstrutura).blocos)) {
    return { blocos: (raw as DEstrutura).blocos };
  }
  return { blocos: [] };
}

export const novoCampo = (extras: Partial<DCampo> = {}): DCampo => ({
  id: novoId(),
  label: 'Novo campo',
  tipo: 'texto_longo',
  ajuda: null,
  opcoes: [],
  obrigatorio: false,
  campo_fixo: null,
  oculto_colaborador: false,
  ...extras,
});

export const novoBloco = (extras: Partial<DBloco> = {}): DBloco => ({
  id: novoId(),
  titulo: 'Novo bloco',
  descricao: null,
  oculto_colaborador: false,
  campos: [],
  ...extras,
});

export const ALOCACOES = ['Interna', 'Externa', 'Híbrida', 'Campo'];
export const COMPLEXIDADES = ['Baixa complexidade', 'Média complexidade', 'Alta complexidade'];
export const EXPERIENCIAS = ['0 a 2 anos', '2 a 5 anos', '5 a 10 anos', 'Acima de 10 anos'];
export const FORMACOES = [
  'Ensino Médio',
  'Técnico',
  'Graduação Incompleta',
  'Graduação Completa',
  'Pós-Graduação',
  'Mestrado',
  'Doutorado',
];

/** Blocos equivalentes ao formulário fixo original (2 a 7). */
export function modeloPadraoBlocos(): DBloco[] {
  return [
    novoBloco({
      titulo: 'Descrição sumária',
      campos: [
        novoCampo({
          label: 'Descrição sumária',
          tipo: 'texto_longo',
          campo_fixo: 'descricao_sumaria',
          ajuda: 'Principal objetivo (missão) do cargo dentro da organização.',
        }),
      ],
    }),
    novoBloco({
      titulo: 'Grupo organizacional',
      campos: [
        novoCampo({
          label: 'Grupo organizacional',
          tipo: 'texto_longo',
          campo_fixo: 'grupo_organizacional',
        }),
      ],
    }),
    novoBloco({
      titulo: 'Nível / maturidade do cargo',
      campos: [
        novoCampo({
          label: 'Nível / maturidade do cargo',
          tipo: 'texto_longo',
          campo_fixo: 'nivel_maturidade',
        }),
      ],
    }),
    novoBloco({
      titulo: 'Principais responsabilidades',
      campos: [
        novoCampo({
          label: 'Responsabilidades',
          tipo: 'lista',
          campo_fixo: 'responsabilidades',
        }),
      ],
    }),
    novoBloco({
      titulo: 'Competências',
      campos: [
        novoCampo({
          label: 'Nível de formação acadêmica',
          tipo: 'selecao',
          opcoes: [...FORMACOES],
          campo_fixo: 'formacao_academica',
        }),
        novoCampo({
          label: 'Cursos e/ou certificações necessários',
          tipo: 'texto_longo',
          campo_fixo: 'cursos_necessarios',
        }),
        novoCampo({
          label: 'Cursos e/ou certificações desejáveis',
          tipo: 'texto_longo',
          campo_fixo: 'cursos_desejaveis',
        }),
        novoCampo({
          label: 'Habilidades comportamentais',
          tipo: 'texto_longo',
          campo_fixo: 'habilidades_comportamentais',
        }),
      ],
    }),
    novoBloco({
      titulo: 'Fatores',
      campos: [
        novoCampo({
          label: 'Fator experiência',
          tipo: 'selecao',
          opcoes: [...EXPERIENCIAS],
          campo_fixo: 'fator_experiencia',
        }),
        novoCampo({
          label: 'Fator complexidade',
          tipo: 'selecao',
          opcoes: [...COMPLEXIDADES],
          campo_fixo: 'fator_complexidade',
        }),
        novoCampo({
          label: 'Fator responsabilidade por erros',
          tipo: 'texto_longo',
          campo_fixo: 'fator_responsabilidade_erros',
        }),
        novoCampo({
          label: 'Fator responsabilidade por informações sigilosas',
          tipo: 'sim_nao',
          campo_fixo: 'fator_responsabilidade_sigilo',
        }),
      ],
    }),
  ];
}

const TIPO_PARA_PERGUNTA: Record<DCampoTipo, QPerguntaTipo> = {
  texto_curto: 'texto_curto',
  texto_longo: 'texto_longo',
  selecao: 'escolha_unica',
  sim_nao: 'sim_nao',
  lista: 'texto_longo',
  atividades: 'atividades',
};

/**
 * Converte o modelo da descrição nas seções do questionário do colaborador,
 * ignorando blocos/campos marcados como internos do RH.
 */
export function modeloParaSecoes(blocos: DBloco[]): QSecao[] {
  return blocos
    .filter((b) => !b.oculto_colaborador)
    .map((b) => ({
      id: b.id,
      titulo: b.titulo,
      descricao: b.descricao ?? null,
      tipo: 'padrao',
      perguntas: b.campos
        .filter((c) => !c.oculto_colaborador)
        .map<QPergunta>((c) => ({
          id: c.id,
          tipo: TIPO_PARA_PERGUNTA[c.tipo],
          titulo: c.label,
          texto_ajuda: c.ajuda ?? null,
          obrigatorio: c.obrigatorio,
          opcoes: c.opcoes ?? [],
          mapeamento: null,
        })),
    }))
    .filter((s) => s.perguntas.length > 0);
}

/** Índice campo.id -> campo, para consolidar respostas. */
export function indexarCampos(blocos: DBloco[]): Record<string, DCampo> {
  const out: Record<string, DCampo> = {};
  blocos.forEach((b) => b.campos.forEach((c) => (out[c.id] = c)));
  return out;
}
