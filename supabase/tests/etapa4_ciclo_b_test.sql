BEGIN;

-- 1. Aplicar a migration no escopo da transação de teste
CREATE OR REPLACE FUNCTION public.get_visible_modules(p_company_id uuid)
RETURNS TABLE(module_key text, visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_role app_role;
    v_is_super boolean;
BEGIN
    SELECT has_role(auth.uid(), 'super_admin') INTO v_is_super;

    -- 1. Super Admin vê tudo, sempre
    IF v_is_super THEN
        RETURN QUERY
        SELECT c.module_key, true FROM public.catalogo_modulos c WHERE c.ativo = true
        UNION
        SELECT unnest(c.sub_rotas), true FROM public.catalogo_modulos c
        WHERE c.ativo = true AND array_length(c.sub_rotas, 1) > 0;
        RETURN;
    END IF;

    -- 2. Multi-tenant boundary com user_companies (Ciclo B: fonte única de vínculo)
    SELECT role INTO v_user_role
    FROM public.user_companies
    WHERE user_id = auth.uid() AND company_id = p_company_id;

    IF v_user_role IS NULL THEN
        -- Sem vínculo em user_companies com a empresa solicitada: fail-closed imediato
        RETURN;
    END IF;

    RETURN QUERY
    WITH cascata_principal AS (
      SELECT 
        c.module_key,
        c.sub_rotas,
        COALESCE(cm.enabled, true) AS empresa_habilitou,
        mv.visible AS papel_visivel
      FROM public.catalogo_modulos c
      LEFT JOIN public.company_modules cm 
        ON cm.company_id = p_company_id AND cm.module_key = c.module_key
      LEFT JOIN public.module_visibility mv
        ON mv.company_id = p_company_id AND mv.module_key = c.module_key AND mv.role = v_user_role
      WHERE c.ativo = true
    ),
    resultado_calculado AS (
      SELECT 
        cp.module_key,
        CASE
          WHEN cp.empresa_habilitou = false THEN false
          WHEN v_user_role IN ('admin_empresa', 'admin_master') THEN true
          WHEN cp.papel_visivel IS NOT NULL THEN cp.papel_visivel
          ELSE true
        END AS visible
      FROM cascata_principal cp
    ),
    resultado_subrotas AS (
      SELECT 
        unnest(cp.sub_rotas) AS module_key,
        CASE
          WHEN cp.empresa_habilitou = false THEN false
          WHEN v_user_role IN ('admin_empresa', 'admin_master') THEN true
          WHEN cp.papel_visivel IS NOT NULL THEN cp.papel_visivel
          ELSE true
        END AS visible
      FROM cascata_principal cp
      WHERE array_length(cp.sub_rotas, 1) > 0
    )
    SELECT rc.module_key, rc.visible FROM resultado_calculado rc
    UNION ALL
    SELECT rs.module_key, rs.visible FROM resultado_subrotas rs;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pgr_confirmar_parse(p_importacao_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_company_id uuid;
    v_extracao jsonb;
    v_doc_id uuid;
    v_caller uuid := auth.uid();
    v_is_service boolean := (auth.role() = 'service_role');
    v_has_access boolean := false;
BEGIN
    SELECT company_id, extracao_raw INTO v_company_id, v_extracao
    FROM public.pgr_importacoes
    WHERE id = p_importacao_id AND status = 'aguardando_revisao'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Importação não encontrada ou não está em status "aguardando_revisao".';
    END IF;

    IF NOT v_is_service THEN
        IF v_caller IS NULL THEN
            RAISE EXCEPTION 'Não autenticado';
        END IF;

        IF NOT (is_super_admin(v_caller) OR is_admin_master(v_caller)) THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_companies uc
                WHERE uc.user_id = v_caller AND uc.company_id = v_company_id
            ) INTO v_has_access;

            IF NOT v_has_access THEN
                RAISE EXCEPTION 'Acesso negado: usuário não possui vínculo ativo com a empresa do PGR (company_id: %)', v_company_id;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.pgr_documentos (company_id, titulo, vigencia_inicio, vigencia_fim, cnae, grau_risco, responsavel_tecnico)
    VALUES (
        v_company_id,
        COALESCE(v_extracao->'dados_empresa'->>'nome', 'PGR Importado'),
        NULLIF(v_extracao->'dados_empresa'->>'vigencia_inicio', '')::date,
        NULLIF(v_extracao->'dados_empresa'->>'vigencia_fim', '')::date,
        v_extracao->'dados_empresa'->>'cnae',
        v_extracao->'dados_empresa'->>'grau_risco',
        COALESCE(v_extracao->'responsavel_tecnico', '{}'::jsonb)
    ) RETURNING id INTO v_doc_id;

    UPDATE public.pgr_importacoes
    SET status = 'confirmado'
    WHERE id = p_importacao_id;
END;
$function$;

-- Atualizar políticas de storage (Ciclo B)
DROP POLICY IF EXISTS "checklist_fotos_scoped_insert" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_scoped_select" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_scoped_delete" ON storage.objects;

CREATE POLICY "checklist_fotos_scoped_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "checklist_fotos_scoped_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "checklist_fotos_scoped_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
        AND uc.role IN ('admin_empresa', 'admin_master')
    )
  )
);

CREATE TEMP TABLE test_results (
  test_num int,
  test_name text,
  status text,
  details text
);
GRANT ALL ON test_results TO authenticated;

DO $$
DECLARE
  v_mary uuid := 'bbe29d21-199e-46bd-b8bd-5bf622149c66'; -- Colaboradora NRCP
  v_nrcp_id uuid := '540d02bd-8d5d-429b-b695-8a66f46c499d';
  v_hz_id uuid := '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';
  v_hz_admin uuid := 'c36b205d-a22f-4b1a-8ea9-50bfecb198b0'; -- Admin Horizonte
  v_imp_hz uuid := gen_random_uuid();
  v_count int;
  v_vis_count int;
BEGIN
  -- Inserir importação de teste para a Horizonte
  INSERT INTO public.pgr_importacoes (id, company_id, arquivo_nome, arquivo_storage, criado_por, status, extracao_raw)
  VALUES (v_imp_hz, v_hz_id, 'pgr_hz.pdf', 'pgr/hz.pdf', v_hz_admin, 'aguardando_revisao', '{"dados_empresa": {"nome": "Horizonte Teste"}}'::jsonb);

  -- =========================================================================
  -- TESTE 1: NEGAÇÃO - Mary tenta get_visible_modules na Horizonte (sem vínculo)
  -- =========================================================================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mary, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO v_count FROM public.get_visible_modules(v_hz_id);
  IF v_count = 0 THEN
    INSERT INTO test_results VALUES (1, 'Negação get_visible_modules cross-tenant', 'PASS', '0 módulos retornados (fail-closed imediato)');
  ELSE
    INSERT INTO test_results VALUES (1, 'Negação get_visible_modules cross-tenant', 'FAIL', 'Retornou módulos sem vínculo!');
  END IF;

  -- =========================================================================
  -- TESTE 2: NEGAÇÃO - Mary tenta upload de foto de checklist na Horizonte
  -- =========================================================================
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (gen_random_uuid(), 'checklist-fotos', v_hz_id::text || '/unauthorized_cross.jpg', v_mary);
    INSERT INTO test_results VALUES (2, 'Negação storage cross-tenant', 'FAIL', 'Upload cross-tenant permitido!');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO test_results VALUES (2, 'Negação storage cross-tenant', 'PASS', 'Bloqueado por RLS (insufficient_privilege)');
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES (2, 'Negação storage cross-tenant', 'PASS', 'Bloqueado: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 3: NEGAÇÃO - Mary tenta confirmar PGR da Horizonte
  -- =========================================================================
  BEGIN
    PERFORM public.pgr_confirmar_parse(v_imp_hz, v_mary);
    INSERT INTO test_results VALUES (3, 'Negação pgr_confirmar_parse cross-tenant', 'FAIL', 'Confirmou PGR de outra empresa!');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Acesso negado%' THEN
      INSERT INTO test_results VALUES (3, 'Negação pgr_confirmar_parse cross-tenant', 'PASS', 'Bloqueado: ' || SQLERRM);
    ELSE
      INSERT INTO test_results VALUES (3, 'Negação pgr_confirmar_parse cross-tenant', 'FAIL', 'Erro inesperado: ' || SQLERRM);
    END IF;
  END;

  -- =========================================================================
  -- TESTE 4: PERMISSÃO LEGÍTIMA - Mary em sua empresa (NR-1 COM PROVA)
  -- =========================================================================
  SELECT count(*), count(CASE WHEN visible THEN 1 END) INTO v_count, v_vis_count
  FROM public.get_visible_modules(v_nrcp_id);

  IF v_count = 29 AND v_vis_count = 29 THEN
    INSERT INTO test_results VALUES (4, 'Mary permissão legítima em sua empresa', 'PASS', '29/29 módulos visíveis (padrão mantido perfeitamente)');
  ELSE
    INSERT INTO test_results VALUES (4, 'Mary permissão legítima em sua empresa', 'FAIL', 'Esperado 29/29, obtido total: ' || v_count || ', visíveis: ' || v_vis_count);
  END IF;

  -- Mary faz upload e visualiza foto de checklist em sua própria empresa
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (gen_random_uuid(), 'checklist-fotos', v_nrcp_id::text || '/legitimate_mary.jpg', v_mary);

    IF EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'checklist-fotos' AND name = v_nrcp_id::text || '/legitimate_mary.jpg'
    ) THEN
      INSERT INTO test_results VALUES (5, 'Mary storage upload e select próprio', 'PASS', 'Upload e leitura de foto de checklist autorizados na própria empresa');
    ELSE
      INSERT INTO test_results VALUES (5, 'Mary storage upload e select próprio', 'FAIL', 'Foto inserida não visível');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES (5, 'Mary storage upload e select próprio', 'FAIL', 'Erro: ' || SQLERRM);
  END;

  -- =========================================================================
  -- TESTE 6: PERMISSÃO LEGÍTIMA - Admin Horizonte
  -- (Horizonte tem 29 módulos no catálogo, sendo 28 visíveis pois /beneficios foi desabilitado em company_modules)
  -- =========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_hz_admin, 'role', 'authenticated')::text, true);

  -- Módulos da Horizonte
  SELECT count(*), count(CASE WHEN visible THEN 1 END) INTO v_count, v_vis_count
  FROM public.get_visible_modules(v_hz_id);

  IF v_count = 29 AND v_vis_count = 28 AND (SELECT visible FROM public.get_visible_modules(v_hz_id) WHERE module_key = '/beneficios') = false THEN
    INSERT INTO test_results VALUES (6, 'Admin Horizonte get_visible_modules', 'PASS', '28/29 módulos visíveis (/beneficios desabilitado por company_modules respeitado)');
  ELSE
    INSERT INTO test_results VALUES (6, 'Admin Horizonte get_visible_modules', 'FAIL', 'Total: ' || v_count || ', Visíveis: ' || v_vis_count);
  END IF;

  -- Confirmação PGR legítima
  PERFORM public.pgr_confirmar_parse(v_imp_hz, v_hz_admin);
  IF (SELECT status FROM public.pgr_importacoes WHERE id = v_imp_hz) = 'confirmado' THEN
    INSERT INTO test_results VALUES (7, 'Admin Horizonte confirma PGR legítimo', 'PASS', 'PGR confirmado com sucesso status = confirmado');
  ELSE
    INSERT INTO test_results VALUES (7, 'Admin Horizonte confirma PGR legítimo', 'FAIL', 'Status não virou confirmado');
  END IF;

  RESET ROLE;
END $$;

SELECT test_num, test_name, status, details FROM test_results ORDER BY test_num;

ROLLBACK;
