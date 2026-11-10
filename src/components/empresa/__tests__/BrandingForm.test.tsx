import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrandingForm } from '../BrandingForm';

describe('BrandingForm - Remoção de Logotipo e Feedback Visual', () => {
  const defaultProps = {
    brandName: 'Minha Empresa',
    onBrandNameChange: vi.fn(),
    primaryColor: '#C8102E',
    onPrimaryColorChange: vi.fn(),
    logoFile: null,
    onLogoFileChange: vi.fn(),
    currentLogoUrl: null,
    removeLogo: false,
    onRemoveLogoChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) clique em remover com logo pré-existente → preview some e dispara onRemoveLogoChange(true)', () => {
    const onRemoveLogoChange = vi.fn();
    const onLogoFileChange = vi.fn();

    const { rerender } = render(
      <BrandingForm
        {...defaultProps}
        currentLogoUrl="https://example.com/logo-antigo.png"
        removeLogo={false}
        onRemoveLogoChange={onRemoveLogoChange}
        onLogoFileChange={onLogoFileChange}
      />
    );

    // Preview do logo pré-existente está visível
    const imgPreview = screen.getByAltText('Pré-visualização do logotipo');
    expect(imgPreview).toBeInTheDocument();
    expect(imgPreview).toHaveAttribute('src', 'https://example.com/logo-antigo.png');

    // Botão remover está presente
    const btnRemover = screen.getByRole('button', { name: /Remover/i });
    fireEvent.click(btnRemover);

    // Dispara a remoção
    expect(onRemoveLogoChange).toHaveBeenCalledWith(true);

    // Quando o componente pai atualiza a prop removeLogo={true}, o preview some e o aviso de remoção aparece
    rerender(
      <BrandingForm
        {...defaultProps}
        currentLogoUrl="https://example.com/logo-antigo.png"
        removeLogo={true}
        onRemoveLogoChange={onRemoveLogoChange}
        onLogoFileChange={onLogoFileChange}
      />
    );

    expect(screen.queryByAltText('Pré-visualização do logotipo')).not.toBeInTheDocument();
    expect(screen.getByText('Logotipo marcado para remoção ao salvar.')).toBeInTheDocument();
  });

  it('(c) selecionar novo arquivo após remover → onRemoveLogoChange reseta para false', () => {
    const onRemoveLogoChange = vi.fn();
    const onLogoFileChange = vi.fn();

    render(
      <BrandingForm
        {...defaultProps}
        currentLogoUrl="https://example.com/logo-antigo.png"
        removeLogo={true}
        onRemoveLogoChange={onRemoveLogoChange}
        onLogoFileChange={onLogoFileChange}
      />
    );

    const fileInput = document.getElementById('wz-logo') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const newFile = new File(['dummy-content'], 'novo-logo.png', { type: 'image/png' });

    // Seleciona novo arquivo
    fireEvent.change(fileInput, { target: { files: [newFile] } });

    expect(onLogoFileChange).toHaveBeenCalledWith(newFile);
    expect(onRemoveLogoChange).toHaveBeenCalledWith(false);
  });

  it('clique em remover com arquivo recém-selecionado limpa o arquivo selecionado', () => {
    const onLogoFileChange = vi.fn();
    const file = new File(['dummy'], 'logo-recente.png', { type: 'image/png' });

    render(
      <BrandingForm
        {...defaultProps}
        logoFile={file}
        onLogoFileChange={onLogoFileChange}
      />
    );

    const btnRemover = screen.getByRole('button', { name: /Remover/i });
    fireEvent.click(btnRemover);

    expect(onLogoFileChange).toHaveBeenCalledWith(null);
  });
});
