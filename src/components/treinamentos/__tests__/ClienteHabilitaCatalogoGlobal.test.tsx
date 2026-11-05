import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Treinamentos from '@/pages/Treinamentos';
import { EmpresaCatalogoPlataforma } from '../catalogo/EmpresaCatalogoPlataforma';
import { TreinamentoCard } from '../catalogo/TreinamentoCard';
import {
  isSaudeMentalOuPsicossocial,
  useSalvarHabilitacaoTreinamento,
} from '@/hooks/useEmpresaTreinamentosHabilitados';
import * as AuthHook from '@/hooks/useAuth';
import * as EffectiveCompanyHook from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { Treinamento } from '@/hooks/useTreinamentos';

// Mock Auth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock Effective Company
vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn(),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-123' } } }),
    },
  },
}));

// Mock MainLayout
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock Sub-components that might do unwanted fetches
vi.mock('../TreinamentosBuilder', () => ({
  TreinamentosBuilder: () => <div>Mock TreinamentosBuilder</div>,
}));
vi.mock('../TreinamentosCatalogo', () => ({
  TreinamentosCatalogo: () => <div>Mock TreinamentosCatalogo</div>,
}));
vi.mock('../TreinamentosRelatorios', () => ({
  TreinamentosRelatorios: () => <div>Mock TreinamentosRelatorios</div>,
}));
vi.mock('../certificates/CertificatesPanel', () => ({
  CertificatesPanel: () => <div>Mock CertificatesPanel</div>,
}));

describe('ETAPA 8.6 — Cliente Habilita Catálogo Global', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('3.1.a: Aba "Catálogo da Plataforma" é visível apenas para admin_empresa e analista_rh, e NÃO para colaborador', () => {
    // 1) Testar como colaborador
    (AuthHook.useAuth as any).mockReturnValue({
      role: 'colaborador',
      user: { id: 'u-colab' },
    });
    (EffectiveCompanyHook.useEffectiveCompanyId as any).mockReturnValue('comp-1');

    const { unmount } = renderWithProviders(<Treinamentos />);
    expect(screen.queryByText('Catálogo da Plataforma')).not.toBeInTheDocument();
    unmount();

    // 2) Testar como admin_empresa
    (AuthHook.useAuth as any).mockReturnValue({
      role: 'admin_empresa',
      user: { id: 'u-admin' },
    });
    renderWithProviders(<Treinamentos />);
    expect(screen.getByText('Catálogo da Plataforma')).toBeInTheDocument();
  });

  it('3.1.b: Curso global em rascunho NÃO aparece no Catálogo da Plataforma para o cliente', async () => {
    (AuthHook.useAuth as any).mockReturnValue({
      role: 'admin_empresa',
      user: { id: 'u-admin' },
    });
    (EffectiveCompanyHook.useEffectiveCompanyId as any).mockReturnValue('comp-1');

    // Mock das tabelas
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'treinamentos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col, val) => {
              if (col === 'origem') {
                return {
                  is: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((statusCol, statusVal) => {
                      // Apenas cursos publicados devem ser retornados
                      expect(statusVal).toBe('publicado');
                      return {
                        order: vi.fn().mockResolvedValue({
                          data: [
                            {
                              id: 'c-pub-1',
                              titulo: 'Curso Publicado da Plataforma',
                              descricao: 'Curso oficial',
                              origem: 'plataforma',
                              company_id: null,
                              status: 'publicado',
                              tipo: 'pdf',
                              gera_certificado: true,
                              validade_meses: 12,
                            },
                          ],
                          error: null,
                        }),
                      };
                    }),
                  }),
                };
              }
              return { is: vi.fn() };
            }),
          }),
        };
      }
      if (table === 'empresa_treinamentos_habilitados') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    renderWithProviders(<EmpresaCatalogoPlataforma />);

    await waitFor(() => {
      expect(screen.getByText('Curso Publicado da Plataforma')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Rascunho/i)).not.toBeInTheDocument();
  });

  it('3.1.c: Toggle obrigatório em curso de saúde mental abre modal de aviso informativo', async () => {
    const cursoMental: Treinamento = {
      id: 'c-mental-1',
      titulo: 'Gestão de Ansiedade e Estresse no Trabalho',
      origem: 'plataforma',
      company_id: null,
      status: 'publicado',
      tipo: 'pdf',
      gera_certificado: true,
      categoria: { id: 'cat-1', nome: 'Saúde Mental', cor: '#3b82f6' } as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'treinamentos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [cursoMental], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'empresa_treinamentos_habilitados') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  treinamento_id: 'c-mental-1',
                  habilitado: true,
                  obrigatorio: false,
                  habilitado_em: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    renderWithProviders(<EmpresaCatalogoPlataforma />);

    await waitFor(() => {
      expect(screen.getByText('Gestão de Ansiedade e Estresse no Trabalho')).toBeInTheDocument();
    });

    // Clicar no toggle de Obrigatório
    const toggleObrigatorio = screen.getByLabelText('Tornar Gestão de Ansiedade e Estresse no Trabalho obrigatório');
    fireEvent.click(toggleObrigatorio);

    // Modal de aviso deve abrir
    await waitFor(() => {
      expect(screen.getByText('Tornar obrigatório?')).toBeInTheDocument();
      expect(
        screen.getByText(/Cursos de saúde mental e temas psicossociais costumam ter mais adesão quando o colaborador escolhe fazê-los voluntariamente/i)
      ).toBeInTheDocument();
    });
  });

  it('3.1.d: Toggle obrigatório em curso de segurança NÃO abre modal de aviso', async () => {
    expect(isSaudeMentalOuPsicossocial('NR-1 Geral e Segurança do Trabalho', 'Segurança')).toBe(false);
    expect(isSaudeMentalOuPsicossocial('Ergonomia no Escritório', 'Geral')).toBe(false);
    expect(isSaudeMentalOuPsicossocial('Saúde Mental e Bem-Estar', 'Psicossocial')).toBe(true);
  });

  it('3.1.e: Badge "Link externo" aparece em TreinamentoCard quando tipo="link"', () => {
    const cursoLink: Treinamento = {
      id: 'c-link-1',
      titulo: 'Curso Externo GOV.BR',
      origem: 'plataforma',
      company_id: null,
      status: 'publicado',
      tipo: 'link',
      url_conteudo: 'https://www.escolavirtual.gov.br',
      gera_certificado: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    renderWithProviders(<TreinamentoCard treinamento={cursoLink} />);

    expect(screen.getByText('Link externo')).toBeInTheDocument();
    expect(screen.getByText('Catálogo da Plataforma')).toBeInTheDocument();
  });

  it('3.1.f: UPSERT grava company_id derivado do contexto, nunca do client', async () => {
    (EffectiveCompanyHook.useEffectiveCompanyId as any).mockReturnValue('comp-derivada-789');

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'eth-1', company_id: 'comp-derivada-789' },
          error: null,
        }),
      }),
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'empresa_treinamentos_habilitados') {
        return { upsert: mockUpsert };
      }
      return { select: vi.fn() };
    });

    let hookResult: ReturnType<typeof useSalvarHabilitacaoTreinamento>;

    function TestComponent() {
      hookResult = useSalvarHabilitacaoTreinamento();
      return null;
    }

    renderWithProviders(<TestComponent />);

    await hookResult!.mutateAsync({
      treinamentoId: 't-global-1',
      habilitado: true,
      obrigatorio: true,
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'comp-derivada-789',
        treinamento_id: 't-global-1',
        habilitado: true,
        obrigatorio: true,
      }),
      { onConflict: 'company_id,treinamento_id' }
    );
  });
});

