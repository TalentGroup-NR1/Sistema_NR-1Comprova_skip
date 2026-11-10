import { describe, it, expect } from "vitest";
import { validarMetadadosObrigatoriosPgr } from "../pgrImportacaoValidation";

describe("validarMetadadosObrigatoriosPgr", () => {
  it("deve bloquear a importação se o Responsável Técnico estiver em branco", () => {
    const result = validarMetadadosObrigatoriosPgr({
      responsavel_tecnico: "",
      registro_profissional: "CREA-123",
      data_elaboracao: "2024-01-01",
    });
    expect(result.valido).toBe(false);
    expect(result.erro).toContain("Informe o Responsável Técnico");
  });

  it("deve bloquear a importação se o Registro Profissional estiver em branco", () => {
    const result = validarMetadadosObrigatoriosPgr({
      responsavel_tecnico: "João Silva",
      registro_profissional: "  ",
      data_elaboracao: "2024-01-01",
    });
    expect(result.valido).toBe(false);
    expect(result.erro).toContain("Informe o Registro Profissional");
  });

  it("deve permitir a importação com Responsável Técnico e Registro preenchidos, mesmo sem Data de Elaboração", () => {
    const result = validarMetadadosObrigatoriosPgr({
      responsavel_tecnico: "João Silva",
      registro_profissional: "CREA-123",
      data_elaboracao: null,
      cargo_responsavel: "",
    });
    expect(result.valido).toBe(true);
    expect(result.erro).toBeUndefined();
  });

  it("deve permitir a importação com os campos essenciais e adicionais preenchidos", () => {
    const result = validarMetadadosObrigatoriosPgr({
      responsavel_tecnico: "Maria Souza",
      registro_profissional: "CREA-456",
      data_elaboracao: "2024-05-10",
      cargo_responsavel: "Engenheira de Segurança",
    });
    expect(result.valido).toBe(true);
    expect(result.erro).toBeUndefined();
  });
});
