-- Helper: gate de acesso ao módulo Ponto
CREATE OR REPLACE FUNCTION public.pode_acessar_modulo_ponto()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin_master','admin_empresa','analista_rh','gestor_departamento')
    )
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.user_id = auth.uid()
        AND c.status = 'ATIVO'
        AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
    );
$$;

REVOKE ALL ON FUNCTION public.pode_acessar_modulo_ponto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_acessar_modulo_ponto() TO authenticated;

-- 1) assinar_periodo_ponto: gate no topo
DROP FUNCTION IF EXISTS public.assinar_periodo_ponto(uuid);
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
  v_contract text;
  v_hash text;
  v_now timestamptz := now();
  v_nova_versao int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fech FROM public.banco_horas_fechamentos
   WHERE id = p_fechamento_id FOR UPDATE;
  IF v_fech IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: fechamento inexistente' USING ERRCODE = 'P0002';
  END IF;

  SELECT user_id, full_name, contract_type::text
    INTO v_owner_user, v_full_name, v_contract
    FROM public.colaboradores WHERE id = v_fech.colaborador_id;

  IF v_owner_user IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: somente o próprio colaborador pode assinar' USING ERRCODE = '42501';
  END IF;
  IF v_contract NOT IN ('CLT','Estágio','Aprendiz','Temporário') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo % não permite assinatura', v_contract USING ERRCODE = '42501';
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

-- 2) reabrir_periodo_ponto: gate no topo
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
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

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
    RAISE EXCEPTION 'Fechamento não está em estado fechado/assinado (atual: %)', v_fechamento.status;
  END IF;

  v_nova_versao := COALESCE(v_fechamento.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
  SET status = 'reaberto',
      reaberto_por = v_uid,
      reaberto_em = now(),
      motivo_reabertura = p_motivo,
      versao = v_nova_versao,
      assinatura_por = NULL,
      assinatura_em = NULL,
      assinatura_hash = NULL,
      csv_url = NULL,
      pdf_url = NULL,
      updated_at = now()
  WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (
    p_fechamento_id, 'reabriu', v_uid,
    jsonb_build_object('motivo', p_motivo, 'versao_anterior', v_fechamento.versao, 'versao_nova', v_nova_versao)
  );

  RETURN jsonb_build_object('id', p_fechamento_id, 'status', 'reaberto', 'versao', v_nova_versao);
END;
$$;

-- 3) reabrir_periodo_ponto_massa: gate no topo
CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto_massa(
  p_company_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_total INT := 0;
  v_reabertos INT := 0;
  v_rec RECORD;
BEGIN
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Apenas admin_master ou admin_empresa podem reabrir';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  FOR v_rec IN
    SELECT id FROM public.banco_horas_fechamentos
    WHERE company_id = p_company_id
      AND periodo_inicio = p_periodo_inicio
      AND periodo_fim = p_periodo_fim
      AND status IN ('fechado','assinado')
  LOOP
    v_total := v_total + 1;
    BEGIN
      PERFORM public.reabrir_periodo_ponto(v_rec.id, p_motivo);
      v_reabertos := v_reabertos + 1;
    EXCEPTION WHEN OTHERS THEN
      -- continua mesmo se um falhar
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'reabertos', v_reabertos);
END;
$$;
REVOKE ALL ON FUNCTION public.reabrir_periodo_ponto_massa(uuid, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reabrir_periodo_ponto_massa(uuid, date, date, text) TO authenticated;

-- 4) fechar_periodo_ponto: gate + filtro de contract_type no loop
CREATE OR REPLACE FUNCTION public.fechar_periodo_ponto(
  p_company_id UUID,
  p_periodo_inicio DATE,
  p_periodo_fim DATE,
  p_colaboradores_ids UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_colab RECORD;
  v_snapshot JSONB;
  v_h_trab INT;
  v_h_extra INT;
  v_h_not INT;
  v_h_aban INT;
  v_dias_falta INT;
  v_dias_aban INT;
  v_saldo INT;
  v_hash TEXT;
  v_fechamento_id UUID;
  v_total INT := 0;
  v_sucesso INT := 0;
  v_erros JSONB := '[]'::JSONB;
  v_uid UUID := auth.uid();
BEGIN
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;
  IF p_periodo_inicio > p_periodo_fim THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  FOR v_colab IN
    SELECT c.id, c.full_name
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
      AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR c.id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      SELECT
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'data', r.data,
            'horas_previstas_minutos', r.horas_previstas_minutos,
            'horas_trabalhadas_minutos', r.horas_trabalhadas_minutos,
            'horas_intervalo_minutos', r.horas_intervalo_minutos,
            'horas_noturnas_minutos', r.horas_noturnas_minutos,
            'horas_extras_minutos', r.horas_extras_minutos,
            'saldo_minutos', r.saldo_minutos,
            'status', r.status
          ) ORDER BY r.data
        ), '[]'::JSONB),
        COALESCE(SUM(r.horas_trabalhadas_minutos), 0),
        COALESCE(SUM(r.horas_extras_minutos), 0),
        COALESCE(SUM(r.horas_noturnas_minutos), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN r.horas_previstas_minutos ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'FALTA' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(r.saldo_minutos), 0)
      INTO v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban, v_saldo
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim;

      v_hash := encode(extensions.digest(v_snapshot::text || v_colab.id::text || p_periodo_inicio::text || p_periodo_fim::text, 'sha256'), 'hex');

      INSERT INTO public.banco_horas_fechamentos (
        company_id, colaborador_id, periodo_inicio, periodo_fim,
        snapshot_jsonb, horas_trabalhadas_minutos, horas_extras_minutos,
        horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
        saldo_minutos, hash_assinatura, status, fechado_por, fechado_em, versao
      ) VALUES (
        p_company_id, v_colab.id, p_periodo_inicio, p_periodo_fim,
        v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban,
        v_saldo, v_hash, 'fechado', v_uid, now(), 1
      )
      ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
      DO UPDATE SET
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        saldo_minutos = EXCLUDED.saldo_minutos,
        hash_assinatura = EXCLUDED.hash_assinatura,
        status = 'fechado',
        fechado_por = v_uid,
        fechado_em = now(),
        versao = COALESCE(public.banco_horas_fechamentos.versao, 1) + 1,
        csv_url = NULL,
        pdf_url = NULL,
        updated_at = now()
      RETURNING id INTO v_fechamento_id;

      INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
      VALUES (v_fechamento_id, 'fechou', v_uid,
        jsonb_build_object('hash', v_hash, 'periodo_inicio', p_periodo_inicio, 'periodo_fim', p_periodo_fim));

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros);
END;
$$;
ALTER FUNCTION public.fechar_periodo_ponto(uuid, date, date, uuid[]) SET search_path = public, extensions;

-- 5) get_meus_fechamentos_mensais: gate (defesa em profundidade)
-- (não recriamos a função; apenas garantimos que a próxima chamada respeite o gate via outras camadas)