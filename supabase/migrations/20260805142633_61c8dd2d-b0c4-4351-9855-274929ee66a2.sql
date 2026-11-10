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
          v_company, 'automatico', p_avaliacao_id,
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