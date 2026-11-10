CREATE OR REPLACE FUNCTION public.assinar_espelho_mensal(p_espelho_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row public.espelhos_ponto_mensais;
  v_uid uuid := auth.uid();
  v_colab_user uuid;
  v_hash text;
  v_payload text;
BEGIN
  SELECT * INTO v_row FROM public.espelhos_ponto_mensais WHERE id = p_espelho_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT user_id INTO v_colab_user FROM public.colaboradores WHERE id = v_row.colaborador_id;
  IF v_colab_user IS NULL OR v_colab_user <> v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF v_row.status NOT IN ('fechado','reaberto') THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: %', v_row.status;
  END IF;

  v_payload := concat_ws('|',
    v_row.id::text, v_row.colaborador_id::text,
    v_row.periodo_inicio::text, v_row.periodo_fim::text,
    v_row.horas_trabalhadas_minutos, v_row.horas_extras_minutos,
    v_row.horas_abonadas_minutos, v_row.saldo_minutos,
    v_row.versao::text, now()::text
  );
  v_hash := encode(public.sha256(convert_to(v_payload, 'UTF8')), 'hex');

  UPDATE public.espelhos_ponto_mensais
     SET status = 'assinado',
         assinatura_hash = v_hash,
         assinatura_por = v_uid,
         assinatura_em = now(),
         updated_at = now()
   WHERE id = p_espelho_id;

  RETURN jsonb_build_object(
    'id', p_espelho_id,
    'status', 'assinado',
    'hash', v_hash,
    'assinado_em', now(),
    'versao', v_row.versao
  );
END;
$function$;