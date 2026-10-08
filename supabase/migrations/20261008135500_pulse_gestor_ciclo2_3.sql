-- Migration: 20261008135500_pulse_gestor_ciclo2_3.sql
-- Ciclo 2+3 do Cuidar+: Gatilho de Alerta + Obrigatoriedade + Ação do Gestor
-- Idempotente (IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT DO NOTHING)

-- 1. Colunas e constraints de apoio na tabela pulse_acompanhamentos
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS pulse_response_id UUID REFERENCES public.pulse_responses(id) ON DELETE CASCADE;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS criado_por TEXT;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS encerrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS encerrado_em TIMESTAMPTZ;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ;

-- Constraint de unicidade por resposta para garantir idempotência do trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pulse_acompanhamentos_pulse_response_id_key'
  ) THEN
    ALTER TABLE public.pulse_acompanhamentos ADD CONSTRAINT pulse_acompanhamentos_pulse_response_id_key UNIQUE (pulse_response_id);
  END IF;
END $$;

-- 2. Trigger Function: trigger_pulse_acompanhamento_critico
-- Regra de negócio:
-- - Se score_numeric for informado e <= 40 (escala 0-100, equivalente a <= 2 em 0-5)
-- - OU se resposta em escala 0_5 for <= 2
-- - OU se resposta for 'nao' (score 0)
CREATE OR REPLACE FUNCTION public.trigger_pulse_acompanhamento_critico()
RETURNS TRIGGER AS $$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_gestor_user_id UUID;
  v_is_critico BOOLEAN := FALSE;
BEGIN
  -- Avalia criticidade:
  IF NEW.score_numeric IS NOT NULL THEN
    IF NEW.score_numeric <= 40 THEN
      v_is_critico := TRUE;
    END IF;
  ELSIF NEW.resposta IS NOT NULL THEN
    IF NEW.resposta ~ '^[0-9]+$' AND NEW.resposta::NUMERIC <= 2 THEN
      v_is_critico := TRUE;
    ELSIF LOWER(NEW.resposta) = 'nao' THEN
      v_is_critico := TRUE;
    END IF;
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

  -- Se não tem gestor vinculado, não cria (fail-closed) e emite log sem PII
  IF v_gestor_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum gestor encontrado para o colaborador no pulso (%). Acompanhamento automatico pulado.', NEW.id;
    RETURN NEW;
  END IF;

  -- Cria acompanhamento com status 'novo' e criado_por 'sistema'
  INSERT INTO public.pulse_acompanhamentos (
    company_id,
    colaborador_id,
    pulse_response_id,
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
  ON CONFLICT (pulse_response_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Associar trigger em pulse_responses
DROP TRIGGER IF EXISTS trg_pulse_response_critica ON public.pulse_responses;
CREATE TRIGGER trg_pulse_response_critica
AFTER INSERT OR UPDATE OF score_numeric, resposta ON public.pulse_responses
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pulse_acompanhamento_critico();

-- 3. Trilha de Status: trg_pulse_acompanhamento_status
CREATE OR REPLACE FUNCTION public.trg_pulse_acompanhamento_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 'novo' -> 'em_andamento': grava iniciado_em
  IF NEW.status = 'em_andamento' AND (OLD.status = 'novo' OR OLD.status IS NULL) THEN
    IF NEW.iniciado_em IS NULL THEN
      NEW.iniciado_em := now();
    END IF;
  END IF;

  -- Qualquer -> 'concluido': grava encerrado_em e encerrado_por (auth.uid())
  IF NEW.status = 'concluido' AND (OLD.status != 'concluido' OR OLD.status IS NULL) THEN
    IF NEW.encerrado_em IS NULL THEN
      NEW.encerrado_em := now();
    END IF;
    IF NEW.encerrado_por IS NULL THEN
      NEW.encerrado_por := auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_pulse_acompanhamento_status_trigger ON public.pulse_acompanhamentos;
CREATE TRIGGER trg_pulse_acompanhamento_status_trigger
BEFORE UPDATE OF status ON public.pulse_acompanhamentos
FOR EACH ROW
EXECUTE FUNCTION public.trg_pulse_acompanhamento_status();

-- 4. POLICIES idempotentes em pulse_acompanhamentos
ALTER TABLE public.pulse_acompanhamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem visualizar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem atualizar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem inserir acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem deletar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos SELECT" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos UPDATE" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos INSERT" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos DELETE" ON public.pulse_acompanhamentos;

-- SELECT: Admin/RH veem todos da empresa; Gestor vê SOMENTE onde responsavel_id = auth.uid()
CREATE POLICY "Acompanhamentos SELECT" ON public.pulse_acompanhamentos
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id() AND
  (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    OR
    (public.get_my_role() = 'gestor_departamento' AND responsavel_id = auth.uid())
  )
);

-- UPDATE: Admin/RH atualizam todos da empresa; Gestor atualiza SOMENTE onde responsavel_id = auth.uid()
CREATE POLICY "Acompanhamentos UPDATE" ON public.pulse_acompanhamentos
FOR UPDATE TO authenticated
USING (
  company_id = public.get_my_company_id() AND
  (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    OR
    (public.get_my_role() = 'gestor_departamento' AND responsavel_id = auth.uid())
  )
);

-- INSERT: Admin/RH inserem manualmente; Gestor insere somente se responsavel_id = auth.uid() (ou restrito a Admin/RH)
CREATE POLICY "Acompanhamentos INSERT" ON public.pulse_acompanhamentos
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id() AND
  (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    OR
    (public.get_my_role() = 'gestor_departamento' AND responsavel_id = auth.uid())
  )
);

-- DELETE: apenas Admin/RH
CREATE POLICY "Acompanhamentos DELETE" ON public.pulse_acompanhamentos
FOR DELETE TO authenticated
USING (
  company_id = public.get_my_company_id() AND
  public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);
