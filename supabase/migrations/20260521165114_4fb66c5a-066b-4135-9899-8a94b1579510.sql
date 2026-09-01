ALTER TABLE public.ponto_configuracoes
  ADD COLUMN IF NOT EXISTS bonus_fora_escala_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_sabado_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_domingo_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_feriado_pct  NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.ponto_configuracoes
  DROP CONSTRAINT IF EXISTS ponto_configuracoes_bonus_pct_check;
ALTER TABLE public.ponto_configuracoes
  ADD  CONSTRAINT ponto_configuracoes_bonus_pct_check
       CHECK (
         bonus_sabado_pct  BETWEEN 0 AND 500 AND
         bonus_domingo_pct BETWEEN 0 AND 500 AND
         bonus_feriado_pct BETWEEN 0 AND 500
       );

CREATE OR REPLACE FUNCTION public.is_dia_previsto(
  p_colaborador_id uuid,
  p_data date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws_id uuid;
  v_dias int[];
  v_trab_fer boolean := false;
  v_dow int;
  v_company uuid;
  v_is_feriado boolean := false;
BEGIN
  SELECT company_id, work_schedule_id
    INTO v_company, v_ws_id
  FROM public.colaboradores
  WHERE id = p_colaborador_id;

  IF v_company IS NULL THEN
    RETURN false;
  END IF;

  IF v_ws_id IS NOT NULL THEN
    SELECT dias_semana, COALESCE(trabalha_feriados, false)
      INTO v_dias, v_trab_fer
    FROM public.work_schedules
    WHERE id = v_ws_id;
  END IF;

  IF v_dias IS NULL OR array_length(v_dias, 1) IS NULL THEN
    v_dias := ARRAY[1,2,3,4,5];
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.feriados
    WHERE company_id = v_company AND data = p_data
  ) INTO v_is_feriado;

  IF v_is_feriado THEN
    RETURN v_trab_fer;
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::int;
  RETURN v_dow = ANY(v_dias);
END;
$$;

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
    WHERE colaborador_id = p_colaborador_id AND data = p_data AND status = 'ABONADO'
  ) INTO v_abonado;
  IF v_abonado THEN RETURN; END IF;

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

  v_open := NULL;
  v_break_open := NULL;
  v_last_exit := NULL;

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
        v_break_open := v_dh;
        v_last_exit := NULL;
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
     WHERE colaborador_id = p_colaborador_id AND data = p_data AND status <> 'ABONADO';
    RETURN;
  END IF;

  v_previsto := public.is_dia_previsto(p_colaborador_id, p_data);

  IF v_bonus_ativo AND NOT v_previsto AND v_trab > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.feriados
      WHERE company_id = v_company_id AND data = p_data
    ) INTO v_is_feriado;
    v_dow := EXTRACT(DOW FROM p_data)::int;
    IF v_is_feriado THEN
      v_pct := v_bonus_fer;
    ELSIF v_dow = 6 THEN
      v_pct := v_bonus_sab;
    ELSIF v_dow = 0 THEN
      v_pct := v_bonus_dom;
    ELSE
      v_pct := 0;
    END IF;
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

  v_status := CASE WHEN v_open IS NOT NULL THEN 'INCONSISTENTE'::ponto_resumo_status
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

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT colaborador_id, data
    FROM public.ponto_resumo_diario
    WHERE status <> 'ABONADO'
  LOOP
    PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.data);
  END LOOP;
END $$;