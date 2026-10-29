import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyLifecycleModal } from '../CompanyLifecycleModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CompanyLifecycleModal', () => {
  const mockCompany = {
    id: 'comp-123',
    name: 'Empresa Teste LTDA',
    brand_name: 'Empresa Teste',
    status: 'ativa' as const,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    company: mockCompany,
    targetStatus: 'suspensa' as const,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título "Suspender Empresa" e bloqueia confirmação se o motivo tiver menos de 3 caracteres', () => {
    render(<CompanyLifecycleModal {...defaultProps} />);

    expect(screen.getByText('Suspender Empresa')).toBeInTheDocument();
    expect(screen.getByText(/Empresa Teste LTDA/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /confirmar suspensão/i });
    expect(submitBtn).toBeDisabled();

    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(reasonInput, { target: { value: 'ab' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: 'Inadimplência fatura #123' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('renderiza alerta vermelho de estado terminal quando targetStatus é encerrada', () => {
    render(
      <CompanyLifecycleModal
        {...defaultProps}
        targetStatus="encerrada"
      />
    );

    expect(screen.getByText('Encerrar Empresa')).toBeInTheDocument();
    expect(screen.getByText(/Atenção: o encerramento é um estado terminal e definitivo/i)).toBeInTheDocument();
  });

  it('submete com sucesso chamando RPC transition_company_lifecycle com os parâmetros corretos', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { success: true },
      error: null,
    } as any);

    render(<CompanyLifecycleModal {...defaultProps} />);

    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(reasonInput, { target: { value: 'Inadimplência contratual' } });

    const submitBtn = screen.getByRole('button', { name: /confirmar suspensão/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('transition_company_lifecycle', {
        _company_id: 'comp-123',
        _target_status: 'suspensa',
        _reason: 'Inadimplência contratual',
      });
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('suspensa com sucesso'));
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('exibe toast de erro quando a RPC retorna erro de idempotência ou permissão', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'A empresa já se encontra no estado suspensa' },
    } as any);

    render(<CompanyLifecycleModal {...defaultProps} />);

    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(reasonInput, { target: { value: 'Inadimplência contratual' } });

    const submitBtn = screen.getByRole('button', { name: /confirmar suspensão/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A empresa já se encontra no estado suspensa');
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });
});
