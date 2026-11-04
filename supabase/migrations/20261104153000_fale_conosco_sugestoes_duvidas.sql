-- =====================================================================
-- Migration: 20261104153000_fale_conosco_sugestoes_duvidas.sql
-- Objetivo: Separação TOTAL entre Canal de Denúncias (Lei 14.457/2022)
--           e Fale Conosco (Sugestões e Dúvidas operacionais ao RH)
-- =====================================================================

-- 1. Criação da tabela nova e isolada: public.fale_conosco
CREATE TABLE IF NOT EXISTS public.fale_conosco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('sugestao', 'duvida')),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 200),
  mensagem text NOT NULL CHECK (char_length(mensagem) BETWEEN 10 AND 5000),
  anonimo boolean NOT NULL DEFAULT false,
  autor_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido', 'em_analise', 'respondido', 'arquivado')),
  resposta text,
  respondido_por uuid REFERENCES auth.users(id),
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Regra de integridade estrita: se anonimo = true, autor_user_id DEVE ser NULL
ALTER TABLE public.fale_conosco
  DROP CONSTRAINT IF EXISTS chk_fale_anonimato;

ALTER TABLE public.fale_conosco
  ADD CONSTRAINT chk_fale_anonimato
  CHECK (NOT anonimo OR autor_user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_fale_company
  ON public.fale_conosco(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fale_tipo
  ON public.fale_conosco(company_id, tipo);

ALTER TABLE public.fale_conosco ENABLE ROW LEVEL SECURITY;
-- Acesso somente via RPCs SECURITY DEFINER

-- 2. Limpeza das sugestões e dúvidas de teste da tabela denuncias
-- (Preservando 100% das denúncias legítimas da CIPA+A)
DELETE FROM public.denuncias
WHERE tipo IN ('sugestao', 'duvida');

-- 3. RPC: criar_fale_conosco
CREATE OR REPLACE FUNCTION public.criar_fale_conosco(
  p_tipo text,
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean DEFAULT false
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
  v_limpo_titulo text;
  v_limpo_msg text;
  v_anonimo boolean := COALESCE(p_anonimo, false);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_tipo NOT IN ('sugestao', 'duvida') THEN
    RAISE EXCEPTION 'tipo_invalido';
  END IF;

  v_limpo_titulo := trim(p_titulo);
  IF length(v_limpo_titulo) < 3 OR length(v_limpo_titulo) > 200 THEN
    RAISE EXCEPTION 'titulo_invalido';
  END IF;

  v_limpo_msg := trim(p_mensagem);
  IF length(v_limpo_msg) < 10 OR length(v_limpo_msg) > 5000 THEN
    RAISE EXCEPTION 'mensagem_invalida';
  END IF;

  -- Rate limit: 5 envios por minuto por usuário
  PERFORM public.check_rate_limit(v_user, 'criar_fale_conosco', 5, 60);

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.fale_conosco (
    company_id,
    tipo,
    titulo,
    mensagem,
    anonimo,
    autor_user_id
  )
  VALUES (
    v_company,
    p_tipo,
    v_limpo_titulo,
    v_limpo_msg,
    v_anonimo,
    CASE WHEN v_anonimo THEN NULL ELSE v_user END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.criar_fale_conosco(text, text, text, boolean) TO authenticated;

-- 4. RPC: listar_fale_conosco (RH / admin_empresa)
CREATE OR REPLACE FUNCTION public.listar_fale_conosco(p_status text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tipo text,
  titulo text,
  mensagem text,
  anonimo boolean,
  autor_nome text,
  status text,
  resposta text,
  respondido_em timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_is_master boolean;
  v_is_rh boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Regra de soberania da empresa: admin_master não tem acesso operacional a Fale Conosco
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role = 'admin_master'
  ) INTO v_is_master;

  IF v_is_master THEN
    RAISE EXCEPTION 'forbidden_soberania_empresa';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  -- Acesso restrito a admin_empresa ou analista_rh
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_user AND ur.role IN ('admin_empresa', 'analista_rh')
    ) OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = v_user AND uc.company_id = v_company AND uc.role IN ('admin_empresa', 'analista_rh')
    )
  ) INTO v_is_rh;

  IF NOT v_is_rh THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.tipo,
    f.titulo,
    f.mensagem,
    f.anonimo,
    CASE
      WHEN f.anonimo THEN NULL
      ELSE COALESCE(
        (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = f.autor_user_id LIMIT 1),
        (SELECT pr.full_name::text FROM public.profiles pr WHERE pr.user_id = f.autor_user_id LIMIT 1),
        (SELECT u.email::text FROM auth.users u WHERE u.id = f.autor_user_id LIMIT 1)
      )
    END AS autor_nome,
    f.status,
    f.resposta,
    f.respondido_em,
    f.created_at
  FROM public.fale_conosco f
  WHERE f.company_id = v_company
    AND (p_status IS NULL OR f.status = p_status)
  ORDER BY f.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.listar_fale_conosco(text) TO authenticated;

-- 5. RPC: responder_fale_conosco (RH / admin_empresa)
CREATE OR REPLACE FUNCTION public.responder_fale_conosco(
  p_id uuid,
  p_resposta text,
  p_novo_status text DEFAULT 'respondido'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_fc_company uuid;
  v_limpo_resp text;
  v_is_master boolean;
  v_is_rh boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role = 'admin_master'
  ) INTO v_is_master;

  IF v_is_master THEN
    RAISE EXCEPTION 'forbidden_soberania_empresa';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  SELECT f.company_id INTO v_fc_company FROM public.fale_conosco f WHERE f.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registro_nao_encontrado';
  END IF;

  IF v_fc_company <> v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_user AND ur.role IN ('admin_empresa', 'analista_rh')
    ) OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = v_user AND uc.company_id = v_company AND uc.role IN ('admin_empresa', 'analista_rh')
    )
  ) INTO v_is_rh;

  IF NOT v_is_rh THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_novo_status NOT IN ('em_analise', 'respondido', 'arquivado') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  v_limpo_resp := trim(p_resposta);
  IF length(v_limpo_resp) < 10 OR length(v_limpo_resp) > 5000 THEN
    RAISE EXCEPTION 'resposta_invalida';
  END IF;

  UPDATE public.fale_conosco
  SET resposta = v_limpo_resp,
      respondido_por = v_user,
      respondido_em = now(),
      status = p_novo_status,
      updated_at = now()
  WHERE id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.responder_fale_conosco(uuid, text, text) TO authenticated;

-- 6. RPC: minhas_mensagens_fale_conosco (Colaborador)
CREATE OR REPLACE FUNCTION public.minhas_mensagens_fale_conosco()
RETURNS TABLE (
  id uuid,
  tipo text,
  titulo text,
  mensagem text,
  status text,
  resposta text,
  respondido_em timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.tipo,
    f.titulo,
    f.mensagem,
    f.status,
    f.resposta,
    f.respondido_em,
    f.created_at
  FROM public.fale_conosco f
  WHERE f.autor_user_id = v_user
  ORDER BY f.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.minhas_mensagens_fale_conosco() TO authenticated;
