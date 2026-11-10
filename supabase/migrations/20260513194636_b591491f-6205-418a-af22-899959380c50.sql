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
  v_abonado boolean;
  v_override TEXT;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
  v_dh timestamptz;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override IS DISTINCT FROM 'true' AND public.is_periodo_fechado(p_colaborador_id, p_data) THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data AND status = 'ABONADO'
  ) INTO v_abonado;
  IF v_abonado THEN RETURN; END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480)
    INTO v_jornada
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  LIMIT 1;
  v_jornada := COALESCE(v_jornada, 480);

  v_open := NULL;
  v_break_open := NULL;

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
        -- segundos truncados: HH:MM-HH:MM em minutos cheios
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_break_open)) / 60.0)::int;
        v_break_open := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (v_dh - v_open)) / 60.0)::int;
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, v_dh);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := v_dh;
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.ponto_registros
   WHERE colaborador_id = p_colaborador_id
     AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data;

  IF v_count = 0 THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data AND status <> 'ABONADO';
    RETURN;
  END IF;

  v_saldo := v_trab - v_jornada;
  v_extras := GREATEST(0, v_trab - v_jornada);

  v_status := CASE WHEN v_open IS NOT NULL THEN 'INCONSISTENTE'::ponto_resumo_status
                   ELSE 'REGULAR'::ponto_resumo_status END;

  INSERT INTO public.ponto_resumo_diario (
    colaborador_id, company_id, data,
    horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
    horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
  ) VALUES (
    p_colaborador_id, v_company_id, p_data,
    v_jornada, v_trab, v_intervalo, v_noturno, v_extras, v_saldo, v_status
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

-- Recalcula todos os resumos existentes para aplicar a nova regra (HH:MM cheios)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT colaborador_id, data
    FROM public.ponto_resumo_diario
    WHERE status <> 'ABONADO'
  LOOP
    PERFORM public.recalcular_resumo_diario(rec.colaborador_id, rec.data);
  END LOOP;
END $$;