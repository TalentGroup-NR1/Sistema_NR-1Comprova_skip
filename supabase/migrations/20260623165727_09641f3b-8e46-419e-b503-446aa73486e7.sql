CREATE OR REPLACE FUNCTION public.get_cuidar_plus_resultados_agregados(
  p_dimensao text DEFAULT 'departamento',
  p_months int DEFAULT 1
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
  IF p_months NOT IN (1, 3, 6, 12) THEN
    RAISE EXCEPTION 'p_months invalido: %', p_months;
  END IF;

  v_is_admin_master := public.is_admin_master(auth.uid());
  v_company_id := public.get_my_company_id();

  WITH base AS (
    SELECT
      CASE WHEN p_dimensao = 'cliente'
           THEN COALESCE(NULLIF(c.empresa_cliente, ''), comp.name, 'Sem Cliente')
           ELSE COALESCE(NULLIF(c.department, ''), 'Sem Departamento')
      END AS grupo,
      COALESCE(NULLIF(pq.pergunta, ''), 'Geral') AS dimensao,
      COALESCE(
        pr.score_numeric,
        NULLIF(regexp_replace(pr.resposta, '[^0-9.]', '', 'g'), '')::numeric
      ) AS valor,
      date_trunc('week', pr.created_at)::date AS semana,
      pr.employee_id AS colab
    FROM public.pulse_responses pr
    JOIN public.pulse_questions pq ON pq.id = pr.question_id
    JOIN public.colaboradores c ON c.id = pr.employee_id
    LEFT JOIN public.companies comp ON comp.id = c.company_id
    WHERE pr.created_at >= now() - (p_months || ' months')::interval
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
    WHERE LOWER(COALESCE(c.status::text, '')) = 'ativo'
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