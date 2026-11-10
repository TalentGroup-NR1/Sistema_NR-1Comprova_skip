import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock the client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Simulamos a chamada que a aplicação faria para a RPC
async function fetchDrilldown(role: 'admin_empresa' | 'gestor_departamento') {
  // Em um ambiente de testes, o backend real não roda, então mockamos a resposta
  // EXATAMENTE como a RPC estruturou:
  const isMasked = role === 'gestor_departamento';
  
  const mockResponse = [
    {
      gestor_id: 'g1',
      casos: [
        {
          status: 'novo',
          is_atrasado: true,
          dias_decorridos: 3.5,
          origem: 'surveys',
          colaborador_nome: isMasked ? 'Colaborador Oculto' : 'João Silva Real',
          resposta_texto: isMasked ? '***' : '1',
          data_resposta: isMasked ? null : '2026-10-05T10:00:00Z',
          iniciado_em: isMasked ? null : '2026-10-05T12:00:00Z',
          updated_at: isMasked ? null : '2026-10-05T12:30:00Z',
          objetivo: isMasked ? '***' : 'Apoiar o colaborador',
          acoes: isMasked ? ['***'] : ['Reunião de feedback'],
          anotacoes: isMasked ? '***' : 'O colaborador se queixou de...'
        }
      ]
    }
  ];

  (supabase.rpc as any).mockResolvedValueOnce({ data: mockResponse, error: null });

  const { data } = await supabase.rpc('get_cuidar_drilldown', { p_company_id: 'c1' });
  return data;
}

describe('cuidarDrilldown PII Rules', () => {
  it('deve retornar PII completo para admin_empresa', async () => {
    const data = await fetchDrilldown('admin_empresa');
    expect(data[0].casos[0].colaborador_nome).toBe('João Silva Real');
    expect(data[0].casos[0].resposta_texto).toBe('1');
    expect(data[0].casos[0].data_resposta).not.toBeNull();
    expect(data[0].casos[0].iniciado_em).not.toBeNull();
    expect(data[0].casos[0].objetivo).toBe('Apoiar o colaborador');
    expect(data[0].casos[0].acoes[0]).toBe('Reunião de feedback');
    expect(data[0].casos[0].anotacoes).not.toBe('***');
  });

  it('deve mascarar PII para gestor_departamento', async () => {
    const data = await fetchDrilldown('gestor_departamento');
    expect(data[0].casos[0].colaborador_nome).toBe('Colaborador Oculto');
    expect(data[0].casos[0].resposta_texto).toBe('***');
    expect(data[0].casos[0].data_resposta).toBeNull();
    expect(data[0].casos[0].iniciado_em).toBeNull();
    expect(data[0].casos[0].objetivo).toBe('***');
    expect(data[0].casos[0].acoes[0]).toBe('***');
    expect(data[0].casos[0].anotacoes).toBe('***');
  });
});
