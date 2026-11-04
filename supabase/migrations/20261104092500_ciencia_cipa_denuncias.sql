-- Migration: Persistência do aceite CAT/SINAN para Denúncias CIPA+A
-- Data: 2026-11-04
-- Prova jurídica documental persistida no banco

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS ciencia_cipa_em timestamptz,
  ADD COLUMN IF NOT EXISTS ciencia_cipa_por uuid REFERENCES auth.users(id);

-- RPC para registrar a ciência legal da CIPA+A (CAT/SINAN)
CREATE OR REPLACE FUNCTION public.registrar_ciencia_cipa(p_denuncia_id uuid)
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

  UPDATE public.denuncias
  SET ciencia_cipa_em = now(),
      ciencia_cipa_por = v_user,
      updated_at = now()
  WHERE id = p_denuncia_id;

  INSERT INTO public.denuncias_historico (
    denuncia_id,
    company_id,
    alterado_por,
    status_anterior,
    status_novo,
    justificativa
  )
  VALUES (
    p_denuncia_id,
    v_target_company,
    v_user,
    NULL,
    'ciencia_cipa',
    'Ciencia legal CAT/SINAN registrada'
  );
END;
$function$;

-- Atualiza listar_denuncias_admin para expor ciencia_cipa_em e ciencia_cipa_por
DROP FUNCTION IF EXISTS public.listar_denuncias_admin();

CREATE OR REPLACE FUNCTION public.listar_denuncias_admin()
RETURNS TABLE (
  id uuid,
  titulo text,
  mensagem text,
  status text,
  criado_em timestamptz,
  anonimo boolean,
  user_id uuid,
  autor_nome text,
  tipo text,
  categoria_comportamento text,
  origem_ofensa text,
  ciencia_cipa_em timestamptz,
  ciencia_cipa_por uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = v_user LIMIT 1;
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;

  RETURN QUERY
  SELECT
    d.id,
    d.titulo,
    d.mensagem,
    d.status,
    d.criado_em,
    d.anonimo,
    CASE WHEN d.anonimo THEN NULL ELSE d.user_id END AS user_id,
    CASE WHEN d.anonimo THEN NULL ELSE (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = d.user_id LIMIT 1) END AS autor_nome,
    d.tipo,
    d.categoria_comportamento,
    d.origem_ofensa,
    d.ciencia_cipa_em,
    d.ciencia_cipa_por
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$;

