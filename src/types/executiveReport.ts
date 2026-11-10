/**
 * Tipos derivados do contrato real da RPC public.get_executive_report_data(uuid, integer).
 * A RPC retorna um único JSON com as chaves abaixo.
 * Arrays são SEMPRE arrays (mesmo que vazios). Objetos escalares (headcount) são objetos.
 * A normalização de arrays→objetos (feedback, avaliacoes, pdis, treinamentos, promocoes)
 * é feita em normalizeRpcData() dentro de useExecutiveReport.ts.
 */

// ─── Headcount ────────────────────────────────────────────────────────────────
export interface ERHeadcount {
  ativos: number;
  desligados: number;
  ferias: number;
  licenca: number;
  total: number;
}

// ─── Séries temporais ─────────────────────────────────────────────────────────
export interface ERAdmissaoMes {
  ano?: number;
  mes: number;
  total: number;
}

export interface ERDesligamentoMes {
  ano?: number;
  mes: number;
  total: number;
}

// ─── Agrupamentos base ────────────────────────────────────────────────────────
export interface ERDepartamento {
  departamento: string;
  total: number;
}

export interface ERGestorInterno {
  gestor: string;
  total: number;
}

// ─── Demografia ───────────────────────────────────────────────────────────────
export interface ERDemografiaSexo {
  sexo: string;
  total: number;
}

export interface ERDemografiaRaca {
  raca: string;
  total: number;
}

export interface ERFaixaEtaria {
  faixa: string;
  total: number;
}

export interface ERGeografia {
  estado: string;
  total: number;
}

export interface ERTempoCasa {
  /** Ex: "Menos de 1 ano", "1-2 anos", "3-5 anos", "Mais de 5 anos" */
  tempo: string;
  total: number;
}

export interface ERCargoNivel {
  cargo: string;
  total: number;
}

export interface ERFormacao {
  /** Campo retornado pela RPC como "formacao" (education_level::TEXT) */
  formacao: string;
  total: number;
}

// ─── Feedback (normalizado de array no hook) ──────────────────────────────────
/** Formato final após normalizeRpcData — objeto escalar para consumo nos componentes */
export interface ERFeedback {
  total: number;
  concluidos: number;
  por_milestone: ERFeedbackMilestone[] | null;
}

export interface ERFeedbackMilestone {
  milestone_type: string;
  total: number;
}

/** Item bruto que a RPC retorna no array "feedback" */
export interface ERFeedbackRaw {
  gestor: string;
  total_feedbacks: number;
  total_alertas: number;
}

// ─── Feedbacks agrupados (alertas por gestor) ─────────────────────────────────
export interface ERFeedbackColaborador {
  nome: string;
  cargo: string;
  data_feedback: string;
  alerta: boolean;
}

export interface ERFeedbackAlerta {
  departamento: string;
  total_feedbacks: number;
  total_alertas: number;
  colaboradores: ERFeedbackColaborador[];
}

// ─── Feedbacks detalhados ─────────────────────────────────────────────────────
export interface ERFeedbackDetalhado {
  id?: string;
  nome_colaborador: string;
  cargo: string | null;
  departamento: string | null;
  gestor_interno: string | null;
  data_feedback: string;
  texto_feedback: string | null;
  alerta_rh: boolean | null;
  origem: string | null;
}

// ─── Avaliações (normalizado de array no hook) ────────────────────────────────
/** Formato final após normalizeRpcData */
export interface ERAvaliacoes {
  ciclos_total: number;
  avaliacoes_total: number;
  autoavaliacoes_concluidas: number;
  avaliacoes_gestor_concluidas: number;
}

/** Item bruto que a RPC retorna no array "avaliacoes" */
export interface ERAvaliacoesRaw {
  nome_ciclo: string;
  total_avaliacoes: number;
  concluidas_colab: number;
  concluidas_gestor: number;
}

// ─── PDIs (normalizado de array no hook) ──────────────────────────────────────
/** Formato final após normalizeRpcData */
export interface ERPdis {
  total: number;
  em_andamento: number;
  concluidos: number;
  rascunho: number;
}

/** Item bruto que a RPC retorna no array "pdis" */
export interface ERPdisRaw {
  status: string;
  total: number;
}

// ─── Treinamentos (normalizado de array no hook) ──────────────────────────────
/** Formato final após normalizeRpcData */
export interface ERTreinamentos {
  concluidos: number;
  certificados: number;
}

/** Item bruto que a RPC retorna no array "treinamentos" */
export interface ERTreinamentosRaw {
  status: string;
  total: number;
}

// ─── Promoções (normalizado de array no hook) ─────────────────────────────────
/** Formato final após normalizeRpcData */
export interface ERPromocoes {
  total: number;
}

/** Item bruto que a RPC retorna no array "promocoes" */
export interface ERPromocoesRaw {
  ano: number;
  total: number;
}

// ─── Promoções detalhadas ─────────────────────────────────────────────────────
export interface ERPromocaoDetalhada {
  id?: string;
  nome_colaborador: string;
  departamento: string | null;
  cargo_anterior: string | null;
  cargo_novo: string | null;
  salario_anterior: number | null;
  salario_novo: number | null;
  data_promocao: string;
  motivo: string | null;
}

// ─── Desligamentos detalhados ─────────────────────────────────────────────────
export interface ERDesligamentoDetalhado {
  id?: string;
  nome_colaborador: string;
  departamento: string | null;
  cargo: string | null;
  data_desligamento: string;
  tipo_desligamento: string | null;
  iniciativa: string | null;
  motivo_principal: string | null;
  motivos_secundarios: string[] | null;
}

// ─── Diário de Bordo / Pulse ──────────────────────────────────────────────────
export interface ERDiarioBordo {
  semana: number;
  media_nota: number | null;
  no_prazo: number;
  com_atraso: number;
}

// ─── Shape final (pós-normalização) ──────────────────────────────────────────
/**
 * ExecutiveReportData é o contrato público consumido pelos componentes.
 * Todos os campos arrays e objetos escalares estão garantidos por normalizeRpcData().
 */
export interface ExecutiveReportData {
  headcount: ERHeadcount;
  admissoes_mes: ERAdmissaoMes[];
  desligamentos_mes: ERDesligamentoMes[];
  departamentos: ERDepartamento[];
  gestor_interno: ERGestorInterno[];
  demografia_sexo: ERDemografiaSexo[];
  demografia_raca: ERDemografiaRaca[];
  faixas_etarias: ERFaixaEtaria[];
  geografia: ERGeografia[];
  tempo_casa: ERTempoCasa[];
  cargos_niveis: ERCargoNivel[];
  escolaridade: ERFormacao[];
  feedback: ERFeedback;
  feedbacks_alertas: ERFeedbackAlerta[];
  feedbacks_detalhados: ERFeedbackDetalhado[];
  avaliacoes: ERAvaliacoes;
  pdis: ERPdis;
  treinamentos: ERTreinamentos;
  promocoes: ERPromocoes;
  promocoes_detalhadas: ERPromocaoDetalhada[];
  desligamentos_detalhados: ERDesligamentoDetalhado[];
  diario_bordo_resultados: ERDiarioBordo[];
}
