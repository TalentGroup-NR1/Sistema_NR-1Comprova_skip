import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreferenciasDialog } from '../PreferenciasDialog';

const mockMutate = vi.fn();
let mockThemeColor: string | null = null;
let mockCompanyPrimaryColor = '#0D13C5';

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    themeColor: mockThemeColor,
    updateThemeColor: {
      mutate: mockMutate,
      isPending: false,
    },
  }),
}));

vi.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({
    companyPrimaryColor: mockCompanyPrimaryColor,
    primaryColor: mockThemeColor || mockCompanyPrimaryColor,
  }),
}));

describe('PreferenciasDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeColor = null;
    mockCompanyPrimaryColor = '#0D13C5';
  });

  it('1. Quando themeColor é nulo: exibe placeholder e cor da empresa como fallback (#0D13C5)', () => {
    render(<PreferenciasDialog open={true} onOpenChange={() => {}} />);

    const input = screen.getByPlaceholderText('#0D13C5');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');

    // Botão "Usar cor da empresa" exibe a cor da empresa
    expect(screen.getByText(/Usar cor da empresa \(#0D13C5\)/i)).toBeInTheDocument();
  });

  it('2. Selecionar preset (Verde) e salvar: chama updateThemeColor.mutate com #10B981', () => {
    const onOpenChange = vi.fn();
    render(<PreferenciasDialog open={true} onOpenChange={onOpenChange} />);

    // Clica no preset "Verde"
    const verdeBtn = screen.getByRole('button', { name: /Verde/i });
    fireEvent.click(verdeBtn);

    // Salvar
    const salvarBtn = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(salvarBtn);

    expect(mockMutate).toHaveBeenCalledWith('#10B981');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('3. Clicar em "Usar cor da empresa" e salvar: chama updateThemeColor.mutate com null', () => {
    mockThemeColor = '#10B981';
    const onOpenChange = vi.fn();
    render(<PreferenciasDialog open={true} onOpenChange={onOpenChange} />);

    // Clica em "Usar cor da empresa"
    const resetBtn = screen.getByRole('button', { name: /Usar cor da empresa/i });
    fireEvent.click(resetBtn);

    // Salvar
    const salvarBtn = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(salvarBtn);

    expect(mockMutate).toHaveBeenCalledWith(null);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
