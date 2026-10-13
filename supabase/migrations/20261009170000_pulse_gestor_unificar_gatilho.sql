-- Migration: 20261009170000_pulse_gestor_unificar_gatilho.sql
-- Unificação do gatilho de criação de acompanhamentos para abranger pulse_surveys (pulso direto)
-- Idempotente (IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT DO NOTHING)

-- 1. Garantir que pulse_acompanhamentos.resposta_id é UNIQUE para podermos usar ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pulse_acompanhamentos_resposta_id_key'
  ) THEN
    ALTER TABLE public.pulse_acompanhamentos ADD CONSTRAINT pulse_acompanhamentos_resposta_id_key UNIQUE (resposta_id);
  END IF;
END $$;

-- 2. Trigger Function exclusiva para pulse_surveys
-- Regra: score <= 2 (escala 0-5)
CREATE OR REPLACE FUNCTION public.trigger_pulse_survey_acompanhamento_critico()
RETURNS TRIGGER AS $$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_gestor_user_id UUID;
  v_is_critico BOOLEAN := FALSE;
BEGIN
  -- Avalia criticidade (score de 0 a 5, crítico se <= 2)
  IF NEW.score IS NOT NULL AND NEW.score <= 2 THEN
    v_is_critico := TRUE;
  END IF;

  IF NOT v_is_critico THEN
    RETURN NEW;
  END IF;

  -- Obter dados do colaborador e user_id do gestor
  SELECT c.company_id, c.id, gestor.user_id
    INTO v_company_id, v_colaborador_id, v_gestor_user_id
  FROM public.colaboradores c
  LEFT JOIN public.colaboradores gestor ON gestor.id = c.gestor_id
  WHERE c.id = NEW.employee_id;

  -- Se não tem gestor vinculado, não cria
  IF v_gestor_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum gestor encontrado para o colaborador no pulse_surveys (%). Acompanhamento automatico pulado.', NEW.id;
    RETURN NEW;
  END IF;

  -- Cria acompanhamento com status 'novo' e vinculado à resposta
  INSERT INTO public.pulse_acompanhamentos (
    company_id,
    colaborador_id,
    resposta_id,
    responsavel_id,
    status,
    criado_por,
    created_at
  ) VALUES (
    v_company_id,
    v_colaborador_id,
    NEW.id,
    v_gestor_user_id,
    'novo',
    'sistema',
    now()
  )
  ON CONFLICT (resposta_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Associar trigger em pulse_surveys
DROP TRIGGER IF EXISTS trg_pulse_survey_critica ON public.pulse_surveys;
CREATE TRIGGER trg_pulse_survey_critica
AFTER INSERT OR UPDATE OF score ON public.pulse_surveys
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pulse_survey_acompanhamento_critico();
