import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanySuspendedBanner } from '../CompanySuspendedBanner';
import * as effectiveCompanyHook from '@/hooks/useEffectiveCompanyId';
import * as companyStatusHook from '@/hooks/useCompanyStatus';

vi.mock('@/hooks/useEffectiveCompanyId');
vi.mock('@/hooks/useCompanyStatus');

describe('CompanySuspendedBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o banner fixo de suspensão quando o status da empresa é suspensa', () => {
    vi.spyOn(effectiveCompanyHook, 'useEffectiveCompanyId').mockReturnValue('comp-123');
    vi.spyOn(companyStatusHook, 'useCompanyStatus').mockReturnValue({
      data: 'suspensa',
      isLoading: false,
    } as any);

    render(<CompanySuspendedBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Serviços suspensos. Regularize o pagamento.');
  });

  it('não renderiza o banner quando o status da empresa é ativa', () => {
    vi.spyOn(effectiveCompanyHook, 'useEffectiveCompanyId').mockReturnValue('comp-123');
    vi.spyOn(companyStatusHook, 'useCompanyStatus').mockReturnValue({
      data: 'ativa',
      isLoading: false,
    } as any);

    const { container } = render(<CompanySuspendedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza o banner quando não há empresa efetiva (Super Admin no Modo Plataforma)', () => {
    vi.spyOn(effectiveCompanyHook, 'useEffectiveCompanyId').mockReturnValue(null);
    vi.spyOn(companyStatusHook, 'useCompanyStatus').mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    const { container } = render(<CompanySuspendedBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
