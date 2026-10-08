-- =============================================================================
-- Cuidar+ — Ciclo de correção do escopo do GESTOR (aprovado)
--  a) get_pulse_colaboradores_list: aceita gestor_departamento (só subordinados
--     diretos via get_my_colaborador_id; vazio se nulo). Demais roles → VAZIO
--     (antes: RAISE 'Acesso negado', mascarado no front como "0 colaboradores").
--     Admin/analista: mesma query; adicionado apenas o gate de tenant
--     (p_company_id deve ser a empresa do chamador; admin_master livre).
--  b) get_pulse_campaign_stats: gate de role + tenant + escopo do gestor.
--  c) trigger_pulse_acompanhamento_critico: threshold corrigido para a escala
--     real 0–100 (score_numeric = resposta/5*100) → crítico = score_numeric <= 40
--     (respostas 0 "Muito Mal", 1 "Mal", 2 "Regular").
--  d) Backfill pontual e idempotente da resposta de 08/10 do colaborador
--     14e3f03e-… na campanha 7b6e6fd0-… (score 20.00).
-- Sem recursão de RLS: todas as funções são SECURITY DEFINER e leem tabelas
-- base diretamente; nenhuma policy é alterada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- a) get_pulse_colaboradores_list
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pulse_colaboradores_list(
  p_company_id uuid,
  p_department text DEFAULT NULL::text
)
RETURNS TABLE(
  employee_id uuid, nome text, departamento character varying, cargo character varying,
  foto_url text, total_respostas bigint, media_geral numeric,
  ultima_resposta timestamp with time zone, esferas_identificadas text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_gestor_id UUID;
BEGIN
  -- Fail-closed: role desconhecida/nula → vazio
  v_role := public.get_my_role()::TEXT;
  IF v_role IS NULL OR v_role NOT IN ('admin_master','admin_empresa','analista_rh','gestor_departamento') THEN
    RETURN;
  END IF;

  -- Fail-closed: tenant (admin_master pode consultar qualquer empresa)
  IF v_role <> 'admin_master' THEN
    IF p_company_id IS NULL OR p_company_id IS DISTINCT FROM public.get_my_company_id() THEN
      RETURN;
    END IF;
  END IF;

  -- Fail-closed: gestor sem vínculo de colaborador → vazio (nunca empresa toda)
  IF v_role = 'gestor_departamento' THEN
    v_gestor_id := public.get_my_colaborador_id();
    IF v_gestor_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS employee_id,
    c.full_name::TEXT AS nome,
    c.department AS departamento,
    c.job_title AS cargo,
    c.avatar_url AS foto_url,
    COUNT(DISTINCT pr.id) AS total_respostas,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER ELSE NULL END
    )::NUMERIC, 2) AS media_geral,
    MAX(pr.created_at) AS ultima_resposta,
    ARRAY_AGG(DISTINCT pr.esfera) FILTER (WHERE pr.esfera IS NOT NULL) AS esferas_identificadas
  FROM public.colaboradores c
  LEFT JOIN public.pulse_responses pr ON c.id = pr.employee_id
  LEFT JOIN public.pulse_questions pq ON pr.question_id = pq.id
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'
    AND (v_role <> 'gestor_departamento' OR c.gestor_id = v_gestor_id)
    AND (p_department IS NULL OR c.department = p_department)
  GROUP BY c.id, c.full_name, c.department, c.job_title, c.avatar_url
  ORDER BY c.full_name ASC;
END;
$function$;

-- -----------------------------------------------------------------------------
-- b) get_pulse_campaign_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_stats(p_campaign_id uuid)
RETURNS TABLE(
  total_responses bigint, avg_score numeric, participation_rate numeric,
  score_distribution jsonb, ambiente_breakdown jsonb, department_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_company_id UUID;
  v_campaign_company UUID;
  v_gestor_id UUID;
  v_scope UUID[];            -- NULL = empresa toda; array = subordinados do gestor
  v_total_colaboradores BIGINT;
  v_audiencia_tipo VARCHAR;
  v_total_responses BIGINT;
BEGIN
  -- Fail-closed: role
  v_role := public.get_my_role()::TEXT;
  IF v_role IS NULL OR v_role NOT IN ('admin_master','admin_empresa','analista_rh','gestor_departamento') THEN
    RETURN;
  END IF;

  -- Fail-closed: campanha precisa existir
  SELECT pc.company_id, pc.audiencia_tipo
    INTO v_campaign_company, v_audiencia_tipo
  FROM public.pulse_campaigns pc
  WHERE pc.id = p_campaign_id;

  IF v_campaign_company IS NULL THEN
    RETURN;
  END IF;

  -- Fail-closed: tenant
  IF v_role = 'admin_master' THEN
    v_company_id := v_campaign_company;
  ELSE
    v_company_id := public.get_my_company_id();
    IF v_company_id IS NULL OR v_company_id <> v_campaign_company THEN
      RETURN;
    END IF;
  END IF;

  -- Fail-closed: escopo do gestor (subordinados diretos)
  IF v_role = 'gestor_departamento' THEN
    v_gestor_id := public.get_my_colaborador_id();
    IF v_gestor_id IS NULL THEN
      RETURN;
    END IF;
    SELECT COALESCE(array_agg(c.id), ARRAY[]::UUID[])
      INTO v_scope
    FROM public.colaboradores c
    WHERE c.gestor_id = v_gestor_id
      AND c.company_id = v_company_id;
  END IF;

  -- Público-alvo (lógica original preservada; acrescenta o escopo).
  -- Correção: o enum colaborador_status usa 'ATIVO'; o literal 'ativo' da
  -- versão anterior gerava 22P02 em toda chamada.
  IF v_audiencia_tipo = 'departamentos' THEN
    SELECT COUNT(DISTINCT c.id) INTO v_total_colaboradores
    FROM public.colaboradores c
    WHERE c.company_id = v_company_id
      AND c.status = 'ATIVO'
      AND (v_scope IS NULL OR c.id = ANY(v_scope))
      AND LOWER(TRIM(c.department)) IN (
        SELECT LOWER(TRIM(a.departamento_nome))
        FROM public.pulse_campaigns_alvos a
        WHERE a.campaign_id = p_campaign_id
      );
  ELSE
    SELECT COUNT(DISTINCT c.id) INTO v_total_colaboradores
    FROM public.colaboradores c
    WHERE c.company_id = v_company_id
      AND c.status = 'ATIVO'
      AND (v_scope IS NULL OR c.id = ANY(v_scope));
  END IF;

  SELECT COUNT(DISTINCT pr.employee_id) INTO v_total_responses
  FROM public.pulse_responses pr
  WHERE pr.campaign_id = p_campaign_id
    AND (v_scope IS NULL OR pr.employee_id = ANY(v_scope));

  RETURN QUERY
  SELECT
    v_total_responses AS total_responses,
    ROUND(AVG(CASE WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC ELSE NULL END), 2) AS avg_score,
    ROUND((v_total_responses::NUMERIC / NULLIF(v_total_colaboradores, 0)) * 100, 1) AS participation_rate,
    (
      SELECT jsonb_object_agg(s.score, s.count)
      FROM (
        SELECT pr2.resposta AS score, COUNT(*) AS count
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
          AND (v_scope IS NULL OR pr2.employee_id = ANY(v_scope))
        GROUP BY pr2.resposta
      ) s
    ) AS score_distribution,
    (
      SELECT jsonb_object_agg(a.ambiente, a.count)
      FROM (
        -- Correção: pulse_responses não possui coluna 'ambiente' (gerava 42703);
        -- a dimensão equivalente é 'esfera' (pessoal/trabalho). Nome do campo mantido.
        SELECT pr2.esfera::TEXT AS ambiente, COUNT(DISTINCT pr2.employee_id) AS count
        FROM public.pulse_responses pr2
        WHERE pr2.campaign_id = p_campaign_id
          AND (v_scope IS NULL OR pr2.employee_id = ANY(v_scope))
        GROUP BY pr2.esfera
      ) a
    ) AS ambiente_breakdown,
    -- Trava de anonimato unificada (inalterada)
    CASE
      WHEN v_total_responses < 5 THEN NULL
      ELSE (
        SELECT jsonb_object_agg(d.department, d.avg_score)
        FROM (
          SELECT c2.department, ROUND(AVG(pr2.resposta::NUMERIC), 2) AS avg_score
          FROM public.pulse_responses pr2
          JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
          JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
          WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
            AND (v_scope IS NULL OR pr2.employee_id = ANY(v_scope))
          GROUP BY c2.department
        ) d
      )
    END AS department_breakdown
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.campaign_id = p_campaign_id
    AND (v_scope IS NULL OR pr.employee_id = ANY(v_scope));
END;
$function$;

-- -----------------------------------------------------------------------------
-- c) Trigger: threshold na escala real 0–100
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_pulse_acompanhamento_critico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_gestor_user_id UUID;
BEGIN
  -- score_numeric está na escala 0–100 (resposta/5*100).
  -- Crítico = score_numeric <= 40 (respostas 0, 1, 2 na escala 0–5).
  IF NEW.score_numeric IS NULL OR NEW.score_numeric > 40 THEN
    RETURN NEW;
  END IF;

  SELECT c.company_id, c.id, gestor.user_id
    INTO v_company_id, v_colaborador_id, v_gestor_user_id
  FROM public.colaboradores c
  LEFT JOIN public.colaboradores gestor ON gestor.id = c.gestor_id
  WHERE c.id = NEW.employee_id;

  IF v_gestor_user_id IS NULL THEN
    -- Log sem PII (só o id técnico da resposta)
    RAISE NOTICE 'Nenhum gestor encontrado para o colaborador no pulso (%). Acompanhamento automatico pulado.', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.pulse_acompanhamentos (
    company_id, colaborador_id, pulse_response_id, responsavel_id, status, criado_por, created_at
  ) VALUES (
    v_company_id, v_colaborador_id, NEW.id, v_gestor_user_id, 'novo', 'sistema', now()
  )
  ON CONFLICT (pulse_response_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- d) Backfill pontual e idempotente (somente a resposta de 08/10 do colaborador
--    14e3f03e-… na campanha 7b6e6fd0-…). responsavel_id = user_id do gestor
--    (mesma regra do trigger e das policies: responsavel_id = auth.uid()).
-- -----------------------------------------------------------------------------
INSERT INTO public.pulse_acompanhamentos (
  company_id, colaborador_id, pulse_response_id, responsavel_id, status, criado_por, created_at
)
SELECT c.company_id, c.id, pr.id, g.user_id, 'novo', 'sistema', now()
FROM public.pulse_responses pr
JOIN public.colaboradores c ON c.id = pr.employee_id
JOIN public.colaboradores g ON g.id = c.gestor_id
WHERE pr.employee_id = '14e3f03e-1a8f-4a94-be29-48ec04bbb6d9'
  AND pr.campaign_id = '7b6e6fd0-1bff-4dc0-8ab1-4560f4e3d203'
  AND pr.score_numeric <= 40
  AND g.id = '6e375b77-493f-49a9-ae83-2b8f0b97274a'
  AND g.user_id IS NOT NULL
ON CONFLICT (pulse_response_id) DO NOTHING;
