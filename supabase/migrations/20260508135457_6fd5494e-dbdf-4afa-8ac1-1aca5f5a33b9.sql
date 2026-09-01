
-- Função IMMUTABLE para indexar minuto da batida
CREATE OR REPLACE FUNCTION public.minuto_epoch(ts timestamptz)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT (EXTRACT(EPOCH FROM ts AT TIME ZONE 'UTC')::bigint) / 60 $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ponto_registros_unico_minuto
  ON public.ponto_registros (colaborador_id, tipo, public.minuto_epoch(data_hora));

CREATE INDEX IF NOT EXISTS ix_ponto_registros_colab_dh
  ON public.ponto_registros (colaborador_id, data_hora);

-- Validação de sequência
CREATE OR REPLACE FUNCTION public.validar_sequencia_ponto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia date;
  v_ultimo text;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  IF NEW.ajuste_manual IS TRUE THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ponto:' || NEW.colaborador_id::text));

  v_dia := (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT tipo INTO v_ultimo
  FROM public.ponto_registros
  WHERE colaborador_id = NEW.colaborador_id
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
    AND data_hora < NEW.data_hora
  ORDER BY data_hora DESC
  LIMIT 1;

  IF v_ultimo IS NULL THEN
    IF NEW.tipo <> 'ENTRADA' THEN
      RAISE EXCEPTION 'Sequência inválida: primeira batida do dia deve ser ENTRADA (recebido %)', NEW.tipo
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF v_ultimo IN ('ENTRADA','INTERVALO_RETORNO') AND NEW.tipo NOT IN ('SAIDA','INTERVALO_SAIDA') THEN
      RAISE EXCEPTION 'Sequência inválida: após % deve vir SAIDA ou INTERVALO_SAIDA (recebido %)', v_ultimo, NEW.tipo
        USING ERRCODE = 'check_violation';
    ELSIF v_ultimo = 'INTERVALO_SAIDA' AND NEW.tipo <> 'INTERVALO_RETORNO' THEN
      RAISE EXCEPTION 'Sequência inválida: após INTERVALO_SAIDA deve vir INTERVALO_RETORNO (recebido %)', NEW.tipo
        USING ERRCODE = 'check_violation';
    ELSIF v_ultimo = 'SAIDA' AND NEW.tipo <> 'ENTRADA' THEN
      RAISE EXCEPTION 'Sequência inválida: após SAIDA do dia deve vir nova ENTRADA (recebido %)', NEW.tipo
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_sequencia_ponto ON public.ponto_registros;
CREATE TRIGGER trg_validar_sequencia_ponto
  BEFORE INSERT ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.validar_sequencia_ponto();

-- Recálculo automático de resumo diário
CREATE UNIQUE INDEX IF NOT EXISTS ux_ponto_resumo_diario_colab_data
  ON public.ponto_resumo_diario (colaborador_id, data);

CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(
  p_colaborador_id uuid,
  p_data date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_tolerancia int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_abonado boolean;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
BEGIN
  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

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
        v_intervalo := v_intervalo + EXTRACT(EPOCH FROM (r.data_hora - v_break_open))::int / 60;
        v_break_open := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab := v_trab + EXTRACT(EPOCH FROM (r.data_hora - v_open))::int / 60;
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
    v_jornada, v_trab, v_intervalo, 0, v_extras, v_saldo, v_status
  )
  ON CONFLICT (colaborador_id, data) DO UPDATE SET
    horas_previstas_minutos   = EXCLUDED.horas_previstas_minutos,
    horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
    horas_intervalo_minutos   = EXCLUDED.horas_intervalo_minutos,
    horas_extras_minutos      = EXCLUDED.horas_extras_minutos,
    saldo_minutos             = EXCLUDED.saldo_minutos,
    status                    = EXCLUDED.status,
    updated_at                = now()
  WHERE public.ponto_resumo_diario.status <> 'ABONADO';
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_ponto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab uuid;
  v_data date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_colab := OLD.colaborador_id;
    v_data := (OLD.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;
  ELSE
    v_colab := NEW.colaborador_id;
    v_data := (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;
  END IF;
  PERFORM public.recalcular_resumo_diario(v_colab, v_data);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_recalc_resumo ON public.ponto_registros;
CREATE TRIGGER trg_ponto_recalc_resumo
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_resumo_ponto();
