import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserTable } from '../UserTable';
import { ROLE_LABELS, COMPANY_ROLE_ORDER } from '@/lib/constants';
import { UserProfile } from '@/hooks/useUsers';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <div role="menuitem" onClick={onClick}>{children}</div>,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdminMaster: false,
    isAdminEmpresa: true,
    user: { id: 'admin-caller' },
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

describe('Nomenclatura dos 4 Perfis de Usuário (Aprovado pelo Gestor)', () => {
  it('ROLE_LABELS centralizado deve refletir a nomenclatura exata dos 4 perfis', () => {
    expect(ROLE_LABELS.admin_empresa).toBe('Administrador Empresa');
    expect(ROLE_LABELS.analista_rh).toBe('Administrador Operacional');
    expect(ROLE_LABELS.gestor_departamento).toBe('Gestor de Departamento');
    expect(ROLE_LABELS.colaborador).toBe('Colaborador');
  });

  it('COMPANY_ROLE_ORDER deve seguir a hierarquia fixa dos 4 perfis', () => {
    expect(COMPANY_ROLE_ORDER).toEqual([
      'admin_empresa',
      'analista_rh',
      'gestor_departamento',
      'colaborador',
    ]);
  });

  it('UserTable: badge do perfil deve exibir "Administrador Operacional" para role analista_rh', () => {
    const mockUsers: UserProfile[] = [
      {
        id: 'p-1',
        user_id: 'u-operacional',
        full_name: 'Operador do Sistema',
        email: 'operador@empresa.com',
        company_id: 'c-1',
        role: 'analista_rh',
        is_active: true,
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
        phone: null,
        avatar_url: null,
      },
    ];

    render(<UserTable users={mockUsers} />);

    // Deve exibir "Administrador Operacional"
    expect(screen.getByText('Administrador Operacional')).toBeInTheDocument();
    // NUNCA deve conter "Analista RH" ou "Analista de RH"
    expect(screen.queryByText('Analista RH')).not.toBeInTheDocument();
    expect(screen.queryByText('Analista de RH')).not.toBeInTheDocument();
  });
});
