
-- 1) Coluna tipo
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'denuncia';

ALTER TABLE public.denuncias
  DROP CONSTRAINT IF EXISTS denuncias_tipo_check;

ALTER TABLE public.denuncias
  ADD CONSTRAINT denuncias_tipo_check CHECK (tipo IN ('denuncia','sugestao','duvida'));

CREATE INDEX IF NOT EXISTS idx_denuncias_tipo ON public.denuncias(tipo);

-- 2) RPC criar_denuncia com tipo
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean);
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.criar_denuncia(
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean,
  p_tipo text DEFAULT 'denuncia'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_tipo text := COALESCE(p_tipo, 'denuncia');
  v_anonimo boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_titulo IS NULL OR char_length(trim(p_titulo)) = 0 OR char_length(p_titulo) > 200 THEN
    RAISE EXCEPTION 'titulo_invalido';
  END IF;
  IF p_mensagem IS NULL OR char_length(trim(p_mensagem)) = 0 OR char_length(p_mensagem) > 5000 THEN
    RAISE EXCEPTION 'mensagem_invalida';
  END IF;

  IF v_tipo NOT IN ('denuncia','sugestao','duvida') THEN
    RAISE EXCEPTION 'tipo_invalido';
  END IF;

  -- Regra de privacidade server-side: denúncia sempre anônima (bloqueia bypass)
  IF v_tipo = 'denuncia' THEN
    v_anonimo := true;
  ELSE
    v_anonimo := COALESCE(p_anonimo, false);
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.denuncias (company_id, titulo, mensagem, anonimo, user_id, tipo)
  VALUES (v_company, trim(p_titulo), trim(p_mensagem), v_anonimo, v_user, v_tipo)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_denuncia(text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_denuncia(text, text, boolean, text) TO authenticated;

-- 3) RPC listar com tipo
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
  tipo text
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
    END,
    d.tipo
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_denuncias_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_denuncias_admin() TO authenticated;
