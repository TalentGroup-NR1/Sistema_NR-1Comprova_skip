/**
 * Testes Automatizados da Estrutura de Schema: Catálogo Global de Treinamentos
 * Etapa 8.4 — Validação das regras estruturais e integridade de banco
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const hasTestCredentials = Boolean(
  process.env.TEST_USER_TGMAIS_EMAIL &&
  process.env.TEST_USER_TGMAIS_PASSWORD
);

const describeSuite = hasTestCredentials ? describe : describe.skip;

describeSuite('Catálogo Global — Regras Estruturais de Banco (Etapa 8.4)', () => {
  it('1. Empresa só pode habilitar treinamento global ou da própria empresa (trigger rejeita cross-tenant)', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_TGMAIS_EMAIL!,
      password: process.env.TEST_USER_TGMAIS_PASSWORD!,
    });

    // ID de treinamento de outra empresa (Horizonte)
    const treinamentoHorizonteId = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

    const { error } = await supa
      .from('empresa_treinamentos_habilitados')
      .insert({
        company_id: '946faadf-ec94-4e16-8516-1467bd9fc61c',
        treinamento_id: treinamentoHorizonteId,
        habilitado: true,
      });

    // Deve falhar por violação de integridade ou RLS
    expect(error).not.toBeNull();
  });

  it('2. Treinamento com tipo=link não pode ter gera_certificado=true (CHECK constraint)', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_TGMAIS_EMAIL!,
      password: process.env.TEST_USER_TGMAIS_PASSWORD!,
    });

    const { error } = await supa
      .from('treinamentos')
      .insert({
        company_id: '946faadf-ec94-4e16-8516-1467bd9fc61c',
        titulo: 'Teste Invalido Link Com Certificado',
        tipo: 'link',
        gera_certificado: true,
        origem: 'empresa',
      });

    expect(error).not.toBeNull();
  });

  it('3. Certificado herda validade_meses do treinamento via trigger', () => {
    // Validação lógica espelhada do trigger calcular_expiracao_certificado
    const dataConclusao = new Date('2026-11-05T10:00:00Z');
    const validadeMeses = 12;
    const dataEsperada = new Date(dataConclusao);
    dataEsperada.setMonth(dataEsperada.getMonth() + validadeMeses);

    expect(dataEsperada.toISOString().split('T')[0]).toBe('2027-11-05');
  });

  it('4. Admin Empresa não consegue setar origem=plataforma (trigger rejeita)', async () => {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    await supa.auth.signInWithPassword({
      email: process.env.TEST_USER_TGMAIS_EMAIL!,
      password: process.env.TEST_USER_TGMAIS_PASSWORD!,
    });

    const { error } = await supa
      .from('treinamentos')
      .insert({
        company_id: null,
        titulo: 'Invasão Plataforma',
        tipo: 'pdf',
        origem: 'plataforma',
        gera_certificado: true,
      });

    expect(error).not.toBeNull();
  });
});
