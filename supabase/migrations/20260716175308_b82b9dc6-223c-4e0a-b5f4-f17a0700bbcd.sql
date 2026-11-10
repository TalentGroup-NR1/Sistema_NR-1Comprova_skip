
-- 1) Helper: reaplica o resumo diário considerando registros reais + abonos ativos
CREATE OR REPLACE FUNCTION public.reaplicar_abonos_dia(p_colab uuid, p_data date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_prev int;
  v_trab int;
  v_has_dia boolean;
  v_total_horas int;
BEGIN
  SELECT company_id INTO v_company_id FROM colaboradores WHERE id = p_colab;
  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Existe abono 'dia' ativo cobrindo esta data?
  SELECT EXISTS(
    SELECT 1 FROM ponto_abonos a
    JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
    WHERE a.colaborador_id = p_colab
      AND a.status = 'ativo'
      AND a.modalidade = 'dia'
      AND t.abona_horas = true
      AND p_data BETWEEN a.data_inicio AND a.data_fim
  ) INTO v_has_dia;

  IF v_has_dia THEN
    SELECT COALESCE(jornada_diaria_minutos, 480) INTO v_jornada
      FROM ponto_configuracoes WHERE company_id = v_company_id
      ORDER BY updated_at DESC NULLS LAST LIMIT 1;
    v_jornada := COALESCE(v_jornada, 480);

    INSERT INTO ponto_resumo_diario (colaborador_id, company_id, data,
      horas_previstas_minutos, horas_trabalhadas_minutos, saldo_minutos, status, observacoes)
    VALUES (p_colab, v_company_id, p_data, v_jornada, v_jornada, 0, 'ABONADO', 'Abonado')
    ON CONFLICT (colaborador_id, data) DO UPDATE SET
      horas_previstas_minutos = EXCLUDED.horas_previstas_minutos,
      horas_trabalhadas_minutos = EXCLUDED.horas_previstas_minutos,
      saldo_minutos = 0,
      status = 'ABONADO',
      observacoes = 'Abonado',
      updated_at = now();
    RETURN;
  END IF;

  -- Sem abono 'dia': remove marcação ABONADO obsoleta e recalcula do zero
  DELETE FROM ponto_resumo_diario
    WHERE colaborador_id = p_colab AND data = p_data
      AND status = 'ABONADO';

  PERFORM public.recalcular_resumo_diario(p_colab, p_data);

  -- Soma abonos 'horas' ativos ao trabalhado
  SELECT COALESCE(SUM(a.minutos_abonados), 0) INTO v_total_horas
    FROM ponto_abonos a
    JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
    WHERE a.colaborador_id = p_colab
      AND a.status = 'ativo'
      AND a.modalidade = 'horas'
      AND t.abona_horas = true
      AND a.data_inicio = p_data;

  IF v_total_horas > 0 THEN
    SELECT horas_previstas_minutos, horas_trabalhadas_minutos INTO v_prev, v_trab
      FROM ponto_resumo_diario WHERE colaborador_id = p_colab AND data = p_data;
    IF FOUND THEN
      UPDATE ponto_resumo_diario SET
        horas_trabalhadas_minutos = COALESCE(v_trab,0) + v_total_horas,
        saldo_minutos = (COALESCE(v_trab,0) + v_total_horas) - COALESCE(v_prev, 480),
        updated_at = now()
      WHERE colaborador_id = p_colab AND data = p_data;
    END IF;
  END IF;
END;
$$;

-- 2) Trigger function que reage a INSERT / UPDATE / DELETE de abonos
CREATE OR REPLACE FUNCTION public.aplicar_abono_resumo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_dia := OLD.data_inicio;
    WHILE v_dia <= OLD.data_fim LOOP
      PERFORM public.reaplicar_abonos_dia(OLD.colaborador_id, v_dia);
      v_dia := v_dia + INTERVAL '1 day';
    END LOOP;
    RETURN OLD;
  END IF;

  -- Em UPDATE, se datas/colaborador mudaram, reprocessa datas antigas também
  IF TG_OP = 'UPDATE' THEN
    v_dia := OLD.data_inicio;
    WHILE v_dia <= OLD.data_fim LOOP
      PERFORM public.reaplicar_abonos_dia(OLD.colaborador_id, v_dia);
      v_dia := v_dia + INTERVAL '1 day';
    END LOOP;
  END IF;

  v_dia := NEW.data_inicio;
  WHILE v_dia <= NEW.data_fim LOOP
    PERFORM public.reaplicar_abonos_dia(NEW.colaborador_id, v_dia);
    v_dia := v_dia + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3) Recria o trigger cobrindo INSERT / UPDATE / DELETE
DROP TRIGGER IF EXISTS trg_aplicar_abono_resumo ON public.ponto_abonos;
CREATE TRIGGER trg_aplicar_abono_resumo
AFTER INSERT OR UPDATE OR DELETE ON public.ponto_abonos
FOR EACH ROW EXECUTE FUNCTION public.aplicar_abono_resumo();

-- 4) Correção retroativa dos dias impactados pelos abonos cancelados
-- NOTA: Envolto em exceção — passa silenciosamente em banco novo
DO $$
BEGIN
  PERFORM public.reaplicar_abonos_dia('ebb85e55-37f6-467d-8660-9052178f6872'::uuid, '2026-07-16'::date);
  PERFORM public.reaplicar_abonos_dia('ebb85e55-37f6-467d-8660-9052178f6872'::uuid, '2026-07-15'::date);
EXCEPTION WHEN foreign_key_violation OR others THEN
  NULL;
END $$;
