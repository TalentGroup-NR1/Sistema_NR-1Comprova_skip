
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS categoria_comportamento TEXT NULL,
  ADD COLUMN IF NOT EXISTS origem_ofensa TEXT NULL;

ALTER TABLE public.denuncias DROP CONSTRAINT IF EXISTS denuncias_categoria_check;
ALTER TABLE public.denuncias ADD CONSTRAINT denuncias_categoria_check
  CHECK (categoria_comportamento IS NULL OR categoria_comportamento IN (
    'assedio_sexual','ameaca_violencia','violencia_fisica','bullying_assedio_moral'
  ));

ALTER TABLE public.denuncias DROP CONSTRAINT IF EXISTS denuncias_origem_check;
ALTER TABLE public.denuncias ADD CONSTRAINT denuncias_origem_check
  CHECK (origem_ofensa IS NULL OR origem_ofensa IN (
    'lideranca_cliente','lideranca_interna','colegas_pares','subordinados','clientes_terceiros'
  ));

-- Drop old signature
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean, text);
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean, text, text, text);

CREATE OR REPLACE FUNCTION public.criar_denuncia(
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean,
  p_tipo text DEFAULT 'denuncia',
  p_categoria text DEFAULT NULL,
  p_origem text DEFAULT NULL
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
  v_anonimo boolean := p_anonimo;
  v_tipo text := COALESCE(p_tipo, 'denuncia');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_tipo NOT IN ('denuncia','sugestao','duvida') THEN
    RAISE EXCEPTION 'tipo_invalido';
  END IF;

  IF v_tipo = 'denuncia' THEN
    v_anonimo := true;
    IF p_categoria IS NULL OR p_origem IS NULL THEN
      RAISE EXCEPTION 'categoria_origem_obrigatorios';
    END IF;
    IF p_categoria NOT IN ('assedio_sexual','ameaca_violencia','violencia_fisica','bullying_assedio_moral') THEN
      RAISE EXCEPTION 'categoria_invalida';
    END IF;
    IF p_origem NOT IN ('lideranca_cliente','lideranca_interna','colegas_pares','subordinados','clientes_terceiros') THEN
      RAISE EXCEPTION 'origem_invalida';
    END IF;
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.denuncias (company_id, titulo, mensagem, anonimo, user_id, tipo, categoria_comportamento, origem_ofensa)
  VALUES (
    v_company,
    p_titulo,
    p_mensagem,
    v_anonimo,
    CASE WHEN v_anonimo THEN NULL ELSE v_user END,
    v_tipo,
    CASE WHEN v_tipo = 'denuncia' THEN p_categoria ELSE NULL END,
    CASE WHEN v_tipo = 'denuncia' THEN p_origem ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_denuncia(text, text, boolean, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_denuncia(text, text, boolean, text, text, text) TO authenticated;

-- Update listar to return new fields
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
    CASE WHEN d.anonimo THEN NULL ELSE (SELECT c.nome_completo FROM public.colaboradores c WHERE c.user_id = d.user_id LIMIT 1) END AS autor_nome,
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
