CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto_massa(
  p_company_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_caller_company uuid;
  v_total int := 0;
  v_reabertos int := 0;
  v_rec record;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo deve ter ao menos 5 caracteres';
  END IF;

  v_role := public.get_my_role();
  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  IF v_role = 'admin_empresa' THEN
    v_caller_company := public.get_my_company_id();
    IF v_caller_company IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'Permissão negada para esta empresa';
    END IF;
  END IF;

  FOR v_rec IN
    SELECT id
    FROM public.banco_horas_fechamentos
    WHERE company_id = p_company_id
      AND periodo_inicio = p_periodo_inicio
      AND periodo_fim = p_periodo_fim
      AND status = 'fechado'
    FOR UPDATE
  LOOP
    v_total := v_total + 1;
    BEGIN
      PERFORM public.reabrir_periodo_ponto(v_rec.id, p_motivo);
      v_reabertos := v_reabertos + 1;
    EXCEPTION WHEN OTHERS THEN
      -- continua tentando os demais
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'total', v_total,
    'reabertos', v_reabertos,
    'periodo_inicio', p_periodo_inicio,
    'periodo_fim', p_periodo_fim
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reabrir_periodo_ponto_massa(uuid, date, date, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reabrir_periodo_ponto_massa(uuid, date, date, text) TO authenticated;