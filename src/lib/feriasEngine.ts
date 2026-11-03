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

import { addDays, addMonths, addYears, differenceInDays, isAfter, isBefore, startOfDay, parseISO } from "date-fns";
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

export type StatusFerias = 'em_dia' | 'a_vencer' | 'vencida';

export interface PeriodoComGozos {
  id: string;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_gozo: string;
  dias_adquiridos: number;
  gozos?: Array<{
    dias_gozados: number;
    abono_pecuniario_dias?: number | null;
    status: string;
  }>;
}

function parseDateInput(d: string | Date): Date {
  if (d instanceof Date) return startOfDay(d);
  if (typeof d === "string" && d.includes("-")) {
    return startOfDay(parseISODate(d));
  }
  return startOfDay(new Date(d));
}

/**
 * Calcula o status de um período aquisitivo individual.
 * Regras:
 * - usados = soma de (dias_gozados + abono_pecuniario_dias) dos gozos com status !== 'cancelado'
 * - direito = calcularDiasDireitoProporcional(...)
 * - restantes = direito - usados
 * - se restantes <= 0 → 'em_dia' (nada a vencer)
 * - se limite < hoje → 'vencida'
 * - se limite <= hoje + janelaDias → 'a_vencer'
 * - senão → 'em_dia'
 */
export function calcularStatusPeriodo(
  periodo: PeriodoComGozos,
  hoje: Date = new Date(),
  janelaDias: number = 90
): { status: StatusFerias; diasRestantes: number; diasUsados: number } {
  const hojeNormalizado = startOfDay(hoje);
  const gozosAtivos = (periodo.gozos || []).filter((g) => g.status !== 'cancelado');
  const usados = gozosAtivos.reduce(
    (sum, g) => sum + (Number(g.dias_gozados) || 0) + (Number(g.abono_pecuniario_dias) || 0),
    0
  );
  const direito = calcularDiasDireitoProporcional(
    periodo.data_inicio_aquisitivo,
    periodo.data_fim_aquisitivo,
    hojeNormalizado
  );
  const restantes = Math.max(0, direito - usados);

  if (restantes <= 0) {
    return { status: 'em_dia', diasRestantes: 0, diasUsados: usados };
  }

  const limite = parseDateInput(periodo.data_limite_gozo);

  if (limite < hojeNormalizado) {
    return { status: 'vencida', diasRestantes: restantes, diasUsados: usados };
  }

  if (limite <= addDays(hojeNormalizado, janelaDias)) {
    return { status: 'a_vencer', diasRestantes: restantes, diasUsados: usados };
  }

  return { status: 'em_dia', diasRestantes: restantes, diasUsados: usados };
}

export type StatusColaborador = {
  vencidos: number;
  aVencer: number;
};

/**
 * Helper de apresentação: calcula a quantidade de períodos vencidos e a vencer de um colaborador.
 */
export function calcularStatusColaborador(
  periodos: PeriodoComGozos[],
  hoje: Date = new Date(),
  janelaDias: number = 90
): StatusColaborador {
  let vencidos = 0;
  let aVencer = 0;
  for (const p of periodos) {
    const { status } = calcularStatusPeriodo(p, hoje, janelaDias);
    if (status === 'vencida') vencidos++;
    else if (status === 'a_vencer') aVencer++;
  }
  return { vencidos, aVencer };
}

/**
 * Contabiliza o status de férias consolidado por colaborador único (D1) e por período.
 */
export function contarPorColaborador(
  colaboradores: Array<{ id: string; periodos: PeriodoComGozos[] }>,
  hoje: Date = new Date(),
  janelaDias: number = 90
): {
  colaboradoresVencidos: number;
  colaboradoresAVencer: number;
  periodosVencidos: number;
  periodosAVencer: number;
  porColaborador: Map<string, { vencidos: number; aVencer: number }>;
} {
  let colaboradoresVencidos = 0;
  let colaboradoresAVencer = 0;
  let periodosVencidos = 0;
  let periodosAVencer = 0;
  const porColaborador = new Map<string, { vencidos: number; aVencer: number }>();

  colaboradores.forEach((colab) => {
    const { vencidos, aVencer } = calcularStatusColaborador(colab.periodos || [], hoje, janelaDias);
    periodosVencidos += vencidos;
    periodosAVencer += aVencer;

    porColaborador.set(colab.id, { vencidos, aVencer });

    if (vencidos > 0) {
      colaboradoresVencidos++;
    }
    if (aVencer > 0) {
      colaboradoresAVencer++;
    }
  });

  return {
    colaboradoresVencidos,
    colaboradoresAVencer,
    periodosVencidos,
    periodosAVencer,
    porColaborador,
  };
}
