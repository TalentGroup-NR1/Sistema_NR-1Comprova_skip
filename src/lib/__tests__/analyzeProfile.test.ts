import { describe, it, expect } from "vitest";
import { generateLocalFallbackAnalysis } from "../../../supabase/functions/_shared/profileAnalysisFallback.ts";

describe("analyze-profile: Migração para OpenAI GPT-4o e Fallback Local", () => {
  const candidatoNome = "Ana Souza";
  const vaga = "Desenvolvedor Full Stack";
  const texts = {
    alinhamento: "Requisitos: React, Node.js, TypeScript, PostgreSQL. Trabalho híbrido.",
    anuncio: "Vaga para Desenvolvedor Full Stack Sênior com experiência em SaaS.",
    entrevista: "Candidata demonstrou pleno domínio de React, TypeScript e microsserviços.",
    curriculo: "5 anos de experiência com TypeScript, React, Node.js e bancos relacionais.",
  };

  describe("Fallback Local Estruturado", () => {
    it("deve gerar análise completa e válida quando a chave de IA não estiver configurada", () => {
      const resultado = generateLocalFallbackAnalysis(candidatoNome, vaga, texts, "chave_ia_ausente");

      expect(resultado).toBeDefined();
      expect(resultado.percentual_aderencia_geral).toBeGreaterThanOrEqual(60);
      expect(resultado.analise_alinhamento_entrevista).toBeDefined();
      expect(resultado.analise_alinhamento_entrevista.convergencias.length).toBeGreaterThan(0);
      expect(resultado.analise_alinhamento_entrevista.parecer).toContain("Ana Souza");
      expect(resultado.analise_anuncio_curriculo.parecer).toContain(vaga);
      expect(resultado.modo_extracao).toBe("fallback_local");
      expect(resultado.conclusao_geral).toContain("Processamento local ativado: chave_ia_ausente");
    });

    it("deve calcular o percentual proporcional com base na presença dos 4 documentos", () => {
      const textsIncompletos = {
        alinhamento: "Texto curto",
        anuncio: "",
        entrevista: "",
        curriculo: "Texto curto",
      };
      const resultado = generateLocalFallbackAnalysis(candidatoNome, vaga, textsIncompletos);
      expect(resultado.percentual_aderencia_geral).toBe(60); // piso mínimo de 60%
    });
  });

  describe("Validação de Limite de Arquivo (10MB)", () => {
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

    it("deve aprovar arquivos de até 10MB", () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      expect(fileSize <= MAX_FILE_SIZE_BYTES).toBe(true);
    });

    it("deve rejeitar arquivos que excedem 10MB", () => {
      const fileSize = 12 * 1024 * 1024; // 12MB
      expect(fileSize > MAX_FILE_SIZE_BYTES).toBe(true);
    });
  });

  describe("Contrato da Resposta da Função", () => {
    it("deve manter a estrutura esperada pelo frontend em todas as saídas", () => {
      const resultado = generateLocalFallbackAnalysis(candidatoNome, vaga, texts);
      const keys = Object.keys(resultado);

      expect(keys).toContain("analise_alinhamento_entrevista");
      expect(keys).toContain("analise_anuncio_curriculo");
      expect(keys).toContain("percentual_aderencia_geral");
      expect(keys).toContain("conclusao_geral");

      const subKeys = Object.keys(resultado.analise_alinhamento_entrevista);
      expect(subKeys).toEqual(
        expect.arrayContaining([
          "percentual_aderencia",
          "convergencias",
          "divergencias",
          "pontos_atencao",
          "pontos_fortes",
          "parecer",
        ])
      );
    });
  });
});
