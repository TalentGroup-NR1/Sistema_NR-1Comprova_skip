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
  autor_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
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

  RETURN QUERY
  SELECT
    d.id,
    d.titulo,
    d.mensagem,
    d.status::text,
    d.criado_em,
    d.anonimo,
    CASE WHEN d.anonimo THEN NULL ELSE d.user_id END,
    CASE
      WHEN d.anonimo THEN NULL
      ELSE (
        SELECT c.full_name::text
        FROM public.colaboradores c
        WHERE c.user_id = d.user_id
        LIMIT 1
      )
    END
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(p_id uuid, p_novo_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_target_company uuid;
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

  SELECT d.company_id INTO v_target_company
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_role <> 'admin_master' AND v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.denuncias
  SET status = p_novo_status
  WHERE id = p_id;
END;
$$;