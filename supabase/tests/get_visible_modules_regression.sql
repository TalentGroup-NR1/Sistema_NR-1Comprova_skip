-- Teste de regressão (SQL) da RPC get_visible_modules.
-- Executar: npx supabase db query --linked -f supabase/tests/get_visible_modules_regression.sql
-- Tudo roda em transação revertida (ROLLBACK): nenhum dado é persistido.
-- Qualquer asserção falha => RAISE EXCEPTION (exit code != 0).
BEGIN;

DO $$
DECLARE
  v_co uuid := (SELECT id FROM public.companies ORDER BY created_at LIMIT 1);
  v_colab uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_analista uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_total int; v_vis int; v_hidden text;
  v_off text;
BEGIN
  -- Cenário limpo para a empresa de teste
  DELETE FROM public.module_visibility WHERE company_id = v_co;
  UPDATE public.company_modules SET enabled = true WHERE company_id = v_co;

  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_colab,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg-colab@invalid.test'),
    (v_gestor,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg-gestor@invalid.test'),
    (v_analista, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg-analista@invalid.test'),
    (v_admin,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg-admin@invalid.test');

  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_colab, 'colaborador'), (v_gestor, 'gestor_departamento'),
    (v_analista, 'analista_rh'), (v_admin, 'admin_empresa')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_companies (user_id, company_id, role, is_default) VALUES
    (v_colab, v_co, 'colaborador', true), (v_gestor, v_co, 'gestor_departamento', true),
    (v_analista, v_co, 'analista_rh', true), (v_admin, v_co, 'admin_empresa', true)
  ON CONFLICT (user_id, company_id) DO UPDATE SET role = EXCLUDED.role;

  -- Restrições deliberadas (equivalentes ao seed 20261008100000)
  INSERT INTO public.module_visibility (company_id, module_key, role, visible) VALUES
    (v_co, '/estrutura-organizacional', 'gestor_departamento', false),
    (v_co, '/mapa-riscos-nr1', 'gestor_departamento', false);

  -- 1. Colaborador SEM linhas em module_visibility: tudo visível (padrão restaurado)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  SELECT count(*), count(*) FILTER (WHERE visible) INTO v_total, v_vis FROM public.get_visible_modules(v_co);
  IF v_total = 0 OR v_vis <> v_total THEN
    RAISE EXCEPTION 'REGRESSAO: colaborador deveria ver todos (% de %)', v_vis, v_total;
  END IF;

  -- 2. analista_rh SEM linhas: tudo visível
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_analista, 'role', 'authenticated')::text, true);
  SELECT count(*), count(*) FILTER (WHERE visible) INTO v_total, v_vis FROM public.get_visible_modules(v_co);
  IF v_total = 0 OR v_vis <> v_total THEN
    RAISE EXCEPTION 'REGRESSAO: analista_rh deveria ver todos (% de %)', v_vis, v_total;
  END IF;

  -- 3. gestor_departamento: false EXPLÍCITO continua valendo (e só ele, + sub-rotas dos pais)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_gestor, 'role', 'authenticated')::text, true);
  SELECT count(*), count(*) FILTER (WHERE visible) INTO v_total, v_vis FROM public.get_visible_modules(v_co);
  IF v_vis = 0 OR v_vis = v_total THEN
    RAISE EXCEPTION 'REGRESSAO: gestor deveria ver a maioria, exceto restritos (% de %)', v_vis, v_total;
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_visible_modules(v_co)
             WHERE module_key IN ('/estrutura-organizacional', '/mapa-riscos-nr1') AND visible) THEN
    RAISE EXCEPTION 'REGRESSAO: gestor NAO pode ver /estrutura-organizacional nem /mapa-riscos-nr1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_visible_modules(v_co) WHERE module_key = '/colaboradores' AND visible) THEN
    RAISE EXCEPTION 'REGRESSAO: gestor deveria ver /colaboradores';
  END IF;

  -- 4. Admin: vê tudo habilitado
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT count(*), count(*) FILTER (WHERE visible) INTO v_total, v_vis FROM public.get_visible_modules(v_co);
  IF v_total = 0 OR v_vis <> v_total THEN
    RAISE EXCEPTION 'REGRESSAO: admin_empresa deveria ver todos (% de %)', v_vis, v_total;
  END IF;

  -- 5. company_modules.enabled=false desliga o módulo para TODOS os papéis (inclusive admin)
  SELECT module_key INTO v_off FROM public.company_modules WHERE company_id = v_co ORDER BY module_key LIMIT 1;
  IF v_off IS NULL THEN
    RAISE EXCEPTION 'REGRESSAO: empresa de teste sem company_modules';
  END IF;
  UPDATE public.company_modules SET enabled = false WHERE company_id = v_co AND module_key = v_off;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  IF EXISTS (SELECT 1 FROM public.get_visible_modules(v_co) WHERE module_key = v_off AND visible) THEN
    RAISE EXCEPTION 'REGRESSAO: admin ainda ve modulo % desligado na empresa', v_off;
  END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_colab, 'role', 'authenticated')::text, true);
  IF EXISTS (SELECT 1 FROM public.get_visible_modules(v_co) WHERE module_key = v_off AND visible) THEN
    RAISE EXCEPTION 'REGRESSAO: colaborador ainda ve modulo % desligado na empresa', v_off;
  END IF;

  RAISE NOTICE 'OK: get_visible_modules - todas as asserções passaram (modulo desligado testado: %)', v_off;
END $$;

ROLLBACK;
