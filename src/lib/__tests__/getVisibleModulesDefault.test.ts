import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regressão: a RPC get_visible_modules NÃO pode voltar a ser fail-closed para papéis
 * sem linha em module_visibility (migration 20261014120000 ocultou todos os módulos
 * de todos os colaboradores). Padrão intencional (13/10): sem linha => visível;
 * visible=false EXPLÍCITO continua sendo a exceção.
 * A verificação comportamental contra o banco está em
 * supabase/tests/get_visible_modules_regression.sql.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function latestDefinition(): { file: string; sql: string } {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const defining = files.filter((f) =>
    /CREATE OR REPLACE FUNCTION public\.get_visible_modules\(/i.test(
      readFileSync(join(MIGRATIONS_DIR, f), 'utf8'),
    ),
  );
  const file = defining[defining.length - 1];
  return { file, sql: readFileSync(join(MIGRATIONS_DIR, file), 'utf8') };
}

function cases(sql: string): string[] {
  // Blocos CASE ... END dentro do corpo da função
  return sql.match(/CASE[\s\S]*?END AS visible/g) ?? [];
}

describe('get_visible_modules - padrão de visibilidade (regressão fail-closed)', () => {
  const { file, sql } = latestDefinition();
  // Remove comentários de linha para não confundir com a documentação
  const code = sql.replace(/--.*$/gm, '');

  it('a definição mais recente é posterior à migration multiempresa que causou o fail-closed', () => {
    expect(file > '20261014120000_multiempresa_user_companies.sql').toBe(true);
  });

  it('papel sem linha em module_visibility é visível (ELSE true) em módulos e sub-rotas', () => {
    const blocks = cases(code);
    expect(blocks).toHaveLength(2); // resultado_calculado + resultado_subrotas
    for (const block of blocks) {
      expect(block).toMatch(/ELSE\s+true/);
      expect(block).not.toMatch(/ELSE\s+false/);
    }
  });

  it('false explícito (gestor_departamento/analista_rh) continua valendo', () => {
    for (const block of cases(code)) {
      expect(block).toMatch(/WHEN cp\.papel_visivel IS NOT NULL THEN cp\.papel_visivel/);
    }
  });

  it('company_modules.enabled=false desliga o módulo antes de qualquer papel (inclusive admin)', () => {
    for (const block of cases(code)) {
      const off = block.indexOf('cp.empresa_habilitou = false THEN false');
      const admin = block.indexOf("v_user_role IN ('admin_empresa', 'admin_master') THEN true");
      expect(off).toBeGreaterThan(-1);
      expect(admin).toBeGreaterThan(off);
    }
  });

  it('admin_empresa/admin_master veem tudo habilitado e super_admin tem bypass', () => {
    expect(code).toMatch(/v_user_role IN \('admin_empresa', 'admin_master'\) THEN true/);
    expect(code).toMatch(/IF v_is_super THEN/);
  });

  it('mantém a fronteira multi-tenant via user_companies (fail-closed sem vínculo)', () => {
    expect(code).toMatch(/FROM public\.user_companies\s+WHERE user_id = auth\.uid\(\) AND company_id = p_company_id/);
    expect(code).toMatch(/RETURN;/);
  });

  it('o seed de restrições do gestor segue usando false explícito', () => {
    const seed = readFileSync(
      join(MIGRATIONS_DIR, '20261008100000_gestor_default_visibility.sql'),
      'utf8',
    );
    expect(seed).toMatch(/'gestor_departamento', false/);
    expect(seed).toContain('/estrutura-organizacional');
    expect(seed).toContain('/mapa-riscos-nr1');
  });
});
