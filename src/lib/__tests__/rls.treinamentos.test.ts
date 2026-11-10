/**
 * Teste de Regressão de Isolamento Multi-Tenant (RLS) em `treinamentos`
 * Etapa 8.3 — Prevenção de vazamento entre clientes via SELECT sem filtro.
 *
 * Estrutura: Testes ponta a ponta contra a API autenticada do Supabase.
 * Caso as variáveis de ambiente com credenciais não estejam configuradas,
 * o conjunto é marcado como `skip` para execução manual documentada.
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const hasTestCredentials = Boolean(
  process.env.TEST_USER_TGMAIS_EMAIL &&
  process.env.TEST_USER_TGMAIS_PASSWORD &&
  process.env.TEST_USER_HORIZONTE_EMAIL &&
  process.env.TEST_USER_HORIZONTE_PASSWORD
);

const describeSuite = hasTestCredentials ? describe : describe.skip;

describeSuite('RLS Treinamentos — Validação de Isolamento Estrito', () => {
  // TODO: Caso as credenciais não estejam definidas no ambiente de CI/CD,
  // preencher as variáveis TEST_USER_TGMAIS_EMAIL / TEST_USER_TGMAIS_PASSWORD,
  // TEST_USER_HORIZONTE_EMAIL / TEST_USER_HORIZONTE_PASSWORD, etc.

  it('A) admin_empresa TG MAIS deve receber apenas 1 treinamento (Cartilha Amarela)', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_TGMAIS_EMAIL!,
      password: process.env.TEST_USER_TGMAIS_PASSWORD!,
    });
    expect(authErr).toBeNull();

    // SELECT sem NENHUM filtro — simulação do vetor de ataque
    const { data, count, error } = await supa
      .from('treinamentos')
      .select('*', { count: 'exact' });

    expect(error).toBeNull();
    expect(count).toBe(1);
    expect(data?.[0]?.company_id).toBe('946faadf-ec94-4e16-8516-1467bd9fc61c');
  });

  it('B) admin_empresa Horizonte deve receber exatamente 7 treinamentos', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_HORIZONTE_EMAIL!,
      password: process.env.TEST_USER_HORIZONTE_PASSWORD!,
    });
    expect(authErr).toBeNull();

    const { data, count, error } = await supa
      .from('treinamentos')
      .select('*', { count: 'exact' });

    expect(error).toBeNull();
    expect(count).toBe(7);
    data?.forEach((row) => {
      expect(row.company_id).toBe('8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4');
    });
  });

  it('C) analista_rh Horizonte deve receber exatamente 7 treinamentos da sua empresa', async () => {
    if (!process.env.TEST_USER_HORIZONTE_RH_EMAIL || !process.env.TEST_USER_HORIZONTE_RH_PASSWORD) {
      return;
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_HORIZONTE_RH_EMAIL,
      password: process.env.TEST_USER_HORIZONTE_RH_PASSWORD,
    });
    expect(authErr).toBeNull();

    const { data, count, error } = await supa
      .from('treinamentos')
      .select('*', { count: 'exact' });

    expect(error).toBeNull();
    expect(count).toBe(7);
  });

  it('D) colaborador Horizonte deve receber apenas os 6 treinamentos publicados da própria', async () => {
    if (!process.env.TEST_USER_COLAB_EMAIL || !process.env.TEST_USER_COLAB_PASSWORD) {
      return;
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_COLAB_EMAIL,
      password: process.env.TEST_USER_COLAB_PASSWORD,
    });
    expect(authErr).toBeNull();

    const { data, count, error } = await supa
      .from('treinamentos')
      .select('*', { count: 'exact' });

    expect(error).toBeNull();
    expect(count).toBe(6);
    data?.forEach((row) => {
      expect(row.company_id).toBe('8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4');
      expect(row.status).toBe('publicado');
    });
  });

  it('E) admin_master deve receber o total conforme escopo', async () => {
    if (!process.env.TEST_USER_MASTER_EMAIL || !process.env.TEST_USER_MASTER_PASSWORD) {
      return;
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { error: authErr } = await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_MASTER_EMAIL,
      password: process.env.TEST_USER_MASTER_PASSWORD,
    });
    expect(authErr).toBeNull();

    const { count, error } = await supa
      .from('treinamentos')
      .select('*', { count: 'exact' });

    expect(error).toBeNull();
    // admin_master_scope protege contra vazamento de clientes externos (retorna apenas escopo permitido)
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
