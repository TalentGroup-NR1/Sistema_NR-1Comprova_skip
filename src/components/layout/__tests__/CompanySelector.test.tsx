import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanySelector } from '../CompanySelector';
import * as AuthContext from '@/hooks/useAuth';
import * as UserCompaniesHook from '@/hooks/useUserCompanies';
import * as CompanyContext from '@/contexts/CompanyContext';
import * as CompaniesHook from '@/hooks/useCompanies';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useUserCompanies', () => ({
  useUserCompanies: vi.fn(),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn(),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: vi.fn(),
}));

describe('CompanySelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada se o usuário tiver apenas 1 empresa vinculada e não for admin global (regra de ouro)', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAdminMaster: false,
      isSuperAdmin: false,
    } as any);

    vi.mocked(UserCompaniesHook.useUserCompanies).mockReturnValue({
      userCompanies: [
        { companyId: 'c1', name: 'Empresa Única', role: 'admin_empresa', isDefault: true },
      ],
      isLoading: false,
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'c1',
      setSelectedCompanyId: vi.fn(),
    } as any);

    vi.mocked(CompaniesHook.useCompanies).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { container } = render(<CompanySelector />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o seletor para usuário cliente com 2 ou mais vínculos', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAdminMaster: false,
      isSuperAdmin: false,
    } as any);

    vi.mocked(UserCompaniesHook.useUserCompanies).mockReturnValue({
      userCompanies: [
        { companyId: 'c1', name: 'Empresa A', role: 'admin_empresa', isDefault: true },
        { companyId: 'c2', name: 'Empresa B', role: 'admin_empresa', isDefault: false },
      ],
      isLoading: false,
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'c1',
      setSelectedCompanyId: vi.fn(),
    } as any);

    vi.mocked(CompaniesHook.useCompanies).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<CompanySelector />);
    // O trigger do seletor deve existir na tela
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renderiza com opção global se for Super Admin / Admin Master', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: true,
    } as any);

    vi.mocked(UserCompaniesHook.useUserCompanies).mockReturnValue({
      userCompanies: [],
      isLoading: false,
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
      setSelectedCompanyId: vi.fn(),
    } as any);

    vi.mocked(CompaniesHook.useCompanies).mockReturnValue({
      data: [
        { id: 'c1', name: 'Empresa 1', status: 'active' },
        { id: 'c2', name: 'Empresa 2', status: 'active' },
      ],
      isLoading: false,
    } as any);

    render(<CompanySelector />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
