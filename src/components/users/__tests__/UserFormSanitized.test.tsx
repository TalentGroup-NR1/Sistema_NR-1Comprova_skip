import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserForm } from '../UserForm';
import { UserProfile } from '@/hooks/useUsers';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdminMaster: false,
    companyId: 'comp-1',
  }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: [] }),
}));

vi.mock('@/hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    createUser: { mutateAsync: vi.fn(), isPending: false },
    updateUser: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

describe('UserForm Sanitization', () => {
  const existingUser: UserProfile = {
    id: 'p-1',
    user_id: 'u-1',
    full_name: 'Usuário Ativo',
    email: 'ativo@empresa.com',
    company_id: 'comp-1',
    role: 'colaborador',
    is_active: true,
    created_at: '2026-10-01',
    updated_at: '2026-10-01',
    phone: null,
    avatar_url: null,
  };

  it('no modo de EDIÇÃO de usuário existente, campos de Nova Senha e Confirmar Senha NÃO devem ser exibidos', () => {
    render(
      <UserForm
        open={true}
        onClose={vi.fn()}
        user={existingUser}
      />
    );

    expect(screen.getByText('Editar Usuário')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nova Senha/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Confirmar Senha/i)).not.toBeInTheDocument();
  });
});
