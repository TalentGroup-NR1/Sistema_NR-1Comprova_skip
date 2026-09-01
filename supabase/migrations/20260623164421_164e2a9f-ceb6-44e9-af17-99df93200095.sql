CREATE OR REPLACE FUNCTION public.get_cuidar_plus_resultados_agregados(
  p_dimensao text DEFAULT 'departamento',
  p_weeks int DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_is_admin_master boolean;
  v_company_id uuid;
BEGIN
  PERFORM require_admin_role();

  IF p_dimensao NOT IN ('departamento','cliente') THEN
    RAISE EXCEPTION 'p_dimensao invalido: %', p_dimensao;
  END IF;
  IF p_weeks NOT IN (4, 12, 24) THEN
    RAISE EXCEPTION 'p_weeks invalido: %', p_weeks;
  END IF;

  v_is_admin_master := public.is_admin_master();
  v_company_id := public.get_my_company_id();

  WITH base AS (
    SELECT
      CASE WHEN p_dimensao = 'cliente'
           THEN COALESCE(NULLIF(c.empresa_cliente, ''), comp.name, 'Sem Cliente')
           ELSE COALESCE(NULLIF(c.department, ''), 'Sem Departamento')
      END AS grupo,
      COALESCE(NULLIF(p.dimensao, ''), 'Geral') AS dimensao,
      NULLIF(regexp_replace(r.resposta_valor, '[^0-9.]', '', 'g'), '')::numeric AS valor,
      date_trunc('week', r.submitted_at)::date AS semana,
      COALESCE(r.colaborador_id_identificado, e.colaborador_id) AS colab,
      c.company_id AS cid
    FROM public.respostas_cuidar_plus r
    JOIN public.perguntas_cuidar_plus p ON p.id = r.pergunta_id
    LEFT JOIN public.envios_cuidar_plus e ON e.id = r.session_id
    LEFT JOIN public.colaboradores c
      ON c.id = COALESCE(r.colaborador_id_identificado, e.colaborador_id)
    LEFT JOIN public.companies comp ON comp.id = c.company_id
    WHERE r.submitted_at >= now() - (p_weeks || ' weeks')::interval
      AND (v_is_admin_master OR c.company_id = v_company_id)
  ),
  base_valida AS (
    SELECT * FROM base WHERE valor IS NOT NULL AND grupo IS NOT NULL
  ),
  totais_grupo AS (
    SELECT
      CASE WHEN p_dimensao = 'cliente'
           THEN COALESCE(NULLIF(c.empresa_cliente, ''), comp.name, 'Sem Cliente')
           ELSE COALESCE(NULLIF(c.department, ''), 'Sem Departamento')
      END AS grupo,
      COUNT(*)::int AS total_colaboradores
    FROM public.colaboradores c
    LEFT JOIN public.companies comp ON comp.id = c.company_id
    WHERE c.status = 'ativo'
      AND (v_is_admin_master OR c.company_id = v_company_id)
    GROUP BY 1
  ),
  heatmap AS (
    SELECT
      b.grupo,
      b.dimensao,
      ROUND(AVG(b.valor)::numeric, 2) AS media,
      COUNT(DISTINCT b.colab)::int AS respondentes,
      COALESCE(tg.total_colaboradores, 0) AS total_colaboradores
    FROM base_valida b
    LEFT JOIN totais_grupo tg ON tg.grupo = b.grupo
    GROUP BY b.grupo, b.dimensao, tg.total_colaboradores
  ),
  timeline AS (
    SELECT
      grupo,
      semana,
      ROUND(AVG(valor)::numeric, 2) AS media,
      COUNT(DISTINCT colab)::int AS respondentes
    FROM base_valida
    GROUP BY grupo, semana
  )
  SELECT jsonb_build_object(
    'heatmap', COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM heatmap h), '[]'::jsonb),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.semana) FROM timeline t), '[]'::jsonb),
    'grupos', COALESCE((SELECT jsonb_agg(DISTINCT grupo ORDER BY grupo) FROM base_valida), '[]'::jsonb),
    'dimensoes', COALESCE((SELECT jsonb_agg(DISTINCT dimensao ORDER BY dimensao) FROM base_valida), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cuidar_plus_resultados_agregados(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cuidar_plus_resultados_agregados(text, int) TO authenticated;