CREATE OR REPLACE FUNCTION public.ensure_periodos_aquisitivos_company(p_company_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab RECORD;
  v_inicio DATE;
  v_fim DATE;
  v_limite DATE;
  v_today DATE := CURRENT_DATE;
  v_status TEXT;
  v_is_admin_master BOOLEAN := public.is_admin_master(auth.uid());
  v_user_company UUID := public.get_user_company_id(auth.uid());
  v_target_company UUID;
BEGIN
  IF v_is_admin_master THEN
    v_target_company := p_company_id;
  ELSIF public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh') THEN
    v_target_company := v_user_company;
    IF p_company_id IS NOT NULL AND p_company_id <> v_user_company THEN
      RAISE EXCEPTION 'Sem permissão para outra empresa';
    END IF;
  ELSE
    RETURN;
  END IF;

  FOR v_colab IN
    SELECT id, company_id, admission_date
    FROM public.colaboradores
    WHERE status = 'ATIVO'
      AND admission_date IS NOT NULL
      AND contract_type IN ('CLT', 'Aprendiz', 'Estágio')
      AND (v_target_company IS NULL OR company_id = v_target_company)
  LOOP
    v_inicio := v_colab.admission_date;

    LOOP
      v_fim := (v_inicio + INTERVAL '12 months')::date;
      v_limite := (v_fim + INTERVAL '12 months')::date;

      IF v_fim <= v_today THEN
        IF v_limite < v_today THEN
          v_status := 'vencido';
        ELSE
          v_status := 'aberto';
        END IF;
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

      EXIT WHEN v_fim > v_today;
      v_inicio := v_fim;
    END LOOP;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_periodos_aquisitivos_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_periodos_aquisitivos_company(uuid) TO authenticated;