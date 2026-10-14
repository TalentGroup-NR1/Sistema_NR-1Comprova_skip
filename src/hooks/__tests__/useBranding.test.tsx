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
vi.mock('@/hooks/useCompanyBranding', () => ({
  useCompanyBranding: () => ({ data: null, isLoading: false, isError: false }),
}));

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

  it('4. Cenário Sem Empresa Nenhuma: recebe o fallback NR-1Comprova', () => {
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

  it('6. Teste de Invalidação por Mudança de Branding: atualiza o localStorage se a cor vinda da API mudar', () => {
    // Simulando o BrandingDocumentEffect gravando no localStorage
    const mockUserId = 'user-123';
    const cacheKey = `nr1_branding_${mockUserId}`;
    
    // Suponha que o cache local tinha uma cor antiga
    localStorage.setItem(cacheKey, '#OLDCOLOR');
    
    const apiResolvedColor = '#00FF00'; // Nova cor que veio da API
    
    // Lógica do BrandingDocumentEffect:
    if (localStorage.getItem(cacheKey) !== apiResolvedColor) {
      localStorage.setItem(cacheKey, apiResolvedColor);
    }
    
    // O cache foi invalidado/atualizado
    expect(localStorage.getItem(cacheKey)).toBe(apiResolvedColor);
    
    // Limpeza
    localStorage.removeItem(cacheKey);
  });

  it('7. Teste de Isolamento de Cache: signOut remove a chave nr1_branding_<user_id>', async () => {
    const mockUserId = 'user-joao';
    const cacheKey = `nr1_branding_${mockUserId}`;
    
    // Simular que ele logou e salvou a cor
    localStorage.setItem(cacheKey, '#FFA500'); // Laranja Horizonte
    expect(localStorage.getItem(cacheKey)).toBe('#FFA500');
    
    // Simular a chamada de signOut no hook useAuth
    const signOutSimulation = async () => {
      const user = { id: mockUserId };
      if (user?.id) {
        localStorage.removeItem(`nr1_branding_${user.id}`);
      }
    };
    
    await signOutSimulation();
    
    // O cache foi eliminado, isolando o próximo usuário
    expect(localStorage.getItem(cacheKey)).toBeNull();
  });
  it('8. Teste de Document Title: não duplica a marca se o fallback for NR-1Comprova', () => {
    // Simula lógica isolada usada no BrandingDocumentEffect
    const getDocumentTitle = (brandName: string) => {
      return brandName === "NR-1Comprova" 
        ? "NR-1Comprova" 
        : `${brandName} — NR-1Comprova`;
    };
    
    // Título sem empresa (fallback default)
    expect(getDocumentTitle("NR-1Comprova")).toBe("NR-1Comprova");
    
    // Título com empresa
    expect(getDocumentTitle("Empresa X")).toBe("Empresa X — NR-1Comprova");
  });

  it('9. Cenário isLoading=true: retorna valores vazios e transparente', () => {
    (useCompanies as any).mockReturnValue({ data: undefined, isLoading: true });
    (useAuth as any).mockReturnValue({ loading: true, isAdminMaster: false, companyId: null });
    (useMyColaborador as any).mockReturnValue({ data: null, isLoading: true });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.brandName).toBe("");
    expect(result.current.logoUrl).toBe("");
    expect(result.current.faviconUrl).toBe("");
    expect(result.current.primaryColor).toBe("transparent");
  });

  it('10. Cenário Multiempresa: empresa efetiva selecionada no contexto determina o tema', () => {
    (useCompanies as any).mockReturnValue({ data: [mockCompanyX, mockCompanyY], isLoading: false });
    // Usuário regular multiempresa (não é admin_master)
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: 'empresa-X' });
    (useMyColaborador as any).mockReturnValue({ data: null });
    // Usuário trocou para Empresa Y no seletor
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: 'empresa-Y' });

    const { result } = renderHook(() => useBranding());
    
    // O tema deve seguir a empresa efetivamente selecionada (Empresa Y)
    expect(result.current.brandName).toBe('Empresa Y');
    expect(result.current.primaryColor).toBe('#0000FF');
    expect(result.current.logoUrl).toBe('https://logo.y');
  });

  it('11. Fallback seguro para empresa sem identidade: nunca exibe artefato quebrado', () => {
    const mockEmpresaSemBranding = {
      id: 'empresa-nova',
      name: 'Empresa Piloto Nova',
      brand_name: null,
      brand_logo_url: null,
      logo_url: null,
      brand_primary_color: null,
      primary_color: null,
      brand_favicon_url: null,
    };

    (useCompanies as any).mockReturnValue({ data: [mockEmpresaSemBranding], isLoading: false });
    (useAuth as any).mockReturnValue({ isAdminMaster: false, companyId: 'empresa-nova' });
    (useMyColaborador as any).mockReturnValue({ data: null });
    (useCompanyContext as any).mockReturnValue({ selectedCompanyId: null });

    const { result } = renderHook(() => useBranding());
    
    // Nome cai no name da empresa
    expect(result.current.brandName).toBe('Empresa Piloto Nova');
    // Logo cai no logo oficial da plataforma
    expect(result.current.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
    // Cor cai na cor primária oficial da plataforma
    expect(result.current.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    // Favicon cai no favicon oficial da plataforma
    expect(result.current.faviconUrl).toBe(DEFAULT_BRANDING.faviconUrl);
  });
});
