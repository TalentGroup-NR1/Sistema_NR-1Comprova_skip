import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PulsoCampanhaModal } from '../PulsoCampanhaModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const mockCampaignNew = {
  campaign_id: 'c6a1c511-3dd8-4188-b634-11aee8f17815',
  titulo: 'Pulso - sexta - 18/09/2026',
  descricao: '',
  data_inicio: '2026-09-18',
  data_fim: '2026-09-18',
  has_responded: false,
  questions: [
    {
      id: '35fe4d0d-1c79-44c4-9813-4c9fd8f671c5',
      tipo: 'escala_0_5' as const,
      ordem: 0,
      pergunta: 'Como foi sua semana de trabalho?',
      obrigatoria: true,
      campaign_id: 'c6a1c511-3dd8-4188-b634-11aee8f17815',
      created_at: '2026-09-18T17:36:40.371683+00:00'
    }
  ]
};

const mockCampaignOld = {
  campaign_id: '99ce99b7-9440-411a-90ae-b05443befe90',
  titulo: 'Pulso da Semana 38',
  descricao: '',
  data_inicio: '2026-06-26',
  data_fim: '2026-06-26',
  has_responded: false,
  questions: [
    {
      id: '22049e9e-04d3-4695-82e1-132d38082a26',
      tipo: 'escala_0_5' as const,
      ordem: 1,
      pergunta: 'Como foi sua semana?',
      obrigatoria: true,
      campaign_id: '99ce99b7-9440-411a-90ae-b05443befe90',
      created_at: '2026-06-26T14:12:28.770452+00:00'
    }
  ]
};

describe('PulsoCampanhaModal Debug', () => {
  it('testa pulso novo', () => {
    render(<PulsoCampanhaModal open={true} onOpenChange={() => {}} campaign={mockCampaignNew} />, { wrapper: Wrapper });
    const btn = screen.getByText('😢');
    fireEvent.click(btn);
    const btnAvancar = screen.getByText('Finalizar');
    fireEvent.click(btnAvancar);
  });

  it('testa pulso antigo', () => {
    render(<PulsoCampanhaModal open={true} onOpenChange={() => {}} campaign={mockCampaignOld} />, { wrapper: Wrapper });
    const btn = screen.getByText('😢');
    fireEvent.click(btn);
    const btnAvancar = screen.getByText('Finalizar');
    fireEvent.click(btnAvancar);
  });
});
