import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useAbonos } from '../usePontoAbonos';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn().mockReturnValue('company-1'),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn().mockReturnValue({ selectedCompanyId: 'company-1' }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('upload limits in usePontoAbonos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects file > 5MB without calling upload', async () => {
    const { result } = renderHook(() => useAbonos(), { wrapper });
    
    // Create a 6MB mock file
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });

    let error: Error | null = null;
    try {
      await result.current.create.mutateAsync({
        colaborador_id: 'colab-1',
        tipo_abono_id: 'tipo-1',
        data_inicio: '2026-10-01',
        data_fim: '2026-10-01',
        justificativa: 'Teste',
        anexo_file: bigFile,
      });
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/5MB/);
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.storage.from('abonos-anexos').upload).not.toHaveBeenCalled();
  });

  it('accepts file < 5MB and calls upload', async () => {
    const { result } = renderHook(() => useAbonos(), { wrapper });
    
    // Create a 2MB mock file
    const smallFile = new File(['x'.repeat(2 * 1024 * 1024)], 'small.pdf', { type: 'application/pdf' });

    try {
      await result.current.create.mutateAsync({
        colaborador_id: 'colab-1',
        tipo_abono_id: 'tipo-1',
        data_inicio: '2026-10-01',
        data_fim: '2026-10-01',
        justificativa: 'Teste',
        anexo_file: smallFile,
      });
    } catch (e) {
      // Ignora erro de insert
    }

    expect(supabase.storage.from).toHaveBeenCalledWith('abonos-anexos');
    expect(supabase.storage.from('abonos-anexos').upload).toHaveBeenCalled();
  });
});
