import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlataformaEmpresasTable, renderCompanyStatusBadge } from '../PlataformaEmpresasTable';
import * as plataformaHook from '@/hooks/usePlataforma';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/usePlataforma');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PlataformaEmpresasTable — Máquina de Estados e Ciclo de Vida', () => {
  const mockEmpresas: plataformaHook.PlataformaEmpresa[] = [
    {
      id: 'emp-1',
      name: 'Empresa Ativa LTDA',
      brand_name: 'Empresa Ativa',
      cnpj: '11.111.111/0001-11',
      status: 'ativa',
      is_internal: false,
      created_at: '2026-01-01T00:00:00.000Z',
      total_colaboradores: 10,
    },
    {
      id: 'emp-2',
      name: 'Empresa Suspensa LTDA',
      brand_name: 'Empresa Suspensa',
      cnpj: '22.222.222/0001-22',
      status: 'suspensa',
      is_internal: false,
      created_at: '2026-01-01T00:00:00.000Z',
      total_colaboradores: 5,
    },
    {
      id: 'emp-3',
      name: 'Empresa Encerrada LTDA',
      brand_name: 'Empresa Encerrada',
      cnpj: '33.333.333/0001-33',
      status: 'encerrada',
      is_internal: false,
      created_at: '2026-01-01T00:00:00.000Z',
      total_colaboradores: 0,
    },
    {
      id: 'emp-4',
      name: 'Empresa Interna LTDA',
      brand_name: 'Empresa Interna',
      cnpj: '44.444.444/0001-44',
      status: 'ativa',
      is_internal: true,
      created_at: '2026-01-01T00:00:00.000Z',
      total_colaboradores: 2,
    },
  ];

  it('renderiza os 3 badges de status corretamente: Ativa, Suspensa e Encerrada', () => {
    vi.spyOn(plataformaHook, 'usePlataformaEmpresas').mockReturnValue({
      data: mockEmpresas,
      isLoading: false,
    } as any);

    renderWithClient(<PlataformaEmpresasTable />);

    expect(screen.getAllByText('Ativa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Suspensa')).toBeInTheDocument();
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
  });

  it('empresa ativa exibe botão Suspender; empresa suspensa exibe botão Reativar; empresa encerrada exibe Terminal', () => {
    vi.spyOn(plataformaHook, 'usePlataformaEmpresas').mockReturnValue({
      data: mockEmpresas,
      isLoading: false,
    } as any);

    renderWithClient(<PlataformaEmpresasTable />);

    const suspenderBtns = screen.getAllByRole('button', { name: /^suspender$/i });
    expect(suspenderBtns.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /^reativar$/i })).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('empresa interna possui botão de suspender desabilitado', () => {
    vi.spyOn(plataformaHook, 'usePlataformaEmpresas').mockReturnValue({
      data: [mockEmpresas[3]],
      isLoading: false,
    } as any);

    renderWithClient(<PlataformaEmpresasTable />);

    const suspenderBtn = screen.getByRole('button', { name: /^suspender$/i });
    expect(suspenderBtn).toBeDisabled();
  });

  it('status desconhecido renderiza badge neutro "—", emite console.warn e não exibe botões de transição', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unknownEmpresa: plataformaHook.PlataformaEmpresa = {
      id: 'emp-unknown',
      name: 'Empresa Desconhecida LTDA',
      brand_name: 'Desconhecida',
      cnpj: '99.999.999/0001-99',
      status: 'invalido' as any,
      is_internal: false,
      created_at: '2026-01-01T00:00:00.000Z',
      total_colaboradores: 1,
    };

    vi.spyOn(plataformaHook, 'usePlataformaEmpresas').mockReturnValue({
      data: [unknownEmpresa],
      isLoading: false,
    } as any);

    renderWithClient(<PlataformaEmpresasTable />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PlataformaEmpresasTable] Status desconhecido para empresa: "invalido"')
    );
    expect(screen.queryByRole('button', { name: /^suspender$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reativar$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Terminal')).not.toBeInTheDocument();

    warnSpy.mockRestore();
  });

  it('renderCompanyStatusBadge retorna as variantes e classes corretas para cada status', () => {
    const { container: ativaContainer } = render(renderCompanyStatusBadge('ativa'));
    expect(ativaContainer.textContent).toBe('Ativa');
    expect(ativaContainer.firstElementChild?.className).toContain('bg-emerald-600');

    const { container: suspensaContainer } = render(renderCompanyStatusBadge('suspensa'));
    expect(suspensaContainer.textContent).toBe('Suspensa');
    expect(suspensaContainer.firstElementChild?.className).toContain('bg-amber-500/15');

    const { container: encerradaContainer } = render(renderCompanyStatusBadge('encerrada'));
    expect(encerradaContainer.textContent).toBe('Encerrada');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container: unknownContainer } = render(renderCompanyStatusBadge('xyz'));
    expect(unknownContainer.textContent).toBe('—');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
