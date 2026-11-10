-- Migration: 20261027160000_gestor_aprovar_ferias_policy.sql
-- Etapa 1: Policy de UPDATE em ferias_gozo para gestor_departamento + trigger de salvaguarda de auditoria e imutabilidade

-- 1. Trigger de salvaguarda: impede que gestor_departamento altere datas, dias, valores ou chaves,
--    e preenche automaticamente aprovado_por e aprovado_em quando o status transicionar para 'aprovado'.
CREATE OR REPLACE FUNCTION public.fn_guard_gestor_ferias_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := public.get_my_role();

  IF v_role = 'gestor_departamento'::public.app_role THEN
    -- Apenas transição a partir de 'planejado'
    IF OLD.status <> 'planejado'::public.ferias_gozo_status THEN
      RAISE EXCEPTION 'Apenas solicitações com status planejado podem ser alteradas pelo gestor.' USING ERRCODE = '42501';
    END IF;

    -- O gestor só pode aprovar ou cancelar (recusar)
    IF NEW.status NOT IN ('aprovado'::public.ferias_gozo_status, 'cancelado'::public.ferias_gozo_status) THEN
      RAISE EXCEPTION 'O gestor só pode aprovar ou recusar solicitações de férias.' USING ERRCODE = '42501';
    END IF;

    -- Imutabilidade de datas, valores, chaves e dias
    IF NEW.data_inicio_gozo IS DISTINCT FROM OLD.data_inicio_gozo
       OR NEW.data_fim_gozo IS DISTINCT FROM OLD.data_fim_gozo
       OR NEW.dias_gozados IS DISTINCT FROM OLD.dias_gozados
       OR NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento
       OR NEW.abono_pecuniario_dias IS DISTINCT FROM OLD.abono_pecuniario_dias
       OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.periodo_aquisitivo_id IS DISTINCT FROM OLD.periodo_aquisitivo_id THEN
      RAISE EXCEPTION 'O gestor não tem permissão para alterar datas, dias ou valores das férias.' USING ERRCODE = '42501';
    END IF;

    -- Preenchimento automático de auditoria
    IF NEW.status = 'aprovado'::public.ferias_gozo_status THEN
      NEW.aprovado_por := auth.uid();
      NEW.aprovado_em := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_gestor_ferias_update ON public.ferias_gozo;
CREATE TRIGGER trg_guard_gestor_ferias_update
  BEFORE UPDATE ON public.ferias_gozo
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_gestor_ferias_update();

-- 2. Policy de UPDATE em ferias_gozo para gestor_departamento
DROP POLICY IF EXISTS "Gestor departamento can update own subordinates ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Gestor departamento can update own subordinates ferias_gozo"
ON public.ferias_gozo
FOR UPDATE
TO authenticated
USING (
  (public.get_my_role() = 'gestor_departamento'::public.app_role OR public.has_role(auth.uid(), 'gestor_departamento'::public.app_role))
  AND company_id = public.get_my_company_id()
  AND colaborador_id IN (
    SELECT c.id FROM public.colaboradores c
    WHERE c.gestor_id = public.get_my_colaborador_id()
      AND c.company_id = public.get_my_company_id()
  )
  AND status = 'planejado'::public.ferias_gozo_status
)
WITH CHECK (
  (public.get_my_role() = 'gestor_departamento'::public.app_role OR public.has_role(auth.uid(), 'gestor_departamento'::public.app_role))
  AND company_id = public.get_my_company_id()
  AND colaborador_id IN (
    SELECT c.id FROM public.colaboradores c
    WHERE c.gestor_id = public.get_my_colaborador_id()
      AND c.company_id = public.get_my_company_id()
  )
  AND status IN ('aprovado'::public.ferias_gozo_status, 'cancelado'::public.ferias_gozo_status)
);

-- 3. Atualizar RPCs de aprovação e recusa para garantir trava de empresa
CREATE OR REPLACE FUNCTION public.aprovar_ferias_gozo(p_gozo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_my_colab uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id, c.gestor_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  -- Authorization
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' AND v_gozo.col_company_id = v_my_company THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para aprovar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para aprovar';
  END IF;
  
  IF v_gozo.status <> 'planejado' THEN
    RAISE EXCEPTION 'Apenas solicitações planejadas podem ser aprovadas';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'aprovado',
      aprovado_por = auth.uid(),
      aprovado_em = now(),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recusar_ferias_gozo(p_gozo_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_my_colab uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id, c.gestor_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' AND v_gozo.col_company_id = v_my_company THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para recusar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para recusar';
  END IF;
  
  IF v_gozo.status NOT IN ('planejado','aprovado') THEN
    RAISE EXCEPTION 'Status atual não permite recusa';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'cancelado',
      observacoes = COALESCE(observacoes,'') || E'\n[Recusado em ' || to_char(now(),'DD/MM/YYYY') || ']: ' || COALESCE(p_motivo,'Sem motivo informado'),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$$;
