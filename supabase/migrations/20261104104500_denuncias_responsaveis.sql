-- Migration: Designação Nominal de Responsáveis pelo Canal de Denúncias
-- Data: 2026-11-04
-- Lei 14.457/2022 (Art. 23, II) — Apuração Imparcial e Soberania Multi-tenant

-- 1. Tabela de designação de responsáveis
CREATE TABLE IF NOT EXISTS public.denuncias_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designado_por uuid NOT NULL REFERENCES auth.users(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  desativado_em timestamptz,
  UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dresp_company_ativo
  ON public.denuncias_responsaveis(company_id, ativo);
CREATE INDEX IF NOT EXISTS idx_dresp_user_ativo
  ON public.denuncias_responsaveis(user_id, ativo);

ALTER TABLE public.denuncias_responsaveis ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.denuncias_responsaveis IS
  'Responsaveis designados nominalmente pelo Canal de Denuncias por empresa. Acesso restrito via RPC (Lei 14.457/2022).';

-- 2. Colunas de atribuição na tabela denuncias
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS responsavel_id uuid
    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS transferido_de uuid
    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS atribuido_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_denuncias_responsavel
  ON public.denuncias(responsavel_id, status);

-- 3. Função helper de elegibilidade de responsável
CREATE OR REPLACE FUNCTION public.e_responsavel_denuncia(
  p_user_id uuid, p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.denuncias_responsaveis
    WHERE user_id = p_user_id AND company_id = p_company_id
      AND ativo = true
  );
$$;

-- 4. Função helper para o próprio usuário saber se é responsável
CREATE OR REPLACE FUNCTION public.sou_responsavel_denuncia()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;
  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN RETURN false; END IF;
  RETURN public.e_responsavel_denuncia(v_user, v_company);
END;
$$;

-- 5. RPC listar_responsaveis_denuncias()
CREATE OR REPLACE FUNCTION public.listar_responsaveis_denuncias()
RETURNS TABLE (
  user_id uuid,
  nome text,
  email text,
  ativo boolean,
  created_at timestamptz,
  designado_por_nome text
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
  IF v_role NOT IN ('admin_master', 'admin_empresa') AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role IN ('admin_master', 'admin_empresa')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;

  RETURN QUERY
  SELECT
    dr.user_id,
    COALESCE(
      (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = dr.user_id LIMIT 1),
      (SELECT p.full_name::text FROM public.profiles p WHERE p.user_id = dr.user_id LIMIT 1),
      (SELECT u.email::text FROM auth.users u WHERE u.id = dr.user_id LIMIT 1),
      'Usuário'
    ) AS nome,
    (SELECT u.email::text FROM auth.users u WHERE u.id = dr.user_id LIMIT 1) AS email,
    dr.ativo,
    dr.created_at,
    COALESCE(
      (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = dr.designado_por LIMIT 1),
      (SELECT p.full_name::text FROM public.profiles p WHERE p.user_id = dr.designado_por LIMIT 1),
      (SELECT u.email::text FROM auth.users u WHERE u.id = dr.designado_por LIMIT 1),
      'Admin'
    ) AS designado_por_nome
  FROM public.denuncias_responsaveis dr
  WHERE (v_role = 'admin_master' OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role = 'admin_master'))
     OR dr.company_id = v_company
  ORDER BY dr.ativo DESC, dr.created_at ASC;
END;
$function$;

-- 6. RPC designar_responsavel_denuncia(p_user_id)
CREATE OR REPLACE FUNCTION public.designar_responsavel_denuncia(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role app_role;
  v_caller_company uuid;
  v_target_company uuid;
  v_active_count integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := public.get_my_role();
  IF v_role NOT IN ('admin_empresa') AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_caller AND ur.role = 'admin_empresa'
  ) THEN
    RAISE EXCEPTION 'forbidden_apenas_admin_empresa';
  END IF;

  SELECT p.company_id INTO v_caller_company FROM public.profiles p WHERE p.user_id = v_caller LIMIT 1;
  SELECT p.company_id INTO v_target_company FROM public.profiles p WHERE p.user_id = p_user_id LIMIT 1;

  IF v_caller_company IS NULL OR v_target_company IS NULL OR v_caller_company <> v_target_company THEN
    RAISE EXCEPTION 'usuario_de_outra_empresa';
  END IF;

  -- Limite estrito de no máximo 3 responsáveis ativos por empresa
  SELECT count(*) INTO v_active_count
  FROM public.denuncias_responsaveis
  WHERE company_id = v_caller_company
    AND ativo = true
    AND user_id <> p_user_id;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'limite_designados_atingido';
  END IF;

  INSERT INTO public.denuncias_responsaveis (
    company_id,
    user_id,
    designado_por,
    ativo,
    created_at,
    desativado_em
  )
  VALUES (
    v_caller_company,
    p_user_id,
    v_caller,
    true,
    now(),
    NULL
  )
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET ativo = true,
        desativado_em = NULL,
        designado_por = v_caller,
        created_at = now();

  -- Se houver denúncias em aberto sem responsável na empresa, atribui a este novo designado
  UPDATE public.denuncias
  SET responsavel_id = p_user_id,
      atribuido_em = now()
  WHERE company_id = v_caller_company
    AND responsavel_id IS NULL
    AND status <> 'concluido';
END;
$function$;

-- 7. RPC remover_responsavel_denuncia(p_user_id, p_transferir_para)
CREATE OR REPLACE FUNCTION public.remover_responsavel_denuncia(
  p_user_id uuid,
  p_transferir_para uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_destino uuid := p_transferir_para;
  v_has_open boolean;
  v_rec record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := public.get_my_role();
  IF v_role NOT IN ('admin_empresa') AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_caller AND ur.role = 'admin_empresa'
  ) THEN
    RAISE EXCEPTION 'forbidden_apenas_admin_empresa';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_caller LIMIT 1;

  -- Verifica se há denúncias abertas atribuídas a este usuário
  SELECT EXISTS (
    SELECT 1 FROM public.denuncias
    WHERE company_id = v_company
      AND responsavel_id = p_user_id
      AND status <> 'concluido'
  ) INTO v_has_open;

  IF v_has_open THEN
    IF v_destino IS NULL THEN
      -- Seleciona o designado ativo mais antigo restante como destino default
      SELECT user_id INTO v_destino
      FROM public.denuncias_responsaveis
      WHERE company_id = v_company
        AND ativo = true
        AND user_id <> p_user_id
      ORDER BY created_at ASC
      LIMIT 1;

      IF v_destino IS NULL THEN
        RAISE EXCEPTION 'nenhum_designado_restante';
      END IF;
    ELSE
      -- Valida se v_destino é um designado ativo da mesma empresa
      IF NOT EXISTS (
        SELECT 1 FROM public.denuncias_responsaveis
        WHERE company_id = v_company AND user_id = v_destino AND ativo = true
      ) THEN
        RAISE EXCEPTION 'destino_invalido';
      END IF;
    END IF;

    -- Transfere as denúncias abertas e registra no histórico de auditoria
    FOR v_rec IN (
      SELECT id, status FROM public.denuncias
      WHERE company_id = v_company
        AND responsavel_id = p_user_id
        AND status <> 'concluido'
    ) LOOP
      UPDATE public.denuncias
      SET responsavel_id = v_destino,
          transferido_de = p_user_id,
          atribuido_em = now(),
          updated_at = now()
      WHERE id = v_rec.id;

      INSERT INTO public.denuncias_historico (
        denuncia_id,
        company_id,
        alterado_por,
        status_anterior,
        status_novo,
        justificativa
      )
      VALUES (
        v_rec.id,
        v_company,
        v_caller,
        v_rec.status,
        v_rec.status,
        'Transferida por desligamento/remocao do responsavel anterior'
      );
    END LOOP;
  END IF;

  -- Desativa o responsável
  UPDATE public.denuncias_responsaveis
  SET ativo = false,
      desativado_em = now()
  WHERE company_id = v_company
    AND user_id = p_user_id;
END;
$function$;

-- 8. Recriar criar_denuncia com atribuição ao designado mais antigo
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
  v_resp uuid;
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

  -- Busca o responsável ativo mais antigo da empresa
  SELECT user_id INTO v_resp
  FROM public.denuncias_responsaveis
  WHERE company_id = v_company AND ativo = true
  ORDER BY created_at ASC
  LIMIT 1;

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
    atribuido_em
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
    v_resp,
    CASE WHEN v_resp IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 9. Recriar listar_denuncias_admin() — SÓ os designados veem; admin_master e admin_empresa recebem forbidden
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
  atribuido_em timestamptz
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

  -- Exclusividade absoluta: somente responsáveis designados ativos da empresa podem listar denúncias
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
    d.atribuido_em
  FROM public.denuncias d
  WHERE d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$;

-- 10. Recriar atualizar_status_denuncia(...) — Só o responsável designado e atribuído
CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(
  p_id uuid,
  p_novo_status text,
  p_justificativa text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_target_company uuid;
  v_status_ant text;
  v_resp_den uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_novo_status NOT IN ('novo','em_analise','concluido') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT d.company_id, d.status, d.responsavel_id
  INTO v_target_company, v_status_ant, v_resp_den
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Se a denúncia já está sob responsabilidade de outro membro designado, bloqueia
  IF v_resp_den IS NOT NULL AND v_resp_den <> v_user THEN
    RAISE EXCEPTION 'denuncia_atribuida_a_outro_responsavel';
  END IF;

  UPDATE public.denuncias
  SET status = p_novo_status,
      responsavel_id = COALESCE(responsavel_id, v_user),
      atribuido_em = COALESCE(atribuido_em, now()),
      updated_at = now()
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
    v_target_company,
    v_user,
    v_status_ant,
    p_novo_status,
    p_justificativa
  );
END;
$function$;

-- 11. Recriar registrar_ciencia_cipa(...) — Só designado ativo da empresa
CREATE OR REPLACE FUNCTION public.registrar_ciencia_cipa(p_denuncia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_target_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT d.company_id INTO v_target_company
  FROM public.denuncias d
  WHERE d.id = p_denuncia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.denuncias
  SET ciencia_cipa_em = now(),
      ciencia_cipa_por = v_user,
      updated_at = now()
  WHERE id = p_denuncia_id;

  INSERT INTO public.denuncias_historico (
    denuncia_id,
    company_id,
    alterado_por,
    status_anterior,
    status_novo,
    justificativa
  )
  VALUES (
    p_denuncia_id,
    v_target_company,
    v_user,
    NULL,
    'ciencia_cipa',
    'Ciencia legal CAT/SINAN registrada'
  );
END;
$function$;

-- 12. Recriar listar_historico_denuncia(...) — Só designado ativo da empresa
CREATE OR REPLACE FUNCTION public.listar_historico_denuncia(p_denuncia_id uuid)
RETURNS TABLE (
  id uuid,
  status_anterior text,
  status_novo text,
  justificativa text,
  alterado_por uuid,
  alterado_por_nome text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_target_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  IF NOT public.e_responsavel_denuncia(v_user, v_company) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT d.company_id INTO v_target_company
  FROM public.denuncias d
  WHERE d.id = p_denuncia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    h.id,
    h.status_anterior,
    h.status_novo,
    h.justificativa,
    h.alterado_por,
    COALESCE(
      (SELECT c.full_name::text FROM public.colaboradores c WHERE c.user_id = h.alterado_por LIMIT 1),
      (SELECT p.full_name::text FROM public.profiles p WHERE p.user_id = h.alterado_por LIMIT 1),
      (SELECT u.email::text FROM auth.users u WHERE u.id = h.alterado_por LIMIT 1),
      'Usuário'
    ) AS alterado_por_nome,
    h.created_at
  FROM public.denuncias_historico h
  WHERE h.denuncia_id = p_denuncia_id
  ORDER BY h.created_at DESC;
END;
$function$;

-- 13. RPC contagem_denuncias_sem_responsavel() para alerta ao admin_empresa (sem conteúdo)
CREATE OR REPLACE FUNCTION public.contagem_denuncias_sem_responsavel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_sem_resp integer := 0;
  v_em_aberto integer := 0;
  v_tem_designados boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := public.get_my_role();
  IF v_role NOT IN ('admin_empresa', 'admin_master') AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user AND ur.role IN ('admin_empresa', 'admin_master')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;

  SELECT count(*) INTO v_sem_resp
  FROM public.denuncias d
  WHERE (v_role = 'admin_master' OR d.company_id = v_company)
    AND d.responsavel_id IS NULL
    AND d.status <> 'concluido';

  SELECT count(*) INTO v_em_aberto
  FROM public.denuncias d
  WHERE (v_role = 'admin_master' OR d.company_id = v_company)
    AND d.status <> 'concluido';

  SELECT EXISTS (
    SELECT 1 FROM public.denuncias_responsaveis dr
    WHERE (v_role = 'admin_master' OR dr.company_id = v_company)
      AND dr.ativo = true
  ) INTO v_tem_designados;

  RETURN jsonb_build_object(
    'total_sem_responsavel', v_sem_resp,
    'total_em_aberto', v_em_aberto,
    'tem_designados', v_tem_designados
  );
END;
$function$;
