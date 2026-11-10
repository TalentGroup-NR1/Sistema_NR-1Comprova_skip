
-- 1) Corrige registrar_tratativa_fechamento: filtra dias anteriores à admissão
CREATE OR REPLACE FUNCTION public.registrar_tratativa_fechamento(
  p_company_id uuid,
  p_colaborador_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_acao public.tratativa_saldo_acao,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_uid uuid := auth.uid();
  v_saldo int := 0;
  v_id uuid;
  v_admission date;
BEGIN
  PERFORM public.require_admin_role();

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  SELECT admission_date INTO v_admission
  FROM public.colaboradores WHERE id = p_colaborador_id;

  SELECT COALESCE(SUM(saldo_minutos),0)::int INTO v_saldo
  FROM public.ponto_resumo_diario
  WHERE colaborador_id = p_colaborador_id
    AND data BETWEEN p_periodo_inicio AND p_periodo_fim
    AND (v_admission IS NULL OR data >= v_admission);

  IF v_saldo > 0 AND p_acao NOT IN ('pagar','transferir') THEN
    RAISE EXCEPTION 'Saldo positivo só pode ser pago ou transferido';
  END IF;
  IF v_saldo < 0 AND p_acao NOT IN ('descontar','transferir','perdoar') THEN
    RAISE EXCEPTION 'Saldo negativo só pode ser descontado, transferido ou perdoado';
  END IF;
  IF v_saldo = 0 THEN
    RAISE EXCEPTION 'Colaborador sem saldo no período não requer tratativa';
  END IF;

  INSERT INTO public.ponto_fechamento_tratativas (
    company_id, colaborador_id, periodo_inicio, periodo_fim,
    saldo_minutos, acao, observacao, decidido_por
  ) VALUES (
    p_company_id, p_colaborador_id, p_periodo_inicio, p_periodo_fim,
    v_saldo, p_acao, NULLIF(p_observacao,''), v_uid
  )
  ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
  DO UPDATE SET
    saldo_minutos = EXCLUDED.saldo_minutos,
    acao = EXCLUDED.acao,
    observacao = EXCLUDED.observacao,
    decidido_por = EXCLUDED.decidido_por,
    decidido_em = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2) Corrige fechar_periodo_ponto: agrega ignorando dias anteriores à admissão
CREATE OR REPLACE FUNCTION public.fechar_periodo_ponto(
  p_company_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_colaboradores_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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
  v_tratativa RECORD;
  v_pendentes JSONB := '[]'::JSONB;
  v_data_ajuste DATE;
BEGIN
  PERFORM public.require_admin_role();

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
    SELECT s.colaborador_id, s.full_name, s.saldo_minutos
    FROM public.get_saldos_para_fechamento(p_company_id, p_periodo_inicio, p_periodo_fim) s
    WHERE s.saldo_minutos <> 0
      AND s.tratativa_id IS NULL
      AND (p_colaboradores_ids IS NULL OR s.colaborador_id = ANY(p_colaboradores_ids))
  LOOP
    v_pendentes := v_pendentes || jsonb_build_object(
      'colaborador_id', v_colab.colaborador_id,
      'full_name', v_colab.full_name,
      'saldo_minutos', v_colab.saldo_minutos
    );
  END LOOP;

  IF jsonb_array_length(v_pendentes) > 0 THEN
    RAISE EXCEPTION 'TRATATIVAS_PENDENTES: % colaborador(es) com saldo sem tratativa', jsonb_array_length(v_pendentes)
      USING DETAIL = v_pendentes::text;
  END IF;

  v_data_ajuste := p_periodo_fim + 1;

  FOR v_colab IN
    SELECT c.id, c.full_name, c.admission_date
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
        AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim
        AND (v_colab.admission_date IS NULL OR r.data >= v_colab.admission_date);

      SELECT acao, observacao INTO v_tratativa
      FROM public.ponto_fechamento_tratativas
      WHERE company_id = p_company_id
        AND colaborador_id = v_colab.id
        AND periodo_inicio = p_periodo_inicio
        AND periodo_fim = p_periodo_fim;

      v_hash := encode(extensions.digest(
        v_snapshot::text || v_colab.id::text || p_periodo_inicio::text || p_periodo_fim::text
          || COALESCE(v_tratativa.acao::text,'sem_saldo'),
        'sha256'), 'hex');

      INSERT INTO public.banco_horas_fechamentos (
        company_id, colaborador_id, periodo_inicio, periodo_fim,
        snapshot_jsonb, horas_trabalhadas_minutos, horas_extras_minutos,
        horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
        saldo_minutos, hash_assinatura, status, fechado_por, fechado_em, versao,
        tratativa_acao, tratativa_observacao
      ) VALUES (
        p_company_id, v_colab.id, p_periodo_inicio, p_periodo_fim,
        v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban,
        v_saldo, v_hash, 'fechado', v_uid, now(), 1,
        v_tratativa.acao, v_tratativa.observacao
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
        tratativa_acao = EXCLUDED.tratativa_acao,
        tratativa_observacao = EXCLUDED.tratativa_observacao,
        updated_at = now()
      RETURNING id INTO v_fechamento_id;

      IF v_tratativa.acao = 'transferir' AND v_saldo <> 0 THEN
        INSERT INTO public.ponto_resumo_diario (
          colaborador_id, company_id, data,
          horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
          horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
        ) VALUES (
          v_colab.id, p_company_id, v_data_ajuste,
          0, 0, 0, 0, 0, v_saldo, 'AJUSTE'::ponto_resumo_status
        )
        ON CONFLICT (colaborador_id, data) DO UPDATE SET
          saldo_minutos = EXCLUDED.saldo_minutos,
          status = 'AJUSTE'::ponto_resumo_status,
          updated_at = now();

        UPDATE public.ponto_fechamento_tratativas
        SET ajuste_resumo_data = v_data_ajuste
        WHERE company_id = p_company_id
          AND colaborador_id = v_colab.id
          AND periodo_inicio = p_periodo_inicio
          AND periodo_fim = p_periodo_fim;
      END IF;

      INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
      VALUES (v_fechamento_id, 'fechou', v_uid,
        jsonb_build_object('hash', v_hash, 'tratativa', v_tratativa.acao));

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros);
END;
$$;

-- 3) Corrige dados específicos da Aline (CARDIF LAM) - ciclo jan→abr/2026
DO $$
DECLARE
  v_colab uuid := '121649bd-978c-41ba-9870-3a961ebf2b60';
  v_admission date;
  v_novo_saldo int;
BEGIN
  PERFORM set_config('app.allow_fechado_override', 'true', true);

  SELECT admission_date INTO v_admission FROM public.colaboradores WHERE id = v_colab;

  -- Remove rows de resumo anteriores à admissão (fonte do saldo fantasma)
  DELETE FROM public.ponto_resumo_diario
  WHERE colaborador_id = v_colab
    AND v_admission IS NOT NULL
    AND data < v_admission;

  -- Recalcula saldo real do ciclo
  SELECT COALESCE(SUM(saldo_minutos),0)::int INTO v_novo_saldo
  FROM public.ponto_resumo_diario
  WHERE colaborador_id = v_colab
    AND data BETWEEN '2026-01-01' AND '2026-04-30';

  -- Atualiza tratativa com o saldo correto
  UPDATE public.ponto_fechamento_tratativas
  SET saldo_minutos = v_novo_saldo,
      updated_at = now()
  WHERE colaborador_id = v_colab
    AND periodo_inicio = '2026-01-01'
    AND periodo_fim = '2026-04-30';

  -- Atualiza o fechamento (saldo + recompõe contagens)
  UPDATE public.banco_horas_fechamentos f
  SET saldo_minutos = v_novo_saldo,
      horas_trabalhadas_minutos = COALESCE((SELECT SUM(horas_trabalhadas_minutos) FROM public.ponto_resumo_diario
        WHERE colaborador_id = v_colab AND data BETWEEN '2026-01-01' AND '2026-04-30'),0),
      horas_extras_minutos = COALESCE((SELECT SUM(horas_extras_minutos) FROM public.ponto_resumo_diario
        WHERE colaborador_id = v_colab AND data BETWEEN '2026-01-01' AND '2026-04-30'),0),
      updated_at = now()
  WHERE colaborador_id = v_colab
    AND periodo_inicio = '2026-01-01'
    AND periodo_fim = '2026-04-30';

  -- Atualiza o ajuste de transferência em 01/05/2026 com o novo saldo
  UPDATE public.ponto_resumo_diario
  SET saldo_minutos = v_novo_saldo,
      status = 'AJUSTE'::ponto_resumo_status,
      updated_at = now()
  WHERE colaborador_id = v_colab
    AND data = '2026-05-01';
END $$;
