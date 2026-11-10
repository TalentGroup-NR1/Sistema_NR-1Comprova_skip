
-- Tabela denuncias
CREATE TABLE public.denuncias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  mensagem text NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 5000),
  anonimo boolean NOT NULL DEFAULT false,
  user_id uuid,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_analise','concluido')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_denuncias_company_status ON public.denuncias(company_id, status);
CREATE INDEX idx_denuncias_criado_em ON public.denuncias(criado_em DESC);

ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;

-- Sem policies = nega tudo. Acesso somente via RPC SECURITY DEFINER.

CREATE TRIGGER trg_denuncias_updated_at
BEFORE UPDATE ON public.denuncias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: criar denuncia
CREATE OR REPLACE FUNCTION public.criar_denuncia(
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_id uuid;
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

  SELECT company_id INTO v_company FROM public.profiles WHERE id = v_user;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.denuncias (company_id, titulo, mensagem, anonimo, user_id)
  VALUES (v_company, trim(p_titulo), trim(p_mensagem), COALESCE(p_anonimo, false), v_user)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- RPC: listar denuncias (admin/RH)
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

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user LIMIT 1;
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT company_id INTO v_company FROM public.profiles WHERE id = v_user;

  RETURN QUERY
  SELECT
    d.id,
    d.titulo,
    d.mensagem,
    d.status,
    d.criado_em,
    d.anonimo,
    CASE WHEN d.anonimo THEN NULL ELSE d.user_id END AS user_id,
    CASE
      WHEN d.anonimo THEN NULL
      ELSE (SELECT c.full_name FROM public.colaboradores c WHERE c.user_id = d.user_id LIMIT 1)
    END AS autor_nome
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$$;

-- RPC: atualizar status
CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(
  p_id uuid,
  p_novo_status text
)
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

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user LIMIT 1;
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT company_id INTO v_company FROM public.profiles WHERE id = v_user;
  SELECT company_id INTO v_target_company FROM public.denuncias WHERE id = p_id;

  IF v_target_company IS NULL THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_role <> 'admin_master' AND v_target_company <> v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.denuncias SET status = p_novo_status WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_denuncia(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listar_denuncias_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_status_denuncia(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.criar_denuncia(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_denuncias_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_denuncia(uuid, text) TO authenticated;
