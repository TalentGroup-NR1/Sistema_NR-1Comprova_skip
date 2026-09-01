-- Função transacional para confirmar a importação do PGR e extrair o JSONB para as tabelas relacionais
CREATE OR REPLACE FUNCTION public.pgr_confirmar_parse(p_importacao_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_extracao jsonb;
    v_doc_id uuid;
    v_ghe_id uuid;
    v_risco_id uuid;
    v_ghe jsonb;
    v_risco jsonb;
    v_acao jsonb;
BEGIN
    -- Obter a importação e garantir que existe e está aguardando revisão
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

    -- Inserir GHEs e Riscos
    IF jsonb_typeof(v_extracao->'ghes') = 'array' THEN
        FOR v_ghe IN SELECT * FROM jsonb_array_elements(v_extracao->'ghes')
        LOOP
            INSERT INTO public.nr1_ghe (company_id, nome, descricao)
            VALUES (
                v_company_id,
                COALESCE(v_ghe->>'nome', 'GHE Importado'),
                v_ghe->>'descricao'
            ) RETURNING id INTO v_ghe_id;

            IF jsonb_typeof(v_ghe->'riscos') = 'array' THEN
                FOR v_risco IN SELECT * FROM jsonb_array_elements(v_ghe->'riscos')
                LOOP
                    INSERT INTO public.nr1_ghe_riscos (ghe_id, tipo, nome_perigo)
                    VALUES (
                        v_ghe_id,
                        v_risco->>'categoria',
                        v_risco->>'perigo'
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

    -- Inserir Plano de Ação
    IF jsonb_typeof(v_extracao->'plano_acao') = 'array' THEN
        FOR v_acao IN SELECT * FROM jsonb_array_elements(v_extracao->'plano_acao')
        LOOP
            INSERT INTO public.nr1_planos_acao (company_id, o_que, responsavel, quando, origem)
            VALUES (
                v_company_id,
                v_acao->>'acao',
                v_acao->>'responsavel',
                NULLIF(v_acao->>'data_prevista', '')::date,
                'pgr'
            );
        END LOOP;
    END IF;

    -- Atualizar status final
    UPDATE public.pgr_importacoes
    SET status = 'confirmado'
    WHERE id = p_importacao_id;

END;
$$;
