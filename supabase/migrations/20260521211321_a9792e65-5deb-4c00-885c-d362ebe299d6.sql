CREATE OR REPLACE FUNCTION public.get_saldos_para_fechamento(p_company_id uuid, p_periodo_inicio date, p_periodo_fim date)
 RETURNS TABLE(colaborador_id uuid, full_name text, matricula text, department text, saldo_minutos integer, tratativa_id uuid, tratativa_acao tratativa_saldo_acao, tratativa_observacao text, decidido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company uuid;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name::text,
    c.matricula::text,
    c.department::text,
    COALESCE(s.saldo, 0)::int,
    t.id,
    t.acao,
    t.observacao,
    t.decidido_em
  FROM public.colaboradores c
  LEFT JOIN LATERAL (
    SELECT SUM(r.saldo_minutos)::int AS saldo
    FROM public.ponto_resumo_diario r
    WHERE r.colaborador_id = c.id
      AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim
  ) s ON true
  LEFT JOIN public.ponto_fechamento_tratativas t
    ON t.colaborador_id = c.id
   AND t.periodo_inicio = p_periodo_inicio
   AND t.periodo_fim    = p_periodo_fim
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'
    AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
  ORDER BY c.full_name;
END;
$function$;