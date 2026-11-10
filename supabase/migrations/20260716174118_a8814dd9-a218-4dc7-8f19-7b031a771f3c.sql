
ALTER TABLE public.ponto_abonos
  ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT 'dia' CHECK (modalidade IN ('dia','horas')),
  ADD COLUMN IF NOT EXISTS hora_inicio TIME NULL,
  ADD COLUMN IF NOT EXISTS hora_fim TIME NULL,
  ADD COLUMN IF NOT EXISTS minutos_abonados INTEGER NULL;

ALTER TABLE public.ponto_abonos DROP CONSTRAINT IF EXISTS ponto_abonos_modalidade_check;
ALTER TABLE public.ponto_abonos ADD CONSTRAINT ponto_abonos_modalidade_check CHECK (
  (modalidade = 'dia' AND hora_inicio IS NULL AND hora_fim IS NULL AND minutos_abonados IS NULL)
  OR
  (modalidade = 'horas' AND hora_inicio IS NOT NULL AND hora_fim IS NOT NULL
   AND hora_fim > hora_inicio AND data_inicio = data_fim
   AND minutos_abonados IS NOT NULL AND minutos_abonados > 0)
);

-- Recria função aplicar_abono_resumo com suporte a horas parciais
CREATE OR REPLACE FUNCTION public.aplicar_abono_resumo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia DATE;
  v_jornada INTEGER;
  v_abona BOOLEAN;
  v_prev INTEGER;
  v_trab INTEGER;
BEGIN
  IF NEW.status != 'ativo' THEN
    RETURN NEW;
  END IF;

  SELECT abona_horas INTO v_abona FROM ponto_tipos_abono WHERE id = NEW.tipo_abono_id;
  IF NOT v_abona THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480) INTO v_jornada
  FROM ponto_configuracoes WHERE company_id = NEW.company_id;
  v_jornada := COALESCE(v_jornada, 480);

  IF NEW.modalidade = 'horas' THEN
    -- Abono parcial: soma minutos_abonados às horas trabalhadas do dia
    SELECT horas_previstas_minutos, horas_trabalhadas_minutos
      INTO v_prev, v_trab
      FROM ponto_resumo_diario
      WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data_inicio;

    IF NOT FOUND THEN
      INSERT INTO ponto_resumo_diario (
        colaborador_id, company_id, data,
        horas_previstas_minutos, horas_trabalhadas_minutos,
        saldo_minutos, status, observacoes
      ) VALUES (
        NEW.colaborador_id, NEW.company_id, NEW.data_inicio,
        v_jornada, NEW.minutos_abonados,
        NEW.minutos_abonados - v_jornada, 'ABONO_PARCIAL',
        'Abono parcial ' || to_char(NEW.hora_inicio,'HH24:MI') || '-' || to_char(NEW.hora_fim,'HH24:MI') || ': ' || NEW.justificativa
      );
    ELSE
      UPDATE ponto_resumo_diario SET
        horas_trabalhadas_minutos = COALESCE(v_trab,0) + NEW.minutos_abonados,
        saldo_minutos = (COALESCE(v_trab,0) + NEW.minutos_abonados) - COALESCE(v_prev, v_jornada),
        observacoes = COALESCE(observacoes || ' | ', '') || 'Abono parcial ' || to_char(NEW.hora_inicio,'HH24:MI') || '-' || to_char(NEW.hora_fim,'HH24:MI') || ': ' || NEW.justificativa,
        updated_at = now()
      WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data_inicio;
    END IF;
    RETURN NEW;
  END IF;

  -- Modalidade 'dia' (comportamento original)
  v_dia := NEW.data_inicio;
  WHILE v_dia <= NEW.data_fim LOOP
    IF EXTRACT(DOW FROM v_dia) <> 0 THEN
      INSERT INTO ponto_resumo_diario (
        colaborador_id, company_id, data,
        horas_previstas_minutos, horas_trabalhadas_minutos,
        saldo_minutos, status, observacoes
      ) VALUES (
        NEW.colaborador_id, NEW.company_id, v_dia,
        v_jornada, v_jornada, 0, 'ABONADO',
        'Abonado: ' || NEW.justificativa
      )
      ON CONFLICT (colaborador_id, data) DO UPDATE SET
        horas_trabalhadas_minutos = EXCLUDED.horas_previstas_minutos,
        saldo_minutos = 0,
        status = 'ABONADO',
        observacoes = 'Abonado: ' || NEW.justificativa,
        updated_at = now();
    END IF;
    v_dia := v_dia + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

-- Atualiza bloqueio: abono por horas não bloqueia registros
CREATE OR REPLACE FUNCTION public.block_ponto_em_abono()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ponto_abonos
    WHERE colaborador_id = NEW.colaborador_id
      AND status = 'ativo'
      AND modalidade = 'dia'
      AND NEW.data_hora::date BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Não é possível registrar ponto em dia abonado.';
  END IF;
  RETURN NEW;
END;
$$;
