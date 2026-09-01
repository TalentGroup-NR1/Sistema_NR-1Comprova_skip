ALTER TABLE public.ponto_configuracoes
  ADD COLUMN IF NOT EXISTS faixas_hora_extra JSONB;

-- Backfill: cria faixa única a partir dos % planos existentes
-- NOTA: Envolto em exceção — passa silenciosamente em banco novo
DO $$
BEGIN
  UPDATE public.ponto_configuracoes
  SET faixas_hora_extra = jsonb_build_object(
    'dia_util', jsonb_build_array(jsonb_build_object('ate_horas', null, 'percentual', COALESCE(adicional_hora_extra_pct, 50))),
    'sabado', jsonb_build_array(jsonb_build_object('ate_horas', null, 'percentual', COALESCE(adicional_hora_extra_pct, 50))),
    'domingo_feriado', jsonb_build_array(jsonb_build_object('ate_horas', null, 'percentual', COALESCE(adicional_hora_extra_domingo_pct, 100)))
  )
  WHERE faixas_hora_extra IS NULL;
EXCEPTION WHEN foreign_key_violation OR others THEN
  NULL;
END $$;

-- Trigger de validação
CREATE OR REPLACE FUNCTION public.validate_faixas_hora_extra()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  grupo text;
  faixas jsonb;
  faixa jsonb;
  prev_ate numeric;
  curr_ate numeric;
  pct numeric;
  i int;
  total int;
BEGIN
  IF NEW.faixas_hora_extra IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH grupo IN ARRAY ARRAY['dia_util','sabado','domingo_feriado'] LOOP
    faixas := NEW.faixas_hora_extra -> grupo;
    IF faixas IS NULL OR jsonb_typeof(faixas) <> 'array' OR jsonb_array_length(faixas) < 1 THEN
      RAISE EXCEPTION 'Grupo % deve ter pelo menos 1 faixa', grupo;
    END IF;
    total := jsonb_array_length(faixas);
    IF total > 5 THEN
      RAISE EXCEPTION 'Grupo % excede o limite de 5 faixas', grupo;
    END IF;
    prev_ate := NULL;
    FOR i IN 0..total-1 LOOP
      faixa := faixas -> i;
      pct := (faixa ->> 'percentual')::numeric;
      IF pct IS NULL OR pct < 0 OR pct > 500 THEN
        RAISE EXCEPTION 'Percentual inválido em % (faixa %)', grupo, i+1;
      END IF;
      IF (faixa ->> 'ate_horas') IS NULL THEN
        curr_ate := NULL;
        IF i <> total-1 THEN
          RAISE EXCEPTION 'Somente a última faixa de % pode ter ate_horas nulo', grupo;
        END IF;
      ELSE
        curr_ate := (faixa ->> 'ate_horas')::numeric;
        IF curr_ate <= 0 THEN
          RAISE EXCEPTION 'ate_horas deve ser maior que zero em %', grupo;
        END IF;
        IF prev_ate IS NOT NULL AND curr_ate <= prev_ate THEN
          RAISE EXCEPTION 'ate_horas deve ser crescente em %', grupo;
        END IF;
        IF i = total-1 THEN
          RAISE EXCEPTION 'A última faixa de % deve ter ate_horas nulo (sem teto)', grupo;
        END IF;
        prev_ate := curr_ate;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_faixas_hora_extra ON public.ponto_configuracoes;
CREATE TRIGGER trg_validate_faixas_hora_extra
BEFORE INSERT OR UPDATE ON public.ponto_configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.validate_faixas_hora_extra();