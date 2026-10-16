BEGIN;

-- 1. Aplicar a migration no escopo da transação de teste
CREATE OR REPLACE FUNCTION public.can_access_cuidar_plus_alvos(p_questionario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = p_questionario_id
      AND (
        is_admin_master(auth.uid())
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = q.company_id
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND p.company_id = q.company_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_cuidar_plus_alvos(p_questionario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = p_questionario_id
      AND (
        is_admin_master(auth.uid())
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = q.company_id
            AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND p.company_id = q.company_id
            AND (
              has_role(auth.uid(), 'admin_empresa'::app_role)
              OR has_role(auth.uid(), 'analista_rh'::app_role)
            )
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_cuidar_plus_alvos(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_cuidar_plus_alvos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_cuidar_plus_alvos(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_cuidar_plus_alvos(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can access their company cuidamais alvos" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_select_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_insert_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_update_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_delete_scoped" ON public.questionarios_cuidar_plus_alvos;

CREATE POLICY "questionarios_cuidar_plus_alvos_select_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR SELECT
TO authenticated
USING (can_access_cuidar_plus_alvos(questionario_id));

CREATE POLICY "questionarios_cuidar_plus_alvos_admin_insert_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR INSERT
TO authenticated
WITH CHECK (can_manage_cuidar_plus_alvos(questionario_id));

CREATE POLICY "questionarios_cuidar_plus_alvos_admin_update_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR UPDATE
TO authenticated
USING (can_manage_cuidar_plus_alvos(questionario_id))
WITH CHECK (can_manage_cuidar_plus_alvos(questionario_id));

CREATE POLICY "questionarios_cuidar_plus_alvos_admin_delete_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR DELETE
TO authenticated
USING (can_manage_cuidar_plus_alvos(questionario_id));

-- Revoke DML anon
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.module_visibility FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pulse_campaigns_alvos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.questionarios_cuidar_plus_alvos FROM anon;

CREATE TEMP TABLE test_results (
  test_num int,
  test_name text,
  status text,
  details text
);
GRANT ALL ON test_results TO authenticated;
GRANT ALL ON test_results TO anon;

DO $$
DECLARE
  v_mary uuid := 'bbe29d21-199e-46bd-b8bd-5bf622149c66'; -- Colaboradora NRCP
  v_nrcp_admin uuid := 'b0f6068f-21b4-49e0-b122-53441e2f10d1'; -- Admin NRCP (Mariana)
  v_nrcp_id uuid := '540d02bd-8d5d-429b-b695-8a66f46c499d';
  v_q_id uuid := gen_random_uuid();
  v_alvo_id uuid := gen_random_uuid();
  v_count int;
BEGIN
  -- Inserir questionário sintético pertencente à NR-1 COM PROVA
  INSERT INTO public.questionarios_cuidar_plus (id, company_id, titulo, audiencia_tipo)
  VALUES (v_q_id, v_nrcp_id, 'Questionário Clima Teste', 'departamentos');

  -- Admin insere o alvo inicial
  INSERT INTO public.questionarios_cuidar_plus_alvos (id, questionario_id, departamento_nome)
  VALUES (v_alvo_id, v_q_id, 'Tecnologia da Informação');

  -- =========================================================================
  -- TESTE 1: NEGAÇÃO - Colaborador (Mary) tenta INSERT em questionarios_cuidar_plus_alvos
  -- =========================================================================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mary, 'role', 'authenticated')::text, true);

  BEGIN
    INSERT INTO public.questionarios_cuidar_plus_alvos (id, questionario_id, departamento_nome)
    VALUES (gen_random_uuid(), v_q_id, 'Financeiro Tentativa Colaborador');
    INSERT INTO test_results VALUES (1, 'Colaborador tenta INSERT em cuidamais_alvos', 'FAIL', 'Colaborador conseguiu inserir alvo!');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (1, 'Colaborador tenta INSERT em cuidamais_alvos', 'PASS', 'Bloqueado por RLS (insufficient_privilege)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (1, 'Colaborador tenta INSERT em cuidamais_alvos', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 2: NEGAÇÃO - Colaborador (Mary) tenta UPDATE em questionarios_cuidar_plus_alvos
  -- =========================================================================
  BEGIN
    UPDATE public.questionarios_cuidar_plus_alvos
    SET departamento_nome = 'RH Invasivo'
    WHERE id = v_alvo_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      INSERT INTO test_results VALUES (2, 'Colaborador tenta UPDATE em cuidamais_alvos', 'PASS', '0 linhas atualizadas (bloqueado por RLS)');
    ELSE
      INSERT INTO test_results VALUES (2, 'Colaborador tenta UPDATE em cuidamais_alvos', 'FAIL', 'Colaborador conseguiu alterar linha existente!');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (2, 'Colaborador tenta UPDATE em cuidamais_alvos', 'PASS', 'Bloqueado por RLS (insufficient_privilege)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (2, 'Colaborador tenta UPDATE em cuidamais_alvos', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 3: NEGAÇÃO - Colaborador (Mary) tenta DELETE em questionarios_cuidar_plus_alvos
  -- =========================================================================
  BEGIN
    DELETE FROM public.questionarios_cuidar_plus_alvos
    WHERE id = v_alvo_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      INSERT INTO test_results VALUES (3, 'Colaborador tenta DELETE em cuidamais_alvos', 'PASS', '0 linhas deletadas (bloqueado por RLS)');
    ELSE
      INSERT INTO test_results VALUES (3, 'Colaborador tenta DELETE em cuidamais_alvos', 'FAIL', 'Colaborador conseguiu deletar linha existente!');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (3, 'Colaborador tenta DELETE em cuidamais_alvos', 'PASS', 'Bloqueado por RLS (insufficient_privilege)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (3, 'Colaborador tenta DELETE em cuidamais_alvos', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 4: LEITURA - Colaborador (Mary) pode ler os alvos de sua empresa
  -- =========================================================================
  SELECT count(*) INTO v_count FROM public.questionarios_cuidar_plus_alvos WHERE id = v_alvo_id;
  IF v_count = 1 THEN
    INSERT INTO test_results VALUES (4, 'Colaborador lê alvos da própria empresa', 'PASS', 'Colaborador visualiza os alvos normalmente (count = 1)');
  ELSE
    INSERT INTO test_results VALUES (4, 'Colaborador lê alvos da própria empresa', 'FAIL', 'Colaborador não conseguiu ler alvos da própria empresa');
  END IF;

  -- =========================================================================
  -- TESTE 5: PERMISSÃO - Admin (Mariana) insere, atualiza e deleta alvos
  -- =========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_nrcp_admin, 'role', 'authenticated')::text, true);

  BEGIN
    -- Inserir novo alvo
    INSERT INTO public.questionarios_cuidar_plus_alvos (id, questionario_id, departamento_nome)
    VALUES (gen_random_uuid(), v_q_id, 'Comercial Admin');

    -- Atualizar alvo existente
    UPDATE public.questionarios_cuidar_plus_alvos
    SET departamento_nome = 'Tecnologia da Informação e Inovação'
    WHERE id = v_alvo_id;

    -- Deletar alvo existente
    DELETE FROM public.questionarios_cuidar_plus_alvos
    WHERE id = v_alvo_id;

    INSERT INTO test_results VALUES (5, 'Admin insere, edita e deleta alvos', 'PASS', 'Admin executou INSERT, UPDATE e DELETE com sucesso');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (5, 'Admin insere, edita e deleta alvos', 'FAIL', 'Erro admin: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 6: ANON DML - Tentativa de escrita direta por role anon
  -- =========================================================================
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  -- 6a. questionarios_cuidar_plus_alvos INSERT
  BEGIN
    INSERT INTO public.questionarios_cuidar_plus_alvos (id, questionario_id, departamento_nome)
    VALUES (gen_random_uuid(), v_q_id, 'Tentativa Anon');
    INSERT INTO test_results VALUES (6, 'anon tenta INSERT em cuidamais_alvos', 'FAIL', 'anon conseguiu inserir!');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (6, 'anon tenta INSERT em cuidamais_alvos', 'PASS', 'Bloqueado com permission denied / insufficient_privilege (grant revogado)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (6, 'anon tenta INSERT em cuidamais_alvos', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- 6b. module_visibility UPDATE
  BEGIN
    UPDATE public.module_visibility SET visible = false WHERE module_key = 'teste_anon';
    INSERT INTO test_results VALUES (7, 'anon tenta UPDATE em module_visibility', 'FAIL', 'anon conseguiu update!');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (7, 'anon tenta UPDATE em module_visibility', 'PASS', 'Bloqueado com permission denied / insufficient_privilege (grant revogado)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (7, 'anon tenta UPDATE em module_visibility', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- 6c. pulse_campaigns_alvos DELETE
  BEGIN
    DELETE FROM public.pulse_campaigns_alvos WHERE id = gen_random_uuid();
    INSERT INTO test_results VALUES (8, 'anon tenta DELETE em pulse_campaigns_alvos', 'FAIL', 'anon conseguiu delete!');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (8, 'anon tenta DELETE em pulse_campaigns_alvos', 'PASS', 'Bloqueado com permission denied / insufficient_privilege (grant revogado)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (8, 'anon tenta DELETE em pulse_campaigns_alvos', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  RESET ROLE;
END $$;

SELECT test_num, test_name, status, details FROM test_results ORDER BY test_num;

ROLLBACK;
