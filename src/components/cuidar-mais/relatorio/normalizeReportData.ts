import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  EmployeeReportData,
  ReportColaborador,
  ReportFiltro,
  ReportPulso,
  ReportAcompanhamento,
} from "./types";

/**
 * Normaliza defensivamente o retorno da RPC get_employee_report_data.
 * O payload pode vir como objeto único, array [data] ou encapsulado em chave do client.
 */
export function normalizeReportPayload(raw: any): EmployeeReportData | null {
  if (!raw) return null;

  let target = raw;

  // Se o client retornou como array: data[0]
  if (Array.isArray(target)) {
    if (target.length === 0) return null;
    target = target[0];
  }

  // Se veio encapsulado pelo nome da RPC
  if (target && typeof target === "object" && "get_employee_report_data" in target) {
    target = target.get_employee_report_data;
  }

  // Se veio como string JSON
  if (typeof target === "string") {
    try {
      target = JSON.parse(target);
    } catch {
      return null;
    }
  }

  if (!target || typeof target !== "object") {
    return null;
  }

  const colaborador: ReportColaborador | null = target.colaborador
    ? {
        id: String(target.colaborador.id || ""),
        full_name: String(target.colaborador.full_name || "Colaborador sem nome"),
        cpf: target.colaborador.cpf ? String(target.colaborador.cpf) : null,
        cargo: target.colaborador.cargo ? String(target.colaborador.cargo) : null,
        departamento: target.colaborador.departamento ? String(target.colaborador.departamento) : null,
        admissao: target.colaborador.admissao ? String(target.colaborador.admissao) : null,
        status: target.colaborador.status ? String(target.colaborador.status) : null,
      }
    : null;

  const filtro_aplicado: ReportFiltro = {
    data_inicio: target.filtro_aplicado?.data_inicio ? String(target.filtro_aplicado.data_inicio) : null,
    data_fim: target.filtro_aplicado?.data_fim ? String(target.filtro_aplicado.data_fim) : null,
  };

  const pulsos: ReportPulso[] = Array.isArray(target.pulsos)
    ? target.pulsos.map((p: any) => ({
        id: String(p.id || ""),
        origem: String(p.origem || "campanha"),
        campanha: p.campanha ? String(p.campanha) : null,
        data_hora: String(p.data_hora || ""),
        pergunta: p.pergunta ? String(p.pergunta) : null,
        resposta: p.resposta ? String(p.resposta) : null,
        score_numeric: p.score_numeric !== null && p.score_numeric !== undefined && !isNaN(Number(p.score_numeric))
          ? Number(p.score_numeric)
          : null,
        esfera: p.esfera ? String(p.esfera) : null,
        comentario: p.comentario ? String(p.comentario) : null,
      }))
    : [];

  const acompanhamentos: ReportAcompanhamento[] = Array.isArray(target.acompanhamentos)
    ? target.acompanhamentos.map((a: any) => ({
        id: String(a.id || ""),
        status: String(a.status || "novo"),
        objetivo: a.objetivo ? String(a.objetivo) : null,
        acoes: Array.isArray(a.acoes) ? a.acoes : [],
        anotacoes: a.anotacoes ? String(a.anotacoes) : null,
        resultado: a.resultado ? String(a.resultado) : null,
        responsavel_nome: a.responsavel_nome ? String(a.responsavel_nome) : "RH",
        criado_em: String(a.criado_em || ""),
        atualizado_em: a.atualizado_em ? String(a.atualizado_em) : null,
        concluido_em: a.concluido_em ? String(a.concluido_em) : null,
        proximo_contato_em: a.proximo_contato_em ? String(a.proximo_contato_em) : null,
        updated_by_nome: a.updated_by_nome ? String(a.updated_by_nome) : null,
      }))
    : [];

  const regras_aplicadas = typeof target.regras_aplicadas === "string" ? target.regras_aplicadas : "";

  return {
    colaborador,
    filtro_aplicado,
    pulsos,
    acompanhamentos,
    regras_aplicadas,
  };
}

/**
 * Formata data e hora em padrão pt-BR (dd/MM/yyyy HH:mm)
 */
export function formatReportDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

/**
 * Formata apenas data em padrão pt-BR (dd/MM/yyyy)
 */
export function formatReportDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    // Trata strings que começam com YYYY-MM-DD para evitar recuo de fuso horário
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return "—";
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    }
    const d = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

/**
 * Retorna classes semânticas puras para o status funcional do colaborador.
 * ATIVO: verde | AFASTADO: amarelo | DESLIGADO: vermelho (regra de ouro: não sobrescrever com cor de marca).
 */
export function getStatusBadgeConfig(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "ativo":
      return {
        label: "Ativo",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "afastado":
      return {
        label: "Afastado",
        className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      };
    case "desligado":
      return {
        label: "Desligado",
        className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
      };
    default:
      return {
        label: status || "Não informado",
        className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700",
      };
  }
}

/**
 * Retorna classes semânticas para o status do acompanhamento institucional
 */
export function getAcompanhamentoBadgeConfig(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "novo":
      return {
        label: "Novo",
        className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      };
    case "em_andamento":
      return {
        label: "Em Andamento",
        className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      };
    case "aguardando_retorno":
      return {
        label: "Aguardando",
        className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
      };
    case "concluido":
      return {
        label: "Concluído",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "arquivado":
      return {
        label: "Arquivado",
        className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700",
      };
    default:
      return {
        label: status || "Indefinido",
        className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700",
      };
  }
}
