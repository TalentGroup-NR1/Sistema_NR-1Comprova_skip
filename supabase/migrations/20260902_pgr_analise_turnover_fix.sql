DROP FUNCTION IF EXISTS public.pgr_analise_turnover(uuid);

CREATE OR REPLACE FUNCTION public.pgr_analise_turnover()
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
DECLARE
    v_company_id uuid := (select (auth.jwt() ->> 'company_id')::uuid);
BEGIN
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: company_id não identificado no contexto JWT.';
    END IF;

    RETURN QUERY
    WITH recentes AS (
        SELECT dc.colaborador_id, dc.tipo_desligamento, c.department
        FROM public.desligamentos_colaborador dc
        JOIN public.colaboradores c ON c.id = dc.colaborador_id
        WHERE c.company_id = v_company_id
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
    WHERE gs.company_id = v_company_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pgr_analise_turnover() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pgr_analise_turnover() FROM anon;
GRANT EXECUTE ON FUNCTION public.pgr_analise_turnover() TO authenticated;
