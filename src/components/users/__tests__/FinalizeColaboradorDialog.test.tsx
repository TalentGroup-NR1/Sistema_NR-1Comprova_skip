import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinalizeColaboradorDialog } from '../FinalizeColaboradorDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useColaboradoresPendentes', () => ({
  useFinalizeColaborador: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockColaborador = {
  id: '123',
  full_name: 'Test User',
  email_pessoal: 'test@example.com',
  company_id: 'c1',
  company_name: 'Test Company',
  created_at: new Date().toISOString(),
};

describe('FinalizeColaboradorDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <FinalizeColaboradorDialog
          colaborador={mockColaborador as any}
          open={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

  it('deve ter default role colaborador e chamar mutation corretamente', async () => {
    renderComponent();

    // Default select value
    expect(screen.getAllByText('Colaborador').length).toBeGreaterThan(0);

    const submitBtn = screen.getByRole('button', { name: 'Liberar Acesso' });
    // Botão habilitado por padrão para colaborador
    expect(submitBtn).not.toBeDisabled();
    
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        colaborador_id: '123',
        contract_type: 'CLT',
        role: 'colaborador',
      });
    });
  });

  it('deve exigir a palavra CONFIRMAR ao selecionar admin_empresa', async () => {
    renderComponent();

    // Change select to admin_empresa
    const triggers = screen.getAllByRole('combobox');
    const roleTrigger = triggers[1]; // O segundo combobox é o de Nível de Acesso
    fireEvent.click(roleTrigger);
    
    // Select admin_empresa option
    const adminOption = await screen.findByText('Administrador da Empresa');
    fireEvent.click(adminOption);

    const submitBtn = screen.getByRole('button', { name: 'Liberar Acesso' });
    
    // (b) Botão deve estar desabilitado
    expect(submitBtn).toBeDisabled();

    const confirmInput = screen.getByPlaceholderText('Digite CONFIRMAR');
    
    // (d) Digitar texto errado
    fireEvent.change(confirmInput, { target: { value: 'CONFIRMA' } });
    expect(submitBtn).toBeDisabled();

    // (c) Digitar 'CONFIRMAR' certo
    fireEvent.change(confirmInput, { target: { value: 'CONFIRMAR' } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        colaborador_id: '123',
        contract_type: 'CLT',
        role: 'admin_empresa',
      });
    });
  });
});
