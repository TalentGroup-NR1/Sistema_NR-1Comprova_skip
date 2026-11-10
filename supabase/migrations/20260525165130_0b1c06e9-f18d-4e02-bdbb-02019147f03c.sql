
ALTER TABLE public.denuncias ALTER COLUMN company_id DROP NOT NULL;

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

  SELECT company_id INTO v_company FROM public.profiles WHERE user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    SELECT company_id INTO v_company FROM public.colaboradores WHERE user_id = v_user LIMIT 1;
  END IF;
  -- admin_master pode ter company_id NULL (visão global)

  INSERT INTO public.denuncias (company_id, titulo, mensagem, anonimo, user_id)
  VALUES (v_company, trim(p_titulo), trim(p_mensagem), COALESCE(p_anonimo, false), v_user)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
