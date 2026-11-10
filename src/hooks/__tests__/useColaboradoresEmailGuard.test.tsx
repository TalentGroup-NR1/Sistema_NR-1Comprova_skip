import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateColaborador } from '../useColaboradores';
import { supabase } from '@/integrations/supabase/client';
import * as EffectiveCompanyIdHook from '@/hooks/useEffectiveCompanyId';
import * as AuthContext from '../useAuth';

// Mock dependencies
const insertColaboradorMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === 'colaboradores') {
    return {
      insert: insertColaboradorMock,
    };
  }
  return {
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: (table: string) => fromMock(table),
  },
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useGestorFilter', () => ({
  useGestorFilter: () => ({
    gestorColaboradorId: null,
    shouldFilterByGestor: false,
    isLoadingGestor: false,
  }),
}));

describe('useCreateColaborador - Guard de E-mail Existente', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('company-uuid-123');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'admin-user-id' },
      isAuthenticated: true,
      role: 'admin_empresa',
    } as any);

    insertColaboradorMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'colab-uuid-new' }, error: null }),
      }),
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const fakeColaboradorPayload = {
    full_name: 'Novo Colaborador',
    birth_date: '15/05/1990',
    admission_date: '01/01/2026',
    base_salary: '3.500,00',
    contract_type: 'CLT',
    job_title: 'Analista',
    department: 'TI',
    payment_method: 'PIX',
    cpf: '123.456.789-00',
    email_pessoal: 'colaborador.existente@talentgroup.com.br',
  };

  it('1. Bloqueia cadastro e NUNCA insere colaborador se e-mail já possui conta ativa (check_email_exists = true)', async () => {
    // Simula a RPC retornando true (e-mail já ativo)
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null,
    } as any);

    const { result } = renderHook(() => useCreateColaborador(), {
      wrapper: createWrapper(),
    });

    let thrownError: any = null;
    try {
      await result.current.mutateAsync(fakeColaboradorPayload as any);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Este e-mail já possui acesso à plataforma. Use outro e-mail ou contate o suporte.');

    // Prova obrigatória: NENHUM insert na tabela colaboradores foi chamado
    expect(insertColaboradorMock).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('check_email_exists', {
      p_email: 'colaborador.existente@talentgroup.com.br',
    });
  });

  it('2. Permite cadastro normalmente para e-mail novo (check_email_exists = false)', async () => {
    // Simula a RPC retornando false (e-mail não cadastrado)
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useCreateColaborador(), {
      wrapper: createWrapper(),
    });

    const res = await result.current.mutateAsync({
      ...fakeColaboradorPayload,
      email_pessoal: 'novo.email@talentgroup.com.br',
    } as any);

    expect(res).toEqual({ id: 'colab-uuid-new' });
    expect(supabase.rpc).toHaveBeenCalledWith('check_email_exists', {
      p_email: 'novo.email@talentgroup.com.br',
    });
    expect(insertColaboradorMock).toHaveBeenCalledTimes(1);
  });

  it('3. Permite cadastro quando e-mail pertencia a conta excluída/inativa (check_email_exists = false)', async () => {
    // No banco, se deleted_at IS NOT NULL ou profiles.is_active = false, a RPC retorna false
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useCreateColaborador(), {
      wrapper: createWrapper(),
    });

    const res = await result.current.mutateAsync({
      ...fakeColaboradorPayload,
      email_pessoal: 'conta.excluida@talentgroup.com.br',
    } as any);

    expect(res).toEqual({ id: 'colab-uuid-new' });
    expect(insertColaboradorMock).toHaveBeenCalledTimes(1);
  });
});
