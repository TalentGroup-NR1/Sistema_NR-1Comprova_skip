-- =====================================================================
-- Migration: 20261104143000_denuncias_protocolo_mensageria.sql
-- Objetivo: Protocolo não sequencial, consulta anônima em 2 fatores,
--           mensageria bidirecional comitê/denunciante e resumo público
-- Lei 14.457/2022 (Canal de Denúncias e Apuração Imparcial)
-- =====================================================================

-- 1. Helper para IP hash (gera UUID estável a partir do IP real da requisição PostgREST)
CREATE OR REPLACE FUNCTION public.get_client_ip_hash()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_headers json;
  v_ip text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_ip := COALESCE(
      v_headers->>'cf-connecting-ip',
      split_part(v_headers->>'x-forwarded-for', ',', 1),
      v_headers->>'x-real-ip',
      '127.0.0.1'
    );
  EXCEPTION WHEN OTHERS THEN
    v_ip := '127.0.0.1';
  END;
  RETURN md5(trim(v_ip))::uuid;
END;
$$;

-- 2. Função auxiliar para gerar protocolo aleatório não sequencial: DEN-YYYY-XXXXXXXX
-- Exclui caracteres ambíguos: I, O, 0, 1
CREATE OR REPLACE FUNCTION public.gerar_protocolo()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_char text;
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    v_char := substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    v_code := v_code || v_char;
  END LOOP;
  RETURN 'DEN-' || to_char(now(), 'YYYY') || '-' || v_code;
END;
$$;

-- 3. Adicionar novas colunas na tabela public.denuncias
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS protocolo text UNIQUE,
  ADD COLUMN IF NOT EXISTS data_fato date,
  ADD COLUMN IF NOT EXISTS resumo_publico text,
  ADD COLUMN IF NOT EXISTS ultima_mensagem_denunciante_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_denuncias_protocolo ON public.denuncias (protocolo);

-- 4. Backfill para denúncias existentes sem protocolo
DO $$
DECLARE
  r RECORD;
  v_proto text;
  v_tentativas int;
BEGIN
  FOR r IN SELECT id, criado_em FROM public.denuncias WHERE protocolo IS NULL LOOP
    v_tentativas := 0;
    LOOP
      v_tentativas := v_tentativas + 1;
      v_proto := public.gerar_protocolo();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.denuncias WHERE protocolo = v_proto);
      IF v_tentativas > 20 THEN
        RAISE EXCEPTION 'falha_ao_gerar_protocolo_unico';
      END IF;
    END LOOP;
    UPDATE public.denuncias SET protocolo = v_proto WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Tabela public.denuncia_mensagens (mensageria bidirecional)
CREATE TABLE IF NOT EXISTS public.denuncia_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.denuncias(id) ON DELETE CASCADE,
  autor_tipo text NOT NULL CHECK (autor_tipo IN ('denunciante','comite')),
  autor_user_id uuid REFERENCES auth.users(id),
  mensagem text NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 2000),
  lida_pelo_denunciante boolean NOT NULL DEFAULT false,
  lida_pelo_comite boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_denmsg_denuncia
  ON public.denuncia_mensagens(denuncia_id, created_at);

ALTER TABLE public.denuncia_mensagens ENABLE ROW LEVEL SECURITY;
-- Acesso somente via RPC SECURITY DEFINER

-- 6. Tabela public.denuncia_acessos (auditoria de consulta e resposta anônimas)
CREATE TABLE IF NOT EXISTS public.denuncia_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.denuncias(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  acao text NOT NULL CHECK (acao IN ('consulta','resposta')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_denacesso_den
  ON public.denuncia_acessos(denuncia_id);

ALTER TABLE public.denuncia_acessos ENABLE ROW LEVEL SECURITY;
-- Acesso somente via RPC SECURITY DEFINER

-- 7. Atualizar criar_denuncia para receber p_data_fato e RETORNAR o protocolo gerado
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean, text, text, text);
DROP FUNCTION IF EXISTS public.criar_denuncia(text, text, boolean, text, text, text, date);

CREATE OR REPLACE FUNCTION public.criar_denuncia(
  p_titulo text,
  p_mensagem text,
  p_anonimo boolean,
  p_tipo text DEFAULT 'denuncia'::text,
  p_categoria text DEFAULT NULL::text,
  p_origem text DEFAULT NULL::text,
  p_data_fato date DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_protocolo text;
  v_tentativas int := 0;
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

  -- Geração de protocolo único com proteção contra colisão
  LOOP
    v_tentativas := v_tentativas + 1;
    v_protocolo := public.gerar_protocolo();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.denuncias WHERE protocolo = v_protocolo);
    IF v_tentativas >= 10 THEN
      RAISE EXCEPTION 'protocolo_collision';
    END IF;
  END LOOP;

  -- Modelo B: denúncia nasce SEM responsável no pool compartilhado e com prazos de 30 e 90 dias
  INSERT INTO public.denuncias (
    company_id,
    titulo,
    mensagem,
    anonimo,
    user_id,
    tipo,
    categoria_comportamento,
    origem_ofensa,
    data_fato,
    protocolo,
    responsavel_id,
    atribuido_em,
    assumido_por,
    assumido_em,
    prazo_primeira_resposta,
    prazo_conclusao
  )
  VALUES (
    v_company,
    p_titulo,
    p_mensagem,
    v_anonimo,
    CASE WHEN v_anonimo THEN NULL ELSE v_user END,
    v_tipo,
    CASE WHEN v_tipo = 'denuncia' THEN p_categoria ELSE NULL END,
    CASE WHEN v_tipo = 'denuncia' THEN p_origem ELSE NULL END,
    p_data_fato,
    v_protocolo,
    NULL,
    NULL,
    NULL,
    NULL,
    now() + interval '30 days',
    now() + interval '90 days'
  )
  RETURNING id INTO v_id;

  -- Retorna o PROTOCOLO gerado para o denunciante acompanhar
  RETURN v_protocolo;
END;
$function$;

-- 8. RPC Pública de Consulta: consultar_denuncia_por_protocolo
CREATE OR REPLACE FUNCTION public.consultar_denuncia_por_protocolo(
  p_protocolo text,
  p_data_fato date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_denuncia RECORD;
  v_ip_uuid uuid;
  v_ip_hash_txt text;
  v_status_externo text;
  v_mensagens jsonb;
BEGIN
  -- Rate limit por IP: 10 tentativas por minuto
  v_ip_uuid := public.get_client_ip_hash();
  v_ip_hash_txt := md5(v_ip_uuid::text);
  PERFORM public.check_rate_limit(v_ip_uuid, 'consulta_protocolo', 10, 60);

  IF p_protocolo IS NULL OR trim(p_protocolo) = '' THEN
    RETURN jsonb_build_object('erro', 'protocolo_invalido');
  END IF;

  -- Localiza pelo protocolo em maiúsculo
  SELECT id, status, criado_em, data_fato, resumo_publico, assumido_por, protocolo
  INTO v_denuncia
  FROM public.denuncias
  WHERE upper(trim(protocolo)) = upper(trim(p_protocolo))
  LIMIT 1;

  IF NOT FOUND THEN
    -- Erro genérico
    RETURN jsonb_build_object('erro', 'protocolo_invalido');
  END IF;

  -- Validação do 2º fator (data_fato): se a denúncia possuir data_fato e for informada diferente
  IF v_denuncia.data_fato IS NOT NULL AND p_data_fato IS NOT NULL THEN
    IF v_denuncia.data_fato <> p_data_fato THEN
      RETURN jsonb_build_object('erro', 'protocolo_invalido');
    END IF;
  END IF;

  -- Mapeamento do status externo
  -- 'novo' -> 'Recebida'
  -- 'em_analise' com assumido_por -> 'Em apuração'
  -- 'em_analise' sem assumido_por -> 'Em análise'
  -- 'concluido' -> 'Concluída'
  IF v_denuncia.status = 'novo' THEN
    v_status_externo := 'Recebida';
  ELSIF v_denuncia.status = 'em_analise' THEN
    IF v_denuncia.assumido_por IS NOT NULL THEN
      v_status_externo := 'Em apuração';
    ELSE
      v_status_externo := 'Em análise';
    END IF;
  ELSIF v_denuncia.status = 'concluido' THEN
    v_status_externo := 'Concluída';
  ELSE
    v_status_externo := 'Recebida';
  END IF;

  -- Auditoria do acesso
  INSERT INTO public.denuncia_acessos (denuncia_id, ip_hash, acao)
  VALUES (v_denuncia.id, v_ip_hash_txt, 'consulta');

  -- Marca mensagens do comitê como lidas pelo denunciante
  UPDATE public.denuncia_mensagens
  SET lida_pelo_denunciante = true
  WHERE denuncia_id = v_denuncia.id
    AND autor_tipo = 'comite'
    AND lida_pelo_denunciante = false;

  -- Mensagens trocadas
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'autor', m.autor_tipo,
        'mensagem', m.mensagem,
        'created_at', m.created_at
      ) ORDER BY m.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_mensagens
  FROM public.denuncia_mensagens m
  WHERE m.denuncia_id = v_denuncia.id;

  RETURN jsonb_build_object(
    'protocolo', v_denuncia.protocolo,
    'status_externo', v_status_externo,
    'criado_em', v_denuncia.criado_em,
    'data_fato', v_denuncia.data_fato,
    'mensagens', v_mensagens,
    'resumo_publico', CASE WHEN v_denuncia.status = 'concluido' THEN v_denuncia.resumo_publico ELSE NULL END,
    'permite_resposta', (v_denuncia.status <> 'concluido')
  );
END;
$function$;

-- Concede execução pública
GRANT EXECUTE ON FUNCTION public.consultar_denuncia_por_protocolo(text, date) TO anon, authenticated;

-- 9. RPC Pública de Resposta: responder_denuncia_por_protocolo
CREATE OR REPLACE FUNCTION public.responder_denuncia_por_protocolo(
  p_protocolo text,
  p_data_fato date,
  p_mensagem text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_denuncia RECORD;
  v_ip_uuid uuid;
  v_ip_hash_txt text;
  v_limpo text;
BEGIN
  -- Rate limit por IP: 5 respostas por minuto
  v_ip_uuid := public.get_client_ip_hash();
  v_ip_hash_txt := md5(v_ip_uuid::text);
  PERFORM public.check_rate_limit(v_ip_uuid, 'responder_protocolo', 5, 60);

  IF p_protocolo IS NULL OR trim(p_protocolo) = '' THEN
    RETURN jsonb_build_object('erro', 'protocolo_invalido');
  END IF;

  SELECT id, status, data_fato
  INTO v_denuncia
  FROM public.denuncias
  WHERE upper(trim(protocolo)) = upper(trim(p_protocolo))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'protocolo_invalido');
  END IF;

  IF v_denuncia.data_fato IS NOT NULL AND p_data_fato IS NOT NULL THEN
    IF v_denuncia.data_fato <> p_data_fato THEN
      RETURN jsonb_build_object('erro', 'protocolo_invalido');
    END IF;
  END IF;

  IF v_denuncia.status = 'concluido' THEN
    RETURN jsonb_build_object('erro', 'denuncia_concluida');
  END IF;

  v_limpo := trim(p_mensagem);
  IF v_limpo IS NULL OR length(v_limpo) < 1 OR length(v_limpo) > 2000 THEN
    RAISE EXCEPTION 'mensagem_invalida';
  END IF;

  INSERT INTO public.denuncia_mensagens (
    denuncia_id,
    autor_tipo,
    mensagem,
    lida_pelo_denunciante,
    lida_pelo_comite
  )
  VALUES (
    v_denuncia.id,
    'denunciante',
    v_limpo,
    true,
    false
  );

  UPDATE public.denuncias
  SET ultima_mensagem_denunciante_em = now()
  WHERE id = v_denuncia.id;

  INSERT INTO public.denuncia_acessos (denuncia_id, ip_hash, acao)
  VALUES (v_denuncia.id, v_ip_hash_txt, 'resposta');

  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.responder_denuncia_por_protocolo(text, date, text) TO anon, authenticated;

-- 10. RPC do Comitê: comite_enviar_mensagem
CREATE OR REPLACE FUNCTION public.comite_enviar_mensagem(
  p_denuncia_id uuid,
  p_mensagem text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_assumido_por uuid;
  v_limpo text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT d.company_id, d.assumido_por
  INTO v_company, v_assumido_por
  FROM public.denuncias d
  WHERE d.id = p_denuncia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_assumido_por IS NULL OR v_assumido_por <> v_user THEN
    RAISE EXCEPTION 'assuma_a_denuncia_primeiro';
  END IF;

  v_limpo := trim(p_mensagem);
  IF v_limpo IS NULL OR length(v_limpo) < 1 OR length(v_limpo) > 2000 THEN
    RAISE EXCEPTION 'mensagem_invalida';
  END IF;

  INSERT INTO public.denuncia_mensagens (
    denuncia_id,
    autor_tipo,
    autor_user_id,
    mensagem,
    lida_pelo_comite,
    lida_pelo_denunciante
  )
  VALUES (
    p_denuncia_id,
    'comite',
    v_user,
    v_limpo,
    true,
    false
  );
END;
$function$;

-- 11. RPC do Comitê: comite_listar_mensagens
CREATE OR REPLACE FUNCTION public.comite_listar_mensagens(p_denuncia_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_mensagens jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT d.company_id INTO v_company FROM public.denuncias d WHERE d.id = p_denuncia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Marca mensagens do denunciante como lidas pelo comitê
  UPDATE public.denuncia_mensagens
  SET lida_pelo_comite = true
  WHERE denuncia_id = p_denuncia_id
    AND autor_tipo = 'denunciante'
    AND lida_pelo_comite = false;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'autor', m.autor_tipo,
        'autor_nome', CASE
          WHEN m.autor_tipo = 'comite' THEN (
            SELECT COALESCE(c.full_name, p.full_name, 'Comitê de Ética')
            FROM public.profiles p
            LEFT JOIN public.colaboradores c ON c.user_id = p.user_id
            WHERE p.user_id = m.autor_user_id
            LIMIT 1
          )
          ELSE 'Denunciante'
        END,
        'mensagem', m.mensagem,
        'created_at', m.created_at
      ) ORDER BY m.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_mensagens
  FROM public.denuncia_mensagens m
  WHERE m.denuncia_id = p_denuncia_id;

  RETURN v_mensagens;
END;
$function$;

-- 12. Atualizar atualizar_status_denuncia com p_resumo_publico
DROP FUNCTION IF EXISTS public.atualizar_status_denuncia(uuid, text);
DROP FUNCTION IF EXISTS public.atualizar_status_denuncia(uuid, text, text);
DROP FUNCTION IF EXISTS public.atualizar_status_denuncia(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(
  p_id uuid,
  p_novo_status text,
  p_parecer text DEFAULT NULL::text,
  p_resumo_publico text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_status_ant text;
  v_assumido_por uuid;
  v_primeira_resp timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_novo_status NOT IN ('novo','em_analise','concluido') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT d.company_id, d.status, d.assumido_por, d.primeira_resposta_em
  INTO v_company, v_status_ant, v_assumido_por, v_primeira_resp
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_assumido_por IS NULL OR v_assumido_por <> v_user THEN
    RAISE EXCEPTION 'assuma_a_denuncia_primeiro';
  END IF;

  IF p_novo_status = 'concluido' THEN
    IF p_parecer IS NULL OR length(trim(p_parecer)) < 30 THEN
      RAISE EXCEPTION 'parecer_obrigatorio_para_conclusao';
    END IF;
  END IF;

  IF v_status_ant = 'novo' AND p_novo_status <> 'novo' AND v_primeira_resp IS NULL THEN
    v_primeira_resp := now();
  END IF;

  UPDATE public.denuncias
  SET status = p_novo_status,
      updated_at = now(),
      primeira_resposta_em = COALESCE(primeira_resposta_em, v_primeira_resp),
      parecer_atual = COALESCE(p_parecer, parecer_atual),
      parecer_em = CASE WHEN p_parecer IS NOT NULL THEN now() ELSE parecer_em END,
      parecer_por = CASE WHEN p_parecer IS NOT NULL THEN v_user ELSE parecer_por END,
      resumo_publico = CASE WHEN p_resumo_publico IS NOT NULL THEN p_resumo_publico ELSE resumo_publico END
  WHERE id = p_id;

  INSERT INTO public.denuncias_historico (
    denuncia_id,
    company_id,
    alterado_por,
    status_anterior,
    status_novo,
    justificativa
  )
  VALUES (
    p_id,
    v_company,
    v_user,
    v_status_ant,
    p_novo_status,
    COALESCE(p_parecer, 'Status alterado de ' || v_status_ant || ' para ' || p_novo_status)
  );
END;
$function$;

-- 13. Atualizar listar_denuncias_admin para incluir protocolo, data_fato, resumo_publico e ultima_mensagem_denunciante_em
DROP FUNCTION IF EXISTS public.listar_denuncias_admin();

CREATE OR REPLACE FUNCTION public.listar_denuncias_admin()
RETURNS TABLE(
  id uuid,
  titulo text,
  mensagem text,
  status text,
  criado_em timestamp with time zone,
  anonimo boolean,
  user_id uuid,
  autor_nome text,
  tipo text,
  categoria_comportamento text,
  origem_ofensa text,
  ciencia_cipa_em timestamp with time zone,
  ciencia_cipa_por uuid,
  responsavel_id uuid,
  transferido_de uuid,
  atribuido_em timestamp with time zone,
  assumido_por uuid,
  assumido_por_nome text,
  assumido_em timestamp with time zone,
  parecer_atual text,
  parecer_em timestamp with time zone,
  parecer_por uuid,
  prazo_primeira_resposta timestamp with time zone,
  prazo_conclusao timestamp with time zone,
  primeira_resposta_em timestamp with time zone,
  protocolo text,
  data_fato date,
  resumo_publico text,
  ultima_mensagem_denunciante_em timestamp with time zone,
  mensagens_nao_lidas_comite bigint
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

  v_role := public.get_my_role();
  IF v_role = 'admin_master' OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role = 'admin_master') THEN
    RAISE EXCEPTION 'forbidden_exceto_designacao';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
    d.ciencia_cipa_por,
    d.responsavel_id,
    d.transferido_de,
    d.atribuido_em,
    d.assumido_por,
    COALESCE(
      (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = d.assumido_por LIMIT 1),
      (SELECT p.full_name::text FROM public.profiles p WHERE p.user_id = d.assumido_por LIMIT 1),
      (SELECT u.email::text FROM auth.users u WHERE u.id = d.assumido_por LIMIT 1)
    ) AS assumido_por_nome,
    d.assumido_em,
    d.parecer_atual,
    d.parecer_em,
    d.parecer_por,
    d.prazo_primeira_resposta,
    d.prazo_conclusao,
    d.primeira_resposta_em,
    d.protocolo,
    d.data_fato,
    d.resumo_publico,
    d.ultima_mensagem_denunciante_em,
    (
      SELECT count(*)
      FROM public.denuncia_mensagens dm
      WHERE dm.denuncia_id = d.id
        AND dm.autor_tipo = 'denunciante'
        AND dm.lida_pelo_comite = false
    ) AS mensagens_nao_lidas_comite
  FROM public.denuncias d
  WHERE d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$;

