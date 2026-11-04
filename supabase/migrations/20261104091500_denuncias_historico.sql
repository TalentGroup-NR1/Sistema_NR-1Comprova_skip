-- Migration: Trilha de Auditoria para Denúncias (denuncias_historico)
-- Data: 2026-11-04
-- Prova documental para fiscalização MPT e conformidade Lei 14.457/2022

CREATE TABLE IF NOT EXISTS public.denuncias_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL
    REFERENCES public.denuncias(id) ON DELETE CASCADE,
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  alterado_por uuid NOT NULL REFERENCES auth.users(id),
  status_anterior text,
  status_novo text NOT NULL,
  justificativa text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_denuncias_hist_denuncia
  ON public.denuncias_historico(denuncia_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_denuncias_hist_company
  ON public.denuncias_historico(company_id, created_at DESC);

ALTER TABLE public.denuncias_historico ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.denuncias_historico IS
  'Trilha de auditoria das mudancas de status. RLS sem policy: acesso exclusivo via RPC auditada. Prova de diligencia em fiscalizacao MPT (Lei 14.457/2022).';

-- Recria atualizar_status_denuncia com gravação em histórico e parâmetro opcional p_justificativa
CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(
  p_id uuid,
  p_novo_status text,
  p_justificativa text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_target_company uuid;
  v_status_ant text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_novo_status NOT IN ('novo','em_analise','concluido') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user
  LIMIT 1;

  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  SELECT d.company_id, d.status INTO v_target_company, v_status_ant
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_role <> 'admin_master' AND v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Atualiza status e data de modificação
  UPDATE public.denuncias
  SET status = p_novo_status,
      updated_at = now()
  WHERE id = p_id;

  -- Grava trilha de auditoria
  INSERT INTO public.denuncias_historico (
    denuncia_id,
    company_id,
    alterado_por,
    status_anterior,
    status_novo,
    justificativa
  )
  VALUES (
    p_id,
    v_target_company,
    v_user,
    v_status_ant,
    p_novo_status,
    p_justificativa
  );
END;
$function$;

-- RPC de leitura do histórico de uma denúncia
CREATE OR REPLACE FUNCTION public.listar_historico_denuncia(p_denuncia_id uuid)
RETURNS TABLE (
  id uuid,
  status_anterior text,
  status_novo text,
  justificativa text,
  alterado_por uuid,
  alterado_por_nome text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_target_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user
  LIMIT 1;

  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  SELECT d.company_id INTO v_target_company
  FROM public.denuncias d
  WHERE d.id = p_denuncia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_role <> 'admin_master' AND v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    h.id,
    h.status_anterior,
    h.status_novo,
    h.justificativa,
    h.alterado_por,
    COALESCE(
      (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = h.alterado_por LIMIT 1),
      (SELECT u.email::text FROM auth.users u WHERE u.id = h.alterado_por LIMIT 1),
      'Usuário'
    ) AS alterado_por_nome,
    h.created_at
  FROM public.denuncias_historico h
  WHERE h.denuncia_id = p_denuncia_id
  ORDER BY h.created_at DESC;
END;
$function$;
