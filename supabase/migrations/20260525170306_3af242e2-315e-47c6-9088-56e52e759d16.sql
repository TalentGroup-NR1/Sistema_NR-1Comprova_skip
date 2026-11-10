DROP FUNCTION IF EXISTS public.listar_denuncias_admin();

CREATE OR REPLACE FUNCTION public.listar_denuncias_admin()
RETURNS TABLE(
  id uuid,
  titulo text,
  mensagem text,
  status text,
  criado_em timestamptz,
  anonimo boolean,
  user_id uuid,
  autor_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    d.id AS id,
    d.titulo AS titulo,
    d.mensagem AS mensagem,
    d.status AS status,
    d.criado_em AS criado_em,
    d.anonimo AS anonimo,
    CASE WHEN d.anonimo THEN NULL ELSE d.user_id END AS user_id,
    CASE
      WHEN d.anonimo THEN NULL
      ELSE (SELECT c.full_name FROM public.colaboradores c WHERE c.user_id = d.user_id LIMIT 1)
    END AS autor_nome
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$;