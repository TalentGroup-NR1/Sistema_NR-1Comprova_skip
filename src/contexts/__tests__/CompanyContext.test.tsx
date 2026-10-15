import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  CompanyProvider,
  useCompanyContext,
  getCompanyStorageKey,
  LEGACY_STORAGE_KEY,
} from '../CompanyContext';
import * as AuthHook from '@/hooks/useAuth';
import * as CompaniesHook from '@/hooks/useCompanies';
import * as UserCompaniesHook from '@/hooks/useUserCompanies';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompanies: vi.fn(),
}));

vi.mock('@/hooks/useUserCompanies', () => ({
  useUserCompanies: vi.fn(),
}));

describe('CompanyContext - Isolamento de Tenant e Chaveamento de LocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(CompaniesHook.useCompanies).mockReturnValue({
      data: [
        { id: 'comp-a', name: 'Empresa A' },
        { id: 'comp-b', name: 'Empresa B' },
      ],
    } as any);

    vi.mocked(UserCompaniesHook.useUserCompanies).mockReturnValue({
      userCompanies: [],
      hasMultipleCompanies: true,
      switchCompany: vi.fn().mockResolvedValue(true),
    } as any);
  });

  it('1. getCompanyStorageKey gera chaves isoladas por userId e null quando ausente', () => {
    expect(getCompanyStorageKey('user-123')).toBe('tgmais_selected_company_user-123');
    expect(getCompanyStorageKey('user-456')).toBe('tgmais_selected_company_user-456');
    expect(getCompanyStorageKey(null)).toBeNull();
    expect(getCompanyStorageKey(undefined)).toBeNull();
  });

  it('2. remove proativamente a chave legada global (LEGACY_STORAGE_KEY) para evitar herança', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, 'empresa-vazada-legada');

    vi.mocked(AuthHook.useAuth).mockReturnValue({
      user: { id: 'user-a' },
      isAdminMaster: false,
      isSuperAdmin: false,
      companyId: 'comp-a',
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CompanyProvider>{children}</CompanyProvider>
    );

    renderHook(() => useCompanyContext(), { wrapper });

    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('3. isolamento multi-usuário: Usuário B no mesmo navegador NÃO herda tenant do Usuário A', async () => {
    // Passo 1: Usuário A loga e seleciona Empresa A
    let currentAuth: any = {
      user: { id: 'user-a' },
      isAdminMaster: true, // Permite selecionar qualquer empresa sem restrição de vínculo
      isSuperAdmin: false,
      companyId: 'comp-a',
    };
    vi.mocked(AuthHook.useAuth).mockImplementation(() => currentAuth);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CompanyProvider>{children}</CompanyProvider>
    );

    const { result, rerender } = renderHook(() => useCompanyContext(), { wrapper });

    await act(async () => {
      await result.current.setSelectedCompanyId('comp-a');
    });

    expect(result.current.selectedCompanyId).toBe('comp-a');
    expect(localStorage.getItem('tgmais_selected_company_user-a')).toBe('comp-a');
    expect(localStorage.getItem('tgmais_selected_company_user-b')).toBeNull();

    // Passo 2: Logout (sessão sem usuário)
    currentAuth = {
      user: null,
      isAdminMaster: false,
      isSuperAdmin: false,
      companyId: null,
    };
    rerender();

    expect(result.current.selectedCompanyId).toBeNull();

    // Passo 3: Usuário B faz login no mesmo navegador/máquina
    currentAuth = {
      user: { id: 'user-b' },
      isAdminMaster: true,
      isSuperAdmin: false,
      companyId: 'comp-b',
    };
    rerender();

    // B NÃO herda comp-a do Usuário A
    expect(result.current.selectedCompanyId).toBeNull();
    expect(localStorage.getItem('tgmais_selected_company_user-b')).toBeNull();

    // Usuário B seleciona Empresa B
    await act(async () => {
      await result.current.setSelectedCompanyId('comp-b');
    });

    expect(result.current.selectedCompanyId).toBe('comp-b');
    expect(localStorage.getItem('tgmais_selected_company_user-b')).toBe('comp-b');

    // Chave do Usuário A permanece intacta e isolada
    expect(localStorage.getItem('tgmais_selected_company_user-a')).toBe('comp-a');
  });
});
