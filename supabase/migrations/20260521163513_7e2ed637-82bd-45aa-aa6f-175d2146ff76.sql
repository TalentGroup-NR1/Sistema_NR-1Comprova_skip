ALTER TABLE public.work_schedules
ADD COLUMN IF NOT EXISTS horarios_por_dia JSONB NULL;

CREATE OR REPLACE FUNCTION public.validate_horarios_por_dia()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  k TEXT;
  v JSONB;
  hhmm TEXT := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  carga INT;
BEGIN
  IF NEW.horarios_por_dia IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.horarios_por_dia) <> 'object' THEN
    RAISE EXCEPTION 'horarios_por_dia must be a JSON object';
  END IF;

  FOR k, v IN SELECT * FROM jsonb_each(NEW.horarios_por_dia) LOOP
    IF k !~ '^[0-6]$' THEN
      RAISE EXCEPTION 'horarios_por_dia keys must be 0..6 (got %)', k;
    END IF;
    IF jsonb_typeof(v) <> 'object' THEN
      RAISE EXCEPTION 'horarios_por_dia entries must be objects';
    END IF;
    -- optional time fields
    IF v ? 'em' AND jsonb_typeof(v->'em') = 'string' AND (v->>'em') !~ hhmm THEN
      RAISE EXCEPTION 'invalid em time on day %', k;
    END IF;
    IF v ? 'sm' AND jsonb_typeof(v->'sm') = 'string' AND (v->>'sm') !~ hhmm THEN
      RAISE EXCEPTION 'invalid sm time on day %', k;
    END IF;
    IF v ? 'et' AND jsonb_typeof(v->'et') = 'string' AND (v->>'et') !~ hhmm THEN
      RAISE EXCEPTION 'invalid et time on day %', k;
    END IF;
    IF v ? 'st' AND jsonb_typeof(v->'st') = 'string' AND (v->>'st') !~ hhmm THEN
      RAISE EXCEPTION 'invalid st time on day %', k;
    END IF;
    IF v ? 'carga' THEN
      carga := (v->>'carga')::INT;
      IF carga < 1 OR carga > 1440 THEN
        RAISE EXCEPTION 'carga on day % must be between 1 and 1440', k;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_horarios_por_dia ON public.work_schedules;
CREATE TRIGGER trg_validate_horarios_por_dia
BEFORE INSERT OR UPDATE ON public.work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.validate_horarios_por_dia();