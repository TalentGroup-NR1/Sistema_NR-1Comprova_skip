-- Migração: Máquina de Estados e Auditoria do Ciclo de Vida de Empresa
-- Data: 2026-10-29

-- 1. Remover constraint legada antes da normalização dos dados
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_status_check;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS check_companies_status;

-- 2. Normalização dos dados existentes (active -> ativa)
UPDATE public.companies
SET status = 'ativa'
WHERE status = 'active' OR status IS NULL;

-- 3. Criação da nova CHECK constraint para companies.status
ALTER TABLE public.companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN ('ativa', 'suspensa', 'encerrada'));

-- 4. Adição da coluna suspension_reason para evolução futura
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 5. Tabela de auditoria append-only: company_lifecycle_events
CREATE TABLE IF NOT EXISTS public.company_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_lifecycle_events_company_id
  ON public.company_lifecycle_events (company_id, created_at DESC);

-- 6. Trigger de salvaguarda: bloqueia estritamente UPDATE e DELETE em company_lifecycle_events
CREATE OR REPLACE FUNCTION public.prevent_lifecycle_events_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'company_lifecycle_events é estritamente append-only: UPDATE e DELETE são proibidos'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_lifecycle_events_update_delete ON public.company_lifecycle_events;
CREATE TRIGGER trg_prevent_lifecycle_events_update_delete
BEFORE UPDATE OR DELETE ON public.company_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_events_modification();

-- 7. RLS e Permissões em company_lifecycle_events
ALTER TABLE public.company_lifecycle_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.company_lifecycle_events TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.company_lifecycle_events FROM authenticated, anon;

DROP POLICY IF EXISTS "Apenas super_admin e admin_master leem auditoria de ciclo de vida" ON public.company_lifecycle_events;
CREATE POLICY "Apenas super_admin e admin_master leem auditoria de ciclo de vida"
  ON public.company_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_admin_master(auth.uid())
  );

-- 8. RPC transacional: transition_company_lifecycle
CREATE OR REPLACE FUNCTION public.transition_company_lifecycle(
  _company_id uuid,
  _target_status text,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company record;
  v_caller_id uuid := auth.uid();
BEGIN
  -- 1. Verificação estrita de autorização
  IF NOT (
    public.is_super_admin(v_caller_id)
    OR public.is_admin_master(v_caller_id)
  ) THEN
    RAISE EXCEPTION 'Permissão negada: apenas super_admin ou admin_master'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do motivo
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'O motivo da alteração de estado é obrigatório (mínimo 3 caracteres)'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Lock pessimista e leitura da empresa
  SELECT id, name, is_internal, status INTO v_company
  FROM public.companies
  WHERE id = _company_id
  FOR UPDATE;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Salvaguarda para empresas internas da plataforma
  IF v_company.is_internal AND _target_status IN ('suspensa', 'encerrada') THEN
    RAISE EXCEPTION 'Empresas internas da plataforma não podem ser suspensas ou encerradas'
      USING ERRCODE = '22023';
  END IF;

  -- 5. Validação de idempotência
  IF v_company.status = _target_status THEN
    RAISE EXCEPTION 'A empresa já se encontra no estado %', _target_status
      USING ERRCODE = '22023';
  END IF;

  -- 6. Validação de estado terminal
  IF v_company.status = 'encerrada' THEN
    RAISE EXCEPTION 'Empresa com estado terminal (encerrada) não pode ter seu estado alterado'
      USING ERRCODE = '22023';
  END IF;

  -- 7. Validação de matriz de transição
  IF NOT (
    (v_company.status = 'ativa' AND _target_status IN ('suspensa', 'encerrada')) OR
    (v_company.status = 'suspensa' AND _target_status IN ('ativa', 'encerrada'))
  ) THEN
    RAISE EXCEPTION 'Transição de estado inválida: % -> %', v_company.status, _target_status
      USING ERRCODE = '22023';
  END IF;

  -- 8. Atualização atômica da empresa
  UPDATE public.companies
  SET
    status = _target_status,
    suspension_reason = CASE WHEN _target_status = 'suspensa' THEN trim(_reason) ELSE NULL END,
    updated_at = now()
  WHERE id = _company_id;

  -- 9. Registro obrigatório na auditoria append-only
  INSERT INTO public.company_lifecycle_events (
    company_id,
    changed_by,
    previous_status,
    new_status,
    reason
  ) VALUES (
    _company_id,
    v_caller_id,
    v_company.status,
    _target_status,
    trim(_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'company_id', _company_id,
    'previous_status', v_company.status,
    'new_status', _target_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transition_company_lifecycle(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_company_lifecycle(uuid, text, text) TO authenticated;

-- 9. Atualização de get_plataforma_metrics para suportar novos status e permissão de admin_master
CREATE OR REPLACE FUNCTION public.get_plataforma_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_admin_master(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'empresas_ativas', (SELECT count(*) FROM public.companies WHERE status IN ('active', 'ativa')),
    'empresas_internas', (SELECT count(*) FROM public.companies WHERE is_internal IS TRUE),
    'empresas_externas', (SELECT count(*) FROM public.companies WHERE is_internal IS NOT TRUE),
    'empresas_suspensas', (SELECT count(*) FROM public.companies WHERE status IN ('suspended', 'suspensa')),
    'empresas_encerradas', (SELECT count(*) FROM public.companies WHERE status = 'encerrada'),
    'total_usuarios', (SELECT count(*) FROM public.profiles),
    'novos_30_dias', (SELECT count(*) FROM public.companies WHERE created_at >= now() - interval '30 days')
  ) INTO v;

  RETURN v;
END;
$$;
