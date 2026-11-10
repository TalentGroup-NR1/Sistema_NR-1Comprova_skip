import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserMutations } from '../useUserMutations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import React from 'react';

const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useUserMutations — linkUserToCompany', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('invoca link-user-company com os dados corretos e exibe toast de sucesso', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        message: 'Usuário vinculado a TG UNITI com sucesso!',
        company_name: 'TG UNITI',
      },
      error: null,
    });

    const { result } = renderHook(() => useUserMutations(), { wrapper });

    await act(async () => {
      await result.current.linkUserToCompany.mutateAsync({
        user_id: 'user-123',
        company_id: 'comp-uniti',
        company_name: 'TG UNITI',
        role: 'admin_empresa',
        is_default: false,
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('link-user-company', {
      body: {
        user_id: 'user-123',
        company_id: 'comp-uniti',
        role: 'admin_empresa',
        is_default: false,
      },
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Vínculo realizado',
        description: 'Usuário vinculado a TG UNITI com sucesso.',
      })
    );
  });

  it('trata erro 409 de vínculo já existente extraindo mensagem de FunctionsHttpError', async () => {
    const error409 = new Error('FunctionsHttpError');
    (error409 as any).context = {
      json: vi.fn().mockResolvedValue({
        error: 'Usuário já possui vínculo ativo com a empresa TG UNITI.',
      }),
    };

    mockInvoke.mockResolvedValue({
      data: null,
      error: error409,
    });

    const { result } = renderHook(() => useUserMutations(), { wrapper });

    await act(async () => {
      try {
        await result.current.linkUserToCompany.mutateAsync({
          user_id: 'user-123',
          company_id: 'comp-uniti',
          company_name: 'TG UNITI',
          role: 'admin_empresa',
        });
      } catch (err: any) {
        expect(err.message).toBe('Usuário já possui vínculo ativo com a empresa TG UNITI.');
      }
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Erro ao vincular empresa',
          description: 'Usuário já possui vínculo ativo com a empresa TG UNITI.',
        })
      );
    });
  });

  it('trata erro 403 de acesso negado quando admin_empresa tenta vincular outra empresa', async () => {
    const error403 = new Error('FunctionsHttpError');
    (error403 as any).context = {
      json: vi.fn().mockResolvedValue({
        error: 'Acesso negado: você não tem permissão para vincular usuários a esta empresa.',
      }),
    };

    mockInvoke.mockResolvedValue({
      data: null,
      error: error403,
    });

    const { result } = renderHook(() => useUserMutations(), { wrapper });

    await act(async () => {
      try {
        await result.current.linkUserToCompany.mutateAsync({
          user_id: 'user-123',
          company_id: 'comp-other',
          role: 'admin_empresa',
        });
      } catch (err: any) {
        expect(err.message).toBe(
          'Acesso negado: você não tem permissão para vincular usuários a esta empresa.'
        );
      }
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Erro ao vincular empresa',
          description:
            'Acesso negado: você não tem permissão para vincular usuários a esta empresa.',
        })
      );
    });
  });
});
