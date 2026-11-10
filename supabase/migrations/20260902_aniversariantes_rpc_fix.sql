CREATE OR REPLACE FUNCTION public.get_aniversariantes_globais_mes(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  nome text,
  dia int,
  tipo text,
  anos_empresa int,
  cliente_alocado text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH hoje AS (
    SELECT EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS mes,
           EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS ano
  )
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.birth_date)::int AS dia,
         'nascimento'::text AS tipo,
         NULL::int AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date)::int = hoje.mes
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  UNION ALL
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.admission_date)::int AS dia,
         'empresa'::text AS tipo,
         (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.admission_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.admission_date)::int = hoje.mes
    AND (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) >= 1
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  ORDER BY dia;
$$;
