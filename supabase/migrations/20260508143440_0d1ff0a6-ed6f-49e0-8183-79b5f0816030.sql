-- 1) Helper: calcula minutos noturnos (22h-05h BR) dentro de um intervalo
CREATE OR REPLACE FUNCTION public.calc_minutos_noturnos_br(p_inicio timestamptz, p_fim timestamptz)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_local_a timestamp;
  v_local_b timestamp;
  v_total int := 0;
  v_day date;
  v_day_start timestamp;
  v_seg_a timestamp;
  v_seg_b timestamp;
BEGIN
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim <= p_inicio THEN
    RETURN 0;
  END IF;

  v_local_a := (p_inicio AT TIME ZONE 'America/Sao_Paulo');
  v_local_b := (p_fim    AT TIME ZONE 'America/Sao_Paulo');
  v_day := v_local_a::date;

  WHILE v_day <= v_local_b::date LOOP
    v_day_start := v_day::timestamp;

    -- janela [00:00, 05:00)
    v_seg_a := GREATEST(v_local_a, v_day_start);
    v_seg_b := LEAST(v_local_b, v_day_start + interval '5 hours');
    IF v_seg_b > v_seg_a THEN
      v_total := v_total + (EXTRACT(EPOCH FROM (v_seg_b - v_seg_a))::int / 60);
    END IF;

    -- janela [22:00, 24:00)
    v_seg_a := GREATEST(v_local_a, v_day_start + interval '22 hours');
    v_seg_b := LEAST(v_local_b, v_day_start + interval '24 hours');
    IF v_seg_b > v_seg_a THEN
      v_total := v_total + (EXTRACT(EPOCH FROM (v_seg_b - v_seg_a))::int / 60);
    END IF;

    v_day := v_day + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 2) Atualiza recalcular_resumo_diario com noturnas + ON CONFLICT correto
CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(p_colaborador_id uuid, p_data date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_tolerancia int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_noturno int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_abonado boolean;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
BEGIN
  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Preserva ABONADO
  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data AND status = 'ABONADO'
  ) INTO v_abonado;
  IF v_abonado THEN RETURN; END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480), COALESCE(tolerancia_minutos, 10)
    INTO v_jornada, v_tolerancia
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  LIMIT 1;
  v_jornada := COALESCE(v_jornada, 480);
  v_tolerancia := COALESCE(v_tolerancia, 10);

  v_open := NULL;
  v_break_open := NULL;

  FOR r IN
    SELECT tipo, data_hora
    FROM public.ponto_registros
    WHERE colaborador_id = p_colaborador_id
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data
      AND status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
    ORDER BY data_hora ASC
  LOOP
    IF r.tipo IN ('ENTRADA','INTERVALO_RETORNO') THEN
      v_open := r.data_hora;
      IF r.tipo = 'INTERVALO_RETORNO' AND v_break_open IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (r.data_hora - v_break_open))::int / 60);
        v_break_open := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (r.data_hora - v_open))::int / 60);
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, r.data_hora);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := r.data_hora;
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
  IF abs(v_saldo) <= v_tolerancia THEN v_saldo := 0; END IF;
  IF v_trab > v_jornada + v_tolerancia THEN
    v_extras := v_trab - v_jornada;
  ELSE
    v_extras := 0;
  END IF;

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
    updated_at                = now()
  WHERE public.ponto_resumo_diario.status <> 'ABONADO';
END;
$$;

-- 3) Backfill: recalcula todos (colaborador, data) existentes; ABONADO é
--    naturalmente preservado pelo early-return acima.
--    NOTA: Envolto em exceção — passa silenciosamente em banco novo
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT
      colaborador_id,
      (data_hora AT TIME ZONE 'America/Sao_Paulo')::date AS d
    FROM public.ponto_registros
    WHERE status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
  LOOP
    PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.d);
  END LOOP;
EXCEPTION WHEN foreign_key_violation OR others THEN
  NULL;
END $$;