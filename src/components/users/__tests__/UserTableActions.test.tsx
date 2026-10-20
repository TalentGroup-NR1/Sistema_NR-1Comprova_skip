import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserTable } from '../UserTable';
import { UserProfile } from '@/hooks/useUsers';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <div role="menuitem" onClick={onClick} aria-disabled={disabled}>{children}</div>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdminMaster: false,
    isAdminEmpresa: true,
    user: { id: 'admin-caller-id' },
    role: 'admin_empresa',
  }),
}));

vi.mock('@/hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    toggleUserStatus: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/hooks/useColaboradoresPendentes', () => ({
  useResendAcessoByUserId: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useUpdateUserRole', () => ({
  useUpdateUserRole: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('UserTable - Ações de Usuário Ativo', () => {
  const mockUsers: UserProfile[] = [
    {
      id: 'profile-1',
      user_id: 'target-user-1',
      full_name: 'Usuária de Teste',
      email: 'teste@empresa.com',
      company_id: 'comp-1',
      role: 'colaborador',
      is_active: true,
      created_at: '2026-10-01',
      updated_at: '2026-10-01',
      phone: null,
      avatar_url: null,
    },
  ];

  it('no menu de ações NÃO deve existir "Editar", e DEVE existir "Alterar Perfil"', () => {
    render(<UserTable users={mockUsers} />);

    // Assert que "Editar" foi removido
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();

    // Assert que "Alterar Perfil" está presente
    expect(screen.getByText('Alterar Perfil')).toBeInTheDocument();

    // Assert que ações legítimas permanecem
    expect(screen.getByText('Reenviar convite de senha')).toBeInTheDocument();
    expect(screen.getByText('Desativar')).toBeInTheDocument();
  });
});
