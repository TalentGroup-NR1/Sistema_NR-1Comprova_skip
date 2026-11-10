CREATE OR REPLACE FUNCTION public.pgr_analise_turnover(p_company_id uuid)
RETURNS TABLE (
    ghe_id uuid,
    departamento text,
    qtde_desligamentos integer,
    alerta_nota integer
)
LANGUAGE plpgsql
SECURITY DEFINER
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
