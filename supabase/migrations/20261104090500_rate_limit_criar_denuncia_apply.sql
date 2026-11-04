-- Migration: Aplicar rate limit em criar_denuncia
-- Data: 2026-11-04
-- Preserva 100% da lógica e validações existentes em produção

CREATE OR REPLACE FUNCTION public.criar_denuncia(
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean,
  p_tipo text DEFAULT 'denuncia'::text,
  p_categoria text DEFAULT NULL::text,
  p_origem text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Rate limit: máximo 3 mensagens por minuto por usuário
  PERFORM public.check_rate_limit(v_user, 'criar_denuncia', 3, 60);

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
$function$;
