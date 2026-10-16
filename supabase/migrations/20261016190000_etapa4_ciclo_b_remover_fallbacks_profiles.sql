-- ============================================================================
-- ETAPA 4: FECHAMENTO DA ETAPA 3 + CICLO B (REMOVER FALLBACKS PROFILES.COMPANY_ID)
-- Data: 2026-10-16
-- 
-- 1. Fechamento Etapa 3:
--    - Revoga REFERENCES e TRIGGER de anon em module_visibility,
--      pulse_campaigns_alvos e questionarios_cuidar_plus_alvos
--
-- 2. Ciclo B - Eliminação definitiva de fallbacks profiles.company_id:
--    - user_companies torna-se a ÚNICA fonte de vínculo institucional
--    - Atualização de:
--      * public.get_visible_modules(uuid)
--      * public.pgr_confirmar_parse(uuid, uuid)
--      * public.can_access_cuidar_plus_alvos(uuid)
--      * public.can_manage_cuidar_plus_alvos(uuid)
--      * Políticas de storage (checklist-fotos e beneficios-materiais)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: Fechamento de privilégios de anon
-- ----------------------------------------------------------------------------
REVOKE REFERENCES, TRIGGER ON public.module_visibility FROM anon;
REVOKE REFERENCES, TRIGGER ON public.pulse_campaigns_alvos FROM anon;
REVOKE REFERENCES, TRIGGER ON public.questionarios_cuidar_plus_alvos FROM anon;

-- ----------------------------------------------------------------------------
-- PARTE 2: Atualização de public.get_visible_modules (Ciclo B)
-- ----------------------------------------------------------------------------
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

    -- Avaliação em cascata:
    -- Camada 1: company_modules.enabled
    -- Camada 2: module_visibility.visible (padrão true quando não há linha)
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

-- ----------------------------------------------------------------------------
-- PARTE 3: Atualização de public.pgr_confirmar_parse (Ciclo B)
-- ----------------------------------------------------------------------------
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
    v_unidade_id uuid;
    v_departamento_id uuid;
    v_setor_id uuid;
    v_ghe_id uuid;
    v_risco_id uuid;
    v_ghe jsonb;
    v_risco jsonb;
    v_acao jsonb;
    v_cat_raw text;
    v_cat_normalized text;
    v_caller uuid := auth.uid();
    v_is_service boolean := (auth.role() = 'service_role');
    v_has_access boolean := false;
BEGIN
    -- Obter a importação para checagem de status e tenant
    SELECT company_id, extracao_raw INTO v_company_id, v_extracao
    FROM public.pgr_importacoes
    WHERE id = p_importacao_id AND status = 'aguardando_revisao'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Importação não encontrada ou não está em status "aguardando_revisao".';
    END IF;

    -- Validação de Tenant e Autorização (Fail-Closed, Ciclo B: user_companies)
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

    -- Inserir documento base
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

    -- Garantir a hierarquia mínima para GHEs
    IF jsonb_typeof(v_extracao->'ghes') = 'array' THEN
        SELECT id INTO v_unidade_id FROM public.unidades_organizacionais WHERE company_id = v_company_id LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO public.unidades_organizacionais (company_id, nome, tipo) VALUES (v_company_id, 'Matriz (PGR Importado)', 'matriz') RETURNING id INTO v_unidade_id;
        END IF;

        SELECT id INTO v_departamento_id FROM public.departamentos WHERE company_id = v_company_id LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO public.departamentos (company_id, unidade_id, nome) VALUES (v_company_id, v_unidade_id, 'Geral (PGR Importado)') RETURNING id INTO v_departamento_id;
        END IF;

        FOR v_ghe IN SELECT * FROM jsonb_array_elements(v_extracao->'ghes')
        LOOP
            INSERT INTO public.setores (company_id, departamento_id, nome) VALUES (v_company_id, v_departamento_id, COALESCE(v_ghe->>'nome', 'Setor Importado')) RETURNING id INTO v_setor_id;

            INSERT INTO public.ghes (company_id, setor_id, nome, descricao)
            VALUES (
                v_company_id,
                v_setor_id,
                COALESCE(v_ghe->>'nome', 'GHE Importado'),
                v_ghe->>'descricao'
            ) RETURNING id INTO v_ghe_id;

            IF jsonb_typeof(v_ghe->'riscos') = 'array' THEN
                FOR v_risco IN SELECT * FROM jsonb_array_elements(v_ghe->'riscos')
                LOOP
                    v_cat_raw := lower(COALESCE(v_risco->>'categoria', 'fisico'));
                    v_cat_normalized := CASE
                        WHEN v_cat_raw LIKE '%f%sico%' OR v_cat_raw LIKE '%fisico%' THEN 'fisico'
                        WHEN v_cat_raw LIKE '%qu%mico%' OR v_cat_raw LIKE '%quimico%' THEN 'quimico'
                        WHEN v_cat_raw LIKE '%biol%gico%' OR v_cat_raw LIKE '%biologico%' THEN 'biologico'
                        WHEN v_cat_raw LIKE '%ergon%mico%' OR v_cat_raw LIKE '%ergonomico%' THEN 'ergonomico'
                        WHEN v_cat_raw LIKE '%psicossocial%' THEN 'psicossocial'
                        WHEN v_cat_raw LIKE '%acidente%' THEN 'acidente'
                        ELSE 'fisico'
                    END;

                    INSERT INTO public.nr1_ghe_riscos (company_id, ghe_id, nome_risco, categoria, probabilidade, severidade, fonte)
                    VALUES (
                        v_company_id,
                        v_ghe_id,
                        COALESCE(v_risco->>'perigo', 'Não informado'),
                        v_cat_normalized,
                        COALESCE((v_risco->>'probabilidade')::int, 1),
                        COALESCE((v_risco->>'severidade')::int, 1),
                        'manual'
                    ) RETURNING id INTO v_risco_id;

                    INSERT INTO public.pgr_risco_detalhes (risco_ghe_id, fundamentacao_legal, lesoes_agravos)
                    VALUES (
                        v_risco_id,
                        v_risco->>'fundamentacao_legal',
                        v_risco->>'possiveis_lesoes'
                    );
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    IF jsonb_typeof(v_extracao->'plano_acao') = 'array' THEN
        FOR v_acao IN SELECT * FROM jsonb_array_elements(v_extracao->'plano_acao')
        LOOP
            INSERT INTO public.nr1_planos_acao (company_id, origem, departamento, escala, media, nivel_risco, titulo, descricao, prazo, status, criado_por)
            VALUES (
                v_company_id,
                'manual',
                'PGR Importado',
                1,
                1.0,
                'Laranja',
                v_acao->>'acao',
                v_acao->>'responsavel',
                NULLIF(v_acao->>'data_prevista', '')::date,
                'pendente',
                COALESCE(v_caller, p_user_id)
            );
        END LOOP;
    END IF;

    UPDATE public.pgr_importacoes
    SET status = 'confirmado'
    WHERE id = p_importacao_id;

END;
$function$;

-- ----------------------------------------------------------------------------
-- PARTE 4: Atualização de helpers de cuidar_plus_alvos (Ciclo B)
-- ----------------------------------------------------------------------------
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
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- PARTE 5: Atualização de Políticas de Storage (Ciclo B)
-- ----------------------------------------------------------------------------

-- 5a. checklist-fotos
DROP POLICY IF EXISTS "checklist_fotos_scoped_insert" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_scoped_select" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_scoped_delete" ON storage.objects;

CREATE POLICY "checklist_fotos_scoped_insert"
ON storage.objects
FOR INSERT
TO authenticated
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
ON storage.objects
FOR SELECT
TO authenticated
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
ON storage.objects
FOR DELETE
TO authenticated
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

-- 5b. beneficios-materiais
DROP POLICY IF EXISTS "beneficios_materiais_scoped_select" ON storage.objects;
DROP POLICY IF EXISTS "beneficios_materiais_admin_insert_scoped" ON storage.objects;
DROP POLICY IF EXISTS "beneficios_materiais_admin_update_scoped" ON storage.objects;
DROP POLICY IF EXISTS "beneficios_materiais_admin_delete_scoped" ON storage.objects;

CREATE POLICY "beneficios_materiais_scoped_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      JOIN public.user_companies uc ON uc.company_id = b.company_id
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND uc.user_id = auth.uid()
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_insert_scoped"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      JOIN public.user_companies uc ON uc.company_id = b.company_id
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND uc.user_id = auth.uid()
        AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_update_scoped"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      JOIN public.user_companies uc ON uc.company_id = b.company_id
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND uc.user_id = auth.uid()
        AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
    )
  )
)
WITH CHECK (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      JOIN public.user_companies uc ON uc.company_id = b.company_id
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND uc.user_id = auth.uid()
        AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_delete_scoped"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      JOIN public.user_companies uc ON uc.company_id = b.company_id
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND uc.user_id = auth.uid()
        AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
    )
  )
);
