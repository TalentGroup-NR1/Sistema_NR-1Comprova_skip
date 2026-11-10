// Gera a Folha de Ponto mensal (mesmo layout do Espelho de Ponto)
// para um colaborador, no mês indicado. Pode salvar localmente ou retornar Blob.
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { gerarFolhaPontoPDF } from "./folhaPontoPDF";
import { calcularResumoDiario } from "@/hooks/usePontoResumo";
import { aplicarResumoDB, type DBResumoRow, type ResumoDBLookup } from "@/hooks/usePontoResumoDB";
import type { Feriado } from "@/hooks/useFeriados";
import type { PontoRegistro } from "@/hooks/usePontoRegistros";

export interface GerarFolhaMensalParams {
  companyId: string;
  colaboradorId: string;
  ano: number;
  mes: number;
  output?: "save" | "blob";
  assinatura?: { nome: string; assinado_em: string; hash: string } | null;
  assinaturaEmpresa?: { nome: string; cargo?: string | null; assinado_em: string; hash: string } | null;
}

/** Deriva um hash SHA-256 estável para a "assinatura da empresa" do espelho.
 *  Combina espelho_id + user id do responsável + timestamp de fechamento. */
export async function computeAssinaturaEmpresaHash(
  espelho_id: string,
  fechado_por: string,
  fechado_em: string,
): Promise<string> {
  const payload = `${espelho_id}|${fechado_por}|${fechado_em}`;
  const buf = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Busca dados do responsável pelo fechamento e monta o bloco de assinatura da empresa.
 *  Retorna null quando o espelho ainda não foi fechado. Usa RPC SECURITY DEFINER
 *  para funcionar tanto para admin quanto para colaborador (que não enxerga profiles alheios). */
export async function buildAssinaturaEmpresa(
  espelho_id: string,
): Promise<{ nome: string; cargo?: string | null; assinado_em: string; hash: string } | null> {
  const { data: esp } = await supabase
    .from("espelhos_ponto_mensais")
    .select("id, fechado_por, fechado_em")
    .eq("id", espelho_id)
    .maybeSingle();
  if (!esp?.fechado_por || !esp?.fechado_em) return null;

  const { data: resp } = await supabase.rpc("get_espelho_responsavel" as any, {
    p_espelho_id: espelho_id,
  });
  const row = Array.isArray(resp) ? (resp[0] as any) : (resp as any);
  const nome = (row?.nome && String(row.nome).trim()) || "Responsável pelo fechamento";
  const cargo = (row?.cargo as string | null | undefined) ?? null;

  const hash = await computeAssinaturaEmpresaHash(
    espelho_id,
    esp.fechado_por as string,
    esp.fechado_em as string,
  );
  return {
    nome,
    cargo,
    assinado_em: esp.fechado_em as string,
    hash,
  };
}




export async function gerarFolhaMensalParaColaborador(
  p: GerarFolhaMensalParams,
): Promise<Blob | void> {
  const periodoInicio = `${p.ano}-${String(p.mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(p.ano, p.mes, 0).getDate();
  const periodoFim = `${p.ano}-${String(p.mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  // === fetches em paralelo ===
  const [
    empresaRes,
    colabRes,
    configRes,
    feriadosRes,
    feriasRes,
    compensRes,
    registrosRes,
    resumoRes,
    abonoRes,
  ] = await Promise.all([
    supabase.from("companies").select("name, cnpj, logo_url").eq("id", p.companyId).maybeSingle(),
    supabase
      .from("colaboradores")
      .select(
        "id, full_name, department, job_title, jornada_diaria_minutos, matricula, cpf, admission_date, work_schedule_id, ctps_numero, ctps_serie, pis",
      )
      .eq("id", p.colaboradorId)
      .maybeSingle(),
    supabase
      .from("ponto_configuracoes")
      .select("*")
      .eq("company_id", p.companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("feriados" as any).select("*"),
    supabase
      .from("ferias_gozo")
      .select("data_inicio_gozo, data_fim_gozo, status")
      .eq("colaborador_id", p.colaboradorId)
      .in("status", ["planejado", "aprovado", "gozado"])
      .lte("data_inicio_gozo", periodoFim)
      .gte("data_fim_gozo", periodoInicio),
    supabase
      .from("ponto_compensacoes" as any)
      .select("*")
      .eq("company_id", p.companyId),
    supabase
      .from("ponto_registros")
      .select("*")
      .eq("colaborador_id", p.colaboradorId)
      .gte("data_hora", `${periodoInicio}T00:00:00`)
      .lte("data_hora", `${periodoFim}T23:59:59`)
      .order("data_hora", { ascending: true }),
    supabase
      .from("ponto_resumo_diario")
      .select(
        "data, horas_previstas_minutos, horas_trabalhadas_minutos, horas_noturnas_minutos, horas_extras_minutos, horas_intervalo_minutos, saldo_minutos, status",
      )
      .eq("colaborador_id", p.colaboradorId)
      .gte("data", periodoInicio)
      .lte("data", periodoFim),
    supabase
      .from("ponto_abonos")
      .select("data_inicio, data_fim, status, ponto_tipos_abono(nome)")
      .eq("colaborador_id", p.colaboradorId)
      .eq("status", "aprovado")
      .lte("data_inicio", periodoFim)
      .gte("data_fim", periodoInicio),
  ]);

  const colab: any = colabRes.data;
  if (!colab) throw new Error("Colaborador não encontrado");
  const empresa = empresaRes.data;
  if (!empresa) throw new Error("Empresa não encontrada");

  // work schedule
  let workSchedule: any = null;
  if (colab.work_schedule_id) {
    const { data: ws } = await supabase
      .from("work_schedules")
      .select("dias_semana, trabalha_feriados, tolerancia_minutos")
      .eq("id", colab.work_schedule_id)
      .maybeSingle();
    workSchedule = ws ?? null;
  }

  // feriadosMap (expande recorrentes)
  const feriadosMap = new Map<string, { nome: string }>();
  for (const f of (feriadosRes.data || []) as unknown as Feriado[]) {
    if (f.recorrente) {
      const md = f.data.substring(5);
      for (const y of [p.ano - 1, p.ano, p.ano + 1]) feriadosMap.set(`${y}-${md}`, f);
    } else {
      feriadosMap.set(f.data, f);
    }
  }

  // ferias dates
  const feriasDates = new Set<string>();
  for (const f of feriasRes.data || []) {
    const days = eachDayOfInterval({
      start: parseISO(f.data_inicio_gozo as string),
      end: parseISO(f.data_fim_gozo as string),
    });
    for (const d of days) feriasDates.add(format(d, "yyyy-MM-dd"));
  }

  // lookup do ponto_resumo_diario + abonos
  const rows = new Map<string, DBResumoRow>();
  for (const r of (resumoRes.data || []) as unknown as DBResumoRow[]) rows.set(r.data, r);
  const abonos = new Map<string, string>();
  for (const a of (abonoRes.data || []) as any[]) {
    const nome = a.ponto_tipos_abono?.nome ?? "Abonado";
    const start = new Date(a.data_inicio + "T12:00:00");
    const end = new Date(a.data_fim + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      abonos.set(d.toISOString().slice(0, 10), nome);
    }
  }
  const lookup: ResumoDBLookup = { rows, abonos };

  // dias do mês
  const days = eachDayOfInterval({
    start: new Date(periodoInicio + "T12:00:00"),
    end: new Date(periodoFim + "T12:00:00"),
  });

  const resumos = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const client = calcularResumoDiario(
      (registrosRes.data || []) as PontoRegistro[],
      (configRes.data as any) ?? null,
      dayStr,
      colab.jornada_diaria_minutos,
      (compensRes.data || []) as any,
      feriadosMap,
      feriasDates,
      workSchedule,
      colab.admission_date,
    );
    return aplicarResumoDB(client, lookup);
  });

  return await gerarFolhaPontoPDF({
    empresa: {
      razao_social: (empresa as any).name,
      cnpj: (empresa as any).cnpj,
      endereco: null,
      logo_url: (empresa as any).logo_url,
    },
    colaborador: {
      full_name: colab.full_name,
      matricula: colab.matricula,
      admission_date: colab.admission_date,
      department: colab.department,
      job_title: colab.job_title,
      cpf: colab.cpf,
      ctps: colab.ctps_numero,
      ctps_serie: colab.ctps_serie,
      pis: colab.pis,
    },
    periodoInicio,
    periodoFim,
    resumos,
    output: p.output ?? "save",
    assinatura: p.assinatura ?? null,
    assinaturaEmpresa: p.assinaturaEmpresa ?? null,
  });
}
