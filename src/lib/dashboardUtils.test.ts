import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcScore, getPrazoStatus, calcFarol, getAcoesCriticas } from './dashboardUtils';
import { addDays, subDays, startOfToday, format } from 'date-fns';

describe('dashboardUtils', () => {
  const hoje = startOfToday();
  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const ontemStr = format(subDays(hoje, 1), 'yyyy-MM-dd');
  const em5DiasStr = format(addDays(hoje, 5), 'yyyy-MM-dd');
  const em7DiasStr = format(addDays(hoje, 7), 'yyyy-MM-dd');
  const em8DiasStr = format(addDays(hoje, 8), 'yyyy-MM-dd');

  describe('calcScore', () => {
    it('deve retornar 0 e cor cinza para array vazio', () => {
      expect(calcScore([])).toEqual({ pct: 0, cor: 'cinza' });
      expect(calcScore(undefined)).toEqual({ pct: 0, cor: 'cinza' });
    });

    it('deve retornar vermelho se pct < 50', () => {
      const acoes = [
        { status: 'pendente' },
        { status: 'em_andamento' },
        { status: 'concluida' },
      ]; // 1 concluida de 3 = 33%
      expect(calcScore(acoes)).toEqual({ pct: 33, cor: 'vermelho' });
    });

    it('deve retornar amarelo se pct >= 50 e < 80', () => {
      const acoes = [
        { status: 'pendente' },
        { status: 'concluida' },
        { status: 'validada' },
      ]; // 2 concluidas de 3 = 67%
      expect(calcScore(acoes)).toEqual({ pct: 67, cor: 'amarelo' });
    });

    it('deve retornar verde se pct >= 80', () => {
      const acoes = [
        { status: 'concluida' },
        { status: 'concluida' },
        { status: 'validada' },
        { status: 'concluida' },
        { status: 'pendente' }
      ]; // 4 concluidas de 5 = 80%
      expect(calcScore(acoes)).toEqual({ pct: 80, cor: 'verde' });
    });
  });

  describe('getPrazoStatus', () => {
    it('deve retornar invalido para null, string vazia ou data muito antiga', () => {
      expect(getPrazoStatus(null)).toBe('invalido');
      expect(getPrazoStatus('')).toBe('invalido');
      expect(getPrazoStatus('invalid date')).toBe('invalido');
      expect(getPrazoStatus('0001-10-01')).toBe('invalido');
    });

    it('deve retornar vencido para data no passado', () => {
      expect(getPrazoStatus(ontemStr)).toBe('vencido');
    });

    it('deve retornar vencendo para data de hoje até +7 dias', () => {
      expect(getPrazoStatus(hojeStr)).toBe('vencendo');
      expect(getPrazoStatus(em5DiasStr)).toBe('vencendo');
      expect(getPrazoStatus(em7DiasStr)).toBe('vencendo');
    });

    it('deve retornar no_prazo para data acima de +7 dias', () => {
      expect(getPrazoStatus(em8DiasStr)).toBe('no_prazo');
    });
  });

  describe('calcFarol', () => {
    it('deve retornar verde para array vazio (prioridade limpa)', () => {
      expect(calcFarol([])).toBe('verde');
      expect(calcFarol(undefined)).toBe('verde');
    });

    it('deve retornar verde se não houver ações abertas', () => {
      const acoes = [
        { status: 'concluida', prazo: ontemStr }, // Mesmo vencida no passado, já foi concluida
        { status: 'validada', prazo: hojeStr },
      ];
      expect(calcFarol(acoes)).toBe('verde');
    });

    it('deve retornar vermelho se houver pelo menos uma vencida', () => {
      const acoes = [
        { status: 'pendente', prazo: em5DiasStr },
        { status: 'em_andamento', prazo: ontemStr }, // VENCIDA
      ];
      expect(calcFarol(acoes)).toBe('vermelho');
    });

    it('deve retornar amarelo se não houver vencida, mas houver vencendo', () => {
      const acoes = [
        { status: 'pendente', prazo: em8DiasStr },
        { status: 'em_andamento', prazo: hojeStr }, // VENCENDO HOJE
      ];
      expect(calcFarol(acoes)).toBe('amarelo');
    });

    it('deve retornar cinza se não houver vencida nem vencendo, mas houver prazo invalido', () => {
      const acoes = [
        { status: 'pendente', prazo: em8DiasStr },
        { status: 'em_andamento', prazo: null }, // SEM PRAZO
      ];
      expect(calcFarol(acoes)).toBe('cinza');
    });

    it('deve retornar verde se houver ações abertas, mas todas dentro do prazo (>7 dias)', () => {
      const acoes = [
        { status: 'pendente', prazo: em8DiasStr },
      ];
      expect(calcFarol(acoes)).toBe('verde');
    });
  });
});
