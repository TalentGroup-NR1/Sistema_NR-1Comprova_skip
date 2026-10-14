import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfiguracoesEmpresa from '../ConfiguracoesEmpresa';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as cepModule from '@/lib/cep';
import React from 'react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1' },
    role: 'admin_empresa',
    companyId: 'company-123',
    session: {},
    loading: false,
    roles: [],
    mustChangePassword: false,
    isBlocked: false,
    blockReason: null,
    refreshAuth: vi.fn(),
  })),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn(() => ({
    selectedCompanyId: 'company-123',
    setSelectedCompanyId: vi.fn(),
  })),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompany: vi.fn(() => ({ data: mockCompany, isLoading: false })),
  useCompanies: vi.fn(() => ({ data: [mockCompany], isLoading: false })),
}));

vi.mock('@/hooks/useMyFeedbackCycles', () => ({
  useMyColaborador: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('@/components/onboarding/WelcomeWizard', () => ({
  WelcomeWizard: () => null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.url' } })),
      })),
    },
  },
}));

const mockCompany = {
  id: 'company-123',
  name: 'Empresa Teste',
  brand_name: 'Marca Teste',
  brand_primary_color: '#C8102E',
  brand_logo_url: 'https://old.url',
  cnpj: '00.000.000/0001-91',
  telefone: '11987654321',
  segmento: 'Tecnologia',
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  numero: '100',
  complemento: 'Sala 1',
  bairro: 'Sé',
  cidade: 'São Paulo',
  estado: 'SP',
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {ui}
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ConfiguracoesEmpresa - Branding & Perfil Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockImplementation(() => {
        if (table === 'companies') return Promise.resolve({ data: mockCompany, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
    (supabase.rpc as any).mockResolvedValue({ error: null });
  });

  it('salvar so a cor nao zera o brand_logo_url (envia null e o banco da coalesce)', async () => {
    renderWithProviders(<ConfiguracoesEmpresa />);
    
    // Aguarda carregamento do form
    await waitFor(() => {
      expect(screen.getByLabelText(/Nome de exibição/i)).toHaveValue('Marca Teste');
    });

    const colorPicker = screen.getByLabelText(/Cor principal/i);
    fireEvent.change(colorPicker, { target: { value: '#00FF00' } });

    const saveButton = screen.getAllByRole('button', { name: /Salvar/i })[0];
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('atualizar_branding_empresa', expect.objectContaining({
        _brand_primary_color: '#00ff00',
        _brand_logo_url: null,
        _target_company_id: 'company-123',
      }));
    });
  });

  it('exibe e preenche os cards de Contato Institucional e Endereço', async () => {
    renderWithProviders(<ConfiguracoesEmpresa />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Telefone institucional/i)).toHaveValue('(11) 98765-4321');
      expect(screen.getByLabelText(/CEP/i)).toHaveValue('01001-000');
      expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé');
      expect(screen.getByLabelText(/Número/i)).toHaveValue('100');
      expect(screen.getByLabelText(/Complemento/i)).toHaveValue('Sala 1');
      expect(screen.getByLabelText(/Bairro/i)).toHaveValue('Sé');
      expect(screen.getByLabelText(/Cidade/i)).toHaveValue('São Paulo');
      expect(screen.getByLabelText(/UF \/ Estado/i)).toHaveValue('SP');
    });
  });

  it('busca automática de CEP via ViaCEP preenche campos de endereço', async () => {
    const fetchSpy = vi.spyOn(cepModule, 'fetchAddressByCep').mockResolvedValueOnce({
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
    });

    renderWithProviders(<ConfiguracoesEmpresa />);

    const cepInput = await screen.findByLabelText(/CEP/i);
    fireEvent.change(cepInput, { target: { value: '01311000' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('01311000');
      expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Avenida Paulista');
      expect(screen.getByLabelText(/Bairro/i)).toHaveValue('Bela Vista');
      expect(screen.getByLabelText(/Cidade/i)).toHaveValue('São Paulo');
      expect(screen.getByLabelText(/UF \/ Estado/i)).toHaveValue('SP');
    });
  });

  it('salva configurações completas chamando RPC com novos campos', async () => {
    renderWithProviders(<ConfiguracoesEmpresa />);

    await screen.findByLabelText(/Telefone institucional/i);

    const telefoneInput = screen.getByLabelText(/Telefone institucional/i);
    fireEvent.change(telefoneInput, { target: { value: '11999998888' } });

    const numInput = screen.getByLabelText(/Número/i);
    fireEvent.change(numInput, { target: { value: '999' } });

    const saveButton = screen.getAllByRole('button', { name: /Salvar/i })[0];
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('atualizar_branding_empresa', expect.objectContaining({
        _target_company_id: 'company-123',
        _telefone: '(11) 99999-8888',
        _numero: '999',
        _logradouro: 'Praça da Sé',
      }));
    });
  });
});
