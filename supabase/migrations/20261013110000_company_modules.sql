-- ============================================================================
-- MIGRATION: 20261013110000_company_modules.sql
-- OBJETIVO:
--   1. Criar tabela catalogo_modulos (Fonte da verdade do catálogo)
--   2. Criar tabela company_modules (Governança comercial por empresa / Modelo Solides)
--   3. Configurar RLS: Gravação restrita a super_admin; Leitura para a própria empresa
--   4. Seed / Backfill da Horizonte Contabilidade (e empresas ativas)
--   5. Trigger trg_new_company_modules para provisionar novas empresas automaticamente
--   6. Helper is_module_enabled(p_company_id, p_module_key)
--   7. Reescrita da RPC get_visible_modules(p_company_id) em cascata
--   8. Guards de mutação do servidor (Triggers e RPCs de escrita)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DE CATÁLOGO DOS MÓDULOS CONTRATÁVEIS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_modulos (
  module_key text PRIMARY KEY,
  nome text NOT NULL,
  pilar text NOT NULL,
  rota_principal text NOT NULL,
  sub_rotas text[] NOT NULL DEFAULT '{}',
  is_base boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- População oficial dos 15 módulos canônicos
INSERT INTO public.catalogo_modulos (module_key, nome, pilar, rota_principal, sub_rotas, is_base, ordem, ativo)
VALUES
  ('/colaboradores', 'Colaboradores', 'Departamento Pessoal', '/colaboradores', ARRAY['/ficha-profissional'], true, 1, true),
  ('/ferias', 'Gestão de Férias', 'Departamento Pessoal', '/ferias', ARRAY['/minhas-ferias'], false, 2, true),
  ('/demissoes', 'Demissões & Desligamentos', 'Departamento Pessoal', '/demissoes', '{}'::text[], false, 3, true),
  ('/beneficios', 'Benefícios Corporativos', 'Departamento Pessoal', '/beneficios', '{}'::text[], false, 4, true),
  ('/minhas-tarefas', 'Tarefas & Produtividade', 'Departamento Pessoal', '/minhas-tarefas', ARRAY['/minhas-atividades'], false, 5, true),
  ('/comunicados', 'Mural de Comunicados', 'Departamento Pessoal', '/comunicados', '{}'::text[], false, 6, true),
  ('/avaliacoes', 'Avaliação de Desempenho', 'Desenvolvimento & Performance', '/avaliacoes', ARRAY['/pdi', '/avaliacao/preencher', '/avaliacao/resultado'], false, 7, true),
  ('/feedback-gestao', 'Feedback Contínuo & 1:1', 'Desenvolvimento & Performance', '/feedback-gestao', ARRAY['/feedback'], false, 8, true),
  ('/diario-bordo', 'Diário de Bordo', 'Desenvolvimento & Performance', '/diario-bordo', '{}'::text[], false, 9, true),
  ('/treinamentos', 'Treinamentos & LXP', 'Desenvolvimento & Performance', '/treinamentos', ARRAY['/treinamento', '/validar-certificado'], false, 10, true),
  ('/cuidar-mais', 'Cuidar+ (Clima & Riscos Psicossociais)', 'Saúde Mental & Psicossocial', '/cuidar-mais', ARRAY['/cuidar-mais-form'], false, 11, true),
  ('/mapa-riscos-nr1', 'Mapa de Riscos NR-1 & PGR', 'Saúde & Segurança Ocupacional', '/mapa-riscos-nr1', ARRAY['/laudo'], false, 12, true),
  ('/estrutura-organizacional', 'Estrutura Organizacional', 'Governança & Organização', '/estrutura-organizacional', ARRAY['/organograma'], false, 13, true),
  ('/relatorios-executivos', 'Relatórios Executivos', 'Inteligência & Gestão', '/relatorios-executivos', ARRAY['/relatorios'], false, 14, true),
  ('/denuncias', 'Canal de Denúncias & Fale Conosco', 'Compliance & Integridade', '/denuncias', ARRAY['/comportamentos-ofensivos'], false, 15, true)
ON CONFLICT (module_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  pilar = EXCLUDED.pilar,
  rota_principal = EXCLUDED.rota_principal,
  sub_rotas = EXCLUDED.sub_rotas,
  is_base = EXCLUDED.is_base,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo;

ALTER TABLE public.catalogo_modulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer autenticado pode ler catalogo_modulos" ON public.catalogo_modulos;
CREATE POLICY "Qualquer autenticado pode ler catalogo_modulos"
  ON public.catalogo_modulos FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. TABELA COMPANY_MODULES (GOVERNANÇA COMERCIAL B2B)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES public.catalogo_modulos(module_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_modules_unique UNIQUE (company_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_lookup 
  ON public.company_modules (company_id, module_key, enabled);

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- Gravação: Apenas Super Admin da Plataforma
DROP POLICY IF EXISTS "Super admin can manage company_modules" ON public.company_modules;
CREATE POLICY "Super admin can manage company_modules"
  ON public.company_modules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Leitura: Usuários da empresa ou Super Admin
DROP POLICY IF EXISTS "Users can read company_modules for their company" ON public.company_modules;
CREATE POLICY "Users can read company_modules for their company"
  ON public.company_modules
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    company_id = (SELECT c.company_id FROM public.profiles c WHERE c.user_id = auth.uid() LIMIT 1)
  );

-- ----------------------------------------------------------------------------
-- 3. SEED / BACKFILL DA EMPRESA PILOTO (HORIZONTE CONTABILIDADE)
-- ----------------------------------------------------------------------------
INSERT INTO public.company_modules (company_id, module_key, enabled)
SELECT '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'::uuid, c.module_key, true
FROM public.catalogo_modulos c
WHERE c.ativo = true
ON CONFLICT (company_id, module_key) DO UPDATE SET enabled = true;

-- Provisiona qualquer outra empresa ativa existente
INSERT INTO public.company_modules (company_id, module_key, enabled)
SELECT cmp.id, c.module_key, true
FROM public.companies cmp
CROSS JOIN public.catalogo_modulos c
WHERE c.ativo = true
ON CONFLICT (company_id, module_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. TRIGGER DE PROVISIONAMENTO AUTOMÁTICO EM NOVAS EMPRESAS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_company_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.company_modules (company_id, module_key, enabled)
  SELECT NEW.id, c.module_key, true
  FROM public.catalogo_modulos c
  WHERE c.ativo = true
  ON CONFLICT (company_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_company_modules ON public.companies;
CREATE TRIGGER trg_new_company_modules
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_modules();

-- ----------------------------------------------------------------------------
-- 5. HELPER FUNCTION: is_module_enabled(company_id, module_key)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_module_enabled(p_company_id uuid, p_module_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enabled boolean;
  v_parent_key text;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN true;
  END IF;

  -- 1. Verifica se p_module_key é sub-rota mapeada
  SELECT c.module_key INTO v_parent_key
  FROM public.catalogo_modulos c
  WHERE p_module_key = ANY(c.sub_rotas)
  LIMIT 1;

  -- 2. Consulta o status do módulo pai ou da chave informada
  SELECT cm.enabled INTO v_enabled
  FROM public.company_modules cm
  WHERE cm.company_id = p_company_id
    AND cm.module_key = COALESCE(v_parent_key, p_module_key);

  -- Fallback: sem registro = ligado (true)
  RETURN COALESCE(v_enabled, true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. REESCRITA DA RPC get_visible_modules EM CASCATA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_visible_modules(p_company_id uuid)
RETURNS TABLE (module_key text, visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_role app_role;
    v_is_super boolean;
    v_my_company_id uuid;
BEGIN
    SELECT has_role(auth.uid(), 'super_admin') INTO v_is_super;

    -- 1. Super Admin vê tudo, sempre
    IF v_is_super THEN
        RETURN QUERY
        SELECT c.module_key, true
        FROM public.catalogo_modulos c
        WHERE c.ativo = true
        UNION
        SELECT unnest(c.sub_rotas), true
        FROM public.catalogo_modulos c
        WHERE c.ativo = true AND array_length(c.sub_rotas, 1) > 0;
        RETURN;
    END IF;

    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    SELECT company_id INTO v_my_company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

    -- Multi-tenant boundary
    IF v_my_company_id IS NULL OR v_my_company_id != p_company_id THEN
        RETURN;
    END IF;

    -- Avaliação em cascata:
    -- Camada 1: company_modules.enabled
    -- Camada 2: module_visibility.visible (para não-admins)
    RETURN QUERY
    WITH cascata_principal AS (
      SELECT 
        c.module_key,
        c.sub_rotas,
        COALESCE(cm.enabled, true) AS empresa_habilitou,
        mv.visible AS papel_visivel
      FROM public.catalogo_modulos c
      LEFT JOIN public.company_modules cm 
        ON cm.company_id = p_company_id AND cm.module_key = c.module_key
      LEFT JOIN public.module_visibility mv
        ON mv.company_id = p_company_id AND mv.module_key = c.module_key AND mv.role = v_user_role
      WHERE c.ativo = true
    ),
    resultado_calculado AS (
      SELECT 
        cp.module_key,
        CASE
          -- Se a empresa desligou o módulo, NINGUÉM vê (inclusive admin_empresa)
          WHEN cp.empresa_habilitou = false THEN false
          -- Se está ligado na empresa: admins veem tudo contratado
          WHEN v_user_role IN ('admin_empresa', 'admin_master') THEN true
          -- demais papéis respeitam module_visibility (se explicitamente false, false; senão true)
          ELSE COALESCE(cp.papel_visivel, true)
        END AS visibilidade_final,
        cp.sub_rotas
      FROM cascata_principal cp
    )
    SELECT rc.module_key, rc.visibilidade_final
    FROM resultado_calculado rc
    UNION ALL
    SELECT unnest(rc.sub_rotas), rc.visibilidade_final
    FROM resultado_calculado rc
    WHERE array_length(rc.sub_rotas, 1) > 0;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. GUARDS NO SERVIDOR (SERVER ENFORCEMENT - OPERAÇÕES DE MUTAÇÃO)
-- ----------------------------------------------------------------------------

-- Função genérica de verificação disparada por triggers de mutação
CREATE OR REPLACE FUNCTION public.check_module_enabled_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_module_key text := TG_ARGV[0];
  v_company_id uuid;
BEGIN
  v_company_id := NEW.company_id;
  
  IF v_company_id IS NOT NULL AND NOT public.is_module_enabled(v_company_id, v_module_key) THEN
    RAISE EXCEPTION 'Operação bloqueada: o módulo "%" não está contratado para esta empresa.', v_module_key
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$;

-- A) Módulo Avaliação de Desempenho (/avaliacoes)
DROP TRIGGER IF EXISTS trg_guard_ciclos_avaliacao ON public.ciclos_avaliacao;
CREATE TRIGGER trg_guard_ciclos_avaliacao
  BEFORE INSERT OR UPDATE ON public.ciclos_avaliacao
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/avaliacoes');

-- B) Módulo Cuidar+ / Riscos Psicossociais (/cuidar-mais)
DROP TRIGGER IF EXISTS trg_guard_pulse_campaigns ON public.pulse_campaigns;
CREATE TRIGGER trg_guard_pulse_campaigns
  BEFORE INSERT OR UPDATE ON public.pulse_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/cuidar-mais');

DROP TRIGGER IF EXISTS trg_guard_questionarios_cuidar_plus ON public.questionarios_cuidar_plus;
CREATE TRIGGER trg_guard_questionarios_cuidar_plus
  BEFORE INSERT OR UPDATE ON public.questionarios_cuidar_plus
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/cuidar-mais');

-- C) Módulo Mapa de Riscos NR-1 & PGR (/mapa-riscos-nr1)
DROP TRIGGER IF EXISTS trg_guard_pgr_importacoes ON public.pgr_importacoes;
CREATE TRIGGER trg_guard_pgr_importacoes
  BEFORE INSERT OR UPDATE ON public.pgr_importacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/mapa-riscos-nr1');

DROP TRIGGER IF EXISTS trg_guard_checklist_aplicacoes ON public.checklist_aplicacoes;
CREATE TRIGGER trg_guard_checklist_aplicacoes
  BEFORE INSERT OR UPDATE ON public.checklist_aplicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/mapa-riscos-nr1');

-- D) Módulo Feedback 1:1 (/feedback-gestao)
DROP TRIGGER IF EXISTS trg_guard_feedback_cycles ON public.feedback_cycles;
CREATE TRIGGER trg_guard_feedback_cycles
  BEFORE INSERT OR UPDATE ON public.feedback_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/feedback-gestao');

-- E) Módulo Treinamentos (/treinamentos)
DROP TRIGGER IF EXISTS trg_guard_treinamentos ON public.treinamentos;
CREATE TRIGGER trg_guard_treinamentos
  BEFORE INSERT OR UPDATE ON public.treinamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/treinamentos');

-- F) Módulo Benefícios (/beneficios)
DROP TRIGGER IF EXISTS trg_guard_beneficios ON public.beneficios;
CREATE TRIGGER trg_guard_beneficios
  BEFORE INSERT OR UPDATE ON public.beneficios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/beneficios');

-- G) Módulo Demissões (/demissoes)
DROP TRIGGER IF EXISTS trg_guard_desligamentos_colaborador ON public.desligamentos_colaborador;
CREATE TRIGGER trg_guard_desligamentos_colaborador
  BEFORE INSERT OR UPDATE ON public.desligamentos_colaborador
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/demissoes');

-- H) Módulo Gestão de Férias (/ferias)
DROP TRIGGER IF EXISTS trg_guard_ferias_periodos ON public.ferias_periodos_aquisitivos;
CREATE TRIGGER trg_guard_ferias_periodos
  BEFORE INSERT OR UPDATE ON public.ferias_periodos_aquisitivos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/ferias');

DROP TRIGGER IF EXISTS trg_guard_ferias_gozo ON public.ferias_gozo;
CREATE TRIGGER trg_guard_ferias_gozo
  BEFORE INSERT OR UPDATE ON public.ferias_gozo
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/ferias');

-- I) Módulo Comunicados (/comunicados)
DROP TRIGGER IF EXISTS trg_guard_comunicados ON public.comunicados;
CREATE TRIGGER trg_guard_comunicados
  BEFORE INSERT OR UPDATE ON public.comunicados
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/comunicados');

-- J) Módulo Minhas Tarefas (/minhas-tarefas)
DROP TRIGGER IF EXISTS trg_guard_tasks ON public.tasks;
CREATE TRIGGER trg_guard_tasks
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/minhas-tarefas');

-- K) Módulo Canal de Denúncias & Fale Conosco (/denuncias)
DROP TRIGGER IF EXISTS trg_guard_denuncias ON public.denuncias;
CREATE TRIGGER trg_guard_denuncias
  BEFORE INSERT OR UPDATE ON public.denuncias
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/denuncias');

-- L) Módulo Relatórios Executivos (/relatorios-executivos)
DROP TRIGGER IF EXISTS trg_guard_relatorios_salvos ON public.relatorios_executivos_salvos;
CREATE TRIGGER trg_guard_relatorios_salvos
  BEFORE INSERT OR UPDATE ON public.relatorios_executivos_salvos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_module_enabled_trigger('/relatorios-executivos');

-- ----------------------------------------------------------------------------
-- 8. GUARDS ADICIONAIS EM RPCS DE REPLICAÇÃO
-- ----------------------------------------------------------------------------

-- Replicação de Campanha de Pulso (Cuidar+)
CREATE OR REPLACE FUNCTION public.replicate_pulse_campaign(
  p_source_campaign_id UUID,
  p_source_company_id UUID,
  p_target_company_ids UUID[]
)
RETURNS TABLE (
  target_company_id UUID,
  new_campaign_id UUID,
  status TEXT,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID;
  v_source_campaign RECORD;
  v_new_campaign_id UUID;
  v_question RECORD;
  v_new_question_id UUID;
BEGIN
  IF NOT public.is_module_enabled(p_source_company_id, '/cuidar-mais') THEN
    RAISE EXCEPTION 'Módulo Cuidar+ não está contratado para a empresa de origem.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_source_campaign
  FROM public.pulse_campaigns
  WHERE id = p_source_campaign_id AND company_id = p_source_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha de origem não encontrada ou não pertence à empresa de origem';
  END IF;

  FOREACH v_target_id IN ARRAY p_target_company_ids
  LOOP
    BEGIN
      IF NOT public.is_module_enabled(v_target_id, '/cuidar-mais') THEN
        target_company_id := v_target_id;
        new_campaign_id := NULL;
        status := 'SKIPPED';
        error_message := 'Módulo Cuidar+ não contratado para a empresa de destino';
        RETURN NEXT;
        CONTINUE;
      END IF;

      INSERT INTO public.pulse_campaigns (
        company_id, title, description, start_date, end_date,
        is_active, survey_type, recurrence, send_time, send_day_of_week
      ) VALUES (
        v_target_id,
        v_source_campaign.title,
        v_source_campaign.description,
        v_source_campaign.start_date,
        v_source_campaign.end_date,
        false,
        v_source_campaign.survey_type,
        v_source_campaign.recurrence,
        v_source_campaign.send_time,
        v_source_campaign.send_day_of_week
      ) RETURNING id INTO v_new_campaign_id;

      FOR v_question IN
        SELECT * FROM public.pulse_questions
        WHERE campaign_id = p_source_campaign_id
        ORDER BY question_order
      LOOP
        INSERT INTO public.pulse_questions (
          campaign_id, question_text, question_type, question_order, is_required
        ) VALUES (
          v_new_campaign_id,
          v_question.question_text,
          v_question.question_type,
          v_question.question_order,
          v_question.is_required
        );
      END LOOP;

      target_company_id := v_target_id;
      new_campaign_id := v_new_campaign_id;
      status := 'SUCCESS';
      error_message := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      target_company_id := v_target_id;
      new_campaign_id := NULL;
      status := 'ERROR';
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Replicação de Ciclo de Avaliação (/avaliacoes)
CREATE OR REPLACE FUNCTION public.replicate_ciclo_avaliacao(
  p_source_ciclo_id UUID,
  p_source_company_id UUID,
  p_target_company_ids UUID[]
)
RETURNS TABLE (
  target_company_id UUID,
  new_ciclo_id UUID,
  status TEXT,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID;
  v_source_ciclo RECORD;
  v_new_ciclo_id UUID;
  v_comp RECORD;
  v_obj RECORD;
BEGIN
  IF NOT public.is_module_enabled(p_source_company_id, '/avaliacoes') THEN
    RAISE EXCEPTION 'Módulo Avaliação de Desempenho não está contratado para a empresa de origem.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_source_ciclo
  FROM public.ciclos_avaliacao
  WHERE id = p_source_ciclo_id AND company_id = p_source_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo de origem não encontrado';
  END IF;

  FOREACH v_target_id IN ARRAY p_target_company_ids
  LOOP
    BEGIN
      IF NOT public.is_module_enabled(v_target_id, '/avaliacoes') THEN
        target_company_id := v_target_id;
        new_ciclo_id := NULL;
        status := 'SKIPPED';
        error_message := 'Módulo Avaliação de Desempenho não contratado para a empresa de destino';
        RETURN NEXT;
        CONTINUE;
      END IF;

      INSERT INTO public.ciclos_avaliacao (
        company_id, titulo, descricao, tipo, data_inicio, data_fim,
        status, peso_autoavaliacao, peso_gestor, peso_pares, peso_liderados,
        permite_pdi, exige_consenso
      ) VALUES (
        v_target_id,
        v_source_ciclo.titulo,
        v_source_ciclo.descricao,
        v_source_ciclo.tipo,
        v_source_ciclo.data_inicio,
        v_source_ciclo.data_fim,
        'RASCUNHO',
        v_source_ciclo.peso_autoavaliacao,
        v_source_ciclo.peso_gestor,
        v_source_ciclo.peso_pares,
        v_source_ciclo.peso_liderados,
        v_source_ciclo.permite_pdi,
        v_source_ciclo.exige_consenso
      ) RETURNING id INTO v_new_ciclo_id;

      FOR v_comp IN
        SELECT * FROM public.competencias_ciclo
        WHERE ciclo_id = p_source_ciclo_id
      LOOP
        INSERT INTO public.competencias_ciclo (
          ciclo_id, nome, descricao, categoria, peso, ordem
        ) VALUES (
          v_new_ciclo_id,
          v_comp.nome,
          v_comp.descricao,
          v_comp.categoria,
          v_comp.peso,
          v_comp.ordem
        );
      END LOOP;

      FOR v_obj IN
        SELECT * FROM public.objetivos_ciclo
        WHERE ciclo_id = p_source_ciclo_id
      LOOP
        INSERT INTO public.objetivos_ciclo (
          ciclo_id, titulo, descricao, meta, peso
        ) VALUES (
          v_new_ciclo_id,
          v_obj.titulo,
          v_obj.descricao,
          v_obj.meta,
          v_obj.peso
        );
      END LOOP;

      target_company_id := v_target_id;
      new_ciclo_id := v_new_ciclo_id;
      status := 'SUCCESS';
      error_message := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      target_company_id := v_target_id;
      new_ciclo_id := NULL;
      status := 'ERROR';
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;
