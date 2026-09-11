import { describe, it, expect } from "vitest";
import { fallbackLocalAnalise } from "../../../supabase/functions/_shared/pgrFallback";

describe("pgrFallback", () => {
  it("deve preencher CNPJ, Empresa e Data quando houver match explícito", () => {
    const texto = `
      PROGRAMA DE GERENCIAMENTO DE RISCOS
      Razão Social: TalentGroup LTDA
      CNPJ: 12.345.678/0001-99
      Data de Elaboração: 10/09/2026
      Validade: 10/09/2028
    `;
    const resultado = fallbackLocalAnalise(texto, "timeout");

    expect(resultado.dados_empresa).toEqual({
      nome: "TalentGroup LTDA",
      cnpj: "12.345.678/0001-99",
      responsavel_tecnico: null,
      cargo_responsavel: null,
      data_elaboracao: "10/09/2026",
      validade: "10/09/2028",
    });
    expect(resultado.modo_extracao).toBe("fallback_local");
    expect(resultado.motivo_fallback).toBe("timeout");
  });

  it("deve manter nulo quando o texto está em branco (PDF imagem)", () => {
    const texto = "   \n  ";
    const resultado = fallbackLocalAnalise(texto, "parse_error");

    expect(resultado.dados_empresa).toEqual({
      nome: null,
      cnpj: null,
      responsavel_tecnico: null,
      cargo_responsavel: null,
      data_elaboracao: null,
      validade: null,
    });
    expect(resultado.linhas_extraidas).toBe(0);
  });

  it("deve capturar o primeiro CNPJ em caso de múltiplos (ex: filiais na mesma página)", () => {
    const texto = `
      CNPJ Matriz: 11.222.333/0001-44
      CNPJ Filial: 11.222.333/0002-55
    `;
    const resultado = fallbackLocalAnalise(texto, "timeout");
    expect((resultado.dados_empresa as any).cnpj).toBe("11.222.333/0001-44");
  });

  it("deve manter Empresa e Data nulos em caso de ambiguidade (conservadorismo)", () => {
    // Faltando o "LTDA/SA" ou fora do padrão Ancorado
    const texto = `
      O PGR da empresa TalentGroup foi
      elaborado dia 10 de setembro de 2026.
      CNPJ: 11.222.333/0001-44
    `;
    const resultado = fallbackLocalAnalise(texto, "timeout");
    
    expect((resultado.dados_empresa as any).nome).toBeNull();
    expect((resultado.dados_empresa as any).data_elaboracao).toBeNull();
    // O CNPJ que é inequivoco deve funcionar
    expect((resultado.dados_empresa as any).cnpj).toBe("11.222.333/0001-44");
  });
});
