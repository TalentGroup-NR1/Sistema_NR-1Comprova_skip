import { startOfToday, addDays, isBefore, isAfter, startOfDay } from "date-fns";

export type FarolStatus = "vermelho" | "amarelo" | "verde" | "cinza";

export interface DashboardScore {
  pct: number;
  cor: FarolStatus;
}

/**
 * Calcula a taxa de conclusão das ações e retorna um objeto com percentual e cor do score.
 */
export function calcScore(acoes: any[] | undefined): DashboardScore {
  if (!acoes || acoes.length === 0) return { pct: 0, cor: "cinza" };

  const total = acoes.length;
  const concluidasOuValidadas = acoes.filter(
    (a) => a.status === "concluida" || a.status === "validada"
  ).length;

  const pct = Math.round((concluidasOuValidadas / total) * 100);

  let cor: FarolStatus = "verde";
  if (pct < 50) cor = "vermelho";
  else if (pct < 80) cor = "amarelo";

  return { pct, cor };
}

/**
 * Retorna o status temporal de um prazo: "vencido", "vencendo", "no_prazo" ou "invalido".
 */
export function getPrazoStatus(prazoString: string | null | undefined): "vencido" | "vencendo" | "no_prazo" | "invalido" {
  if (!prazoString) return "invalido";
  
  let d: Date;
  if (prazoString.includes('T')) {
    d = new Date(prazoString);
  } else {
    const parts = prazoString.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      if (year < 1000) return "invalido";
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      d = new Date(year, month - 1, day);
      d.setFullYear(year); // Previne o comportamento do JS de somar 1900 para anos < 100
    } else {
      d = new Date(prazoString);
    }
  }

  if (isNaN(d.getTime()) || d.getFullYear() < 1000) {
    return "invalido";
  }

  const prazo = startOfDay(d);
  const hoje = startOfDay(new Date());
  const em7Dias = addDays(hoje, 7);

  if (isBefore(prazo, hoje)) {
    return "vencido";
  } else if (!isAfter(prazo, em7Dias)) { // hoje <= prazo <= em7Dias
    return "vencendo";
  }

  return "no_prazo";
}

/**
 * Calcula o farol geral de uma lista de ações filtradas por uma prioridade específica.
 * VERMELHO = existe ação pendente/em_andamento com prazo vencido;
 * AMARELO = existe ação pendente/em_andamento com prazo vencendo em até 7 dias;
 * CINZA = existe ação pendente/em_andamento sem prazo definido (neutro).
 * VERDE = nenhuma ação pendente/em_andamento possui prazo crítico ou indefinido. (ou seja, todas no prazo, ou todas concluídas)
 */
export function calcFarol(acoesDaPrioridade: any[] | undefined): FarolStatus {
  if (!acoesDaPrioridade || acoesDaPrioridade.length === 0) return "verde";

  const abertas = acoesDaPrioridade.filter(
    (a) => a.status === "pendente" || a.status === "em_andamento"
  );

  if (abertas.length === 0) return "verde";

  let hasVencendo = false;
  let hasInvalido = false;

  for (const acao of abertas) {
    const statusPrazo = getPrazoStatus(acao.prazo);
    if (statusPrazo === "vencido") {
      return "vermelho"; // Vencido ganha de todos, early return
    }
    if (statusPrazo === "vencendo") {
      hasVencendo = true;
    } else if (statusPrazo === "invalido") {
      hasInvalido = true;
    }
  }

  if (hasVencendo) return "amarelo";
  if (hasInvalido) return "cinza";

  return "verde";
}

/**
 * Extrai as listas de ações críticas (vencidas e vencendo).
 */
export function getAcoesCriticas(acoes: any[] | undefined) {
  if (!acoes) return { vencidas: [], vencendo: [] };

  const abertas = acoes.filter(
    (a) => a.status === "pendente" || a.status === "em_andamento"
  );

  const vencidas = abertas.filter((a) => getPrazoStatus(a.prazo) === "vencido");
  const vencendo = abertas.filter((a) => getPrazoStatus(a.prazo) === "vencendo");

  return { vencidas, vencendo };
}
