import { PgrPlanoAcao, PgrAcaoExecucao } from "@/hooks/usePgrAcoes";

export interface AcaoComExecucoes extends PgrPlanoAcao {
  execucoes: PgrAcaoExecucao[];
}

export interface PgrAggregatedData {
  totalAcoes: number;
  pendentes: number;
  emAndamento: number;
  concluidas: number;
  validadas: number;
  percentualExecucao: number;
  custoEstimadoTotal: number;
  custoRealTotal: number;
}

export function aggregatePgrData(acoes: AcaoComExecucoes[]): PgrAggregatedData {
  const totalAcoes = acoes.length;
  let pendentes = 0;
  let emAndamento = 0;
  let concluidas = 0;
  let validadas = 0;
  let custoEstimadoTotal = 0;
  let custoRealTotal = 0;

  for (const acao of acoes) {
    if (acao.status === "pendente") pendentes++;
    else if (acao.status === "em_andamento") emAndamento++;
    else if (acao.status === "concluida") concluidas++;
    else if (acao.status === "validada") validadas++;

    custoEstimadoTotal += Number(acao.custo_estimado) || 0;
    
    // O custo real pode ser pego do acao.custo_real ou somado das execuções.
    // Pelo modelo atual o banco já tem a trigger que soma. Vamos confiar no acao.custo_real
    custoRealTotal += Number(acao.custo_real) || 0;
  }

  const concluidasOuValidadas = concluidas + validadas;
  const percentualExecucao = totalAcoes > 0 ? Math.round((concluidasOuValidadas / totalAcoes) * 100) : 0;

  return {
    totalAcoes,
    pendentes,
    emAndamento,
    concluidas,
    validadas,
    percentualExecucao: Math.round(percentualExecucao),
    custoEstimadoTotal,
    custoRealTotal
  };
}

export function validarPreRequisitosRelatorio(params: { companyId?: string | null, pgrImportacaoId?: string | null, acoes?: any[] | null }): string | null {
  if (!params.companyId) return "Selecione um PGR válido";
  if (!params.pgrImportacaoId) return "PGR não encontrado";
  if (!params.acoes || params.acoes.length === 0) return "Nenhuma ação para gerar relatório";
  return null;
}
