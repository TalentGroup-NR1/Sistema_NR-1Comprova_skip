/**
 * Engine de cálculo do período aquisitivo atual de férias.
 *
 * Prioridade:
 *   1. Se ultima_ferias_inicio E ultima_ferias_fim → base = ultima_ferias_fim
 *   2. Senão se data_corte_ferias → base = data_corte_ferias
 *   3. Senão → fallback baseado em admission_date
 *
 * Datas chegam como YYYY-MM-DD (sem tempo). Usamos parse local para evitar
 * deslocamento de fuso horário.
 */

import { addDays, addMonths, addYears, differenceInDays, isAfter, isBefore } from "date-fns";
import { parseISODate } from "@/lib/validators/colaborador";

/**
 * Calcula o limite legal de gozo: 60 dias antes do término do período
 * concessivo (fim do aquisitivo + 12 meses). Garante que o colaborador
 * conclua as férias antes do prazo final, evitando dobra.
 */
export function calcularLimiteGozo(fimAquisitivo: Date): Date {
  return addDays(addMonths(fimAquisitivo, 12), -60);
}

export interface FeriasInputs {
  admission_date: string;
  ultima_ferias_inicio?: string | null;
  ultima_ferias_fim?: string | null;
  data_corte_ferias?: string | null;
}

/**
 * Vínculos que possuem direito legal a férias (CLT, Aprendiz e Estagiário).
 * Demais vínculos (PJ, Temporário, Voluntário, Outros) ficam fora do módulo.
 *
 * Observação: o enum `contract_type` do banco usa "Estágio" (com acento), por
 * isso a lista inclui "Estágio". A versão sem acento é aceita por compatibilidade.
 */
export const VINCULOS_ELEGIVEIS_FERIAS = ["CLT", "Aprendiz", "Estágio", "Estagiário"] as const;

export function isVinculoElegivelFerias(vinculo?: string | null): boolean {
  if (!vinculo) return false;
  return (VINCULOS_ELEGIVEIS_FERIAS as readonly string[]).includes(vinculo);
}

export interface PeriodoAquisitivoCalculado {
  inicio: Date;
  fim: Date;
  limite: Date; // limite legal de gozo (fim do concessivo - 60 dias)
  origem: "ultima_ferias" | "data_corte" | "admissao";
}

/**
 * Calcula o período aquisitivo ATUAL (aquele em que o colaborador está
 * adquirindo ou que já está adquirido e ainda dentro do prazo de gozo).
 */
export function calcularPeriodoAquisitivoAtual(
  inputs: FeriasInputs,
  hoje: Date = new Date()
): PeriodoAquisitivoCalculado {
  const { admission_date, ultima_ferias_inicio, ultima_ferias_fim, data_corte_ferias } = inputs;

  // Regra 1: últimas férias gozadas
  if (ultima_ferias_inicio && ultima_ferias_fim) {
    const inicio = parseISODate(ultima_ferias_fim);
    const fim = addYears(inicio, 1);
    return {
      inicio,
      fim,
      limite: calcularLimiteGozo(fim),
      origem: "ultima_ferias",
    };
  }

  // Regra 2: data de corte
  if (data_corte_ferias) {
    const inicio = parseISODate(data_corte_ferias);
    const fim = addYears(inicio, 1);
    return {
      inicio,
      fim,
      limite: calcularLimiteGozo(fim),
      origem: "data_corte",
    };
  }

  // Regra 3: fallback baseado em admissão
  const admissao = parseISODate(admission_date);
  const anosCompletos = Math.max(0, Math.floor(differenceInDays(hoje, admissao) / 365));
  const inicio = addYears(admissao, anosCompletos);
  const fim = addYears(inicio, 1);
  return {
    inicio,
    fim,
    limite: calcularLimiteGozo(fim),
    origem: "admissao",
  };
}

/**
 * Calcula a lista de períodos aquisitivos (do base até o atual), encadeados.
 * Quando há últimas férias ou data de corte, ignora períodos anteriores.
 */
export function calcularPeriodosAquisitivos(
  inputs: FeriasInputs,
  hoje: Date = new Date()
): PeriodoAquisitivoCalculado[] {
  const periodos: PeriodoAquisitivoCalculado[] = [];
  const atual = calcularPeriodoAquisitivoAtual(inputs, hoje);

  // Quando a origem é admissão (sem últimas férias ou data de corte registradas),
  // inclui também períodos aquisitivos ANTERIORES já completos cujo prazo legal
  // de gozo (limite = fim + 12 meses) ainda não expirou. Assim, um colaborador
  // que adquiriu direito e ainda não agendou continua enxergando o período em
  // aberto para solicitar férias.
  if (atual.origem === "admissao") {
    const admissao = parseISODate(inputs.admission_date);
    const previos: PeriodoAquisitivoCalculado[] = [];
    let prevInicio = addYears(atual.inicio, -1);
    let prevFim = atual.inicio;
    let safetyPrev = 0;
    while (
      !isBefore(prevInicio, admissao) &&
      !isBefore(addMonths(prevFim, 12), hoje) &&
      safetyPrev < 50
    ) {
      previos.unshift({
        inicio: prevInicio,
        fim: prevFim,
        limite: calcularLimiteGozo(prevFim),
        origem: "admissao",
      });
      prevFim = prevInicio;
      prevInicio = addYears(prevInicio, -1);
      safetyPrev++;
    }
    periodos.push(...previos);
  }

  let cursor: PeriodoAquisitivoCalculado = atual;
  periodos.push(cursor);

  // Encadeia próximos períodos até alcançar/ultrapassar hoje
  let safety = 0;
  while (isBefore(cursor.fim, hoje) && safety < 50) {
    const inicio = cursor.fim;
    const fim = addYears(inicio, 1);
    cursor = {
      inicio,
      fim,
      limite: calcularLimiteGozo(fim),
      origem: atual.origem,
    };
    periodos.push(cursor);
    safety++;
  }

  return periodos;
}

/**
 * Indica se o colaborador está com férias VENCIDAS:
 *   hoje > período_aquisitivo_atual.fim + 12 meses
 */
export function isFeriasVencidas(
  inputs: FeriasInputs,
  hoje: Date = new Date()
): boolean {
  const atual = calcularPeriodoAquisitivoAtual(inputs, hoje);
  return isAfter(hoje, atual.limite);
}

/**
 * Calcula os dias de direito a férias proporcionalmente ao tempo decorrido
 * dentro do período aquisitivo, conforme CLT:
 *   - 2,5 dias por mês completo trabalhado
 *   - Fração de mês > 14 dias conta como mês completo
 *   - Máximo de 30 dias após 12 meses
 *
 * Se o período aquisitivo já se completou (fim <= hoje), retorna 30 (período
 * integralmente adquirido). Caso contrário, retorna a proporcional (floor).
 */
export function calcularDiasDireitoProporcional(
  dataInicioAquisitivo: string | Date,
  dataFimAquisitivo: string | Date,
  hoje: Date = new Date()
): number {
  const inicio = typeof dataInicioAquisitivo === "string" ? parseISODate(dataInicioAquisitivo) : dataInicioAquisitivo;
  const fim = typeof dataFimAquisitivo === "string" ? parseISODate(dataFimAquisitivo) : dataFimAquisitivo;

  // Período já completado → direito integral
  if (!isAfter(fim, hoje)) return 30;
  // Ainda não começou
  if (isAfter(inicio, hoje)) return 0;

  // Meses completos decorridos
  let mesesCompletos = 0;
  let cursor = addMonths(inicio, 1);
  while (!isAfter(cursor, hoje)) {
    mesesCompletos++;
    cursor = addMonths(inicio, mesesCompletos + 1);
  }
  // Dias da fração do mês corrente
  const inicioFracao = addMonths(inicio, mesesCompletos);
  const diasFracao = differenceInDays(hoje, inicioFracao);
  const mesesEfetivos = mesesCompletos + (diasFracao > 14 ? 1 : 0);

  return Math.min(30, Math.floor(mesesEfetivos * 2.5));
}

export interface ValidarFracionamentoParams {
  periodosExistentes: Array<{ dias: number }>;
  novoPeriodo: { dias: number };
  maxFracionamentos?: number;
}

export interface ValidarFracionamentoResult {
  valido: boolean;
  erro?: string;
}

/**
 * Validação de fracionamento de férias segundo CLT art. 134, §1º.
 * Regras:
 *  1. Cada período deve ter no mínimo 5 dias corridos.
 *  2. Ao atingir o limite máximo de fracionamentos (3), ao menos um deve ter 14 dias ou mais.
 *  3. Fracionamento livre para todas as idades (art. 134, §2º revogado pela Lei 13.467/2017).
 */
export function validarFracionamento({
  periodosExistentes,
  novoPeriodo,
  maxFracionamentos = 3,
}: ValidarFracionamentoParams): ValidarFracionamentoResult {
  const totalPeriodos = periodosExistentes.length + 1;
  if (totalPeriodos > maxFracionamentos) {
    return {
      valido: false,
      erro: `Limite de ${maxFracionamentos} períodos atingido para este período aquisitivo`,
    };
  }

  if (novoPeriodo.dias < 5) {
    return {
      valido: false,
      erro: "Período mínimo de 5 dias corridos (CLT art. 134, §1º)",
    };
  }

  if (totalPeriodos >= maxFracionamentos) {
    const temMaiorOuIgual14 =
      novoPeriodo.dias >= 14 || periodosExistentes.some((p) => p.dias >= 14);
    if (!temMaiorOuIgual14) {
      return {
        valido: false,
        erro: "Ao dividir em 3 períodos, ao menos um deve ter 14 dias ou mais (CLT art. 134, §1º)",
      };
    }
  }

  return { valido: true };
}
