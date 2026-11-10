import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateColaborador } from '../useColaboradores';
import { supabase } from '@/integrations/supabase/client';
import * as EffectiveCompanyIdHook from '@/hooks/useEffectiveCompanyId';
import * as AuthContext from '../useAuth';

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

describe('useCreateColaborador - Guard Inteligente de Vinculação Admin ↔ Colaborador', () => {
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

  const fakePayload = {
    full_name: 'Admin Empresa',
    birth_date: '10/10/1985',
    admission_date: '01/01/2026',
    base_salary: '10.000,00',
    contract_type: 'CLT',
    job_title: 'Administrador',
    department: 'Diretoria',
    payment_method: 'Mensalista',
    cpf: '111.222.333-44',
    email_pessoal: 'admin@empresa.com.br',
  };

  it('1. Vinculação inteligente: admin da mesma empresa sem ficha em colaboradores é vinculado com sucesso', async () => {
    // 1ª chamada RPC: check_email_exists -> retorna true (usuário existe no auth)
    // 2ª chamada RPC: check_email_vinculacao -> retorna can_link = true, user_id da mesma empresa
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: true, error: null } as any) // check_email_exists
      .mockResolvedValueOnce({
        data: {
          can_link: true,
          is_occupied: false,
          user_id: 'admin-existing-uuid-999',
          user_name: 'Admin Empresa',
          reason: 'same_company_linkable',
        },
        error: null,
      } as any); // check_email_vinculacao

    const { result } = renderHook(() => useCreateColaborador(), {
      wrapper: createWrapper(),
    });

    const res = await result.current.mutateAsync(fakePayload as any);

    expect(res).toEqual({ id: 'colab-uuid-new' });
    expect(insertColaboradorMock).toHaveBeenCalledTimes(1);

    // Prova obrigatória: o insert recebeu user_id preenchido com a conta existente do admin
    const insertArg = insertColaboradorMock.mock.calls[0][0];
    expect(insertArg.user_id).toBe('admin-existing-uuid-999');
    expect(insertArg.company_id).toBe('company-uuid-123');
  });

  it('2. Bloqueio multi-tenant: e-mail de admin de OUTRA empresa é rejeitado com mensagem de erro', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: true, error: null } as any) // check_email_exists
      .mockResolvedValueOnce({
        data: {
          can_link: false,
          is_occupied: true,
          reason: 'other_company',
          user_id: null,
          user_name: null,
        },
        error: null,
      } as any); // check_email_vinculacao

    const { result } = renderHook(() => useCreateColaborador(), {
      wrapper: createWrapper(),
    });

    let thrownError: any = null;
    try {
      await result.current.mutateAsync(fakePayload as any);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Este e-mail já possui acesso à plataforma. Use outro e-mail ou contate o suporte.');
    expect(insertColaboradorMock).not.toHaveBeenCalled();
  });
});
