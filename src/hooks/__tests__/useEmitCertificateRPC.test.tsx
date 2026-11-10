import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEmitCertificate } from '../useCertificates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock do supabase client
vi.mock('@/integrations/supabase/client', () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  }));
  const mockRpc = vi.fn();

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
    mockInsert,
    mockFrom,
    mockRpc,
  };
});

describe('ETAPA 9.5 — Hook useEmitCertificate (RPC emitir_certificado_seguro)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('d) useEmitCertificate chama a RPC emitir_certificado_seguro e NUNCA faz INSERT direto', async () => {
    const { mockRpc, mockInsert } = await import('@/integrations/supabase/client') as any;

    mockRpc.mockResolvedValueOnce({
      data: [
        {
          certificate_id: 'cert-uuid-456',
          certificate_code: 'CERT-2026-9999AAAA',
          ja_existia: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useEmitCertificate(), { wrapper });

    const emitRes = await result.current.mutateAsync({
      treinamentoId: 'trein-123',
    });

    // Validar chamada da RPC
    expect(mockRpc).toHaveBeenCalledWith('emitir_certificado_seguro', {
      _treinamento_id: 'trein-123',
    });

    // Validar retorno mapeado
    expect(emitRes).toEqual(
      expect.objectContaining({
        id: 'cert-uuid-456',
        certificate_code: 'CERT-2026-9999AAAA',
        ja_existia: false,
      })
    );

    // Validar que INSERT direto em certificates NUNCA foi chamado
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('e) Erro na RPC rejeita a mutation com a mensagem específica da exceção', async () => {
    const { mockRpc } = await import('@/integrations/supabase/client') as any;

    const rpcMensagem = 'Requisitos de conclusão não atendidos (aulas ou avaliação pendentes).';
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: rpcMensagem },
    });

    const { result } = renderHook(() => useEmitCertificate(), { wrapper });

    await expect(
      result.current.mutateAsync({
        treinamentoId: 'trein-pendente',
      })
    ).rejects.toThrow(rpcMensagem);
  });
});
