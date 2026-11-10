import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeUserRoleDialog } from '../ChangeUserRoleDialog';
import { UserProfile } from '@/hooks/useUsers';

// Mocks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useUpdateUserRole', () => ({
  useUpdateUserRole: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdminMaster: false,
    isAdminEmpresa: true,
    companyId: 'company-123',
  }),
}));

describe('ChangeUserRoleDialog', () => {
  const mockUser: UserProfile = {
    id: 'profile-1',
    user_id: 'user-abc-123',
    full_name: 'Maria Silva',
    email: 'maria.silva@empresa.com',
    company_id: 'company-123',
    role: 'colaborador',
    is_active: true,
    created_at: '2026-10-01',
    updated_at: '2026-10-01',
    phone: null,
    avatar_url: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza dados do usuário (nome, email e perfil atual) em modo somente leitura', () => {
    render(
      <ChangeUserRoleDialog
        open={true}
        onClose={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByText('Alterar Perfil de Acesso')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('maria.silva@empresa.com')).toBeInTheDocument();
    expect(screen.getAllByText('Colaborador').length).toBeGreaterThanOrEqual(1);
  });

  it('NÃO contém campos de senha, confirmar senha ou edição de e-mail (superfície de risco eliminada)', () => {
    render(
      <ChangeUserRoleDialog
        open={true}
        onClose={vi.fn()}
        user={mockUser}
      />
    );

    // Garante que nenhum input de senha ou edição de credencial exista
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/••••••/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nova Senha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirmar Senha/i)).not.toBeInTheDocument();
  });

  it('desabilita o botão Salvar se o perfil selecionado for o mesmo do usuário', () => {
    render(
      <ChangeUserRoleDialog
        open={true}
        onClose={vi.fn()}
        user={mockUser}
      />
    );

    const saveButton = screen.getByRole('button', { name: /salvar perfil/i });
    expect(saveButton).toBeDisabled();
  });

  it('quando o alvo é admin_empresa e a empresa possui apenas 1 admin, exibe alerta de salvaguarda', () => {
    const adminUser: UserProfile = {
      ...mockUser,
      role: 'admin_empresa',
    };

    render(
      <ChangeUserRoleDialog
        open={true}
        onClose={vi.fn()}
        user={adminUser}
        totalCompanyAdmins={1}
      />
    );

    expect(screen.getByText('Salvaguarda do Último Administrador')).toBeInTheDocument();
    expect(
      screen.getByText(/A empresa deve possuir pelo menos um Administrador ativo/i)
    ).toBeInTheDocument();
  });

  it('quando a empresa possui mais de 1 admin, NÃO exibe o bloqueio de salvaguarda do último admin', () => {
    const adminUser: UserProfile = {
      ...mockUser,
      role: 'admin_empresa',
    };

    render(
      <ChangeUserRoleDialog
        open={true}
        onClose={vi.fn()}
        user={adminUser}
        totalCompanyAdmins={2}
      />
    );

    expect(screen.queryByText('Salvaguarda do Último Administrador')).not.toBeInTheDocument();
  });
});
