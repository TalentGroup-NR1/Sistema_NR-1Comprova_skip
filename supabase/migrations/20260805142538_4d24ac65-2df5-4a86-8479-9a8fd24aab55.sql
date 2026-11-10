-- helper interno: company do usuário efetivo
CREATE OR REPLACE FUNCTION public.nr1_assert_ghe_company(p_ghe_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'GHE não encontrado' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: GHE de outra empresa' USING ERRCODE = '42501';
  END IF;
  RETURN v_company;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_assert_ghe_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_assert_ghe_company(uuid) TO authenticated;

-- CONFIG ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nr1_get_matriz_config(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_row public.nr1_matriz_config%ROWTYPE;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não definida' USING ERRCODE='22023'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_row FROM public.nr1_matriz_config WHERE company_id = v_company;
  IF NOT FOUND THEN
    INSERT INTO public.nr1_matriz_config (company_id) VALUES (v_company) RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'company_id', v_row.company_id,
    'corte_verde', v_row.corte_verde, 'corte_amarelo', v_row.corte_amarelo,
    'corte_laranja', v_row.corte_laranja, 'corte_vermelho', v_row.corte_vermelho
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_get_matriz_config(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_get_matriz_config(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.nr1_save_matriz_config(p_company_id uuid, p_config jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_row public.nr1_matriz_config%ROWTYPE;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.nr1_matriz_config (company_id, corte_verde, corte_amarelo, corte_laranja, corte_vermelho)
  VALUES (
    v_company,
    COALESCE((p_config->>'corte_verde')::int, 4),
    COALESCE((p_config->>'corte_amarelo')::int, 9),
    COALESCE((p_config->>'corte_laranja')::int, 14),
    COALESCE((p_config->>'corte_vermelho')::int, 25)
  )
  ON CONFLICT (company_id) DO UPDATE SET
    corte_verde = EXCLUDED.corte_verde,
    corte_amarelo = EXCLUDED.corte_amarelo,
    corte_laranja = EXCLUDED.corte_laranja,
    corte_vermelho = EXCLUDED.corte_vermelho
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'company_id', v_row.company_id,
    'corte_verde', v_row.corte_verde, 'corte_amarelo', v_row.corte_amarelo,
    'corte_laranja', v_row.corte_laranja, 'corte_vermelho', v_row.corte_vermelho
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_save_matriz_config(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_save_matriz_config(uuid, jsonb) TO authenticated;

-- LEITURA -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nr1_get_matriz_por_ghe(p_ghe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  PERFORM public.nr1_assert_ghe_company(p_ghe_id);

  SELECT COALESCE(jsonb_agg(x ORDER BY x.nivel_risco DESC, x.nome_risco), '[]'::jsonb) INTO v_res
  FROM (
    SELECT r.id, r.ghe_id, r.risco_id, r.nome_risco, r.categoria, r.probabilidade, r.severidade,
           r.nivel_risco, r.fonte, r.origem_dados, r.descricao, r.controles_existentes,
           g.nome AS ghe_nome, g.codigo AS ghe_codigo, r.created_at
    FROM public.nr1_ghe_riscos r
    JOIN public.ghes g ON g.id = r.ghe_id
    WHERE r.ghe_id = p_ghe_id AND r.ativo
  ) x;
  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_get_matriz_por_ghe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_get_matriz_por_ghe(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.nr1_get_matriz(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT COALESCE(jsonb_agg(y ORDER BY y.ghe_nome), '[]'::jsonb) INTO v_res
  FROM (
    SELECT g.id AS ghe_id, g.nome AS ghe_nome, g.codigo AS ghe_codigo,
           COALESCE((
             SELECT jsonb_agg(z ORDER BY z.nivel_risco DESC, z.nome_risco) FROM (
               SELECT r.id, r.nome_risco, r.categoria, r.probabilidade, r.severidade,
                      r.nivel_risco, r.fonte, r.origem_dados, r.descricao, r.controles_existentes
               FROM public.nr1_ghe_riscos r
               WHERE r.ghe_id = g.id AND r.ativo
             ) z), '[]'::jsonb) AS riscos
    FROM public.ghes g
    WHERE (v_company IS NULL OR g.company_id = v_company) AND g.ativo
  ) y;
  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_get_matriz(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_get_matriz(uuid) TO authenticated;

-- ESCRITA -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nr1_save_risco_ghe(p_ghe_id uuid, p_risco_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_id uuid;
BEGIN
  PERFORM public.require_admin_role();
  v_company := public.nr1_assert_ghe_company(p_ghe_id);

  v_id := NULLIF(p_risco_data->>'id','')::uuid;

  IF v_id IS NOT NULL THEN
    UPDATE public.nr1_ghe_riscos SET
      risco_id = NULLIF(p_risco_data->>'risco_id','')::uuid,
      nome_risco = COALESCE(p_risco_data->>'nome_risco', nome_risco),
      categoria = COALESCE(p_risco_data->>'categoria', categoria),
      probabilidade = COALESCE((p_risco_data->>'probabilidade')::int, probabilidade),
      severidade = COALESCE((p_risco_data->>'severidade')::int, severidade),
      fonte = COALESCE(p_risco_data->>'fonte', fonte),
      origem_dados = p_risco_data->>'origem_dados',
      descricao = p_risco_data->>'descricao',
      controles_existentes = p_risco_data->>'controles_existentes'
    WHERE id = v_id AND ghe_id = p_ghe_id AND company_id = v_company;
    IF NOT FOUND THEN RAISE EXCEPTION 'Risco não encontrado' USING ERRCODE='22023'; END IF;
  ELSE
    INSERT INTO public.nr1_ghe_riscos (
      company_id, ghe_id, risco_id, nome_risco, categoria, probabilidade, severidade,
      fonte, origem_dados, descricao, controles_existentes
    ) VALUES (
      v_company, p_ghe_id,
      NULLIF(p_risco_data->>'risco_id','')::uuid,
      p_risco_data->>'nome_risco',
      p_risco_data->>'categoria',
      COALESCE((p_risco_data->>'probabilidade')::int, 3),
      COALESCE((p_risco_data->>'severidade')::int, 3),
      COALESCE(p_risco_data->>'fonte', 'manual'),
      p_risco_data->>'origem_dados',
      p_risco_data->>'descricao',
      p_risco_data->>'controles_existentes'
    ) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_save_risco_ghe(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_save_risco_ghe(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.nr1_delete_risco_ghe(p_risco_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_ghe uuid;
BEGIN
  PERFORM public.require_admin_role();
  SELECT ghe_id INTO v_ghe FROM public.nr1_ghe_riscos WHERE id = p_risco_id;
  IF v_ghe IS NULL THEN RAISE EXCEPTION 'Risco não encontrado' USING ERRCODE='22023'; END IF;
  PERFORM public.nr1_assert_ghe_company(v_ghe);
  UPDATE public.nr1_ghe_riscos SET ativo = false WHERE id = p_risco_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_delete_risco_ghe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_delete_risco_ghe(uuid) TO authenticated;

-- SUGESTÕES ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nr1_sugerir_riscos(p_ghe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  v_company := public.nr1_assert_ghe_company(p_ghe_id);

  WITH textos AS (
    SELECT 'tarefa_prescrita'::text AS campo, c.nome AS origem, c.tarefa_prescrita AS txt
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.tarefa_prescrita IS NOT NULL
    UNION ALL
    SELECT 'tarefa_real', c.nome, c.tarefa_real
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.tarefa_real IS NOT NULL
    UNION ALL
    SELECT 'descricao_atividades', c.nome, c.descricao_atividades
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.descricao_atividades IS NOT NULL
    UNION ALL
    SELECT 'cbo_descricao', c.nome, c.cbo_descricao
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.cbo_descricao IS NOT NULL
    UNION ALL
    SELECT 'ambiente_fisico', s.nome, s.ambiente_fisico
      FROM public.ghes g JOIN public.setores s ON s.id = g.setor_id
      WHERE g.id = p_ghe_id AND s.ambiente_fisico IS NOT NULL
  ),
  regras AS (
    SELECT rg.id, rg.risco_catalogo_id, rg.campo_busca, rg.probabilidade_sugerida, rg.severidade_sugerida,
           trim(both from pal) AS palavra
    FROM public.nr1_regras_sugestao rg
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(rg.palavras_chave,''), ',')) AS pal
    WHERE rg.ativo AND trim(both from pal) <> ''
  ),
  matches AS (
    SELECT r.risco_catalogo_id,
           max(r.probabilidade_sugerida) AS probabilidade,
           max(r.severidade_sugerida) AS severidade,
           string_agg(DISTINCT format('"%s" em %s (%s)', r.palavra, t.campo, t.origem), '; ') AS motivo
    FROM regras r
    JOIN textos t ON t.campo = r.campo_busca AND t.txt ILIKE '%' || r.palavra || '%'
    GROUP BY r.risco_catalogo_id
  )
  SELECT COALESCE(jsonb_agg(x ORDER BY x.categoria, x.nome), '[]'::jsonb) INTO v_res
  FROM (
    SELECT cat.id AS risco_catalogo_id, cat.nome, cat.categoria,
           m.probabilidade, m.severidade,
           'Palavras-chave encontradas: ' || m.motivo AS origem_dados,
           m.motivo AS motivo_sugestao,
           EXISTS (
             SELECT 1 FROM public.nr1_ghe_riscos gr
             WHERE gr.ghe_id = p_ghe_id AND gr.ativo
               AND (gr.risco_id = cat.id OR lower(gr.nome_risco) = lower(cat.nome))
           ) AS ja_adicionado
    FROM matches m
    JOIN public.nr1_riscos_catalogo cat ON cat.id = m.risco_catalogo_id
    WHERE cat.ativo AND (cat.company_id IS NULL OR cat.company_id = v_company)
  ) x;

  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_sugerir_riscos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_sugerir_riscos(uuid) TO authenticated;

-- SINCRONIZAÇÃO PSICOSSOCIAL ---------------------------------------------
CREATE OR REPLACE FUNCTION public.nr1_sync_psicossociais(p_avaliacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company uuid; v_heat jsonb; v_linha jsonb; v_cel jsonb;
  v_indice numeric; v_risco numeric; v_tipo text; v_cm numeric; v_ca numeric;
  v_nivel text; v_p int; v_s int; v_ghe uuid; v_nome text; v_titulo text;
  v_criados int := 0; v_planos int := 0; v_novo uuid; v_instr text;
BEGIN
  PERFORM public.require_admin_role();
  SELECT a.company_id, i.nome INTO v_company, v_instr
  FROM public.psico_avaliacoes a
  LEFT JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE a.id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada' USING ERRCODE='22023'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  v_heat := public.psico_get_heatmap(p_avaliacao_id, 'ghe');

  FOR v_linha IN SELECT * FROM jsonb_array_elements(COALESCE(v_heat->'linhas','[]'::jsonb)) LOOP
    v_ghe := NULLIF(v_linha->>'grupo_id','')::uuid;
    CONTINUE WHEN v_ghe IS NULL;

    FOR v_cel IN SELECT * FROM jsonb_array_elements(COALESCE(v_linha->'celulas','[]'::jsonb)) LOOP
      v_indice := NULLIF(v_cel->>'indice','')::numeric;
      CONTINUE WHEN v_indice IS NULL;
      v_tipo := COALESCE(v_cel->>'tipo_dimensao','negativa');
      v_cm := COALESCE((v_cel->>'corte_medio')::numeric, 40);
      v_ca := COALESCE((v_cel->>'corte_alto')::numeric, 60);
      -- normaliza para "quanto maior, pior"
      v_risco := CASE WHEN v_tipo = 'positiva' THEN 100 - v_indice ELSE v_indice END;
      IF v_tipo = 'positiva' THEN
        v_nivel := CASE WHEN v_indice < v_cm THEN 'Vermelho' WHEN v_indice < v_ca THEN 'Laranja' ELSE 'Verde' END;
      ELSE
        v_nivel := CASE WHEN v_indice >= v_ca THEN 'Vermelho' WHEN v_indice >= v_cm THEN 'Laranja' ELSE 'Verde' END;
      END IF;
      CONTINUE WHEN v_nivel = 'Verde';

      IF v_risco >= 90 THEN v_p := 5; v_s := 5;
      ELSIF v_risco >= 75 THEN v_p := 4; v_s := 5;
      ELSE v_p := 4; v_s := 4;
      END IF;

      v_nome := v_cel->>'dimensao';
      IF EXISTS (
        SELECT 1 FROM public.nr1_ghe_riscos r
        WHERE r.ghe_id = v_ghe AND r.ativo AND r.categoria = 'psicossocial'
          AND lower(r.nome_risco) = lower(v_nome)
      ) THEN CONTINUE; END IF;

      INSERT INTO public.nr1_ghe_riscos (
        company_id, ghe_id, nome_risco, categoria, probabilidade, severidade,
        fonte, origem_dados, descricao
      ) VALUES (
        v_company, v_ghe, v_nome, 'psicossocial', v_p, v_s, 'psicossocial',
        format('Heatmap %s - %s: índice %s (%s)', COALESCE(v_instr,'instrumento'), v_nome, v_indice, v_nivel),
        format('Risco psicossocial identificado na campanha psicossocial (grupo %s).', v_linha->>'grupo_nome')
      ) RETURNING id INTO v_novo;
      v_criados := v_criados + 1;

      v_titulo := format('%s - %s', v_nome, v_linha->>'grupo_nome');
      IF NOT EXISTS (
        SELECT 1 FROM public.nr1_planos_acao pa
        WHERE pa.avaliacao_id = p_avaliacao_id
          AND pa.grupo_tipo = 'ghe' AND pa.grupo_id = v_ghe
          AND pa.dimensao_id = NULLIF(v_cel->>'dimensao_id','')::uuid
      ) THEN
        INSERT INTO public.nr1_planos_acao (
          company_id, origem, avaliacao_id, dimensao_id, dimensao_nome,
          grupo_tipo, grupo_id, grupo_nome, indice, media, nivel_risco,
          titulo, descricao, status, criado_por
        ) VALUES (
          v_company, 'matriz_risco', p_avaliacao_id,
          NULLIF(v_cel->>'dimensao_id','')::uuid, v_nome,
          'ghe', v_ghe, v_linha->>'grupo_nome',
          v_indice, NULLIF(v_cel->>'media','')::numeric, v_nivel,
          v_titulo,
          format('Plano gerado pela Matriz de Risco a partir do risco psicossocial "%s" (nível %s).', v_nome, v_nivel),
          'pendente', auth.uid()
        );
        v_planos := v_planos + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('riscos_criados', v_criados, 'planos_criados', v_planos);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.nr1_sync_psicossociais(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nr1_sync_psicossociais(uuid) TO authenticated;