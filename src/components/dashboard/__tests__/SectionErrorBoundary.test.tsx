import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionErrorBoundary } from '../SectionErrorBoundary';

const FaultyComponent = () => {
  throw new Error('Falha simulada na seção');
};

const HealthyComponent = () => {
  return <div data-testid="healthy-component">Conteúdo Saudável</div>;
};

describe('SectionErrorBoundary — Isolamento de falhas por seção', () => {
  it('renderiza o conteúdo normalmente quando não há erros', () => {
    render(
      <SectionErrorBoundary title="Seção Normal">
        <HealthyComponent />
      </SectionErrorBoundary>
    );

    expect(screen.getByTestId('healthy-component')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo Saudável')).toBeInTheDocument();
  });

  it('captura o erro isoladamente e exibe o fallback sem derrubar o restante da página', () => {
    // Silencia o console.error esperado do teste
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <div>
        <SectionErrorBoundary title="Métricas Principais">
          <FaultyComponent />
        </SectionErrorBoundary>
        <div data-testid="other-dashboard-content">Outras Seções Funcionando</div>
      </div>
    );

    expect(screen.getByTestId('section-error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar Métricas Principais')).toBeInTheDocument();
    expect(screen.getByTestId('other-dashboard-content')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('permite passar fallback customizado quando fornecido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SectionErrorBoundary fallback={<div data-testid="custom-fallback">Fallback Custom</div>}>
        <FaultyComponent />
      </SectionErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Fallback Custom')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
