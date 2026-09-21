export interface ReportColaborador {
  id: string;
  full_name: string;
  cpf: string | null;
  cargo: string | null;
  departamento: string | null;
  admissao: string | null;
  status: string | null;
}

export interface ReportFiltro {
  data_inicio: string | null;
  data_fim: string | null;
}

export interface ReportPulso {
  id: string;
  origem: 'campanha' | 'pulso_direto' | string;
  campanha: string | null;
  data_hora: string;
  pergunta: string | null;
  resposta: string | null;
  score_numeric: number | null;
  esfera: string | null;
  comentario: string | null;
}

export interface ReportAcompanhamento {
  id: string;
  status: string;
  objetivo: string | null;
  acoes: string[] | any[] | null;
  anotacoes: string | null;
  resultado: string | null;
  responsavel_nome: string | null;
  criado_em: string;
  atualizado_em: string | null;
  concluido_em: string | null;
  proximo_contato_em: string | null;
  updated_by_nome: string | null;
}

export interface EmployeeReportData {
  colaborador: ReportColaborador | null;
  filtro_aplicado: ReportFiltro;
  pulsos: ReportPulso[];
  acompanhamentos: ReportAcompanhamento[];
  regras_aplicadas: string;
}
