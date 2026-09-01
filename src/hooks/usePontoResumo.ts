import { PontoRegistro } from "./usePontoRegistros";
import { PontoConfig } from "./usePontoConfig";

export interface ResumoDiario {
  data: string;
  registros: PontoRegistro[];
  horasTrabalhadasMin: number;
  horasIntervaloMin: number;
  horasExtrasMin: number;
  horasNoturnasMin: number;
  horasPrevistasMin: number;
  saldoMin: number;
  status: "REGULAR" | "INCONSISTENTE" | "FALTA" | "FERIADO" | "FERIAS" | "ABONADO" | "FOLGA" | "PRE_ADMISSAO";
  feriadoNome?: string;
  tipoAbono?: string;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function calcNightMinutes(
  start: Date,
  end: Date,
  nightStart: number, // minutes from midnight (e.g. 22*60=1320)
  nightEnd: number // minutes from midnight (e.g. 5*60=300)
): number {
  let nightMinutes = 0;
  const current = new Date(start);

  while (current < end) {
    const minuteOfDay = current.getHours() * 60 + current.getMinutes();
    // Night period crosses midnight: 22:00 - 05:00
    const isNight =
      nightStart > nightEnd
        ? minuteOfDay >= nightStart || minuteOfDay < nightEnd
        : minuteOfDay >= nightStart && minuteOfDay < nightEnd;

    if (isNight) nightMinutes++;
    current.setMinutes(current.getMinutes() + 1);
  }

  return nightMinutes;
}

export interface CompensacaoInfo {
  data_inicio: string;
  data_fim: string;
  minutos_extras_dia: number | null;
  ativo: boolean;
}

export interface WorkScheduleInfo {
  /** Dias previstos no padrão JS getDay(): 0=Dom..6=Sáb. Default: seg–sex. */
  dias_semana?: number[] | null;
  /** Se true, feriados contam como dia previsto normal. Default: false. */
  trabalha_feriados?: boolean | null;
  /** Tolerância em minutos aplicada ao saldo/extras do dia. 0 = minuto a minuto. */
  tolerancia_minutos?: number | null;
  /** Carga fixa do horário quando não há variação por dia. */
  carga_diaria_minutos?: number | null;
  /** Mapa de horários variáveis por dia da semana. Chaves "0".."6". */
  horarios_por_dia?: Record<string, { em?: string | null; sm?: string | null; et?: string | null; st?: string | null; carga?: number | null }> | null;
}


/**
 * Decide se uma data faz parte da escala prevista do colaborador.
 * Sem schedule -> fallback histórico: seg–sex previsto, sáb/dom não.
 */
export function isDiaPrevisto(
  data: string,
  schedule: WorkScheduleInfo | null | undefined,
  isFeriado: boolean,
): boolean {
  const dow = new Date(data + "T12:00:00").getDay();
  const dias = schedule?.dias_semana && schedule.dias_semana.length > 0
    ? schedule.dias_semana
    : [1, 2, 3, 4, 5];
  const trabalhaFeriado = schedule?.trabalha_feriados ?? false;
  if (isFeriado) return trabalhaFeriado;
  return dias.includes(dow);
}

export function calcularResumoDiario(
  registros: PontoRegistro[],
  config: PontoConfig | null,
  data: string,
  jornadaIndividual?: number | null,
  compensacoes?: CompensacaoInfo[],
  feriadosMap?: Map<string, { nome: string }>,
  feriasDates?: Set<string>,
  workSchedule?: WorkScheduleInfo | null,
  admissionDate?: string | null,
): ResumoDiario {
  // Trava de pré-admissão: dias anteriores à data de admissão não geram
  // saldo, falta ou jornada — apenas marcador neutro "PRE_ADMISSAO".
  if (admissionDate && data < admissionDate) {
    return {
      data,
      registros: [],
      horasTrabalhadasMin: 0,
      horasIntervaloMin: 0,
      horasExtrasMin: 0,
      horasNoturnasMin: 0,
      horasPrevistasMin: 0,
      saldoMin: 0,
      status: "PRE_ADMISSAO",
    };
  }

  // Prioridade da jornada prevista do dia:
  //   1) carga do dia (workSchedule.horarios_por_dia[dow].carga)
  //   2) carga do horário vinculado (workSchedule.carga_diaria_minutos)
  //   3) config global (config.jornada_diaria_minutos)
  //   4) 480
  // O parâmetro `jornadaIndividual` (colaboradores.jornada_diaria_minutos) é
  // mantido só por compatibilidade e IGNORADO — a jornada vem sempre do
  // Horário de Trabalho vinculado.
  void jornadaIndividual;
  const dowJornada = new Date(data + "T12:00:00").getDay();
  const cargaDia = workSchedule?.horarios_por_dia?.[String(dowJornada)]?.carga ?? null;
  const jornadaBase = cargaDia ?? workSchedule?.carga_diaria_minutos ?? config?.jornada_diaria_minutos ?? 480;

  // Check if date falls within an active compensation period
  const compensacao = compensacoes?.find(
    (c) => c.ativo && c.minutos_extras_dia && data >= c.data_inicio && data <= c.data_fim
  );
  const jornada = jornadaBase + (compensacao?.minutos_extras_dia ?? 0);
  // Tolerância: prioridade ao work_schedule (regra por colaborador); fallback à config global; default 0 (minuto a minuto).
  const tolerancia = workSchedule?.tolerancia_minutos ?? config?.tolerancia_minutos ?? 0;

  const nightStartMin = config ? timeToMinutes(config.inicio_noturno) : 1320;
  const nightEndMin = config ? timeToMinutes(config.fim_noturno) : 300;

  // All records for display (including pending manual entries).
  // IMPORTANT: agrupar pela data LOCAL do navegador (mesmo critério do BD,
  // que usa AT TIME ZONE 'America/Sao_Paulo'). Usar startsWith no ISO UTC
  // jogava marcações de fim de noite (ex.: 21:30 BRT = 00:30 UTC do dia
  // seguinte) para o dia errado, ficando dessincronizado com o saldo do BD.
  const localDateOf = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const allDayRegistros = registros
    .filter((r) => localDateOf(r.data_hora) === data)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  // Only approved records for hour calculations
  const approvedRegistros = allDayRegistros
    .filter((r) => r.status_aprovacao === "aprovado");

  const feriado = feriadosMap?.get(data);
  const isFerias = feriasDates?.has(data) ?? false;
  const previsto = isDiaPrevisto(data, workSchedule, !!feriado);

  // Férias: bloqueia jornada
  if (isFerias) {
    return {
      data,
      registros: allDayRegistros,
      horasTrabalhadasMin: 0,
      horasIntervaloMin: 0,
      horasExtrasMin: 0,
      horasNoturnasMin: 0,
      horasPrevistasMin: 0,
      saldoMin: 0,
      status: "FERIAS",
    };
  }

  // Feriado sem registros (e que não é dia previsto): zero jornada
  if (feriado && !previsto && allDayRegistros.length === 0) {
    return {
      data,
      registros: allDayRegistros,
      horasTrabalhadasMin: 0,
      horasIntervaloMin: 0,
      horasExtrasMin: 0,
      horasNoturnasMin: 0,
      horasPrevistasMin: 0,
      saldoMin: 0,
      status: "FERIADO",
      feriadoNome: feriado.nome,
    };
  }

  if (allDayRegistros.length === 0) {
    // Dia não previsto sem registros: folga (não conta como falta)
    if (!previsto) {
      return {
        data,
        registros: allDayRegistros,
        horasTrabalhadasMin: 0,
        horasIntervaloMin: 0,
        horasExtrasMin: 0,
        horasNoturnasMin: 0,
        horasPrevistasMin: 0,
        saldoMin: 0,
        status: "FOLGA",
      };
    }
    return {
      data,
      registros: allDayRegistros,
      horasTrabalhadasMin: 0,
      horasIntervaloMin: 0,
      horasExtrasMin: 0,
      horasNoturnasMin: 0,
      horasPrevistasMin: jornada,
      saldoMin: -jornada,
      status: "FALTA",
    };
  }

  let workedMinutes = 0;
  let breakMinutes = 0;
  let nightMinutes = 0;
  let lastEntry: Date | null = null;
  let lastBreakStart: Date | null = null;
  // SAIDA anterior vira intervalo quando vier nova ENTRADA no mesmo dia.
  let lastExit: Date | null = null;
  let isInconsistent = false;

  for (const reg of approvedRegistros) {
    // Trunca segundos: usuário vê HH:MM, então diff deve usar minuto cheio
    const dt = new Date(reg.data_hora);
    dt.setSeconds(0, 0);
    switch (reg.tipo) {
      case "ENTRADA":
        if (lastExit) {
          breakMinutes += Math.round((dt.getTime() - lastExit.getTime()) / 60000);
          lastExit = null;
        }
        lastEntry = dt;
        break;
      case "SAIDA":
        if (lastEntry) {
          const diff = Math.round((dt.getTime() - lastEntry.getTime()) / 60000);
          workedMinutes += diff;
          nightMinutes += calcNightMinutes(lastEntry, dt, nightStartMin, nightEndMin);
          lastEntry = null;
          lastExit = dt;
        } else {
          isInconsistent = true;
        }
        break;
    }
  }


  // If still clocked in (no exit), mark inconsistent
  if (lastEntry) {
    isInconsistent = true;
  }

  // Night hours with reduced factor (52.5/60)
  const nightAdjusted = Math.round(nightMinutes * (52.5 / 60));
  // workedMinutes already excludes pauses (clock stops at SAIDA and restarts at ENTRADA),
  // so do NOT subtract breakMinutes again.
  const effectiveWorked = workedMinutes + (nightMinutes - nightAdjusted);

  // Em dias não previstos (folga, sáb/dom fora da escala, feriado sem trabalho), o trabalho realizado é todo extra
  const jornadaEfetiva = previsto ? jornada : 0;

  // Bônus configurável em sáb/dom/feriado fora da escala
  let bonusMin = 0;
  if (!previsto && effectiveWorked > 0 && config?.bonus_fora_escala_ativo) {
    const dow = new Date(data + "T12:00:00").getDay();
    const pct = feriado
      ? Number(config.bonus_feriado_pct ?? 0)
      : dow === 6
        ? Number(config.bonus_sabado_pct ?? 0)
        : dow === 0
          ? Number(config.bonus_domingo_pct ?? 0)
          : 0;
    bonusMin = Math.round((effectiveWorked * pct) / 100);
  }

  // Cálculo bruto de extras e saldo
  let extrasMin = jornadaEfetiva === 0
    ? effectiveWorked + bonusMin
    : Math.max(0, effectiveWorked - jornadaEfetiva);

  let saldo = jornadaEfetiva === 0
    ? effectiveWorked + bonusMin
    : effectiveWorked - jornadaEfetiva;

  // Tolerância (apenas em dias previstos): se a diferença está dentro da
  // margem configurada no horário do colaborador, zera saldo e extras.
  if (jornadaEfetiva > 0 && tolerancia > 0 && Math.abs(saldo) <= tolerancia) {
    saldo = 0;
    extrasMin = 0;
  }


  return {
    data,
    registros: allDayRegistros,
    horasTrabalhadasMin: workedMinutes,
    horasIntervaloMin: breakMinutes,
    horasExtrasMin: extrasMin,
    horasNoturnasMin: nightMinutes,
    horasPrevistasMin: jornadaEfetiva,
    saldoMin: saldo,
    status: feriado ? "FERIADO" : (isInconsistent ? "INCONSISTENTE" : "REGULAR"),
    feriadoNome: feriado?.nome,
  };
}

export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
