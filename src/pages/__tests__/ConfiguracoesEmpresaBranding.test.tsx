import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfiguracoesEmpresa from '../ConfiguracoesEmpresa';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  cnpj: '12.345.678/0001-90',
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

describe('ConfiguracoesEmpresa - Branding Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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
        _brand_primary_color: '#C8102E',
        _brand_logo_url: null,
      }));
    });
  });
});
