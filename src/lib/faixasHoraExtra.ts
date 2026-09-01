export type FaixaHoraExtra = { ate_horas: number | null; percentual: number };
export type GrupoFaixaHE = "dia_util" | "sabado" | "domingo_feriado";
export type FaixasHoraExtra = Record<GrupoFaixaHE, FaixaHoraExtra[]>;

export const GRUPOS: { key: GrupoFaixaHE; label: string; defaultPct: number }[] = [
  { key: "dia_util", label: "Dia Útil", defaultPct: 50 },
  { key: "sabado", label: "Sábado", defaultPct: 50 },
  { key: "domingo_feriado", label: "Domingo / Feriado", defaultPct: 100 },
];

export const MAX_FAIXAS = 5;

export function defaultFaixas(diaUtilPct = 50, domingoPct = 100): FaixasHoraExtra {
  return {
    dia_util: [{ ate_horas: null, percentual: diaUtilPct }],
    sabado: [{ ate_horas: null, percentual: diaUtilPct }],
    domingo_feriado: [{ ate_horas: null, percentual: domingoPct }],
  };
}

export function normalizeFaixas(raw: unknown, fallback: FaixasHoraExtra): FaixasHoraExtra {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Partial<Record<GrupoFaixaHE, unknown>>;
  const pickGroup = (k: GrupoFaixaHE): FaixaHoraExtra[] => {
    const arr = r[k];
    if (!Array.isArray(arr) || arr.length === 0) return fallback[k];
    return arr.map((f: any) => ({
      ate_horas: f?.ate_horas == null ? null : Number(f.ate_horas),
      percentual: Number(f?.percentual ?? 0),
    }));
  };
  return {
    dia_util: pickGroup("dia_util"),
    sabado: pickGroup("sabado"),
    domingo_feriado: pickGroup("domingo_feriado"),
  };
}

export function validateFaixas(f: FaixasHoraExtra): { ok: true } | { ok: false; error: string } {
  for (const { key, label } of GRUPOS) {
    const arr = f[key];
    if (!arr || arr.length === 0) return { ok: false, error: `${label}: adicione ao menos 1 faixa` };
    if (arr.length > MAX_FAIXAS) return { ok: false, error: `${label}: máximo ${MAX_FAIXAS} faixas` };
    let prev: number | null = null;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!Number.isFinite(item.percentual) || item.percentual < 0 || item.percentual > 500) {
        return { ok: false, error: `${label} faixa ${i + 1}: percentual deve estar entre 0 e 500` };
      }
      const isLast = i === arr.length - 1;
      if (isLast) {
        if (item.ate_horas !== null) return { ok: false, error: `${label}: a última faixa deve ser "sem teto"` };
      } else {
        if (item.ate_horas === null || !(item.ate_horas > 0)) {
          return { ok: false, error: `${label} faixa ${i + 1}: informe "até X horas"` };
        }
        if (prev !== null && item.ate_horas <= prev) {
          return { ok: false, error: `${label}: faixas devem ser crescentes` };
        }
        prev = item.ate_horas;
      }
    }
  }
  return { ok: true };
}

export function faixasEqual(a: FaixasHoraExtra, b: FaixasHoraExtra): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
