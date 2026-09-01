-- 1) Edição administrativa força aprovação e limpa pedido de exclusão pendente
CREATE OR REPLACE FUNCTION public.editar_batida_ponto(p_batida_id uuid, p_novo_horario timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab uuid;
  v_data_old date;
  v_data_new date;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin_master'::app_role)
    OR has_role(v_caller, 'admin_empresa'::app_role)
    OR has_role(v_caller, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT colaborador_id, (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
    INTO v_colab, v_data_old
  FROM public.ponto_registros
  WHERE id = p_batida_id;

  IF v_colab IS NULL THEN
    RAISE EXCEPTION 'Batida não encontrada';
  END IF;

  UPDATE public.ponto_registros
     SET data_hora = p_novo_horario,
         ajuste_manual = true,
         ajustado_por = v_caller,
         ajuste_motivo = COALESCE(ajuste_motivo, 'Editado pelo admin'),
         status_aprovacao = 'aprovado',
         aprovado_por = v_caller,
         aprovado_em = now(),
         exclusao_pendente = false
   WHERE id = p_batida_id;

  v_data_new := (p_novo_horario AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_data_old IS DISTINCT FROM v_data_new THEN
    PERFORM public.recalcular_resumo_diario(v_colab, v_data_old);
  END IF;
END;
$function$;

-- 2) Recalcular dia: marca INCONSISTENTE se há jornada ou intervalo aberto
CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(p_colaborador_id uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_noturno int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_skip boolean;
  v_override TEXT;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
  v_last_exit timestamptz;
  v_dh timestamptz;
  v_previsto boolean;
  v_bonus_ativo boolean := false;
  v_bonus_sab numeric := 0;
  v_bonus_dom numeric := 0;
  v_bonus_fer numeric := 0;
  v_is_feriado boolean := false;
  v_dow int;
  v_pct numeric := 0;
  v_bonus_min int := 0;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override IS DISTINCT FROM 'true' AND public.is_periodo_fechado(p_colaborador_id, p_data) THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data
      AND status IN ('ABONADO','AJUSTE')
  ) INTO v_skip;
  IF v_skip THEN RETURN; END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480),
         COALESCE(bonus_fora_escala_ativo, false),
         COALESCE(bonus_sabado_pct, 0),
         COALESCE(bonus_domingo_pct, 0),
         COALESCE(bonus_feriado_pct, 0)
    INTO v_jornada, v_bonus_ativo, v_bonus_sab, v_bonus_dom, v_bonus_fer
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;
  v_jornada := COALESCE(v_jornada, 480);

  v_open := NULL; v_break_open := NULL; v_last_exit := NULL;

  FOR r IN
    SELECT tipo, date_trunc('minute', data_hora) AS data_hora
    FROM public.ponto_registros
    WHERE colaborador_id = p_colaborador_id
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data
      AND status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
    ORDER BY data_hora ASC
  LOOP
    v_dh := r.data_hora;
    IF r.tipo IN ('ENTRADA','INTERVALO_RETORNO') THEN
      v_open := v_dh;
      IF r.tipo = 'INTERVALO_RETORNO' AND v_break_open IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_break_open)) / 60.0)::int;
        v_break_open := NULL;
      ELSIF r.tipo = 'ENTRADA' AND v_last_exit IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_last_exit)) / 60.0)::int;
        v_last_exit := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (v_dh - v_open)) / 60.0)::int;
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, v_dh);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := v_dh; v_last_exit := NULL;
      ELSE
        v_last_exit := v_dh;
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.ponto_registros
   WHERE colaborador_id = p_colaborador_id
     AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data;

  IF v_count = 0 THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data
       AND status NOT IN ('ABONADO','AJUSTE');
    RETURN;
  END IF;

  v_previsto := public.is_dia_previsto(p_colaborador_id, p_data);

  IF v_bonus_ativo AND NOT v_previsto AND v_trab > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.feriados WHERE company_id = v_company_id AND data = p_data
    ) INTO v_is_feriado;
    v_dow := EXTRACT(DOW FROM p_data)::int;
    IF v_is_feriado THEN v_pct := v_bonus_fer;
    ELSIF v_dow = 6 THEN v_pct := v_bonus_sab;
    ELSIF v_dow = 0 THEN v_pct := v_bonus_dom;
    ELSE v_pct := 0; END IF;
    v_bonus_min := ROUND(v_trab * v_pct / 100.0)::int;
  ELSE
    v_bonus_min := 0;
  END IF;

  IF v_previsto THEN
    v_saldo  := v_trab - v_jornada;
    v_extras := GREATEST(0, v_trab - v_jornada);
  ELSE
    v_saldo  := v_trab + v_bonus_min;
    v_extras := v_trab + v_bonus_min;
  END IF;

  -- INCONSISTENTE se restou jornada aberta OU intervalo aberto sem retorno
  v_status := CASE WHEN v_open IS NOT NULL OR v_break_open IS NOT NULL
                     THEN 'INCONSISTENTE'::ponto_resumo_status
                   ELSE 'REGULAR'::ponto_resumo_status END;

  INSERT INTO public.ponto_resumo_diario (
    colaborador_id, company_id, data,
    horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
    horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
  ) VALUES (
    p_colaborador_id, v_company_id, p_data,
    CASE WHEN v_previsto THEN v_jornada ELSE 0 END,
    v_trab, v_intervalo, v_noturno, v_extras, v_saldo, v_status
  )
  ON CONFLICT (colaborador_id, data) DO UPDATE SET
    horas_previstas_minutos   = EXCLUDED.horas_previstas_minutos,
    horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
    horas_intervalo_minutos   = EXCLUDED.horas_intervalo_minutos,
    horas_noturnas_minutos    = EXCLUDED.horas_noturnas_minutos,
    horas_extras_minutos      = EXCLUDED.horas_extras_minutos,
    saldo_minutos             = EXCLUDED.saldo_minutos,
    status                    = EXCLUDED.status,
    updated_at                = now();
END;
$function$;