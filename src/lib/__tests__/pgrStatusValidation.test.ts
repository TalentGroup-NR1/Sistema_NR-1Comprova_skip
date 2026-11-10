import { describe, it, expect } from "vitest";
import { validarMudancaStatus, PgrPlanoAcao } from "../../hooks/usePgrAcoes";

describe("validarMudancaStatus", () => {
  it("deve permitir a mudança sempre, pois estamos no Modo Warning", () => {
    const acaoIncompleta: Partial<PgrPlanoAcao> = {};
    const result = validarMudancaStatus(acaoIncompleta, "concluida");
    expect(result.permitido).toBe(true);
  });

  it("deve sinalizar mostrarAviso=true para status final com 5W2H incompleto", () => {
    const acaoIncompleta: Partial<PgrPlanoAcao> = {
      por_que: "",
      custo_estimado: 0
    };
    
    // Status finais
    expect(validarMudancaStatus(acaoIncompleta, "concluida").mostrarAviso).toBe(true);
    expect(validarMudancaStatus(acaoIncompleta, "validada").mostrarAviso).toBe(true);
  });

  it("deve sinalizar mostrarAviso=false para status final com 5W2H completo", () => {
    const acaoCompleta: Partial<PgrPlanoAcao> = {
      por_que: "Motivo",
      onde: "Local",
      como: "Metodo",
      prazo: "2026-10-10",
      responsavel_id: "user",
      custo_estimado: 10
    };
    
    expect(validarMudancaStatus(acaoCompleta, "concluida").mostrarAviso).toBe(false);
    expect(validarMudancaStatus(acaoCompleta, "validada").mostrarAviso).toBe(false);
  });

  it("deve sinalizar mostrarAviso=false e permitido=true para status não-final", () => {
    const acaoIncompleta: Partial<PgrPlanoAcao> = {}; // Incompleta
    
    // Status não-finais
    const resultPendente = validarMudancaStatus(acaoIncompleta, "pendente");
    expect(resultPendente.permitido).toBe(true);
    expect(resultPendente.mostrarAviso).toBe(false);

    const resultEmAndamento = validarMudancaStatus(acaoIncompleta, "em_andamento");
    expect(resultEmAndamento.permitido).toBe(true);
    expect(resultEmAndamento.mostrarAviso).toBe(false);
  });
});
