/**
 * Onda 7.2 — Lógica pura de streak Cuidar+
 * Espelha o comportamento da função SQL atualizar_streak_cuidar para testes offline.
 */

export interface ProgressaoEstado {
  streak_semanal: number;
  best_streak: number;
  ultima_semana_respondida: number | null;
  ultimo_ano_respondido: number | null;
}

/** Retorna o ISO week number (1..53) e ano ISO de uma data. */
export function isoWeekYear(date: Date): { semana: number; ano: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { semana, ano: d.getUTCFullYear() };
}

/** Última semana ISO de um determinado ano (52 ou 53). Usa 28/12 que sempre cai na última semana. */
export function ultimaSemanaIsoDoAno(ano: number): number {
  return isoWeekYear(new Date(Date.UTC(ano, 11, 28))).semana;
}

/**
 * Calcula o novo estado de progressão dado o estado anterior e uma resposta na semana informada.
 * Espelha exatamente a SQL `atualizar_streak_cuidar`.
 */
export function aplicarResposta(
  estado: ProgressaoEstado | null,
  semanaAtual: number,
  anoAtual: number,
): ProgressaoEstado {
  if (!estado || estado.ultima_semana_respondida === null || estado.ultimo_ano_respondido === null) {
    return {
      streak_semanal: 1,
      best_streak: Math.max(1, estado?.best_streak ?? 0),
      ultima_semana_respondida: semanaAtual,
      ultimo_ano_respondido: anoAtual,
    };
  }

  // Mesma semana ISO: noop
  if (estado.ultima_semana_respondida === semanaAtual && estado.ultimo_ano_respondido === anoAtual) {
    return estado;
  }

  let consecutiva = false;
  if (estado.ultimo_ano_respondido === anoAtual && estado.ultima_semana_respondida === semanaAtual - 1) {
    consecutiva = true;
  } else if (semanaAtual === 1 && estado.ultimo_ano_respondido === anoAtual - 1) {
    const ultima = ultimaSemanaIsoDoAno(anoAtual - 1);
    if (estado.ultima_semana_respondida === ultima) {
      consecutiva = true;
    }
  }

  const novoStreak = consecutiva ? estado.streak_semanal + 1 : 1;
  return {
    streak_semanal: novoStreak,
    best_streak: Math.max(estado.best_streak, novoStreak),
    ultima_semana_respondida: semanaAtual,
    ultimo_ano_respondido: anoAtual,
  };
}

/** Badges desbloqueados pelo streak atual. */
export function badgesDoStreak(streak: number): string[] {
  const out: string[] = [];
  if (streak >= 4) out.push("4 semanas de cuidado consistente");
  if (streak >= 12) out.push("Ciclo de bem-estar concluído");
  return out;
}
