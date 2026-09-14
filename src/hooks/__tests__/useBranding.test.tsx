import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBranding, DEFAULT_BRANDING } from '../useBranding';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/hooks/useAuth';
import { useMyColaborador } from '@/hooks/useMyFeedbackCycles';

vi.mock('@/contexts/CompanyContext');
vi.mock('@/hooks/useCompanies');
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMyFeedbackCycles');

describe('useBranding e useEffectiveCompanyId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCompanyX = {
    id: 'empresa-X',
    brand_name: 'Empresa X',
    brand_primary_color: '#00FF00',
    brand_logo_url: 'https://logo.x',
  };

  const mockCompanyY = {
    id: 'empresa-Y',
    brand_name: 'Empresa Y',
    brand_primary_color: '#0000FF',
    brand_logo_url: 'https://logo.y',
  };

  const mockCompanySemLogo = {
    id: 'empresa-Z',
    brand_name: 'Empresa Z',
    brand_primary_color: '#FF00FF',
    brand_logo_url: null,
  };

  it('1. Cenário Admin Master: troca de empresa no seletor recebe o branding da nova empresa (intacto)', () => {
    (useCompanies as any).mockReturnValue({ data: [mockCompanyX, mockCompanyY], isLoading: false });
    (useAuth as any).mockReturnValue({ isAdminMaster: true, companyId: null });
    (useMyColaborador as any).mockReturnValue({ data: null });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: 'empresa-Y' });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.brandName).toBe('Empresa Y');
    expect(result.current.primaryColor).toBe('#0000FF');
    expect(result.current.logoUrl).toBe('https://logo.y');
  });

  it('2. Cenário Profile.company_id preenchido: retorna intacto', () => {
    (useCompanies as any).mockReturnValue({ data: [mockCompanyX], isLoading: false });
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: 'empresa-X' });
    (useMyColaborador as any).mockReturnValue({ data: null });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.brandName).toBe('Empresa X');
    expect(result.current.primaryColor).toBe('#00FF00');
    expect(result.current.logoUrl).toBe('https://logo.x');
  });

  it('3. Cenário Resgate: usuário sem profile mas com vínculo em colaboradores.company_id', () => {
    // Simulando o comportamento da PL/pgSQL (get_user_company_id) com o fallback implementado na migration
    const profileCompanyId = null;
    const colaboradorCompanyId = 'empresa-Y';
    const getUserCompanyIdPLPGSQL = profileCompanyId || colaboradorCompanyId;
    
    // O backend (RLS) só retorna a empresa se o ID dela bater com o retorno da function
    const mockRlsBackend = getUserCompanyIdPLPGSQL === 'empresa-Y' ? [mockCompanyY] : [];
    
    (useCompanies as any).mockReturnValue({ data: mockRlsBackend, isLoading: false });
    
    // Auth context (frontend): profile vazio
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: profileCompanyId });
    // Vínculo resgatado na tabela colaboradores
    (useMyColaborador as any).mockReturnValue({ data: { company_id: colaboradorCompanyId } });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.brandName).toBe('Empresa Y');
    expect(result.current.primaryColor).toBe('#0000FF');
    expect(result.current.logoUrl).toBe('https://logo.y');
  });

  it('4. Cenário Sem Empresa Nenhuma: recebe o fallback NR1-Pronto', () => {
    (useCompanies as any).mockReturnValue({ data: [mockCompanyX], isLoading: false });
    // Nenhum ID efetivo encontrado
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: null });
    (useMyColaborador as any).mockReturnValue({ data: null });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.brandName).toBe(DEFAULT_BRANDING.brandName);
    expect(result.current.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    expect(result.current.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
  });

  it('5. Cenário Fallback sem URL: cada campo é independente', () => {
    (useCompanies as any).mockReturnValue({ data: [mockCompanySemLogo], isLoading: false });
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: 'empresa-Z' });
    (useMyColaborador as any).mockReturnValue({ data: null });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.primaryColor).toBe('#FF00FF');
    expect(result.current.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
    expect(result.current.brandName).toBe('Empresa Z');
  });
});
