/**
 * Testes de Integração de Habilitação do Catálogo Global (Etapa 8.6)
 *
 * Valida a policy `treinamentos_global_habilitado_select`:
 * - Colaborador empresa X vê global habilitado por X
 * - Colaborador empresa Y NÃO vê
 * - Colaborador NÃO vê global não habilitado
 * - Colaborador NÃO vê global em rascunho
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const hasIntegrationCredentials = Boolean(
  process.env.TEST_COLAB_EMPRESA_X_EMAIL &&
  process.env.TEST_COLAB_EMPRESA_X_PASSWORD &&
  process.env.TEST_COLAB_EMPRESA_Y_EMAIL &&
  process.env.TEST_COLAB_EMPRESA_Y_PASSWORD &&
  process.env.TEST_TREINAMENTO_GLOBAL_HABILITADO_ID &&
  process.env.TEST_TREINAMENTO_GLOBAL_NAO_HABILITADO_ID &&
  process.env.TEST_TREINAMENTO_GLOBAL_RASCUNHO_ID
);

const describeSuite = hasIntegrationCredentials ? describe : describe.skip;

describeSuite('Integração RLS: Habilitação de Catálogo Global por Empresa', () => {
  it('1. Colaborador da empresa X vê treinamento global habilitado por X', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_COLAB_EMPRESA_X_EMAIL!,
      password: process.env.TEST_COLAB_EMPRESA_X_PASSWORD!,
    });
    expect(authErr).toBeNull();

    const { data, error } = await supa
      .from('treinamentos')
      .select('id, titulo, origem, status')
      .eq('id', process.env.TEST_TREINAMENTO_GLOBAL_HABILITADO_ID!);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].origem).toBe('plataforma');
    expect(data?.[0].status).toBe('publicado');
  });

  it('2. Colaborador da empresa Y NÃO vê o treinamento global habilitado apenas por X', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_COLAB_EMPRESA_Y_EMAIL!,
      password: process.env.TEST_COLAB_EMPRESA_Y_PASSWORD!,
    });
    expect(authErr).toBeNull();

    const { data, error } = await supa
      .from('treinamentos')
      .select('id, titulo, origem, status')
      .eq('id', process.env.TEST_TREINAMENTO_GLOBAL_HABILITADO_ID!);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('3. Colaborador NÃO vê treinamento global publicado se não foi habilitado pela sua empresa', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_COLAB_EMPRESA_X_EMAIL!,
      password: process.env.TEST_COLAB_EMPRESA_X_PASSWORD!,
    });
    expect(authErr).toBeNull();

    const { data, error } = await supa
      .from('treinamentos')
      .select('id, titulo, origem, status')
      .eq('id', process.env.TEST_TREINAMENTO_GLOBAL_NAO_HABILITADO_ID!);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('4. Colaborador NÃO vê treinamento global em rascunho', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_COLAB_EMPRESA_X_EMAIL!,
      password: process.env.TEST_COLAB_EMPRESA_X_PASSWORD!,
    });
    expect(authErr).toBeNull();

    const { data, error } = await supa
      .from('treinamentos')
      .select('id, titulo, origem, status')
      .eq('id', process.env.TEST_TREINAMENTO_GLOBAL_RASCUNHO_ID!);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

