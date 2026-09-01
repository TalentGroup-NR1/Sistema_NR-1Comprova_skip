import { describe, it, expect } from "vitest";
import {
  aplicarResposta,
  badgesDoStreak,
  isoWeekYear,
  ultimaSemanaIsoDoAno,
  type ProgressaoEstado,
} from "../cuidarStreak";

describe("cuidarStreak", () => {
  it("3 semanas consecutivas: streak 1, 2, 3 e best 3", () => {
    let estado: ProgressaoEstado | null = null;
    estado = aplicarResposta(estado, 10, 2026);
    expect(estado.streak_semanal).toBe(1);
    expect(estado.best_streak).toBe(1);

    estado = aplicarResposta(estado, 11, 2026);
    expect(estado.streak_semanal).toBe(2);
    expect(estado.best_streak).toBe(2);

    estado = aplicarResposta(estado, 12, 2026);
    expect(estado.streak_semanal).toBe(3);
    expect(estado.best_streak).toBe(3);
  });

  it("pular 1 semana reseta streak mas preserva best", () => {
    let estado: ProgressaoEstado = {
      streak_semanal: 5,
      best_streak: 5,
      ultima_semana_respondida: 10,
      ultimo_ano_respondido: 2026,
    };
    estado = aplicarResposta(estado, 12, 2026); // pulou a 11
    expect(estado.streak_semanal).toBe(1);
    expect(estado.best_streak).toBe(5);
  });

  it("responder 2x na mesma semana ISO não incrementa", () => {
    let estado: ProgressaoEstado = {
      streak_semanal: 4,
      best_streak: 4,
      ultima_semana_respondida: 20,
      ultimo_ano_respondido: 2026,
    };
    const novo = aplicarResposta(estado, 20, 2026);
    expect(novo.streak_semanal).toBe(4);
    expect(novo.best_streak).toBe(4);
  });

  it("virada de ano-iso: semana 1 conecta com última semana do ano anterior", () => {
    const ultima = ultimaSemanaIsoDoAno(2025);
    let estado: ProgressaoEstado = {
      streak_semanal: 2,
      best_streak: 2,
      ultima_semana_respondida: ultima,
      ultimo_ano_respondido: 2025,
    };
    estado = aplicarResposta(estado, 1, 2026);
    expect(estado.streak_semanal).toBe(3);
    expect(estado.best_streak).toBe(3);
  });

  it("mesma semana ISO em anos diferentes não é consecutiva", () => {
    let estado: ProgressaoEstado = {
      streak_semanal: 7,
      best_streak: 7,
      ultima_semana_respondida: 20,
      ultimo_ano_respondido: 2025,
    };
    estado = aplicarResposta(estado, 20, 2026);
    expect(estado.streak_semanal).toBe(1);
    expect(estado.best_streak).toBe(7);
  });

  it("badges destravam em 4 e 12", () => {
    expect(badgesDoStreak(3)).toEqual([]);
    expect(badgesDoStreak(4)).toContain("4 semanas de cuidado consistente");
    expect(badgesDoStreak(12)).toHaveLength(2);
  });

  it("isoWeekYear gera ano-iso correto em virada", () => {
    // 1º de janeiro de 2023 é domingo, pertence à semana 52 de 2022
    expect(isoWeekYear(new Date(Date.UTC(2023, 0, 1)))).toEqual({ semana: 52, ano: 2022 });
  });
});
