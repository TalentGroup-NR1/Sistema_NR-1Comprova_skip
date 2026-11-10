import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertaDenunciasCard } from '../AlertaDenunciasCard';
import * as DenunciasHook from '@/hooks/useDenuncias';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useDenuncias', () => ({
  useIsResponsavelDenuncia: vi.fn(),
  useContarDenunciasNaoAssumidas: vi.fn(),
  useListarDenunciasParaAlerta: vi.fn(),
}));

describe('AlertaDenunciasCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AlertaDenunciasCard />
      </MemoryRouter>
    );
  };

  it('não renderiza se o usuário não for designado (isResponsavel = false)', () => {
    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: false,
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 2, total_novas_24h: 1, total_nao_assumidas: 2 },
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useListarDenunciasParaAlerta).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza se contagem for 0 em tudo (total_vencidas = 0 e total_nao_assumidas = 0)', () => {
    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 0, total_novas_24h: 0, total_nao_assumidas: 0 },
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useListarDenunciasParaAlerta).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it('renderiza estado Crítico (vermelho) quando houver denúncia vencida', () => {
    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 2, total_novas_24h: 0, total_nao_assumidas: 3 },
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useListarDenunciasParaAlerta).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderComponent();

    expect(screen.getByText(/denúncias com prazo VENCIDO/i)).toBeInTheDocument();
    expect(screen.getByText(/O prazo legal da Lei nº 14.457\/2022 expirou/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tratar denúncias/i })).toBeInTheDocument();
  });

  it('renderiza estado Urgente (laranja) quando houver nova ou não assumida (sem vencidas)', () => {
    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 0, total_novas_24h: 1, total_nao_assumidas: 1 },
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useListarDenunciasParaAlerta).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderComponent();

    expect(screen.getByText(/denúncia aguardando responsável/i)).toBeInTheDocument();
    expect(screen.getByText(/Há relato no pool compartilhado da empresa sem titular atribuído/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assumir apuração/i })).toBeInTheDocument();
  });

  it('botão direciona para /comportamentos-ofensivos ao ser clicado', () => {
    vi.mocked(DenunciasHook.useIsResponsavelDenuncia).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useContarDenunciasNaoAssumidas).mockReturnValue({
      data: { total_vencidas: 1, total_novas_24h: 0, total_nao_assumidas: 1 },
      isLoading: false,
    } as any);
    vi.mocked(DenunciasHook.useListarDenunciasParaAlerta).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderComponent();

    const button = screen.getByRole('button', { name: /Tratar denúncias/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/comportamentos-ofensivos');
  });
});
