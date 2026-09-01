
CREATE OR REPLACE FUNCTION public.assinar_periodo_ponto(p_fechamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_fech RECORD;
  v_owner_user uuid;
  v_full_name text;
  v_hash text;
  v_now timestamptz := now();
  v_nova_versao int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fech FROM public.banco_horas_fechamentos
   WHERE id = p_fechamento_id FOR UPDATE;
  IF v_fech IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: fechamento inexistente' USING ERRCODE = 'P0002';
  END IF;

  SELECT user_id, full_name INTO v_owner_user, v_full_name
    FROM public.colaboradores WHERE id = v_fech.colaborador_id;

  IF v_owner_user IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: somente o próprio colaborador pode assinar' USING ERRCODE = '42501';
  END IF;
  IF v_fech.status NOT IN ('fechado','reaberto') THEN
    RAISE EXCEPTION 'INVALID_STATE: status atual = %', v_fech.status USING ERRCODE = 'P0001';
  END IF;
  IF v_fech.snapshot_jsonb IS NULL THEN
    RAISE EXCEPTION 'NO_SNAPSHOT: snapshot indisponível' USING ERRCODE = 'P0001';
  END IF;

  v_hash := encode(
    extensions.digest(v_fech.snapshot_jsonb::text || v_uid::text || v_now::text, 'sha256'),
    'hex'
  );
  v_nova_versao := COALESCE(v_fech.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
     SET status='assinado', assinatura_por=v_uid, assinatura_em=v_now,
         assinatura_hash=v_hash, versao=v_nova_versao,
         pdf_url=NULL, csv_url=NULL, updated_at=now()
   WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (p_fechamento_id, 'assinou', v_uid,
    jsonb_build_object('hash', v_hash, 'assinado_em', v_now,
      'versao_anterior', v_fech.versao, 'versao_nova', v_nova_versao,
      'colaborador', v_full_name));

  RETURN jsonb_build_object('id', p_fechamento_id, 'status', 'assinado',
    'hash', v_hash, 'assinado_em', v_now, 'versao', v_nova_versao);
END;
$$;

REVOKE ALL ON FUNCTION public.assinar_periodo_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_periodo_ponto(uuid) TO authenticated;
