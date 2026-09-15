import { describe, it, expect } from 'vitest';
import { getMutFor } from '../ConfiguracaoTab';
import { type EntidadeTabela as Tabela } from '@/hooks/useEstruturaConfig';

describe('ConfiguracaoTab - mutFor (Anti-Regressão)', () => {
  it('deve retornar a mutação correta para cada tabela de entidade (departamentos, cargos, ghes, niveis_maturidade)', () => {
    // Mocks simulando o retorno de useEntidadeMutations
    const mockMutDep = { id: 'mutDep' };
    const mockMutCargo = { id: 'mutCargo' };
    const mockMutGhe = { id: 'mutGhe' };
    const mockMutNivel = { id: 'mutNivel' };

    // Lista de entidades utilizadas ativamente nas abas (EntidadeTabela)
    const entidadesAtivas: Tabela[] = ['departamentos', 'cargos', 'ghes', 'niveis_maturidade'];

    entidadesAtivas.forEach((tabela) => {
      const mutacaoRetornada = getMutFor(
        tabela,
        mockMutDep,
        mockMutCargo,
        mockMutGhe,
        mockMutNivel
      );

      // Asserções para garantir que a tabela cai no mock certo
      if (tabela === 'departamentos') {
        expect(mutacaoRetornada).toBe(mockMutDep);
      } else if (tabela === 'cargos') {
        expect(mutacaoRetornada).toBe(mockMutCargo);
      } else if (tabela === 'ghes') {
        expect(mutacaoRetornada).toBe(mockMutGhe);
      } else if (tabela === 'niveis_maturidade') {
        expect(mutacaoRetornada).toBe(mockMutNivel);
      }
      
      // Garante que não está retornando undefined/null (causa raiz da regressão)
      expect(mutacaoRetornada).toBeDefined();
    });
  });
});
