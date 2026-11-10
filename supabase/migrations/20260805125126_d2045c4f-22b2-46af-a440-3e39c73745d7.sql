-- ============ LISTAGEM ============
CREATE OR REPLACE FUNCTION public.psico_get_instrumentos()
RETURNS TABLE (
  id UUID, company_id UUID, nome VARCHAR, versao VARCHAR, descricao TEXT,
  referencia_cientifica TEXT, editavel BOOLEAN, ativo BOOLEAN,
  total_dimensoes BIGINT, total_perguntas BIGINT, em_uso BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.id, i.company_id, i.nome, i.versao, i.descricao, i.referencia_cientifica,
         i.editavel, i.ativo,
         (SELECT count(*) FROM public.psico_dimensoes d WHERE d.instrumento_id = i.id),
         (SELECT count(*) FROM public.psico_perguntas p WHERE p.instrumento_id = i.id AND p.ativa),
         public.psico_instrumento_em_uso(i.id),
         i.created_at
  FROM public.psico_instrumentos i
  WHERE i.company_id IS NULL
     OR i.company_id = public.get_my_company_id()
     OR public.is_admin_master(auth.uid())
  ORDER BY i.company_id NULLS FIRST, i.nome;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_instrumentos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_instrumentos() TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_get_instrumento_completo(p_instrumento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', i.id, 'company_id', i.company_id, 'nome', i.nome, 'versao', i.versao,
    'descricao', i.descricao, 'referencia_cientifica', i.referencia_cientifica,
    'editavel', i.editavel, 'ativo', i.ativo,
    'em_uso', public.psico_instrumento_em_uso(i.id),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'nome', d.nome, 'tipo_dimensao', d.tipo_dimensao,
        'descricao', d.descricao, 'ordem', d.ordem,
        'perguntas', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', p.id, 'ordem', p.ordem, 'texto_pergunta', p.texto_pergunta,
            'tipo_escala', p.tipo_escala, 'inverter_pontuacao', p.inverter_pontuacao,
            'ativa', p.ativa
          ) ORDER BY p.ordem)
          FROM public.psico_perguntas p WHERE p.dimensao_id = d.id
        ), '[]'::jsonb)
      ) ORDER BY d.ordem)
      FROM public.psico_dimensoes d WHERE d.instrumento_id = i.id
    ), '[]'::jsonb)
  ) INTO v
  FROM public.psico_instrumentos i
  WHERE i.id = p_instrumento_id
    AND (i.company_id IS NULL OR i.company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()));

  IF v IS NULL THEN RAISE EXCEPTION 'Instrumento não encontrado ou sem permissão'; END IF;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_instrumento_completo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_instrumento_completo(UUID) TO authenticated;

-- ============ CRUD ADMIN ============
CREATE OR REPLACE FUNCTION public.psico_save_instrumento(
  p_id UUID, p_nome TEXT, p_versao TEXT, p_descricao TEXT, p_referencia TEXT, p_ativo BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID; v_company UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  v_company := public.get_my_company_id();

  IF p_id IS NULL THEN
    INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
    VALUES (v_company, p_nome, COALESCE(p_versao,'1.0'), p_descricao, p_referencia, TRUE, COALESCE(p_ativo,TRUE))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_instrumentos
    SET nome = p_nome, versao = COALESCE(p_versao, versao), descricao = p_descricao,
        referencia_cientifica = p_referencia, ativo = COALESCE(p_ativo, ativo)
    WHERE id = p_id AND editavel = TRUE
      AND (public.is_admin_master(auth.uid()) OR company_id = v_company)
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Instrumento não editável ou sem permissão'; END IF;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_instrumento(UUID,TEXT,TEXT,TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_instrumento(UUID,TEXT,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_duplicar_instrumento(p_instrumento_id UUID, p_novo_nome TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_new UUID; v_company UUID; r RECORD;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  v_company := public.get_my_company_id();

  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  SELECT v_company, COALESCE(p_novo_nome, i.nome || ' (cópia)'), i.versao, i.descricao, i.referencia_cientifica, TRUE, TRUE
  FROM public.psico_instrumentos i
  WHERE i.id = p_instrumento_id
    AND (i.company_id IS NULL OR i.company_id = v_company OR public.is_admin_master(auth.uid()))
  RETURNING id INTO v_new;

  IF v_new IS NULL THEN RAISE EXCEPTION 'Instrumento não encontrado'; END IF;

  FOR r IN SELECT * FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id ORDER BY ordem LOOP
    WITH nd AS (
      INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem)
      VALUES (v_new, r.nome, r.tipo_dimensao, r.descricao, r.ordem)
      RETURNING id
    )
    INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao, ativa)
    SELECT v_new, nd.id, p.ordem, p.texto_pergunta, p.tipo_escala, p.inverter_pontuacao, p.ativa
    FROM nd, public.psico_perguntas p WHERE p.dimensao_id = r.id;
  END LOOP;

  RETURN v_new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_duplicar_instrumento(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_duplicar_instrumento(UUID,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_assert_editavel(p_instrumento_id UUID)
RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_ed BOOLEAN; v_comp UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT editavel, company_id INTO v_ed, v_comp FROM public.psico_instrumentos WHERE id = p_instrumento_id;
  IF v_ed IS NULL THEN RAISE EXCEPTION 'Instrumento não encontrado'; END IF;
  IF NOT v_ed THEN RAISE EXCEPTION 'Este é um modelo padrão. Duplique para criar uma versão editável.'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_comp = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF public.psico_instrumento_em_uso(p_instrumento_id) THEN
    RAISE EXCEPTION 'Este instrumento está em uso em campanhas ativas. Duplique para criar uma versão editável.';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_assert_editavel(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_assert_editavel(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_save_dimensao(
  p_id UUID, p_instrumento_id UUID, p_nome TEXT, p_tipo TEXT, p_descricao TEXT, p_ordem INT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem)
    VALUES (p_instrumento_id, p_nome, COALESCE(p_tipo,'negativa'), p_descricao,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id)))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_dimensoes
    SET nome = p_nome, tipo_dimensao = COALESCE(p_tipo, tipo_dimensao), descricao = p_descricao, ordem = COALESCE(p_ordem, ordem)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_dimensao(UUID,UUID,TEXT,TEXT,TEXT,INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_dimensao(UUID,UUID,TEXT,TEXT,TEXT,INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_delete_dimensao(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_inst UUID;
BEGIN
  SELECT instrumento_id INTO v_inst FROM public.psico_dimensoes WHERE id = p_id;
  IF v_inst IS NULL THEN RETURN; END IF;
  PERFORM public.psico_assert_editavel(v_inst);
  DELETE FROM public.psico_dimensoes WHERE id = p_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_delete_dimensao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_delete_dimensao(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_save_pergunta(
  p_id UUID, p_instrumento_id UUID, p_dimensao_id UUID, p_texto TEXT,
  p_tipo_escala TEXT, p_inverter BOOLEAN, p_ordem INT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
    VALUES (p_instrumento_id, p_dimensao_id,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_perguntas WHERE dimensao_id = p_dimensao_id)),
            p_texto, COALESCE(p_tipo_escala,'likert_5'), COALESCE(p_inverter,FALSE))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_perguntas
    SET dimensao_id = COALESCE(p_dimensao_id, dimensao_id), texto_pergunta = p_texto,
        tipo_escala = COALESCE(p_tipo_escala, tipo_escala),
        inverter_pontuacao = COALESCE(p_inverter, inverter_pontuacao),
        ordem = COALESCE(p_ordem, ordem)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_pergunta(UUID,UUID,UUID,TEXT,TEXT,BOOLEAN,INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_pergunta(UUID,UUID,UUID,TEXT,TEXT,BOOLEAN,INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_delete_pergunta(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_inst UUID;
BEGIN
  SELECT instrumento_id INTO v_inst FROM public.psico_perguntas WHERE id = p_id;
  IF v_inst IS NULL THEN RETURN; END IF;
  PERFORM public.psico_assert_editavel(v_inst);
  DELETE FROM public.psico_perguntas WHERE id = p_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_delete_pergunta(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_delete_pergunta(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_reordenar_perguntas(p_instrumento_id UUID, p_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  UPDATE public.psico_perguntas p
  SET ordem = x.pos
  FROM (SELECT unnest(p_ids) AS id, generate_subscripts(p_ids, 1) AS pos) x
  WHERE p.id = x.id AND p.instrumento_id = p_instrumento_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_reordenar_perguntas(UUID,UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_reordenar_perguntas(UUID,UUID[]) TO authenticated;

-- ============ CAMPANHAS ============
CREATE OR REPLACE FUNCTION public.psico_criar_avaliacao(
  p_titulo TEXT, p_instrumento_id UUID, p_data_inicio DATE, p_data_fim DATE,
  p_ghe_ids UUID[], p_modo_anonimato BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID; v_company UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_ghe_ids IS NULL OR array_length(p_ghe_ids,1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um GHE para a campanha';
  END IF;
  v_company := public.get_my_company_id();
  IF v_company IS NULL THEN RAISE EXCEPTION 'Selecione uma empresa antes de criar a campanha'; END IF;

  INSERT INTO public.psico_avaliacoes (company_id, titulo, instrumento_id, status, data_inicio, data_fim, modo_anonimato, criado_por)
  VALUES (v_company, p_titulo, p_instrumento_id, 'rascunho', p_data_inicio, p_data_fim, COALESCE(p_modo_anonimato,TRUE), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.psico_avaliacao_ghes (avaliacao_id, ghe_id)
  SELECT v_id, unnest(p_ghe_ids);

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_criar_avaliacao(TEXT,UUID,DATE,DATE,UUID[],BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_criar_avaliacao(TEXT,UUID,DATE,DATE,UUID[],BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_atribuir_colaboradores(p_avaliacao_id UUID, p_colaborador_ids UUID[])
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_company UUID; v_count INT := 0; v_colab UUID; v_ghe UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  FOREACH v_colab IN ARRAY p_colaborador_ids LOOP
    SELECT cg.ghe_id INTO v_ghe
    FROM public.colaboradores c
    LEFT JOIN public.cargos cg ON cg.id = c.cargo_id
    WHERE c.id = v_colab;
    IF v_ghe IS NULL THEN
      RAISE EXCEPTION 'Colaborador sem GHE vinculado não pode ser atribuído';
    END IF;
    INSERT INTO public.psico_atribuicoes (avaliacao_id, colaborador_id, ghe_id)
    VALUES (p_avaliacao_id, v_colab, v_ghe)
    ON CONFLICT (avaliacao_id, colaborador_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.psico_avaliacoes SET status = 'em_execucao'
  WHERE id = p_avaliacao_id AND status = 'rascunho';

  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_atribuir_colaboradores(UUID,UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_atribuir_colaboradores(UUID,UUID[]) TO authenticated;

-- ============ COLABORADOR ============
CREATE OR REPLACE FUNCTION public.psico_get_questionario(p_atribuicao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_at RECORD; v_res JSONB;
BEGIN
  SELECT t.*, a.instrumento_id, a.titulo, a.data_fim, a.modo_anonimato
  INTO v_at
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  WHERE t.id = p_atribuicao_id;

  IF v_at IS NULL THEN RAISE EXCEPTION 'Atribuição não encontrada'; END IF;
  IF v_at.colaborador_id <> public.get_my_colaborador_id() AND NOT public.psico_is_rh() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_res := jsonb_build_object(
    'atribuicao_id', v_at.id,
    'avaliacao_id', v_at.avaliacao_id,
    'titulo', v_at.titulo,
    'data_fim', v_at.data_fim,
    'status', v_at.status,
    'rascunho', COALESCE(v_at.rascunho, '{}'::jsonb),
    'instrumento', public.psico_get_instrumento_completo(v_at.instrumento_id)
  );
  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_questionario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_questionario(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_save_rascunho(p_atribuicao_id UUID, p_rascunho JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.psico_atribuicoes
  SET rascunho = p_rascunho,
      status = CASE WHEN status = 'pendente' THEN 'em_andamento' ELSE status END
  WHERE id = p_atribuicao_id
    AND colaborador_id = public.get_my_colaborador_id()
    AND status <> 'preenchido';
  IF NOT FOUND THEN RAISE EXCEPTION 'Não foi possível salvar o rascunho'; END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_rascunho(UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_rascunho(UUID,JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_save_respostas(p_atribuicao_id UUID, p_respostas JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_at RECORD;
BEGIN
  SELECT * INTO v_at FROM public.psico_atribuicoes WHERE id = p_atribuicao_id;
  IF v_at IS NULL THEN RAISE EXCEPTION 'Atribuição não encontrada'; END IF;
  IF v_at.colaborador_id <> public.get_my_colaborador_id() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_at.status = 'preenchido' THEN RAISE EXCEPTION 'Questionário já enviado'; END IF;

  INSERT INTO public.psico_respostas (avaliacao_id, ghe_id, pergunta_id, valor_resposta)
  SELECT v_at.avaliacao_id, v_at.ghe_id, (kv.key)::uuid, (kv.value)::int
  FROM jsonb_each_text(p_respostas) kv
  WHERE kv.value ~ '^[0-9]+$';

  UPDATE public.psico_atribuicoes
  SET status = 'preenchido', data_resposta = now(), rascunho = NULL
  WHERE id = p_atribuicao_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_respostas(UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_respostas(UUID,JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_reabrir_questionario(p_atribuicao_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.psico_atribuicoes
  SET status = 'em_andamento', data_resposta = NULL
  WHERE id = p_atribuicao_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_reabrir_questionario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_reabrir_questionario(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_minhas_avaliacoes()
RETURNS TABLE (
  atribuicao_id UUID, avaliacao_id UUID, titulo VARCHAR, status VARCHAR,
  data_inicio DATE, data_fim DATE, instrumento_nome VARCHAR, total_perguntas BIGINT,
  data_atribuicao TIMESTAMPTZ, data_resposta TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT t.id, a.id, a.titulo, t.status, a.data_inicio, a.data_fim, i.nome,
         (SELECT count(*) FROM public.psico_perguntas p WHERE p.instrumento_id = i.id AND p.ativa),
         t.data_atribuicao, t.data_resposta
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE t.colaborador_id = public.get_my_colaborador_id()
    AND a.status <> 'rascunho'
  ORDER BY (t.status = 'preenchido'), a.data_fim;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_minhas_avaliacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_minhas_avaliacoes() TO authenticated;

-- ============ RESULTADOS ============
CREATE OR REPLACE FUNCTION public.psico_get_resultados_gerais(p_avaliacao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_company UUID; v_res JSONB;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  WITH scores AS (
    SELECT r.ghe_id, d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
           CASE WHEN p.inverter_pontuacao THEN 6 - r.valor_resposta ELSE r.valor_resposta END AS score
    FROM public.psico_respostas r
    JOIN public.psico_perguntas p ON p.id = r.pergunta_id
    JOIN public.psico_dimensoes d ON d.id = p.dimensao_id
    WHERE r.avaliacao_id = p_avaliacao_id
  ),
  respondentes AS (
    SELECT ghe_id, count(*) FILTER (WHERE status = 'preenchido') AS total
    FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id GROUP BY ghe_id
  ),
  ghes_validos AS (SELECT ghe_id FROM respondentes WHERE total >= 3)
  SELECT jsonb_build_object(
    'total_atribuidos', (SELECT count(*) FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id),
    'total_respondidos', (SELECT count(*) FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id AND status = 'preenchido'),
    'ghes_omitidos', (SELECT count(*) FROM respondentes WHERE total < 3),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT s.dimensao, s.tipo_dimensao,
               round(avg(s.score)::numeric, 2) AS media,
               round(((avg(s.score) - 1) * 25)::numeric, 1) AS indice
        FROM scores s WHERE s.ghe_id IN (SELECT ghe_id FROM ghes_validos)
        GROUP BY s.dimensao, s.tipo_dimensao ORDER BY s.dimensao
      ) x), '[]'::jsonb),
    'por_ghe', COALESCE((
      SELECT jsonb_agg(y) FROM (
        SELECT g.id AS ghe_id, g.nome AS ghe_nome,
               (SELECT total FROM respondentes rp WHERE rp.ghe_id = g.id) AS respondentes,
               round(avg(s.score)::numeric, 2) AS media_geral,
               COALESCE((
                 SELECT jsonb_agg(z) FROM (
                   SELECT s2.dimensao, s2.tipo_dimensao, round(avg(s2.score)::numeric,2) AS media,
                          round(((avg(s2.score) - 1) * 25)::numeric,1) AS indice
                   FROM scores s2 WHERE s2.ghe_id = g.id GROUP BY s2.dimensao, s2.tipo_dimensao ORDER BY s2.dimensao
                 ) z), '[]'::jsonb) AS dimensoes
        FROM scores s
        JOIN public.ghes g ON g.id = s.ghe_id
        WHERE s.ghe_id IN (SELECT ghe_id FROM ghes_validos)
        GROUP BY g.id, g.nome ORDER BY g.nome
      ) y), '[]'::jsonb)
  ) INTO v_res;

  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_resultados_gerais(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_resultados_gerais(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_get_avaliacoes()
RETURNS TABLE (
  id UUID, titulo VARCHAR, status VARCHAR, data_inicio DATE, data_fim DATE,
  modo_anonimato BOOLEAN, instrumento_id UUID, instrumento_nome VARCHAR,
  total_atribuidos BIGINT, total_respondidos BIGINT, ghe_ids UUID[], created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.titulo, a.status, a.data_inicio, a.data_fim, a.modo_anonimato,
         a.instrumento_id, i.nome,
         (SELECT count(*) FROM public.psico_atribuicoes t WHERE t.avaliacao_id = a.id),
         (SELECT count(*) FROM public.psico_atribuicoes t WHERE t.avaliacao_id = a.id AND t.status = 'preenchido'),
         ARRAY(SELECT ag.ghe_id FROM public.psico_avaliacao_ghes ag WHERE ag.avaliacao_id = a.id),
         a.created_at
  FROM public.psico_avaliacoes a
  JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE public.psico_is_rh()
    AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
  ORDER BY a.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_avaliacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_avaliacoes() TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_get_acompanhamento(p_avaliacao_id UUID)
RETURNS TABLE (
  atribuicao_id UUID, colaborador_id UUID, colaborador_nome TEXT,
  ghe_id UUID, ghe_nome TEXT, status VARCHAR, data_atribuicao TIMESTAMPTZ, data_resposta TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.colaborador_id, c.full_name::text, t.ghe_id, g.nome::text,
         t.status, t.data_atribuicao, t.data_resposta
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  JOIN public.colaboradores c ON c.id = t.colaborador_id
  LEFT JOIN public.ghes g ON g.id = t.ghe_id
  WHERE t.avaliacao_id = p_avaliacao_id
    AND public.psico_is_rh()
    AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
  ORDER BY c.full_name;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_acompanhamento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_acompanhamento(UUID) TO authenticated;