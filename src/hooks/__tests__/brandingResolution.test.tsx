import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { BrandingDocumentEffect } from '@/components/layout/BrandingDocumentEffect';
import { hexToHslString } from '@/lib/colorUtils';

/**
 * Resolução de branding no ambiente LOGADO — árvore REAL:
 * AuthProvider + CompanyProvider + QueryClientProvider + BrandingDocumentEffect + useBranding.
 * Apenas o cliente Supabase (rede) é simulado. NENHUM hook de tema/branding é mockado.
 */

const h = vi.hoisted(() => ({
  state: {
    session: null as any,
    role: 'admin_empresa' as string | null,
    roles: [] as string[],
    profile: null as any,
    companies: [] as any[],
    userCompanies: [] as any[],
    companiesGate: null as null | Promise<void>,
    roleGate: null as null | Promise<void>,
    companiesCalls: 0,
    authCb: null as null | ((event: string, session: any) => void),
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  const s = h.state;
  const makeBuilder = (table: string) => {
    const resolveData = async () => {
      switch (table) {
        case 'companies':
          s.companiesCalls++;
          if (s.companiesGate) await s.companiesGate;
          return { data: s.companies, error: null };
        case 'user_roles':
          return { data: s.roles.map((r) => ({ role: r })), error: null };
        case 'user_companies':
          return { data: s.userCompanies, error: null };
        default:
          return { data: [], error: null };
      }
    };
    const single = async () =>
      table === 'profiles' ? { data: s.profile, error: null } : { data: null, error: null };
    const b: any = {
      select: () => b,
      eq: () => b,
      order: () => b,
      update: () => b,
      maybeSingle: single,
      single,
      then: (res: any, rej: any) => resolveData().then(res, rej),
    };
    return b;
  };

  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      rpc: async (fn: string) => {
        if (fn === 'get_my_role') {
          if (s.roleGate) await s.roleGate;
          return { data: s.role, error: null };
        }
        if (fn === 'get_my_company_id') return { data: s.profile?.company_id ?? null, error: null };
        return { data: null, error: null };
      },
      auth: {
        getSession: async () => ({ data: { session: s.session } }),
        onAuthStateChange: (cb: any) => {
          s.authCb = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getUser: async () => ({
          data: { user: { app_metadata: { company_id: 'ok' }, user_metadata: {} } },
        }),
        updateUser: async () => ({ data: {}, error: null }),
        refreshSession: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
      },
    },
  };
});

const STORAGE_KEY = 'tgmais_selected_company';
const HORIZONTE_ID = 'c-horizonte';
const OUTRA_ID = 'c-outra';
const HORIZONTE_HEX = '#0D13C5';
const DEFAULT_HEX = '#C8102E';

const horizonte = {
  id: HORIZONTE_ID,
  name: 'Horizonte Contabilidade',
  brand_name: 'Horizonte Contabilidade',
  brand_primary_color: HORIZONTE_HEX,
  brand_logo_url: 'https://cdn.exemplo.com/logos/horizonte.png',
  brand_favicon_url: null,
  primary_color: null,
  created_at: '2026-10-01',
};

const outraSemBranding = {
  id: OUTRA_ID,
  name: 'Empresa Sem Marca',
  brand_name: null,
  brand_primary_color: null,
  brand_logo_url: null,
  brand_favicon_url: null,
  primary_color: null,
  created_at: '2026-10-02',
};

const session = { user: { id: 'u1', app_metadata: {}, user_metadata: {} } };

const rootPrimary = () => document.documentElement.style.getPropertyValue('--primary');

function setup(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>
          <BrandingDocumentEffect />
        </CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('Branding da empresa efetiva no ambiente logado (providers reais)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const s = h.state;
    s.session = session;
    s.role = 'admin_empresa';
    s.roles = [];
    s.profile = { company_id: HORIZONTE_ID, must_change_password: false, is_active: true };
    s.companies = [horizonte];
    s.userCompanies = [];
    s.companiesGate = null;
    s.roleGate = null;
    s.companiesCalls = 0;
    s.authCb = null;
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.title = 'NR-1Comprova';
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const brandingWarns = () =>
    warnSpy.mock.calls.filter((c) => String(c[0]).includes('BrandingDocumentEffect'));

  it('1. admin_empresa com branding existente: aplica o tema da Horizonte (sem warns de fallback)', async () => {
    setup();

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
    expect(document.title).toBe('Horizonte Contabilidade — NR-1Comprova');
    expect(localStorage.getItem('nr1_branding_u1')).toBe(HORIZONTE_HEX);
    expect(brandingWarns()).toHaveLength(0);
  });

  it('2. seleção obsoleta no localStorage: ainda resolve a Horizonte e LIMPA a chave', async () => {
    localStorage.setItem(STORAGE_KEY, 'empresa-antiga-excluida');
    setup();

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
    expect(brandingWarns()).toHaveLength(0);
  });

  it('3. empresa SEM branding: cai no padrão da plataforma (e somente nesse caso)', async () => {
    h.state.profile = { company_id: OUTRA_ID, must_change_password: false, is_active: true };
    h.state.companies = [outraSemBranding];
    setup();

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(DEFAULT_HEX)));
    expect(document.title).toBe('Empresa Sem Marca — NR-1Comprova');
  });

  it('4a. janela de loading do perfil: NENHUM padrão aplicado nem cache gravado; depois aplica a Horizonte', async () => {
    let releaseRole!: () => void;
    h.state.roleGate = new Promise<void>((r) => (releaseRole = r));
    setup();

    // Empresas já chegam, mas role/companyId ainda estão sendo resolvidos
    await waitFor(() => expect(h.state.companiesCalls).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(rootPrimary()).toBe(''); // sem flash vermelho
    expect(localStorage.getItem('nr1_branding_u1')).toBeNull(); // cache não envenenado

    await act(async () => releaseRole());
    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
    expect(localStorage.getItem('nr1_branding_u1')).toBe(HORIZONTE_HEX);
  });

  it('4b. dados de empresas chegando APÓS a montagem: tema reage quando chegam', async () => {
    let releaseCompanies!: () => void;
    h.state.companiesGate = new Promise<void>((r) => (releaseCompanies = r));
    setup();

    await waitFor(() => expect(h.state.companiesCalls).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(rootPrimary()).toBe('');
    expect(localStorage.getItem('nr1_branding_u1')).toBeNull();

    await act(async () => releaseCompanies());
    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
  });

  it('5. cache pré-login: sem sessão não consulta empresas; após o login a lista é buscada e o tema aplicado', async () => {
    h.state.session = null; // tela de login: anon
    const { queryClient } = setup();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(h.state.companiesCalls).toBe(0); // nenhuma consulta anon (que voltaria [] por RLS e ficaria em cache)
    expect(rootPrimary()).toBe(hexToHslString(DEFAULT_HEX)); // login deslogado: padrão da plataforma

    // Login na mesma sessão SPA (sem recarregar a página)
    h.state.session = session;
    await act(async () => {
      h.state.authCb?.('SIGNED_IN', session);
    });

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
    expect(h.state.companiesCalls).toBeGreaterThan(0);
    expect(queryClient.getQueryCache().find({ queryKey: ['companies', 'u1'] })).toBeDefined();
  });

  it('6. REGRESSÃO: invalidação por prefixo ["companies"] continua revalidando a lista', async () => {
    const { queryClient } = setup();
    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));

    const before = h.state.companiesCalls;
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
    });
    await waitFor(() => expect(h.state.companiesCalls).toBeGreaterThan(before));
  });

  it('7. REGRESSÃO Super Admin SEM seleção: padrão da plataforma (não usa a empresa do profile)', async () => {
    h.state.role = 'admin_master';
    h.state.roles = ['super_admin', 'admin_master'];
    // profile do super admin aponta para a Horizonte, mas sem seleção deve valer o padrão
    h.state.companies = [horizonte, outraSemBranding];
    setup();

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(DEFAULT_HEX)));
    expect(document.title).toBe('NR-1Comprova');
  });

  it('8. Super Admin COM a Horizonte selecionada: branding da Horizonte', async () => {
    h.state.role = 'admin_master';
    h.state.roles = ['super_admin', 'admin_master'];
    h.state.companies = [horizonte, outraSemBranding];
    localStorage.setItem(STORAGE_KEY, HORIZONTE_ID);
    setup();

    await waitFor(() => expect(rootPrimary()).toBe(hexToHslString(HORIZONTE_HEX)));
    expect(document.title).toBe('Horizonte Contabilidade — NR-1Comprova');
  });
});
