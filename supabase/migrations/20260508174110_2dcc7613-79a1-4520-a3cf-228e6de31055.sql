
CREATE OR REPLACE FUNCTION public.get_meus_fechamentos_mensais(p_colaborador_id uuid)
RETURNS SETOF public.banco_horas_fechamentos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.banco_horas_fechamentos
  WHERE colaborador_id = p_colaborador_id
    AND status IN ('fechado', 'reaberto', 'assinado')
    AND date_trunc('month', periodo_inicio)::date = periodo_inicio
    AND date_trunc('month', periodo_fim)::date = periodo_fim
    AND periodo_fim = (periodo_inicio + interval '1 month - 1 day')::date
  ORDER BY periodo_fim DESC;
$$;

REVOKE ALL ON FUNCTION public.get_meus_fechamentos_mensais(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meus_fechamentos_mensais(uuid) TO authenticated;
