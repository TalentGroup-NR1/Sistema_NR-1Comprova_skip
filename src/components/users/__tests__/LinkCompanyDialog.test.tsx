import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LinkCompanyDialog } from '../LinkCompanyDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCompanies = vi.fn();
vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => mockUseCompanies(),
}));

const mockUseUserCompanies = vi.fn();
vi.mock('@/hooks/useUserCompanies', () => ({
  useUserCompanies: () => mockUseUserCompanies(),
}));

const mockMutateAsync = vi.fn();
const mockLinkUserMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

vi.mock('@/hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    linkUserToCompany: mockLinkUserMutation,
  }),
}));

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('LinkCompanyDialog Component', () => {
  let queryClient: QueryClient;

  const mockTargetUser = {
    id: 'profile-1',
    user_id: 'target-user-123',
    full_name: 'Usuário Teste',
    email: 'usuario.teste@exemplo.com',
    company_id: 'comp-1',
    role: 'colaborador' as const,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Mock padrão do supabase.from('user_companies') retornando vínculo atual da empresa 1
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_companies') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ company_id: 'comp-1' }],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  const renderComponent = (props: { open?: boolean; onClose?: () => void; user?: any } = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LinkCompanyDialog
          open={props.open ?? true}
          onClose={props.onClose ?? vi.fn()}
          user={props.user ?? mockTargetUser}
        />
      </QueryClientProvider>
    );
  };

  it('renderiza o diálogo com cabeçalho e formulário de vinculação', () => {
    mockUseAuth.mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: false,
      isAdminEmpresa: false,
    });
    mockUseCompanies.mockReturnValue({
      data: [{ id: 'comp-2', name: 'TG UNITI', status: 'active' }],
      isLoading: false,
    });
    mockUseUserCompanies.mockReturnValue({ userCompanies: [], isLoading: false });

    renderComponent();

    expect(screen.getByText('Vincular a Outra Empresa')).toBeInTheDocument();
    expect(screen.getByText(/Conceda acesso a uma empresa adicional para/i)).toBeInTheDocument();
    expect(screen.getByText('Usuário Teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vincular Empresa/i })).toBeInTheDocument();
  });

  it('exibe alerta amigável quando o usuário já possui vínculo com todas as empresas disponíveis', async () => {
    mockUseAuth.mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: false,
      isAdminEmpresa: false,
    });

    // Ambas as empresas já vinculadas
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_companies') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ company_id: 'comp-1' }, { company_id: 'comp-2' }],
            error: null,
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    mockUseCompanies.mockReturnValue({
      data: [
        { id: 'comp-1', name: 'Empresa 1', status: 'active' },
        { id: 'comp-2', name: 'Empresa 2', status: 'active' },
      ],
      isLoading: false,
    });
    mockUseUserCompanies.mockReturnValue({ userCompanies: [], isLoading: false });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Este usuário já está vinculado a todas as empresas disponíveis/i)
      ).toBeInTheDocument();
    });

    // O botão de submissão não deve ser renderizado quando há o alerta
    expect(screen.queryByRole('button', { name: /Vincular Empresa/i })).not.toBeInTheDocument();
  });

  it('exibe checkbox para definir como empresa padrão', () => {
    mockUseAuth.mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: false,
      isAdminEmpresa: false,
    });
    mockUseCompanies.mockReturnValue({
      data: [{ id: 'comp-2', name: 'TG UNITI', status: 'active' }],
      isLoading: false,
    });
    mockUseUserCompanies.mockReturnValue({ userCompanies: [], isLoading: false });

    renderComponent();

    expect(screen.getByText('Definir como empresa padrão')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('não renderiza o diálogo se open for falso', () => {
    mockUseAuth.mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: false,
      isAdminEmpresa: false,
    });
    mockUseCompanies.mockReturnValue({ data: [], isLoading: false });
    mockUseUserCompanies.mockReturnValue({ userCompanies: [], isLoading: false });

    renderComponent({ open: false });

    expect(screen.queryByText('Vincular a Outra Empresa')).not.toBeInTheDocument();
  });
});
