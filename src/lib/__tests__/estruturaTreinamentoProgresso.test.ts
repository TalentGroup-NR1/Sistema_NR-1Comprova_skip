import { describe, it, expect } from 'vitest';

/**
 * Testes Unitários de Regra de Negócio: Cálculo de Progresso e Certificação
 * Etapa 9.1 — Função get_progresso_treinamento (Regra de Ouro)
 */

interface ProgressoCalculado {
  totalAulas: number;
  aulasConcluidas: number;
  percentual: number;
  quizObrigatorio: boolean;
  quizAprovado: boolean;
  podeCertificar: boolean;
}

function calcularProgresso(
  aulas: Array<{ obrigatoria: boolean; concluida: boolean }>,
  quizObrigatorio: boolean,
  quizAprovado: boolean
): ProgressoCalculado {
  const aulasObrigatorias = aulas.filter((a) => a.obrigatoria);
  const totalAulas = aulasObrigatorias.length;
  const aulasConcluidas = aulasObrigatorias.filter((a) => a.concluida).length;

  const percentual = totalAulas === 0 ? 0 : Number(((100 * aulasConcluidas) / totalAulas).toFixed(2));
  const podeCertificar =
    totalAulas > 0 &&
    aulasConcluidas === totalAulas &&
    (!quizObrigatorio || quizAprovado);

  return {
    totalAulas,
    aulasConcluidas,
    percentual,
    quizObrigatorio,
    quizAprovado,
    podeCertificar,
  };
}

describe('ETAPA 9.1 — Regra de Ouro: Cálculo de Progresso e Certificação', () => {
  it('a) 0 aulas -> total=0, percentual=0, pode_certificar=false (treinamento sem aulas nunca certifica)', () => {
    const res = calcularProgresso([], false, false);
    expect(res.totalAulas).toBe(0);
    expect(res.aulasConcluidas).toBe(0);
    expect(res.percentual).toBe(0);
    expect(res.podeCertificar).toBe(false);
  });

  it('b) 1 de 2 concluídas -> percentual=50, pode_certificar=false', () => {
    const res = calcularProgresso(
      [
        { obrigatoria: true, concluida: true },
        { obrigatoria: true, concluida: false },
      ],
      false,
      false
    );
    expect(res.totalAulas).toBe(2);
    expect(res.aulasConcluidas).toBe(1);
    expect(res.percentual).toBe(50);
    expect(res.podeCertificar).toBe(false);
  });

  it('c) 2 de 2 concluídas, quiz não obrigatório -> pode_certificar=true', () => {
    const res = calcularProgresso(
      [
        { obrigatoria: true, concluida: true },
        { obrigatoria: true, concluida: true },
      ],
      false,
      false
    );
    expect(res.totalAulas).toBe(2);
    expect(res.aulasConcluidas).toBe(2);
    expect(res.percentual).toBe(100);
    expect(res.podeCertificar).toBe(true);
  });

  it('d) 2 de 2 concluídas, quiz obrigatório NÃO aprovado -> pode_certificar=false', () => {
    const res = calcularProgresso(
      [
        { obrigatoria: true, concluida: true },
        { obrigatoria: true, concluida: true },
      ],
      true,
      false
    );
    expect(res.totalAulas).toBe(2);
    expect(res.aulasConcluidas).toBe(2);
    expect(res.percentual).toBe(100);
    expect(res.podeCertificar).toBe(false);
  });

  it('e) 2 de 2 concluídas, quiz obrigatório aprovado -> pode_certificar=true', () => {
    const res = calcularProgresso(
      [
        { obrigatoria: true, concluida: true },
        { obrigatoria: true, concluida: true },
      ],
      true,
      true
    );
    expect(res.totalAulas).toBe(2);
    expect(res.aulasConcluidas).toBe(2);
    expect(res.percentual).toBe(100);
    expect(res.podeCertificar).toBe(true);
  });

  it('f) aula com obrigatoria=false não entra no total para certificação', () => {
    const res = calcularProgresso(
      [
        { obrigatoria: true, concluida: true },
        { obrigatoria: true, concluida: true },
        { obrigatoria: false, concluida: false }, // aula opcional
      ],
      false,
      false
    );
    expect(res.totalAulas).toBe(2);
    expect(res.aulasConcluidas).toBe(2);
    expect(res.percentual).toBe(100);
    expect(res.podeCertificar).toBe(true);
  });
});
