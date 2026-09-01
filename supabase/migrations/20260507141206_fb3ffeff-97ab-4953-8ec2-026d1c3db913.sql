CREATE OR REPLACE FUNCTION public.ensure_meus_periodos_aquisitivos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab RECORD;
  v_inicio DATE;
  v_fim DATE;
  v_limite DATE;
  v_today DATE := CURRENT_DATE;
  v_status TEXT;
BEGIN
  SELECT id, company_id, admission_date
    INTO v_colab
  FROM public.colaboradores
  WHERE id = public.get_my_colaborador_id()
  LIMIT 1;

  IF v_colab.id IS NULL OR v_colab.admission_date IS NULL THEN
    RETURN;
  END IF;

  v_inicio := v_colab.admission_date;

  LOOP
    v_fim := (v_inicio + INTERVAL '12 months' - INTERVAL '1 day')::date;
    EXIT WHEN v_fim > v_today;

    v_limite := (v_fim + INTERVAL '12 months')::date;
    IF v_limite < v_today THEN
      v_status := 'vencido';
    ELSE
      v_status := 'aberto';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.ferias_periodos_aquisitivos
      WHERE colaborador_id = v_colab.id
        AND data_inicio_aquisitivo = v_inicio
    ) THEN
      INSERT INTO public.ferias_periodos_aquisitivos (
        colaborador_id, company_id, data_inicio_aquisitivo,
        data_fim_aquisitivo, data_limite_gozo, dias_adquiridos, status
      ) VALUES (
        v_colab.id, v_colab.company_id, v_inicio,
        v_fim, v_limite, 30, v_status
      );
    END IF;

    v_inicio := (v_inicio + INTERVAL '12 months')::date;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_meus_periodos_aquisitivos() TO authenticated;