-- Migration: Add search_path to SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pgr_confirmar_parse(p_importacao_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
BEGIN
    -- Obter a importação
    SELECT company_id, extracao_raw INTO v_company_id, v_extracao
    FROM public.pgr_importacoes
    WHERE id = p_importacao_id AND status = 'aguardando_revisao'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Importação não encontrada ou não está em status "aguardando_revisao".';
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
        -- Tentar achar uma unidade matriz, se não criar
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
            -- Criar um setor dinâmico para este GHE (ou usar Geral)
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
                        COALESCE(v_risco->>'perigo', 'Não informado'),
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

    -- Inserir Plano de Ação real em `nr1_planos_acao`
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
                p_user_id
            );
        END LOOP;
    END IF;

    -- Atualizar status final
    UPDATE public.pgr_importacoes
    SET status = 'confirmado'
    WHERE id = p_importacao_id;

END;
$$;

CREATE OR REPLACE FUNCTION public.pgr_analise_turnover(p_company_id uuid)
RETURNS TABLE (
    ghe_id uuid,
    departamento text,
    qtde_desligamentos integer,
    alerta_nota integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH recentes AS (
        SELECT dc.colaborador_id, dc.tipo_desligamento, c.department
        FROM public.desligamentos_colaborador dc
        JOIN public.colaboradores c ON c.id = dc.colaborador_id
        WHERE c.company_id = p_company_id
          AND dc.acao = 'desligar'
          AND dc.data_desligamento IS NOT NULL
          AND dc.data_desligamento::date >= (now() - interval '6 months')::date
    ),
    agrupado AS (
        SELECT r.department, 
               count(*) as qtde,
               sum(CASE WHEN r.tipo_desligamento ILIKE '%pedido%' THEN 2 ELSE 1 END) as peso
        FROM recentes r
        GROUP BY r.department
    )
    SELECT
        gs.ghe_id,
        gs.departamento,
        COALESCE(a.qtde, 0)::integer as qtde_desligamentos,
        LEAST(100, COALESCE(a.peso, 0) * 10)::integer as alerta_nota
    FROM public.pgr_ghe_setor gs
    LEFT JOIN agrupado a ON a.department = gs.departamento
    WHERE gs.company_id = p_company_id;
END;
$$;

