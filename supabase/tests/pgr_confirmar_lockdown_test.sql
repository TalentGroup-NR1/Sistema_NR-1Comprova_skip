BEGIN;

-- Aplicar a migration no escopo da transaÃ§Ã£o de teste
-- ============================================================================
-- ETAPA 2: Blindagem da RPC pgr_confirmar_parse + Fechamento Etapa 1
-- Data: 2026-10-16
-- 
-- 1. Blindagem de pgr_confirmar_parse:
--    - Fixa search_path TO 'public', 'pg_temp'.
--    - Revoga EXECUTE de PUBLIC e concede apenas a authenticated e service_role.
--    - Valida multi-tenant boundary do chamador contra a company_id da importaÃ§Ã£o
--      via user_companies (com fallback profiles no Ciclo A) e roles permitidas.
--
-- 2. Fechamento Etapa 1 (beneficios-materiais admin):
--    - Restringe roles para authenticated (revogando public).
--    - Adiciona suporte a super_admin e user_companies.
--    - Adiciona WITH CHECK explÃ­cito no UPDATE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: Blindagem de public.pgr_confirmar_parse
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pgr_confirmar_parse(p_importacao_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
    -- Obter a importaÃ§Ã£o para checagem de status e tenant
    SELECT company_id, extracao_raw INTO v_company_id, v_extracao
    FROM public.pgr_importacoes
    WHERE id = p_importacao_id AND status = 'aguardando_revisao'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ImportaÃ§Ã£o nÃ£o encontrada ou nÃ£o estÃ¡ em status "aguardando_revisao".';
    END IF;

    -- ValidaÃ§Ã£o de Tenant e AutorizaÃ§Ã£o (Fail-Closed)
    -- Chamadas via service_role (Edge Function pgr-confirmar) jÃ¡ sÃ£o previamente auditadas.
    -- Chamadas diretas de usuÃ¡rios autenticados exigem vÃ­nculo ativo com a empresa do documento.
    IF NOT v_is_service THEN
        IF v_caller IS NULL THEN
            RAISE EXCEPTION 'NÃ£o autenticado';
        END IF;

        IF NOT (is_super_admin(v_caller) OR is_admin_master(v_caller)) THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_companies uc
                WHERE uc.user_id = v_caller AND uc.company_id = v_company_id
            ) OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = v_caller AND p.company_id = v_company_id
            ) INTO v_has_access;

            IF NOT v_has_access THEN
                RAISE EXCEPTION 'Acesso negado: usuÃ¡rio nÃ£o possui vÃ­nculo ativo com a empresa do PGR (company_id: %)', v_company_id;
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

    -- Garantir a hierarquia mÃ­nima para GHEs
    IF jsonb_typeof(v_extracao->'ghes') = 'array' THEN
        -- Tentar achar uma unidade matriz, se nÃ£o criar
        SELECT id INTO v_unidade_id FROM public.unidades_organizacionais WHERE company_id = v_company_id LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO public.unidades_organizacionais (company_id, nome, tipo) VALUES (v_company_id, 'Matriz (PGR Importado)', 'matriz') RETURNING id INTO v_unidade_id;
        END IF;

        -- Tentar achar departamento
        SELECT id INTO v_departamento_id FROM public.departamentos WHERE company_id = v_company_id LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO public.departamentos (company_id, unidade_id, nome) VALUES (v_company_id, v_unidade_id, 'Geral (PGR Importado)') RETURNING id INTO v_departamento_id;
        END IF;

        -- Loop GHEs
        FOR v_ghe IN SELECT * FROM jsonb_array_elements(v_extracao->'ghes')
        LOOP
            -- Criar um setor dinÃ¢mico para este GHE (ou usar Geral)
            INSERT INTO public.setores (company_id, departamento_id, nome) VALUES (v_company_id, v_departamento_id, COALESCE(v_ghe->>'nome', 'Setor Importado')) RETURNING id INTO v_setor_id;

            -- Inserir GHE real na tabela `ghes`
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

                    -- Inserir na tabela real `nr1_ghe_riscos`
                    INSERT INTO public.nr1_ghe_riscos (company_id, ghe_id, nome_risco, categoria, probabilidade, severidade, fonte)
                    VALUES (
                        v_company_id,
                        v_ghe_id,
                        COALESCE(v_risco->>'perigo', 'NÃ£o informado'),
                        v_cat_normalized,
                        COALESCE((v_risco->>'probabilidade')::int, 1),
                        COALESCE((v_risco->>'severidade')::int, 1),
                        'manual'
                    ) RETURNING id INTO v_risco_id;

                    -- Detalhes do risco
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

    -- Inserir Plano de AÃ§Ã£o real em `nr1_planos_acao`
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

    -- Atualizar status final
    UPDATE public.pgr_importacoes
    SET status = 'confirmado'
    WHERE id = p_importacao_id;

END;
$$;

-- RestriÃ§Ã£o de privilÃ©gios de execuÃ§Ã£o
REVOKE EXECUTE ON FUNCTION public.pgr_confirmar_parse(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pgr_confirmar_parse(uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- PARTE 2: Fechamento das PolÃ­ticas Admin de Storage (beneficios-materiais)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "beneficios_materiais_admin_insert_scoped" ON storage.objects;
DROP POLICY IF EXISTS "beneficios_materiais_admin_update_scoped" ON storage.objects;
DROP POLICY IF EXISTS "beneficios_materiais_admin_delete_scoped" ON storage.objects;

-- INSERT: Admin empresa / Analista RH / Admin Master da empresa do benefÃ­cio
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
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = b.company_id
              AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.company_id = b.company_id
              AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          )
        )
    )
  )
);

-- UPDATE: Admin empresa / Analista RH / Admin Master da empresa do benefÃ­cio
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
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = b.company_id
              AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.company_id = b.company_id
              AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          )
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = b.company_id
              AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.company_id = b.company_id
              AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          )
        )
    )
  )
);

-- DELETE: Admin empresa / Analista RH / Admin Master da empresa do benefÃ­cio
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
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid()
              AND uc.company_id = b.company_id
              AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.company_id = b.company_id
              AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          )
        )
    )
  )
);


DO $$
DECLARE
  v_mary uuid := 'bbe29d21-199e-46bd-b8bd-5bf622149c66'; -- Colaboradora NRCP
  v_nrcp_admin uuid := 'b0f6068f-21b4-49e0-b122-53441e2f10d1'; -- Admin NRCP (Mariana)
  v_nrcp_id uuid := '540d02bd-8d5d-429b-b695-8a66f46c499d';
  v_hz_id uuid := '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';
  v_hz_admin uuid := 'c36b205d-a22f-4b1a-8ea9-50bfecb198b0'; -- Admin Horizonte
  v_imp_hz uuid := gen_random_uuid();
  v_imp_nrcp uuid := gen_random_uuid();
  v_nrcp_beneficio uuid := gen_random_uuid();
  v_err boolean := false;
BEGIN
  -- 1. Inserir dados sintéticos de importação PGR em aguardando_revisao
  INSERT INTO public.pgr_importacoes (id, company_id, arquivo_nome, arquivo_storage, criado_por, status, extracao_raw)
  VALUES 
    (v_imp_hz, v_hz_id, 'pgr_hz.pdf', 'pgr/hz.pdf', v_hz_admin, 'aguardando_revisao', '{"dados_empresa": {"nome": "Horizonte Teste"}, "ghes": []}'::jsonb),
    (v_imp_nrcp, v_nrcp_id, 'pgr_nrcp.pdf', 'pgr/nrcp.pdf', v_nrcp_admin, 'aguardando_revisao', '{"dados_empresa": {"nome": "NRCP Teste"}, "ghes": []}'::jsonb);

  -- Inserir benefÃ­cio na NRCP para testar polÃ­tica admin de beneficios-materiais
  INSERT INTO public.beneficios (id, company_id, nome, categoria)
  VALUES (v_nrcp_beneficio, v_nrcp_id, 'Vale Transporte NRCP', 'transporte');

  -- =========================================================================
  -- TESTE 1: NEGAÃ‡ÃƒO CROSS-TENANT EM pgr_confirmar_parse
  -- Mary (NR-1 COM PROVA) tenta confirmar importaÃ§Ã£o da Horizonte Contabilidade
  -- =========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mary, 'role', 'authenticated')::text, true);
  v_err := false;
  BEGIN
    PERFORM public.pgr_confirmar_parse(v_imp_hz, v_mary);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Acesso negado%' THEN
      v_err := true;
    ELSE
      RAISE EXCEPTION 'Erro inesperado no teste de negaÃ§Ã£o: %', SQLERRM;
    END IF;
  END;

  IF NOT v_err THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÃ‡A: Mary conseguiu confirmar PGR da empresa Horizonte!';
  END IF;

  -- =========================================================================
  -- TESTE 2: PERMISSÃƒO LEGÃTIMA EM pgr_confirmar_parse
  -- Admin da Horizonte confirma importaÃ§Ã£o da Horizonte
  -- =========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_hz_admin, 'role', 'authenticated')::text, true);
  PERFORM public.pgr_confirmar_parse(v_imp_hz, v_hz_admin);

  -- Verificar se status virou 'confirmado'
  IF (SELECT status FROM public.pgr_importacoes WHERE id = v_imp_hz) <> 'confirmado' THEN
    RAISE EXCEPTION 'FALHA FUNCIONAL: ImportaÃ§Ã£o da Horizonte deveria estar confirmada';
  END IF;

  -- =========================================================================
  -- TESTE 3: FECHAMENTO ETAPA 1 - COLABORADOR TENTA INSERIR MATERIAL DE BENEFÃCIO
  -- Mary (colaboradora) tenta inserir material no benefÃ­cio de sua empresa
  -- Deve ser bloqueada pela RLS porque nÃ£o Ã© admin/analista
  -- =========================================================================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mary, 'role', 'authenticated')::text, true);
  
  v_err := false;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (gen_random_uuid(), 'beneficios-materiais', v_nrcp_beneficio::text || '/unauthorized_by_colab.pdf', v_mary);
  EXCEPTION WHEN insufficient_privilege THEN
    v_err := true;
  END;

  IF NOT v_err THEN
    RESET ROLE;
    RAISE EXCEPTION 'FALHA DE SEGURANÃ‡A: Colaboradora conseguiu inserir material em beneficios-materiais!';
  END IF;

  -- =========================================================================
  -- TESTE 4: FECHAMENTO ETAPA 1 - ADMIN INSERE E DELETA MATERIAL DE BENEFÃCIO
  -- Mariana (admin_empresa da NRCP) insere e deleta material no benefÃ­cio da NRCP
  -- =========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_nrcp_admin, 'role', 'authenticated')::text, true);
  SET LOCAL storage.allow_delete_query = 'true';

  INSERT INTO storage.objects (id, bucket_id, name, owner)
  VALUES (gen_random_uuid(), 'beneficios-materiais', v_nrcp_beneficio::text || '/authorized_admin.pdf', v_nrcp_admin);

  DELETE FROM storage.objects
  WHERE bucket_id = 'beneficios-materiais' AND name = v_nrcp_beneficio::text || '/authorized_admin.pdf';

  RESET ROLE;
  RAISE NOTICE 'SUCESSO: Todos os testes da Etapa 2 e Fechamento da Etapa 1 passaram perfeitamente!';
END $$;

ROLLBACK;

