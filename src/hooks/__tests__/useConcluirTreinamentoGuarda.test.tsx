import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useConcluirTreinamento } from '../useTreinamentoProgresso';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-teste-123' } },
      }),
    },
  },
}));

describe('ETAPA 9.2b — Guarda do useConcluirTreinamento via get_progresso_treinamento (Fail-Closed)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    (supabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'prog-1', status: 'concluido' },
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // a) total_aulas = 0 → conclusão REJEITADA com mensagem
  it('a) Rejeita conclusão quando total_aulas = 0 com mensagem clara', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          total_aulas: 0,
          aulas_concluidas: 0,
          percentual: 0,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConcluirTreinamento(), { wrapper });

    await expect(
      result.current.mutateAsync({
        progressoId: 'prog-1',
        treinamentoId: 'trein-sem-aulas',
      })
    ).rejects.toThrow('Este treinamento não possui aulas cadastradas e não pode ser concluído.');
  });

  // b) 1 de 2 aulas → rejeitada
  it('b) Rejeita conclusão quando 1 de 2 aulas estão concluídas', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          total_aulas: 2,
          aulas_concluidas: 1,
          percentual: 50,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConcluirTreinamento(), { wrapper });

    await expect(
      result.current.mutateAsync({
        progressoId: 'prog-1',
        treinamentoId: 'trein-incompleto',
      })
    ).rejects.toThrow('Conclua todas as aulas antes de finalizar. (1 de 2)');
  });

  // c) 2 de 2 sem quiz → aceita
  it('c) Aceita conclusão quando 2 de 2 aulas estão concluídas e quiz não é obrigatório', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          total_aulas: 2,
          aulas_concluidas: 2,
          percentual: 100,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: true,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConcluirTreinamento(), { wrapper });

    const res = await result.current.mutateAsync({
      progressoId: 'prog-1',
      treinamentoId: 'trein-ok',
    });

    expect(res).toBeDefined();
    expect(res.status).toBe('concluido');
  });

  // d) 2 de 2 com quiz obrigatório pendente → rejeitada
  it('d) Rejeita conclusão quando 2 de 2 aulas concluídas mas quiz obrigatório está pendente', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          total_aulas: 2,
          aulas_concluidas: 2,
          percentual: 100,
          quiz_obrigatorio: true,
          quiz_aprovado: false,
          pode_certificar: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConcluirTreinamento(), { wrapper });

    await expect(
      result.current.mutateAsync({
        progressoId: 'prog-1',
        treinamentoId: 'trein-quiz-pendente',
      })
    ).rejects.toThrow('Responda a avaliação com a nota mínima exigida para ser aprovado.');
  });

  // e) 2 de 2 com quiz aprovado → aceita
  it('e) Aceita conclusão quando 2 de 2 aulas concluídas e quiz obrigatório aprovado', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          total_aulas: 2,
          aulas_concluidas: 2,
          percentual: 100,
          quiz_obrigatorio: true,
          quiz_aprovado: true,
          pode_certificar: true,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useConcluirTreinamento(), { wrapper });

    const res = await result.current.mutateAsync({
      progressoId: 'prog-1',
      treinamentoId: 'trein-quiz-ok',
    });

    expect(res).toBeDefined();
    expect(res.status).toBe('concluido');
  });
});
