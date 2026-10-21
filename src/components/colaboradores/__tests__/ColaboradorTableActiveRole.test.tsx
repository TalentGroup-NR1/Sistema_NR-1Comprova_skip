import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColaboradorTable } from '../ColaboradorTable';
import { MemoryRouter } from 'react-router-dom';
import * as useAuthModule from '@/hooks/useAuth';
import type { Colaborador } from '@/hooks/useColaboradores';

vi.mock('@/hooks/useTransferenciaColaborador', () => ({
  useTransferenciasRecentes: () => ({ data: new Set() }),
  useTransferirColaborador: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../TransferirColaboradorDialog', () => ({
  TransferirColaboradorDialog: () => null,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button type="button" onClick={onClick} className={className}>{children}</button>
  ),
}));

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: any) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: any) => <div>{children}</div>,
  ContextMenuContent: ({ children }: any) => <div>{children}</div>,
  ContextMenuSeparator: () => <hr />,
  ContextMenuItem: ({ children, onClick, className }: any) => (
    <button type="button" onClick={onClick} className={className}>{children}</button>
  ),
}));

describe('ColaboradorTable — Ações Condicionais por activeRole', () => {
  const dummyColaborador: any = {
    id: 'colab-1',
    full_name: 'Daniela Alcantara',
    corporate_email: 'daniela.alcantara@talentgroup.com.br',
    role: 'colaborador',
    status: 'ATIVO',
    admission_date: '2023-01-15',
    job_title: 'Analista de RH',
    department: 'Recursos Humanos',
    company_id: 'comp-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    colaboradores: [dummyColaborador],
    isLoading: false,
    onEdit: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    onNovo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe botão "Excluir" e "Transferir" quando activeRole é admin_empresa (Perfil da Empresa)', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1' },
      role: 'admin_empresa',
      activeRole: 'admin_empresa',
      isAdminMaster: false,
      isAdminEmpresa: true,
      isAdmin: true,
      roles: ['admin_empresa', 'colaborador'],
      availableRoles: ['admin_empresa', 'colaborador'],
    } as any);

    render(
      <MemoryRouter>
        <ColaboradorTable {...defaultProps} />
      </MemoryRouter>
    );

    // No Perfil da Empresa (gestão), Excluir e Transferir devem estar disponíveis
    expect(screen.getAllByText('Excluir').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transferir para outra empresa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ver Perfil').length).toBeGreaterThan(0);
  });

  it('oculta botão "Excluir" e "Transferir" quando activeRole é colaborador (Meu Perfil)', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1' },
      role: 'colaborador',
      activeRole: 'colaborador',
      isAdminMaster: false,
      isAdminEmpresa: false,
      isAdmin: false,
      roles: ['admin_empresa', 'colaborador'],
      availableRoles: ['admin_empresa', 'colaborador'],
    } as any);

    render(
      <MemoryRouter>
        <ColaboradorTable {...defaultProps} />
      </MemoryRouter>
    );

    // No Meu Perfil (colaborador), botões de Excluir e Transferir SOMEM completamente
    expect(screen.queryAllByText('Excluir')).toHaveLength(0);
    expect(screen.queryAllByText('Transferir para outra empresa')).toHaveLength(0);

    // Ações permitidas ao colaborador continuam no menu
    expect(screen.getAllByText('Ver Perfil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ficha Profissional').length).toBeGreaterThan(0);
  });
});
