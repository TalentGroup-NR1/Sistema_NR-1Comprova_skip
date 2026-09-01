CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto(p_fechamento_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_fechamento RECORD;
  v_uid UUID := auth.uid();
  v_nova_versao INT;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Apenas admin_master ou admin_empresa podem reabrir';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  SELECT * INTO v_fechamento FROM public.banco_horas_fechamentos WHERE id = p_fechamento_id;
  IF v_fechamento IS NULL THEN
    RAISE EXCEPTION 'Fechamento não encontrado';
  END IF;
  IF v_role <> 'admin_master' AND v_fechamento.company_id <> v_my_company THEN
    RAISE EXCEPTION 'Fora do escopo';
  END IF;
  IF v_fechamento.status <> 'fechado' THEN
    RAISE EXCEPTION 'Fechamento não está em estado fechado (atual: %)', v_fechamento.status;
  END IF;

  v_nova_versao := COALESCE(v_fechamento.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
  SET status = 'reaberto',
      reaberto_por = v_uid,
      reaberto_em = now(),
      motivo_reabertura = p_motivo,
      versao = v_nova_versao,
      csv_url = NULL,
      pdf_url = NULL,
      updated_at = now()
  WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (
    p_fechamento_id, 'reabriu', v_uid,
    jsonb_build_object('motivo', p_motivo, 'versao_anterior', v_fechamento.versao, 'versao_nova', v_nova_versao)
  );

  RETURN jsonb_build_object('ok', true, 'fechamento_id', p_fechamento_id, 'versao', v_nova_versao);
END;
$function$;