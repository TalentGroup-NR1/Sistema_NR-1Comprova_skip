
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS ultima_ferias_inicio date,
  ADD COLUMN IF NOT EXISTS ultima_ferias_fim date,
  ADD COLUMN IF NOT EXISTS data_corte_ferias date;

CREATE OR REPLACE FUNCTION public.validate_colaborador_ferias_legado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_fim IS NULL THEN
    RAISE EXCEPTION 'ultima_ferias_fim é obrigatório quando ultima_ferias_inicio for informado';
  END IF;
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_fim IS NOT NULL
     AND NEW.ultima_ferias_fim < NEW.ultima_ferias_inicio THEN
    RAISE EXCEPTION 'ultima_ferias_fim não pode ser anterior a ultima_ferias_inicio';
  END IF;
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_inicio > CURRENT_DATE THEN
    RAISE EXCEPTION 'ultima_ferias_inicio não pode ser uma data futura';
  END IF;
  IF NEW.ultima_ferias_fim IS NOT NULL AND NEW.ultima_ferias_fim > CURRENT_DATE THEN
    RAISE EXCEPTION 'ultima_ferias_fim não pode ser uma data futura';
  END IF;
  IF NEW.data_corte_ferias IS NOT NULL AND NEW.data_corte_ferias > CURRENT_DATE THEN
    RAISE EXCEPTION 'data_corte_ferias não pode ser uma data futura';
  END IF;
  IF NEW.admission_date IS NOT NULL THEN
    IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_inicio < NEW.admission_date THEN
      RAISE EXCEPTION 'ultima_ferias_inicio não pode ser anterior à data de admissão';
    END IF;
    IF NEW.ultima_ferias_fim IS NOT NULL AND NEW.ultima_ferias_fim < NEW.admission_date THEN
      RAISE EXCEPTION 'ultima_ferias_fim não pode ser anterior à data de admissão';
    END IF;
    IF NEW.data_corte_ferias IS NOT NULL AND NEW.data_corte_ferias < NEW.admission_date THEN
      RAISE EXCEPTION 'data_corte_ferias não pode ser anterior à data de admissão';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_colaborador_ferias_legado ON public.colaboradores;
CREATE TRIGGER trg_validate_colaborador_ferias_legado
  BEFORE INSERT OR UPDATE OF ultima_ferias_inicio, ultima_ferias_fim, data_corte_ferias, admission_date
  ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_colaborador_ferias_legado();
