import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { finalizarAplicacao } from './api';
import { supabase } from '@/integrations/supabase/client';

// Helper para criar query builder encadeado
const createQueryBuilderMock = (overrides = {}) => {
  const qb: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides
  };
  return qb;
};

// Map de tabelas para seus mocks
const tablesMock: Record<string, any> = {};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (!tablesMock[table]) {
        tablesMock[table] = createQueryBuilderMock();
      }
      return tablesMock[table];
    })
  }
}));

describe('Gatilho da Matriz (finalizarAplicacao)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tablesMock).forEach(key => delete tablesMock[key]);
  });

  const setupDefaultMocks = (
    tipoAplicacao: string = 'ghe', 
    gheId: string | null = 'ghe-1', 
    riscoExiste: boolean = false,
    categoriaRisco: string = 'fisico'
  ) => {
    // Mock checklist_aplicacoes
    tablesMock['checklist_aplicacoes'] = createQueryBuilderMock({
      single: vi.fn().mockResolvedValue({ data: { tipo_aplicacao: tipoAplicacao, ghe_id: gheId }, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis()
    });

    // Mock checklist_perguntas
    tablesMock['checklist_perguntas'] = createQueryBuilderMock({
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'p1', perigo_associado_id: 'r1', tipo_resposta: 'C_NC_NA', obrigatoria: false }],
        error: null
      })
    });

    // Mock checklist_respostas
    tablesMock['checklist_respostas'] = createQueryBuilderMock({
      single: vi.fn().mockResolvedValue({ data: { id: 'resp1' }, error: null })
    });

    // Mock nr1_riscos_catalogo
    tablesMock['nr1_riscos_catalogo'] = createQueryBuilderMock({
      single: vi.fn().mockResolvedValue({
        data: { id: 'r1', nome: 'Ruído', categoria: categoriaRisco },
        error: null
      })
    });

    // Mock nr1_ghe_riscos
    tablesMock['nr1_ghe_riscos'] = createQueryBuilderMock({
      maybeSingle: vi.fn().mockResolvedValue({
        data: riscoExiste ? { id: 'ext1' } : null,
        error: null
      }),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-risco-1' }, error: null })
    });
  };

  it('Aplicação GHE com 1 resposta NC → chama o INSERT em nr1_ghe_riscos', async () => {
    setupDefaultMocks('ghe', 'ghe-1', false, 'fisico');
    
    await finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Não' } // NC
    });

    const nr1GheRiscosInsert = tablesMock['nr1_ghe_riscos'].insert;
    expect(nr1GheRiscosInsert).toHaveBeenCalledWith(expect.objectContaining({
      ghe_id: 'ghe-1',
      risco_id: 'r1',
      nome_risco: 'Ruído',
      categoria: 'fisico',
      probabilidade: 1,
      severidade: 1,
      fonte: 'automatico',
      ativo: true
    }));
  });

  it('Aplicação Posto → não chama INSERT na matriz (skip)', async () => {
    setupDefaultMocks('posto', null, false, 'fisico');
    
    await finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Não' } // NC
    });

    const nr1GheRiscosInsert = tablesMock['nr1_ghe_riscos'].insert;
    expect(nr1GheRiscosInsert).not.toHaveBeenCalled();
  });

  it('Resposta conforme (C) → não dispara gatilho', async () => {
    setupDefaultMocks('ghe', 'ghe-1', false, 'fisico');
    
    await finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Sim' } // Conforme
    });

    const nr1GheRiscosInsert = tablesMock['nr1_ghe_riscos'].insert;
    expect(nr1GheRiscosInsert).not.toHaveBeenCalled();
  });

  it('Duplicidade: já existe registro → não insere de novo', async () => {
    setupDefaultMocks('ghe', 'ghe-1', true, 'fisico'); // Risco já existe
    
    await finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Não' } // NC
    });

    const nr1GheRiscosInsert = tablesMock['nr1_ghe_riscos'].insert;
    expect(nr1GheRiscosInsert).not.toHaveBeenCalled();
  });

  it('Categoria fora do CHECK → não insere', async () => {
    setupDefaultMocks('ghe', 'ghe-1', false, 'misto'); // Categoria inválida
    
    await finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Não' } // NC
    });

    const nr1GheRiscosInsert = tablesMock['nr1_ghe_riscos'].insert;
    expect(nr1GheRiscosInsert).not.toHaveBeenCalled();
  });

  it('Falha no INSERT da matriz → dispara o rollback das respostas já salvas', async () => {
    setupDefaultMocks('ghe', 'ghe-1', false, 'fisico');
    
    // Forçar erro no insert da matriz
    tablesMock['nr1_ghe_riscos'].single = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });

    await expect(finalizarAplicacao('app-1', 'company-1', {
      'p1': { resposta_valor: 'Não' } // NC
    })).rejects.toThrow('DB Error');

    // Rollback das respostas deve ter sido chamado (delete de 'checklist_respostas')
    const respostasDelete = tablesMock['checklist_respostas'].delete;
    expect(respostasDelete).toHaveBeenCalled();
  });
});
