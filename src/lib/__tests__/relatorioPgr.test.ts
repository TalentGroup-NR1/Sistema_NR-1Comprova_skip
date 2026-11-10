import { describe, it, expect } from "vitest";
import { aggregatePgrData, AcaoComExecucoes, validarPreRequisitosRelatorio } from "../relatorioPgrAggregators";

describe("relatorioPgrAggregators", () => {
  describe("validarPreRequisitosRelatorio", () => {
    it("deve retornar erro sem companyId", () => {
      const err = validarPreRequisitosRelatorio({ companyId: null, pgrImportacaoId: "123", acoes: [{ id: "1" }] });
      expect(err).toBe("Selecione um PGR válido");
    });

    it("deve retornar erro sem pgrImportacaoId", () => {
      const err = validarPreRequisitosRelatorio({ companyId: "123", pgrImportacaoId: null, acoes: [{ id: "1" }] });
      expect(err).toBe("PGR não encontrado");
    });

    it("deve retornar erro sem ações ou lista vazia", () => {
      const err1 = validarPreRequisitosRelatorio({ companyId: "123", pgrImportacaoId: "123", acoes: [] });
      expect(err1).toBe("Nenhuma ação para gerar relatório");

      const err2 = validarPreRequisitosRelatorio({ companyId: "123", pgrImportacaoId: "123", acoes: null as any });
      expect(err2).toBe("Nenhuma ação para gerar relatório");
    });

    it("deve retornar null se todos os requisitos forem atendidos", () => {
      const err = validarPreRequisitosRelatorio({ companyId: "123", pgrImportacaoId: "123", acoes: [{ id: "1" }] });
      expect(err).toBeNull();
    });
  });
  it("deve agregar dados vazios corretamente", () => {
    const res = aggregatePgrData([]);
    expect(res.totalAcoes).toBe(0);
    expect(res.percentualExecucao).toBe(0);
    expect(res.custoEstimadoTotal).toBe(0);
    expect(res.custoRealTotal).toBe(0);
  });

  it("deve somar totais e percentuais corretamente", () => {
    const acoes: Partial<AcaoComExecucoes>[] = [
      { status: "pendente", custo_estimado: 100, custo_real: 0 },
      { status: "em_andamento", custo_estimado: 200, custo_real: 50 },
      { status: "concluida", custo_estimado: 150, custo_real: 150 },
      { status: "validada", custo_estimado: 0, custo_real: 0 },
    ];

    const res = aggregatePgrData(acoes as AcaoComExecucoes[]);
    expect(res.totalAcoes).toBe(4);
    expect(res.pendentes).toBe(1);
    expect(res.emAndamento).toBe(1);
    expect(res.concluidas).toBe(1);
    expect(res.validadas).toBe(1);
    expect(res.percentualExecucao).toBe(50); // 2 de 4
    expect(res.custoEstimadoTotal).toBe(450);
    expect(res.custoRealTotal).toBe(200);
  });

  it("deve lidar com campos de custo ausentes ou nulos", () => {
    const acoes: Partial<AcaoComExecucoes>[] = [
      { status: "pendente", custo_estimado: null as any, custo_real: undefined as any },
      { status: "concluida" }
    ];
    const res = aggregatePgrData(acoes as AcaoComExecucoes[]);
    expect(res.totalAcoes).toBe(2);
    expect(res.custoEstimadoTotal).toBe(0);
    expect(res.custoRealTotal).toBe(0);
    expect(res.percentualExecucao).toBe(50);
  });
});
