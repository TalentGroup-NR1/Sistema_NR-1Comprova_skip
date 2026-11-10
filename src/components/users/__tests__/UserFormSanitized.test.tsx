import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserForm } from '../UserForm';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdminMaster: true,
    companyId: 'comp-1',
  }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: [] }),
}));

vi.mock('@/hooks/useUserMutations', () => ({
  useUserMutations: () => ({
    createUser: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

describe('UserForm (Criação de Usuário para Admin Master)', () => {
  it('renderiza exclusivamente o modal "Novo Usuário" sem qualquer modo de edição', () => {
    render(
      <UserForm
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.queryByText('Editar Usuário')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
  });
});
