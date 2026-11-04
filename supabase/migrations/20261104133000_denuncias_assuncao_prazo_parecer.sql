-- Migration: Modelo "Assumir + Tratar", Parecer de Apuração e Prazos Legais (Etapa 4A)
-- Data: 2026-11-04
-- Lei 14.457/2022 (Art. 23, II) — Apuração Imparcial com Pool Compartilhado e Prazos

-- 1. Novas colunas em public.denuncias
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS assumido_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assumido_em timestamptz,
  ADD COLUMN IF NOT EXISTS parecer_atual text,
  ADD COLUMN IF NOT EXISTS parecer_em timestamptz,
  ADD COLUMN IF NOT EXISTS parecer_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prazo_primeira_resposta timestamptz,
  ADD COLUMN IF NOT EXISTS prazo_conclusao timestamptz,
  ADD COLUMN IF NOT EXISTS primeira_resposta_em timestamptz,
  ADD COLUMN IF NOT EXISTS alerta_vencimento_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_denuncias_assumido
  ON public.denuncias(assumido_por, status);

CREATE INDEX IF NOT EXISTS idx_denuncias_prazos
  ON public.denuncias(prazo_primeira_resposta, prazo_conclusao, status);

-- 2. Backfill de prazos e migração de responsavel_id para assumido_por
UPDATE public.denuncias
SET prazo_primeira_resposta = criado_em + interval '30 days',
    prazo_conclusao         = criado_em + interval '90 days'
WHERE prazo_primeira_resposta IS NULL;

UPDATE public.denuncias
SET assumido_por = responsavel_id,
    assumido_em  = COALESCE(atribuido_em, criado_em)
WHERE responsavel_id IS NOT NULL AND assumido_por IS NULL;

-- 3. Sanitização de textos com tokens em caixa alta (Tarefa 6)
UPDATE public.denuncias
SET mensagem = 'Conteúdo protegido por sigilo. Visível apenas para os responsáveis designados.'
WHERE mensagem LIKE 'CORPO_SIGILOSO%';

-- 4. RPC assumir_denuncia(p_id uuid)
CREATE OR REPLACE FUNCTION public.assumir_denuncia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_assumido_por uuid;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT d.company_id, d.assumido_por, d.status
  INTO v_company, v_assumido_por, v_status
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  -- Valida se o usuário é responsável designado ativo da empresa da denúncia
  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Se já estiver assumida por outro responsável
  IF v_assumido_por IS NOT NULL AND v_assumido_por <> v_user THEN
    RAISE EXCEPTION 'denuncia_ja_assumida';
  END IF;

  -- Se já for o próprio usuário: idempotente
  IF v_assumido_por = v_user THEN
    RETURN;
  END IF;

  UPDATE public.denuncias
  SET assumido_por = v_user,
      assumido_em  = now(),
      updated_at   = now()
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
    v_status,
    v_status,
    'Denúncia assumida para apuração'
  );
END;
$function$;

-- 5. RPC liberar_denuncia(p_id uuid)
CREATE OR REPLACE FUNCTION public.liberar_denuncia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_assumido_por uuid;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT d.company_id, d.assumido_por, d.status
  INTO v_company, v_assumido_por, v_status
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Apenas quem assumiu pode liberar a apuração de volta ao comitê
  IF v_assumido_por IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'apenas_quem_assumiu_pode_liberar';
  END IF;

  UPDATE public.denuncias
  SET assumido_por = NULL,
      assumido_em  = NULL,
      updated_at   = now()
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
    v_status,
    v_status,
    'Apuração liberada ao comitê'
  );
END;
$function$;

-- 6. Recriar atualizar_status_denuncia(...) com regras de assunção e parecer
DROP FUNCTION IF EXISTS public.atualizar_status_denuncia(uuid, text, text);

CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(
  p_id uuid,
  p_novo_status text,
  p_parecer text DEFAULT NULL
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

  -- Valida se é responsável ativo da empresa
  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Validação estrita: somente quem assumiu pode tratar a denúncia
  IF v_assumido_por IS NULL OR v_assumido_por <> v_user THEN
    RAISE EXCEPTION 'assuma_a_denuncia_primeiro';
  END IF;

  -- Para concluir: parecer é obrigatório e deve ter no mínimo 30 caracteres
  IF p_novo_status = 'concluido' THEN
    IF p_parecer IS NULL OR length(trim(p_parecer)) < 30 THEN
      RAISE EXCEPTION 'parecer_obrigatorio_para_conclusao';
    END IF;
  END IF;

  -- Se está saindo de 'novo' e não tinha primeira resposta, registra
  IF v_status_ant = 'novo' AND p_novo_status <> 'novo' AND v_primeira_resp IS NULL THEN
    v_primeira_resp := now();
  END IF;

  UPDATE public.denuncias
  SET status = p_novo_status,
      updated_at = now(),
      primeira_resposta_em = COALESCE(primeira_resposta_em, v_primeira_resp),
      parecer_atual = COALESCE(p_parecer, parecer_atual),
      parecer_em = CASE WHEN p_parecer IS NOT NULL THEN now() ELSE parecer_em END,
      parecer_por = CASE WHEN p_parecer IS NOT NULL THEN v_user ELSE parecer_por END
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

-- 7. Atualizar criar_denuncia(...) para iniciar sem responsável e com prazos calculados
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
    NULL,
    NULL,
    NULL,
    NULL,
    now() + interval '30 days',
    now() + interval '90 days'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 8. Atualizar listar_denuncias_admin() para retornar os novos campos
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
  origem_ofensa text,
  ciencia_cipa_em timestamptz,
  ciencia_cipa_por uuid,
  responsavel_id uuid,
  transferido_de uuid,
  atribuido_em timestamptz,
  assumido_por uuid,
  assumido_por_nome text,
  assumido_em timestamptz,
  parecer_atual text,
  parecer_em timestamptz,
  parecer_por uuid,
  prazo_primeira_resposta timestamptz,
  prazo_conclusao timestamptz,
  primeira_resposta_em timestamptz
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
    d.primeira_resposta_em
  FROM public.denuncias d
  WHERE d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$;

-- 9. RPC listar_denuncias_vencidas() (Tarefa 5.1)
CREATE OR REPLACE FUNCTION public.listar_denuncias_vencidas()
RETURNS TABLE (
  total_vencidas integer,
  denuncias_vencidas jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH vencidas AS (
    SELECT
      d.id,
      d.titulo,
      d.status,
      d.criado_em,
      d.assumido_por,
      CASE
        WHEN d.status = 'novo' AND d.prazo_primeira_resposta < now()
          THEN EXTRACT(DAY FROM (now() - d.prazo_primeira_resposta))::integer
        WHEN d.status <> 'concluido' AND d.prazo_conclusao < now()
          THEN EXTRACT(DAY FROM (now() - d.prazo_conclusao))::integer
        ELSE 0
      END AS dias_vencidos
    FROM public.denuncias d
    WHERE d.company_id = v_company
      AND d.status <> 'concluido'
      AND (
        (d.status = 'novo' AND d.prazo_primeira_resposta < now())
        OR (d.prazo_conclusao < now())
      )
  )
  SELECT
    (SELECT count(*)::integer FROM vencidas),
    COALESCE((SELECT jsonb_agg(v) FROM vencidas v), '[]'::jsonb);
END;
$function$;

