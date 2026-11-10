import { describe, it, expect } from 'vitest';
import { isNaoConforme } from './api';

describe('isNaoConforme - Regras Aprovadas', () => {
  // Casos Positivos (Devam ser Não-Conformes)
  it('resposta_valor="NC" → deve retornar true', () => {
    expect(isNaoConforme('NC', '', 'C_NC_NA', false)).toBe(true);
  });

  it('resposta_valor="NA" com observacao_especifica vazio → deve retornar true', () => {
    expect(isNaoConforme('NA', '', 'C_NC_NA', false)).toBe(true);
    expect(isNaoConforme('NA', null, 'C_NC_NA', false)).toBe(true);
  });

  it('pergunta TEXTO obrigatoria com observacao_especifica vazio → deve retornar true', () => {
    expect(isNaoConforme(null, '   ', 'TEXTO', true)).toBe(true);
    expect(isNaoConforme(null, null, 'TEXTO', true)).toBe(true);
  });

  // Casos Negativos (Devam ser Conformes / false)
  it('resposta_valor="C" → deve retornar false', () => {
    expect(isNaoConforme('C', '', 'C_NC_NA', false)).toBe(false);
    expect(isNaoConforme('C', 'Tudo certo', 'C_NC_NA', false)).toBe(false);
  });

  it('resposta_valor="NA" com observacao_especifica preenchida → deve retornar false', () => {
    expect(isNaoConforme('NA', 'Máquina desativada na manutenção', 'C_NC_NA', false)).toBe(false);
  });

  it('pergunta TEXTO (obrigatoria ou não) com observacao preenchida → deve retornar false', () => {
    expect(isNaoConforme(null, 'Verificado sem alterações', 'TEXTO', true)).toBe(false);
  });
});
