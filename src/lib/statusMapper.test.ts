import { describe, it, expect } from 'vitest';
import { mapColumnToStatus, resolveTargetStatus } from './statusMapper';

describe('mapColumnToStatus', () => {
  it('should map valid columns correctly', () => {
    expect(mapColumnToStatus('pendente')).toBe('pendente');
    expect(mapColumnToStatus('em_andamento')).toBe('em_andamento');
    expect(mapColumnToStatus('concluida')).toBe('concluida');
    expect(mapColumnToStatus('validada')).toBe('validada');
  });

  it('should return undefined for invalid columns (fail-closed)', () => {
    expect(mapColumnToStatus('Em Andamento')).toBeUndefined();
    expect(mapColumnToStatus('Invalido')).toBeUndefined();
    expect(mapColumnToStatus('')).toBeUndefined();
  });
});

describe('resolveTargetStatus', () => {
  it('should return the status if overId is a direct column status', () => {
    expect(resolveTargetStatus('pendente', [])).toBe('pendente');
    expect(resolveTargetStatus('concluida', [{ id: 'card-1', status: 'em_andamento' }])).toBe('concluida');
  });

  it('should normalize variations of the status text', () => {
    expect(resolveTargetStatus('Em Andamento', [])).toBe('em_andamento');
    expect(resolveTargetStatus('em-andamento', [])).toBe('em_andamento');
    expect(resolveTargetStatus('em_andamento', [])).toBe('em_andamento');
    expect(resolveTargetStatus('Concluída', [])).toBe('concluida'); // teste com acento
  });

  it('should return the card status if overId matches a card id', () => {
    const acoes = [
      { id: 'card-1', status: 'em_andamento' },
      { id: 'card-2', status: 'validada' }
    ];
    expect(resolveTargetStatus('card-1', acoes)).toBe('em_andamento');
    expect(resolveTargetStatus('card-2', acoes)).toBe('validada');
  });

  it('should return undefined if overId is neither a valid column nor a valid card', () => {
    const acoes = [{ id: 'card-1', status: 'em_andamento' }];
    expect(resolveTargetStatus('card-x', acoes)).toBeUndefined();
    expect(resolveTargetStatus('Invalido', acoes)).toBeUndefined();
    expect(resolveTargetStatus('', acoes)).toBeUndefined();
  });
});
