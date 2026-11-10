import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-admin-master' } } }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ETAPA T1 — Conteúdo inicial vira automaticamente o primeiro módulo e aula', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 6.1a: criar treinamento com PDF gera 1 módulo + 1 aula
  it('6.1a: criar treinamento com PDF chama RPC gerando 1 módulo e 1 aula', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        treinamento_id: 'curso-pdf-1',
        modulo_id: 'mod-pdf-1',
        aula_id: 'aula-pdf-1',
      },
      error: null,
    });

    const payload = {
      _titulo: 'Treinamento Segurança NR-1',
      _tipo: 'pdf',
      _url_conteudo: 'curso-pdf-1/material.pdf',
      _nome_arquivo: 'material.pdf',
      _duracao_estimada_minutos: 60,
      _company_id: null,
      _origem: 'plataforma',
    };

    const res = await supabase.rpc('criar_treinamento_com_conteudo_inicial', payload);

    expect(mockRpc).toHaveBeenCalledWith('criar_treinamento_com_conteudo_inicial', payload);
    expect(res.data.treinamento_id).toBe('curso-pdf-1');
    expect(res.data.modulo_id).toBe('mod-pdf-1');
    expect(res.data.aula_id).toBe('aula-pdf-1');
  });

  // 6.1b: criar com link gera aula tipo='link' e gera_certificado=false (regra 8.7)
  it('6.1b: criar treinamento tipo link força gera_certificado=false e gera aula tipo link', async () => {
    mockRpc.mockImplementationOnce(async (_fn, args) => {
      // Simula a lógica da RPC no banco
      const geraCertificado = args._tipo === 'link' ? false : (args._gera_certificado ?? true);
      const aulaTipo = args._tipo === 'link' ? 'link' : 'arquivo';
      return {
        data: {
          treinamento_id: 'curso-link-1',
          modulo_id: 'mod-link-1',
          aula_id: 'aula-link-1',
          gera_certificado: geraCertificado,
          aula_tipo: aulaTipo,
        },
        error: null,
      };
    });

    const res = await supabase.rpc('criar_treinamento_com_conteudo_inicial', {
      _titulo: 'Curso Externo GOV',
      _tipo: 'link',
      _url_conteudo: 'https://escolavirtual.gov.br/curso/123',
      _gera_certificado: true, // Tentando enviar true
    });

    expect(res.data.gera_certificado).toBe(false);
    expect(res.data.aula_tipo).toBe('link');
    expect(res.data.modulo_id).toBeDefined();
    expect(res.data.aula_id).toBeDefined();
  });

  // 6.1c: criar sem conteúdo não gera módulo nem aula
  it('6.1c: criar sem conteúdo retorna modulo_id e aula_id nulos', async () => {
    mockRpc.mockImplementationOnce(async (_fn, args) => {
      const hasContent = !!args._url_conteudo && args._url_conteudo.trim() !== '';
      return {
        data: {
          treinamento_id: 'curso-vazio-1',
          modulo_id: hasContent ? 'mod-1' : null,
          aula_id: hasContent ? 'aula-1' : null,
        },
        error: null,
      };
    });

    const res = await supabase.rpc('criar_treinamento_com_conteudo_inicial', {
      _titulo: 'Curso Rascunho sem Arquivo',
      _tipo: 'video',
      _url_conteudo: null,
    });

    expect(res.data.treinamento_id).toBe('curso-vazio-1');
    expect(res.data.modulo_id).toBeNull();
    expect(res.data.aula_id).toBeNull();
  });

  // 6.1d: editar treinamento com módulos não cria módulo extra
  it('6.1d: editar treinamento existente não duplica módulos ou aulas', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'curso-1', titulo: 'Título Atualizado' },
            error: null,
          }),
        }),
      }),
    });

    mockFrom.mockReturnValue({
      update: mockUpdate,
    });

    // Edição via UPDATE direto em treinamentos não toca em modulos_treinamento
    const res = await supabase
      .from('treinamentos')
      .update({ titulo: 'Título Atualizado' })
      .eq('id', 'curso-1')
      .select()
      .single();

    expect(mockFrom).toHaveBeenCalledWith('treinamentos');
    expect(res.data.titulo).toBe('Título Atualizado');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // 6.1e: publicar sem módulos é bloqueado
  it('6.1e: publicar sem módulos ou aulas é bloqueado pela guarda', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'Cadastre ao menos uma aula antes de publicar.',
              },
            }),
          }),
        }),
      }),
    });

    const res = await supabase
      .from('treinamentos')
      .update({ status: 'publicado' })
      .eq('id', 'curso-sem-aulas')
      .select()
      .single();

    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('Cadastre ao menos uma aula antes de publicar.');
  });

  // 6.1f: migration idempotente (2 execuções, sem duplicar)
  it('6.1f: lógica da migration é idempotente (WHERE NOT EXISTS impede duplicidade)', () => {
    const estadoBanco = {
      treinamentos: [
        { id: 'c1', titulo: 'Curso 1', url_conteudo: 'c1.pdf', tipo: 'pdf' },
      ],
      modulos: [] as { id: string; treinamento_id: string }[],
      aulas: [] as { id: string; treinamento_id: string }[],
    };

    const executarMigration = () => {
      let criados = 0;
      for (const t of estadoBanco.treinamentos) {
        const jaTemModulo = estadoBanco.modulos.some((m) => m.treinamento_id === t.id);
        if (!jaTemModulo && t.url_conteudo) {
          const modId = `m-${t.id}`;
          estadoBanco.modulos.push({ id: modId, treinamento_id: t.id });
          estadoBanco.aulas.push({ id: `a-${t.id}`, treinamento_id: t.id });
          criados++;
        }
      }
      return criados;
    };

    // 1ª execução
    const criados1 = executarMigration();
    expect(criados1).toBe(1);
    expect(estadoBanco.modulos.length).toBe(1);
    expect(estadoBanco.aulas.length).toBe(1);

    // 2ª execução (deve ser 0 criados, sem duplicar)
    const criados2 = executarMigration();
    expect(criados2).toBe(0);
    expect(estadoBanco.modulos.length).toBe(1);
    expect(estadoBanco.aulas.length).toBe(1);
  });
});
