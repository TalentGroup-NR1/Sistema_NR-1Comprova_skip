import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffectiveCompanyId } from '../useEffectiveCompanyId';
import * as AuthHook from '../useAuth';
import * as CompanyContext from '@/contexts/CompanyContext';
import * as FeedbackHook from '../useMyFeedbackCycles';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn(),
}));

vi.mock('../useMyFeedbackCycles', () => ({
  useMyColaborador: vi.fn(),
}));

describe('useEffectiveCompanyId Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FeedbackHook.useMyColaborador).mockReturnValue({ data: null } as any);
  });

  it('retorna null IMEDIATAMENTE para super_admin (mesmo com companyId e selectedCompanyId presentes)', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAdminMaster: false,
      isSuperAdmin: true,
      role: 'super_admin',
      roles: ['super_admin'],
      companyId: 'company-horizonte-id',
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'company-horizonte-id',
    } as any);

    const { result } = renderHook(() => useEffectiveCompanyId());
    expect(result.current).toBeNull();
  });

  it('retorna null IMEDIATAMENTE para admin_master (mesmo com companyId presente)', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAdminMaster: true,
      isSuperAdmin: false,
      role: 'admin_master',
      roles: ['admin_master'],
      companyId: 'company-horizonte-id',
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'company-horizonte-id',
    } as any);

    const { result } = renderHook(() => useEffectiveCompanyId());
    expect(result.current).toBeNull();
  });

  it('retorna selectedCompanyId para usuário comum/admin_empresa multiempresa', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAdminMaster: false,
      isSuperAdmin: false,
      role: 'admin_empresa',
      roles: ['admin_empresa'],
      companyId: 'company-a',
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: 'company-b',
    } as any);

    const { result } = renderHook(() => useEffectiveCompanyId());
    expect(result.current).toBe('company-b');
  });

  it('retorna companyId do auth quando não há selectedCompanyId para usuário comum', () => {
    vi.mocked(AuthHook.useAuth).mockReturnValue({
      isAdminMaster: false,
      isSuperAdmin: false,
      role: 'admin_empresa',
      roles: ['admin_empresa'],
      companyId: 'company-a',
    } as any);

    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({
      selectedCompanyId: null,
    } as any);

    const { result } = renderHook(() => useEffectiveCompanyId());
    expect(result.current).toBe('company-a');
  });
});
