-- 1) Faixas de risco configuráveis por dimensão (em índice 0-100)
ALTER TABLE public.psico_dimensoes
  ADD COLUMN IF NOT EXISTS corte_medio NUMERIC(5,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS corte_alto  NUMERIC(5,2) NOT NULL DEFAULT 60;

-- 2) Planos de ação passam a suportar âncora psicossocial dinâmica
ALTER TABLE public.nr1_planos_acao
  ADD COLUMN IF NOT EXISTS avaliacao_id UUID REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dimensao_id  UUID REFERENCES public.psico_dimensoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dimensao_nome TEXT,
  ADD COLUMN IF NOT EXISTS grupo_tipo   TEXT,
  ADD COLUMN IF NOT EXISTS grupo_id     UUID,
  ADD COLUMN IF NOT EXISTS grupo_nome   TEXT,
  ADD COLUMN IF NOT EXISTS indice       NUMERIC(6,2);

ALTER TABLE public.nr1_planos_acao ALTER COLUMN departamento DROP NOT NULL;
ALTER TABLE public.nr1_planos_acao ALTER COLUMN escala DROP NOT NULL;
ALTER TABLE public.nr1_planos_acao ALTER COLUMN media DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.nr1_planos_acao DROP CONSTRAINT IF EXISTS nr1_planos_acao_grupo_tipo_check;
EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE public.nr1_planos_acao
  ADD CONSTRAINT nr1_planos_acao_grupo_tipo_check
  CHECK (grupo_tipo IS NULL OR grupo_tipo IN ('ghe','departamento'));

CREATE INDEX IF NOT EXISTS idx_nr1_planos_acao_avaliacao ON public.nr1_planos_acao(avaliacao_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nr1_planos_psico_aberto
  ON public.nr1_planos_acao(avaliacao_id, grupo_tipo, grupo_nome, dimensao_id)
  WHERE avaliacao_id IS NOT NULL AND status IN ('pendente','planejado');

-- 3) Heatmap dinâmico
CREATE OR REPLACE FUNCTION public.psico_get_heatmap(p_avaliacao_id UUID, p_agrupamento TEXT DEFAULT 'ghe')
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_company UUID; v_res JSONB; v_agr TEXT;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  v_agr := CASE WHEN lower(COALESCE(p_agrupamento,'ghe')) = 'departamento' THEN 'departamento' ELSE 'ghe' END;

  WITH atrib AS (
    SELECT a.id, a.ghe_id, a.status, c.department
    FROM public.psico_atribuicoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.avaliacao_id = p_avaliacao_id
  ),
  -- Mapa GHE -> grupo. Para departamento, o GHE só é atribuído a um departamento
  -- quando todos os respondentes pertencem ao mesmo (preserva o anonimato).
  ghe_grupo AS (
    SELECT a.ghe_id,
           CASE WHEN v_agr = 'ghe' THEN g.id::text
                WHEN count(DISTINCT COALESCE(a.department,'—')) = 1
                  THEN COALESCE(max(a.department), 'Não informado')
                ELSE 'Múltiplos departamentos' END AS grupo_chave,
           CASE WHEN v_agr = 'ghe' THEN g.nome
                WHEN count(DISTINCT COALESCE(a.department,'—')) = 1
                  THEN COALESCE(max(a.department), 'Não informado')
                ELSE 'Múltiplos departamentos' END AS grupo_nome,
           CASE WHEN v_agr = 'ghe' THEN g.id ELSE NULL END AS grupo_id
    FROM atrib a
    JOIN public.ghes g ON g.id = a.ghe_id
    GROUP BY a.ghe_id, g.id, g.nome
  ),
  respondentes AS (
    SELECT gg.grupo_chave, gg.grupo_nome, gg.grupo_id,
           count(*) FILTER (WHERE a.status = 'preenchido') AS total
    FROM atrib a JOIN ghe_grupo gg ON gg.ghe_id = a.ghe_id
    GROUP BY gg.grupo_chave, gg.grupo_nome, gg.grupo_id
  ),
  grupos_validos AS (SELECT grupo_chave FROM respondentes WHERE total >= 3),
  scores AS (
    SELECT gg.grupo_chave, d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
           d.corte_medio, d.corte_alto, d.ordem,
           CASE WHEN p.inverter_pontuacao THEN 6 - r.valor_resposta ELSE r.valor_resposta END AS score
    FROM public.psico_respostas r
    JOIN public.psico_perguntas p ON p.id = r.pergunta_id
    JOIN public.psico_dimensoes d ON d.id = p.dimensao_id
    JOIN ghe_grupo gg ON gg.ghe_id = r.ghe_id
    WHERE r.avaliacao_id = p_avaliacao_id
  )
  SELECT jsonb_build_object(
    'agrupamento', v_agr,
    'min_respondentes', 3,
    'total_atribuidos', (SELECT count(*) FROM atrib),
    'total_respondidos', (SELECT count(*) FROM atrib WHERE status = 'preenchido'),
    'grupos_omitidos', (SELECT count(*) FROM respondentes WHERE total < 3),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT DISTINCT d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
               d.corte_medio, d.corte_alto, d.ordem
        FROM public.psico_dimensoes d
        JOIN public.psico_avaliacoes av ON av.instrumento_id = d.instrumento_id
        WHERE av.id = p_avaliacao_id
        ORDER BY d.ordem, d.nome
      ) x), '[]'::jsonb),
    'linhas', COALESCE((
      SELECT jsonb_agg(y ORDER BY y.grupo_nome) FROM (
        SELECT rp.grupo_chave, rp.grupo_nome, rp.grupo_id, rp.total AS respondentes,
               COALESCE((
                 SELECT jsonb_agg(z ORDER BY z.ordem, z.dimensao) FROM (
                   SELECT s.dimensao_id, s.dimensao, s.tipo_dimensao, s.corte_medio, s.corte_alto, s.ordem,
                          round(avg(s.score)::numeric, 2) AS media,
                          round(((avg(s.score) - 1) * 25)::numeric, 1) AS indice
                   FROM scores s
                   WHERE s.grupo_chave = rp.grupo_chave
                   GROUP BY s.dimensao_id, s.dimensao, s.tipo_dimensao, s.corte_medio, s.corte_alto, s.ordem
                 ) z), '[]'::jsonb) AS celulas
        FROM respondentes rp
        WHERE rp.grupo_chave IN (SELECT grupo_chave FROM grupos_validos)
      ) y), '[]'::jsonb)
  ) INTO v_res;

  RETURN v_res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_heatmap(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_heatmap(UUID, TEXT) TO authenticated;

-- 4) Geração automática de planos a partir do heatmap
CREATE OR REPLACE FUNCTION public.psico_gerar_planos(p_avaliacao_id UUID, p_agrupamento TEXT DEFAULT 'ghe')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_company UUID; v_hm JSONB; v_linha JSONB; v_cel JSONB;
  v_indice NUMERIC; v_tipo TEXT; v_cm NUMERIC; v_ca NUMERIC; v_nivel TEXT;
  v_criados INT := 0; v_existentes INT := 0; v_agr TEXT;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_hm := public.psico_get_heatmap(p_avaliacao_id, p_agrupamento);
  v_agr := v_hm->>'agrupamento';

  FOR v_linha IN SELECT * FROM jsonb_array_elements(v_hm->'linhas') LOOP
    FOR v_cel IN SELECT * FROM jsonb_array_elements(v_linha->'celulas') LOOP
      v_indice := (v_cel->>'indice')::numeric;
      v_tipo := v_cel->>'tipo_dimensao';
      v_cm := COALESCE((v_cel->>'corte_medio')::numeric, 40);
      v_ca := COALESCE((v_cel->>'corte_alto')::numeric, 60);

      IF v_indice IS NULL THEN CONTINUE; END IF;

      IF v_tipo = 'positiva' THEN
        v_nivel := CASE WHEN v_indice < v_cm THEN 'Vermelho'
                        WHEN v_indice < v_ca THEN 'Laranja' ELSE NULL END;
      ELSE
        v_nivel := CASE WHEN v_indice >= v_ca THEN 'Vermelho'
                        WHEN v_indice >= v_cm THEN 'Laranja' ELSE NULL END;
      END IF;

      IF v_nivel IS NULL THEN CONTINUE; END IF;

      IF EXISTS (
        SELECT 1 FROM public.nr1_planos_acao
        WHERE avaliacao_id = p_avaliacao_id
          AND grupo_tipo = v_agr
          AND grupo_nome = (v_linha->>'grupo_nome')
          AND dimensao_id = (v_cel->>'dimensao_id')::uuid
          AND status IN ('pendente','planejado')
      ) THEN
        v_existentes := v_existentes + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.nr1_planos_acao (
        company_id, origem, avaliacao_id, dimensao_id, dimensao_nome,
        grupo_tipo, grupo_id, grupo_nome, departamento, media, indice,
        nivel_risco, titulo, status, criado_por, participacao_trabalhadores
      ) VALUES (
        v_company, 'automatico', p_avaliacao_id,
        (v_cel->>'dimensao_id')::uuid, v_cel->>'dimensao',
        v_agr, NULLIF(v_linha->>'grupo_id','')::uuid, v_linha->>'grupo_nome',
        CASE WHEN v_agr = 'departamento' THEN v_linha->>'grupo_nome' ELSE NULL END,
        (v_cel->>'media')::numeric, v_indice,
        v_nivel,
        format('%s — %s', v_linha->>'grupo_nome', v_cel->>'dimensao'),
        'pendente', auth.uid(), false
      );
      v_criados := v_criados + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('criados', v_criados, 'ja_existentes', v_existentes);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_gerar_planos(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_gerar_planos(UUID, TEXT) TO authenticated;

-- 5) Salvar dimensão com faixas configuráveis
CREATE OR REPLACE FUNCTION public.psico_save_dimensao(
  p_id UUID, p_instrumento_id UUID, p_nome TEXT, p_tipo TEXT, p_descricao TEXT, p_ordem INT,
  p_corte_medio NUMERIC DEFAULT NULL, p_corte_alto NUMERIC DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem, corte_medio, corte_alto)
    VALUES (p_instrumento_id, p_nome, COALESCE(p_tipo,'negativa'), p_descricao,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id)),
            COALESCE(p_corte_medio, 40), COALESCE(p_corte_alto, 60))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_dimensoes
    SET nome = p_nome, tipo_dimensao = COALESCE(p_tipo, tipo_dimensao), descricao = p_descricao,
        ordem = COALESCE(p_ordem, ordem),
        corte_medio = COALESCE(p_corte_medio, corte_medio),
        corte_alto = COALESCE(p_corte_alto, corte_alto)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.psico_save_dimensao(UUID,UUID,TEXT,TEXT,TEXT,INT,NUMERIC,NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_save_dimensao(UUID,UUID,TEXT,TEXT,TEXT,INT,NUMERIC,NUMERIC) TO authenticated;

-- 6) Instrumento completo devolve as faixas
CREATE OR REPLACE FUNCTION public.psico_get_instrumento_completo(p_instrumento_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', i.id, 'company_id', i.company_id, 'nome', i.nome, 'versao', i.versao,
    'descricao', i.descricao, 'referencia_cientifica', i.referencia_cientifica,
    'editavel', i.editavel, 'ativo', i.ativo,
    'em_uso', public.psico_instrumento_em_uso(i.id),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(d ORDER BY d.ordem, d.nome) FROM (
        SELECT dd.id, dd.nome, dd.tipo_dimensao, dd.descricao, dd.ordem,
               dd.corte_medio, dd.corte_alto,
               COALESCE((
                 SELECT jsonb_agg(p ORDER BY p.ordem) FROM (
                   SELECT pp.id, pp.ordem, pp.texto_pergunta, pp.tipo_escala, pp.inverter_pontuacao, pp.ativa
                   FROM public.psico_perguntas pp WHERE pp.dimensao_id = dd.id
                 ) p), '[]'::jsonb) AS perguntas
        FROM public.psico_dimensoes dd WHERE dd.instrumento_id = i.id
      ) d), '[]'::jsonb)
  )
  FROM public.psico_instrumentos i
  WHERE i.id = p_instrumento_id
    AND (i.company_id IS NULL OR i.company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.psico_get_instrumento_completo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_get_instrumento_completo(UUID) TO authenticated;