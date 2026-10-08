-- 1. Alterar a tabela para suportar o novo fluxo (Cuidar+)
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS pulse_response_id UUID REFERENCES public.pulse_responses(id) ON DELETE CASCADE;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS criado_por TEXT;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS encerrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS encerrado_em TIMESTAMPTZ;
ALTER TABLE public.pulse_acompanhamentos ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ;

-- 2. Garantir idempotência na criação automática baseada na resposta
ALTER TABLE public.pulse_acompanhamentos DROP CONSTRAINT IF EXISTS pulse_acompanhamentos_pulse_response_id_key;
ALTER TABLE public.pulse_acompanhamentos ADD CONSTRAINT pulse_acompanhamentos_pulse_response_id_key UNIQUE (pulse_response_id);

-- 3. Trigger para gerar Acompanhamento Automaticamente ao receber resposta Crítica
CREATE OR REPLACE FUNCTION public.trigger_pulse_acompanhamento_critico()
RETURNS TRIGGER AS $$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_gestor_user_id UUID;
BEGIN
  -- Se o score_numeric não for crítico, não faz nada
  IF NEW.score_numeric IS NULL OR NEW.score_numeric > 2 THEN
    RETURN NEW;
  END IF;

  -- Obter os dados do colaborador (empresa, e o user_id do gestor)
  SELECT c.company_id, c.id, gestor.user_id 
  INTO v_company_id, v_colaborador_id, v_gestor_user_id
  FROM public.colaboradores c
  LEFT JOIN public.colaboradores gestor ON gestor.id = c.gestor_id
  WHERE c.id = NEW.employee_id;

  IF v_gestor_user_id IS NULL THEN
    -- Log sem PII
    RAISE NOTICE 'Nenhum gestor encontrado para o colaborador no pulso (%). Acompanhamento automatico pulado.', NEW.id;
    RETURN NEW;
  END IF;

  -- Criar o acompanhamento
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

DROP TRIGGER IF EXISTS trg_pulse_response_critica ON public.pulse_responses;
CREATE TRIGGER trg_pulse_response_critica
AFTER INSERT OR UPDATE OF score_numeric ON public.pulse_responses
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pulse_acompanhamento_critico();

-- 4. Trigger para Trilha de Status (iniciado_em, encerrado_em, encerrado_por)
CREATE OR REPLACE FUNCTION public.trg_pulse_acompanhamento_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'em_andamento' AND OLD.status = 'novo' THEN
    NEW.iniciado_em := now();
  END IF;
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    NEW.encerrado_em := now();
    NEW.encerrado_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_pulse_acompanhamento_status_trigger ON public.pulse_acompanhamentos;
CREATE TRIGGER trg_pulse_acompanhamento_status_trigger
BEFORE UPDATE OF status ON public.pulse_acompanhamentos
FOR EACH ROW
EXECUTE FUNCTION public.trg_pulse_acompanhamento_status();

-- 5. Novas Policies (Fail-closed e separação Gestor vs Admin)
DROP POLICY IF EXISTS "Admins podem visualizar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem atualizar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem inserir acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Admins podem deletar acompanhamentos de sua empresa" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos SELECT" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos UPDATE" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos INSERT" ON public.pulse_acompanhamentos;
DROP POLICY IF EXISTS "Acompanhamentos DELETE" ON public.pulse_acompanhamentos;

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

CREATE POLICY "Acompanhamentos INSERT" ON public.pulse_acompanhamentos
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id() AND
  public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "Acompanhamentos DELETE" ON public.pulse_acompanhamentos
FOR DELETE TO authenticated
USING (
  company_id = public.get_my_company_id() AND
  public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);
