-- Fix: corrigir c.nome_completo para c.full_name::text na RPC listar_denuncias_admin
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
  origem_ofensa text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    d.origem_ofensa
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_denuncias_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_denuncias_admin() TO authenticated;
