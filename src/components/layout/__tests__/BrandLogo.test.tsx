import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandLogo } from '../BrandLogo';
import { DEFAULT_BRANDING } from '@/hooks/useBranding';

describe('BrandLogo component', () => {
  it('renders with custom logoUrl when valid', () => {
    render(<BrandLogo logoUrl="https://cdn.exemplo.com/logo.png" brandName="Horizonte" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.exemplo.com/logo.png');
    expect(img).toHaveAttribute('alt', 'Horizonte');
  });

  it('renders default fallback when logoUrl is empty, whitespace, or null', () => {
    const { rerender } = render(<BrandLogo logoUrl="" brandName="Sem Logo" />);
    let img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', DEFAULT_BRANDING.logoUrl);

    rerender(<BrandLogo logoUrl="   " brandName="Sem Logo" />);
    img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', DEFAULT_BRANDING.logoUrl);

    rerender(<BrandLogo logoUrl={null} brandName="Sem Logo" />);
    img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', DEFAULT_BRANDING.logoUrl);
  });

  it('falls back to default logo on image load error (onError) without looping', () => {
    render(<BrandLogo logoUrl="https://cdn.exemplo.com/quebrada.png" brandName="Quebrada" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.exemplo.com/quebrada.png');

    // Dispara erro de carregamento da imagem
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', DEFAULT_BRANDING.logoUrl);

    // Segundo disparo não deve causar loop ou crash
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', DEFAULT_BRANDING.logoUrl);
  });

  it('renders cached logo immediately when logoUrl is empty but cache exists in localStorage', () => {
    localStorage.setItem(
      'nr1_branding_data_last',
      JSON.stringify({ logoUrl: 'https://cdn.exemplo.com/cached-logo.png' })
    );

    render(<BrandLogo logoUrl="" brandName="Empresa com Cache" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.exemplo.com/cached-logo.png');

    localStorage.removeItem('nr1_branding_data_last');
  });
});
