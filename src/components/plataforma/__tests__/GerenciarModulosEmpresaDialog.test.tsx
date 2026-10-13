import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerenciarModulosEmpresaDialog } from '../GerenciarModulosEmpresaDialog';
import { supabase } from '@/integrations/supabase/client';

// Mock do supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-super-123' } },
      }),
    },
    rpc: vi.fn(),
  },
}));

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock do hook useInvalidateModuleVisibility
const mockInvalidate = vi.fn();
vi.mock('@/hooks/useVisibleModules', () => ({
  useInvalidateModuleVisibility: () => mockInvalidate,
}));

describe('GerenciarModulosEmpresaDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const empresaMock = {
    id: 'empresa-xyz-123',
    name: 'Empresa Teste SA',
    brand_name: 'Teste SA',
  };

  const setupMockSupabase = (existingModules: { module_key: string; enabled: boolean }[] = []) => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: existingModules.map((m) => ({
          company_id: empresaMock.id,
          module_key: m.module_key,
          enabled: m.enabled,
        })),
        error: null,
      }),
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'company_modules') {
        return {
          select: mockSelect,
          upsert: mockUpsert,
        } as any;
      }
      return {} as any;
    });

    return { mockSelect, mockUpsert };
  };

  it('renderiza o diálogo com o nome da empresa e os módulos agrupados', async () => {
    setupMockSupabase();

    render(
      <QueryClientProvider client={queryClient}>
        <GerenciarModulosEmpresaDialog
          open={true}
          onOpenChange={vi.fn()}
          empresa={empresaMock}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Gestão de Módulos Contratados')).toBeInTheDocument();
    expect(screen.getByText(/Teste SA/)).toBeInTheDocument();
    expect(await screen.findByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Avaliação de Desempenho')).toBeInTheDocument();
    expect(screen.getByText('Cuidar+ (Clima & Riscos Psicossociais)')).toBeInTheDocument();
  });

  it('trava o módulo Colaboradores como base inegociável (switch desabilitado e marcado)', async () => {
    setupMockSupabase();

    render(
      <QueryClientProvider client={queryClient}>
        <GerenciarModulosEmpresaDialog
          open={true}
          onOpenChange={vi.fn()}
          empresa={empresaMock}
        />
      </QueryClientProvider>
    );

    const badgeBase = await screen.findByText('Base Obrigatória');
    expect(badgeBase).toBeInTheDocument();

    const switchColaboradores = await screen.findByRole('switch', {
      name: 'Ativar ou desativar módulo Colaboradores',
    });
    expect(switchColaboradores).toBeDisabled();
    expect(switchColaboradores).toHaveAttribute('data-state', 'checked');
  });

  it('ao clicar em "Desativar Opcionais", mantém Colaboradores ativo e desativa outros', async () => {
    setupMockSupabase();

    render(
      <QueryClientProvider client={queryClient}>
        <GerenciarModulosEmpresaDialog
          open={true}
          onOpenChange={vi.fn()}
          empresa={empresaMock}
        />
      </QueryClientProvider>
    );

    // Espera dados carregarem
    await screen.findByText('Colaboradores');

    const btnDesativarOpcionais = screen.getByText('Desativar Opcionais');
    fireEvent.click(btnDesativarOpcionais);

    // Colaboradores continua checked
    const switchColaboradores = screen.getByRole('switch', {
      name: 'Ativar ou desativar módulo Colaboradores',
    });
    expect(switchColaboradores).toHaveAttribute('data-state', 'checked');

    // Módulo opcional como Avaliação de Desempenho fica unchecked
    const switchAvaliacoes = screen.getByRole('switch', {
      name: 'Ativar ou desativar módulo Avaliação de Desempenho',
    });
    expect(switchAvaliacoes).toHaveAttribute('data-state', 'unchecked');
  });

  it('ao clicar em "Salvar Alterações", envia upsert para company_modules e dispara toast', async () => {
    const { mockUpsert } = setupMockSupabase();
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <GerenciarModulosEmpresaDialog
          open={true}
          onOpenChange={onOpenChange}
          empresa={empresaMock}
        />
      </QueryClientProvider>
    );

    // Espera carregar os dados
    await screen.findByText('Colaboradores');

    const btnSalvar = screen.getByText('Salvar Alterações');
    expect(btnSalvar).not.toBeDisabled();
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Módulos atualizados',
        })
      );
      expect(mockInvalidate).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
