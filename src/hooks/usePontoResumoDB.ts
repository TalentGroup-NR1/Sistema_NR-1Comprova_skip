import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResumoDiario } from "./usePontoResumo";

export interface DBResumoRow {
  data: string;
  horas_previstas_minutos: number;
  horas_trabalhadas_minutos: number;
  horas_noturnas_minutos: number;
  horas_extras_minutos: number;
  horas_intervalo_minutos: number;
  saldo_minutos: number;
  status: string;
}

export interface DBAbonoInfo {
  data: string;
  tipo_abono_nome: string | null;
}

export interface ResumoDBLookup {
  rows: Map<string, DBResumoRow>;
  abonos: Map<string, string>; // date -> tipo_abono nome
}

/**
 * Fetches the materialized daily summary from `ponto_resumo_diario`
 * and the active ABONOS for the date range.
 *
 * The trigger `trg_ponto_recalc_resumo` keeps this table in sync; we only need
 * to consult it for canonical totals + ABONADO status.
 */
export function usePontoResumoDB(
  colaboradorId: string | undefined,
  startDate: string,
  endDate: string,
) {
  return useQuery<ResumoDBLookup>({
    queryKey: ["ponto-resumo-db", colaboradorId, startDate, endDate],
    queryFn: async () => {
      const empty: ResumoDBLookup = { rows: new Map(), abonos: new Map() };
      if (!colaboradorId || !startDate || !endDate) return empty;

      const [resumoRes, abonoRes] = await Promise.all([
        supabase
          .from("ponto_resumo_diario")
          .select(
            "data, horas_previstas_minutos, horas_trabalhadas_minutos, horas_noturnas_minutos, horas_extras_minutos, horas_intervalo_minutos, saldo_minutos, status",
          )
          .eq("colaborador_id", colaboradorId)
          .gte("data", startDate)
          .lte("data", endDate),
        supabase
          .from("ponto_abonos")
          .select("data_inicio, data_fim, status, ponto_tipos_abono(nome)")
          .eq("colaborador_id", colaboradorId)
          .eq("status", "aprovado")
          .lte("data_inicio", endDate)
          .gte("data_fim", startDate),
      ]);

      if (resumoRes.error) throw resumoRes.error;
      if (abonoRes.error) throw abonoRes.error;

      const rows = new Map<string, DBResumoRow>();
      for (const r of resumoRes.data || []) {
        rows.set(r.data as string, r as unknown as DBResumoRow);
      }

      const abonos = new Map<string, string>();
      for (const a of (abonoRes.data || []) as any[]) {
        const nome = a.ponto_tipos_abono?.nome ?? "Abonado";
        const start = new Date(a.data_inicio + "T12:00:00");
        const end = new Date(a.data_fim + "T12:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          abonos.set(key, nome);
        }
      }

      return { rows, abonos };
    },
    enabled: !!colaboradorId && !!startDate && !!endDate,
    staleTime: 30_000,
  });
}

/**
 * Overlay DB canonical values on top of the client-side `calcularResumoDiario`
 * result. Keeps `registros[]` for display; replaces totals + status when the
 * DB row exists. Adds `tipoAbono` for ABONADO rendering.
 */
export function aplicarResumoDB(
  client: ResumoDiario,
  lookup: ResumoDBLookup | undefined,
): ResumoDiario {
  if (!lookup) return client;
  const row = lookup.rows.get(client.data);
  const abono = lookup.abonos.get(client.data);

  if (!row && !abono) return client;

  const merged: ResumoDiario = { ...client };
  if (row) {
    merged.horasPrevistasMin = row.horas_previstas_minutos ?? client.horasPrevistasMin;
    merged.horasTrabalhadasMin = row.horas_trabalhadas_minutos ?? client.horasTrabalhadasMin;
    merged.horasNoturnasMin = row.horas_noturnas_minutos ?? client.horasNoturnasMin;
    merged.horasExtrasMin = row.horas_extras_minutos ?? client.horasExtrasMin;
    merged.horasIntervaloMin = row.horas_intervalo_minutos ?? client.horasIntervaloMin;
    merged.saldoMin = row.saldo_minutos ?? client.saldoMin;
    const dbStatus = (row.status || "").toUpperCase();
    if (
      dbStatus === "ABONADO" ||
      dbStatus === "FERIAS" ||
      dbStatus === "FERIADO" ||
      dbStatus === "REGULAR" ||
      dbStatus === "INCONSISTENTE" ||
      dbStatus === "FOLGA"
    ) {
      merged.status = dbStatus as ResumoDiario["status"];
    } else if (dbStatus === "FALTA") {
      // Não sobrescrever FOLGA (dia fora da escala) com FALTA do BD legado
      if (client.status !== "FOLGA") merged.status = "FALTA";
    }
  }
  if (abono) {
    merged.status = "ABONADO";
    merged.tipoAbono = abono;
    // Abonado neutraliza saldo/falta
    merged.saldoMin = 0;
    merged.horasExtrasMin = 0;
  }
  return merged;
}
