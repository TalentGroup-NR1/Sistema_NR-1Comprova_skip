import { describe, it, expect } from "vitest";
import { calcularResumoDiario } from "../../hooks/usePontoResumo";
import type { PontoRegistro } from "../../hooks/usePontoRegistros";
import type { PontoConfig } from "../../hooks/usePontoConfig";

// Cria timestamp local no formato YYYY-MM-DDTHH:mm:00 para garantir que
// getHours()/getMinutes() retornem os valores esperados em qualquer fuso.
const br = (date: string, hhmm: string) => `${date}T${hhmm}:00`;

const mkReg = (
  id: string,
  tipo: PontoRegistro["tipo"],
  iso: string,
  extra: Partial<PontoRegistro> = {},
): PontoRegistro => ({
  id,
  colaborador_id: "c1",
  company_id: "co1",
  tipo,
  data_hora: iso,
  observacao: null,
  latitude: null,
  longitude: null,
  ajuste_manual: false,
  ajuste_motivo: null,
  ajustado_por: null,
  status_aprovacao: "aprovado",
  aprovado_por: null,
  aprovado_em: null,
  justificativa: null,
  created_at: iso,
  ...extra,
});

const config: PontoConfig = {
  // apenas os campos lidos por calcularResumoDiario:
  jornada_diaria_minutos: 480,
  tolerancia_minutos: 0,
  inicio_noturno: "22:00",
  fim_noturno: "05:00",
} as unknown as PontoConfig;

describe("midnight split (divisão automática na meia-noite)", () => {
  it("cenário 20:30 dia 15 → 03:30 dia 16 com pares auto 23:59/00:00", () => {
    const registros: PontoRegistro[] = [
      mkReg("r1", "ENTRADA", br("2025-05-15", "20:30")),
      mkReg("r2", "SAIDA", br("2025-05-15", "23:59"), { is_auto: true, auto_reason: "midnight-split" } as any),
      mkReg("r3", "ENTRADA", br("2025-05-16", "00:00"), { is_auto: true, auto_reason: "midnight-split" } as any),
      mkReg("r4", "SAIDA", br("2025-05-16", "03:30")),
    ];

    const dia15 = calcularResumoDiario(registros, config, "2025-05-15");
    const dia16 = calcularResumoDiario(registros, config, "2025-05-16");

    // Dia 15: 20:30 → 23:59 = 209 min
    expect(dia15.horasTrabalhadasMin).toBe(209);
    // Noturno real do dia 15 (22:00 → 23:59) = 119 min
    expect(dia15.horasNoturnasMin).toBe(119);

    // Dia 16: 00:00 → 03:30 = 210 min, todos noturnos
    expect(dia16.horasTrabalhadasMin).toBe(210);
    expect(dia16.horasNoturnasMin).toBe(210);

    // Total noturno real = 329 min; pago ≈ 329 * (60/52.5) ≈ 376 min
    const noturnoTotalReal = dia15.horasNoturnasMin + dia16.horasNoturnasMin;
    expect(noturnoTotalReal).toBe(329);
    const noturnoPago = Math.round(noturnoTotalReal * (60 / 52.5));
    expect(noturnoPago).toBeGreaterThanOrEqual(375);
    expect(noturnoPago).toBeLessThanOrEqual(377);
  });

  it("dia regular sem cruzamento de meia-noite não é afetado", () => {
    const registros: PontoRegistro[] = [
      mkReg("r1", "ENTRADA", br("2025-05-15", "08:00")),
      mkReg("r2", "SAIDA", br("2025-05-15", "17:00")),
    ];
    const r = calcularResumoDiario(registros, config, "2025-05-15");
    expect(r.horasTrabalhadasMin).toBe(540);
    expect(r.horasNoturnasMin).toBe(0);
  });
});
