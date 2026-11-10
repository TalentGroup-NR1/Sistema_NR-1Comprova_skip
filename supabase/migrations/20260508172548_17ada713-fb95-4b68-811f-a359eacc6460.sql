
-- Onda 6 — Assinatura Digital do Colaborador

-- 1) Colunas de assinatura
ALTER TABLE public.banco_horas_fechamentos
  ADD COLUMN IF NOT EXISTS assinatura_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assinatura_em timestamptz,
  ADD COLUMN IF NOT EXISTS assinatura_hash text;

-- 2) Permitir status 'assinado' no CHECK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'banco_horas_fechamentos_status_check'
  ) THEN
    ALTER TABLE public.banco_horas_fechamentos DROP CONSTRAINT banco_horas_fechamentos_status_check;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.banco_horas_fechamentos
  ADD CONSTRAINT banco_horas_fechamentos_status_check
  CHECK (status IN ('aberto','fechado','reaberto','assinado'));

-- 3) Permitir nova ação 'assinou' na auditoria
ALTER TABLE public.banco_horas_fechamentos_auditoria
  DROP CONSTRAINT IF EXISTS banco_horas_fechamentos_auditoria_acao_check;
ALTER TABLE public.banco_horas_fechamentos_auditoria
  ADD CONSTRAINT banco_horas_fechamentos_auditoria_acao_check
  CHECK (acao IN ('fechou','reabriu','refechou','exportou','assinou'));

-- 4) is_periodo_fechado — bloquear edições também em 'assinado'
CREATE OR REPLACE FUNCTION public.is_periodo_fechado(p_colaborador_id uuid, p_data date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banco_horas_fechamentos
    WHERE colaborador_id = p_colaborador_id
      AND status IN ('fechado','assinado')
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  );
$$;

-- 5) RPC de assinatura
DROP FUNCTION IF EXISTS public.assinar_periodo_ponto(uuid);
CREATE OR REPLACE FUNCTION public.assinar_periodo_ponto(p_fechamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    digest(v_fech.snapshot_jsonb::text || v_uid::text || v_now::text, 'sha256'),
    'hex'
  );

  v_nova_versao := COALESCE(v_fech.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
     SET status = 'assinado',
         assinatura_por = v_uid,
         assinatura_em = v_now,
         assinatura_hash = v_hash,
         versao = v_nova_versao,
         pdf_url = NULL,
         csv_url = NULL,
         updated_at = now()
   WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (p_fechamento_id, 'assinou', v_uid,
    jsonb_build_object(
      'hash', v_hash,
      'assinado_em', v_now,
      'versao_anterior', v_fech.versao,
      'versao_nova', v_nova_versao,
      'colaborador', v_full_name
    ));

  RETURN jsonb_build_object(
    'id', p_fechamento_id,
    'status', 'assinado',
    'hash', v_hash,
    'assinado_em', v_now,
    'versao', v_nova_versao
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assinar_periodo_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_periodo_ponto(uuid) TO authenticated;

-- 6) reabrir_periodo_ponto: aceitar 'fechado' OU 'assinado' e limpar campos de assinatura
CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto(p_fechamento_id uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_fechamento.status NOT IN ('fechado','assinado') THEN
    RAISE EXCEPTION 'Fechamento não está fechado nem assinado (atual: %)', v_fechamento.status;
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
         assinatura_por = NULL,
         assinatura_em = NULL,
         assinatura_hash = NULL,
         updated_at = now()
   WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (
    p_fechamento_id, 'reabriu', v_uid,
    jsonb_build_object(
      'motivo', p_motivo,
      'versao_anterior', v_fechamento.versao,
      'versao_nova', v_nova_versao,
      'status_anterior', v_fechamento.status
    )
  );

  RETURN jsonb_build_object('ok', true, 'fechamento_id', p_fechamento_id, 'versao', v_nova_versao);
END;
$$;
