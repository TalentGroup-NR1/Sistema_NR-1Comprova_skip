import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers, useUserStats } from '../useUsers';
import * as AuthHook from '../useAuth';
import * as EffectiveCompanyHook from '../useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUsers Hook - Contexto Multiempresa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quando effectiveCompanyId existe, chama get_company_users RPC e retorna papéis contextuais', async () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAdminMaster: false,
    } as any);

    vi.mocked(EffectiveCompanyHook.useEffectiveCompanyId).mockReturnValue('empresa-uniti-id');

    const mockRpcUsers = [
      {
        id: 'p-1',
        user_id: 'u-gabriela',
        full_name: 'Gabriela Gomes de Mattos',
        email: 'gabriela@empresa.com',
        phone: null,
        avatar_url: null,
        company_id: 'empresa-uniti-id',
        is_active: true,
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
        role: 'admin_empresa',
        company_name: 'TG UNITI',
      },
      {
        id: 'p-2',
        user_id: 'u-daniela',
        full_name: 'Daniela Vida Alcantara',
        email: 'daniela@empresa.com',
        phone: null,
        avatar_url: null,
        company_id: 'empresa-uniti-id',
        is_active: true,
        created_at: '2026-10-02',
        updated_at: '2026-10-02',
        role: 'admin_empresa',
        company_name: 'TG UNITI',
      },
    ];

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockRpcUsers,
      error: null,
    } as any);

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.rpc).toHaveBeenCalledWith('get_company_users', {
      p_company_id: 'empresa-uniti-id',
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].role).toBe('admin_empresa');
    expect(result.current.data?.[1].role).toBe('admin_empresa');
  });

  it('quando effectiveCompanyId é null (modo plataforma), consulta profiles e respeita prioridade de papéis', async () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      role: 'admin_master',
      isAdminMaster: true,
    } as any);

    vi.mocked(EffectiveCompanyHook.useEffectiveCompanyId).mockReturnValue(null);

    const mockProfiles = [
      {
        id: 'p-gab',
        user_id: 'u-gabriela',
        full_name: 'Gabriela Gomes',
        email: 'gab@empresa.com',
        company_id: 'comp-1',
        is_active: true,
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
        companies: { name: 'TG MAIS' },
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                // Simula Gabriela com ambos os papéis no banco
                { user_id: 'u-gabriela', role: 'colaborador' },
                { user_id: 'u-gabriela', role: 'admin_empresa' },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    // Prioridade garante admin_empresa sobre colaborador
    expect(result.current.data?.[0].role).toBe('admin_empresa');
  });
});
