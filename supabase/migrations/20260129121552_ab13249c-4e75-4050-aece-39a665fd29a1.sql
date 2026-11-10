-- ============================================
-- GLOBAL REPLICATION FEATURE
-- Functions for cloning records across companies
-- ============================================

-- Table for audit logging of replications
CREATE TABLE IF NOT EXISTS public.replication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  record_type TEXT NOT NULL,
  source_record_id UUID NOT NULL,
  source_company_id UUID REFERENCES public.companies(id),
  target_company_id UUID REFERENCES public.companies(id),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.replication_logs ENABLE ROW LEVEL SECURITY;

-- Only admin_master can view replication logs
CREATE POLICY "Admin master can view replication logs"
ON public.replication_logs FOR SELECT
USING (get_my_role() = 'admin_master');

-- Only admin_master can insert replication logs
CREATE POLICY "Admin master can insert replication logs"
ON public.replication_logs FOR INSERT
WITH CHECK (get_my_role() = 'admin_master');

-- ============================================
-- Function: Count target companies for replication
-- ============================================
CREATE OR REPLACE FUNCTION public.count_replication_targets(p_source_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM companies 
  WHERE id != p_source_company_id AND status = 'active';
$$;

-- ============================================
-- Function: Replicate Pulse Campaign
-- ============================================
CREATE OR REPLACE FUNCTION public.replicate_pulse_campaign(
  p_campaign_id UUID,
  p_source_company_id UUID
)
RETURNS TABLE(company_name TEXT, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_company RECORD;
  v_new_campaign_id UUID;
  v_source_campaign RECORD;
  v_admin_user_id UUID;
BEGIN
  -- Permission check: only admin_master can replicate
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;
  
  v_admin_user_id := auth.uid();

  -- Get source campaign data
  SELECT * INTO v_source_campaign 
  FROM pulse_campaigns WHERE id = p_campaign_id;

  IF v_source_campaign IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  -- Loop through all companies (except source)
  FOR v_target_company IN 
    SELECT id, name FROM companies 
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      -- Insert cloned campaign
      INSERT INTO pulse_campaigns (
        company_id, titulo, descricao, ativo, data_inicio, data_fim
      ) VALUES (
        v_target_company.id, 
        v_source_campaign.titulo, 
        v_source_campaign.descricao, 
        v_source_campaign.ativo, 
        v_source_campaign.data_inicio, 
        v_source_campaign.data_fim
      ) RETURNING id INTO v_new_campaign_id;

      -- Clone related questions
      INSERT INTO pulse_questions (campaign_id, pergunta, tipo, ordem, obrigatoria)
      SELECT v_new_campaign_id, pergunta, tipo, ordem, obrigatoria
      FROM pulse_questions
      WHERE campaign_id = p_campaign_id;

      -- Log success
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'pulse_campaign', p_campaign_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name;
      success := true;
      error_message := null;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Log failure
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'pulse_campaign', p_campaign_id, p_source_company_id, v_target_company.id, false, SQLERRM);

      company_name := v_target_company.name;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- Function: Replicate Ciclo de Avaliação
-- ============================================
CREATE OR REPLACE FUNCTION public.replicate_ciclo_avaliacao(
  p_ciclo_id UUID,
  p_source_company_id UUID
)
RETURNS TABLE(company_name TEXT, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_company RECORD;
  v_new_ciclo_id UUID;
  v_source_ciclo RECORD;
  v_metrica_map JSONB := '{}'::JSONB;
  v_new_metrica_id UUID;
  v_metrica RECORD;
  v_competencia RECORD;
  v_objetivo RECORD;
  v_admin_user_id UUID;
BEGIN
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;
  
  v_admin_user_id := auth.uid();

  SELECT * INTO v_source_ciclo 
  FROM ciclos_avaliacao WHERE id = p_ciclo_id;

  IF v_source_ciclo IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;

  FOR v_target_company IN 
    SELECT id, name FROM companies 
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      -- 1. Create ciclo
      INSERT INTO ciclos_avaliacao (
        company_id, nome_ciclo, descricao, data_inicio, data_fim, status
      ) VALUES (
        v_target_company.id, 
        v_source_ciclo.nome_ciclo, 
        v_source_ciclo.descricao, 
        v_source_ciclo.data_inicio, 
        v_source_ciclo.data_fim,
        'configuracao'
      ) RETURNING id INTO v_new_ciclo_id;

      -- 2. Clone metricas and map old -> new IDs
      v_metrica_map := '{}'::JSONB;
      FOR v_metrica IN SELECT * FROM metricas_avaliacao WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO metricas_avaliacao (
          ciclo_id, nome_metrica, tipo_metrica, valores_escala
        ) VALUES (
          v_new_ciclo_id, v_metrica.nome_metrica, 
          v_metrica.tipo_metrica, v_metrica.valores_escala
        ) RETURNING id INTO v_new_metrica_id;
        
        v_metrica_map := v_metrica_map || 
          jsonb_build_object(v_metrica.id::text, v_new_metrica_id);
      END LOOP;

      -- 3. Clone competencias (referencing new metrica)
      FOR v_competencia IN SELECT * FROM competencias_ciclo WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO competencias_ciclo (
          ciclo_id, nome_competencia, conceito_competencia,
          texto_pergunta_autoavaliacao, texto_pergunta_gestor,
          metrica_id, ordem
        ) VALUES (
          v_new_ciclo_id, v_competencia.nome_competencia,
          v_competencia.conceito_competencia,
          v_competencia.texto_pergunta_autoavaliacao,
          v_competencia.texto_pergunta_gestor,
          CASE 
            WHEN v_competencia.metrica_id IS NOT NULL 
            THEN (v_metrica_map->>v_competencia.metrica_id::text)::UUID
            ELSE NULL
          END,
          v_competencia.ordem
        );
      END LOOP;

      -- 4. Clone objetivos
      FOR v_objetivo IN SELECT * FROM objetivos_ciclo WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO objetivos_ciclo (
          ciclo_id, nome_objetivo, descricao_objetivo,
          texto_pergunta_autoavaliacao, texto_pergunta_gestor,
          metrica_id, ordem
        ) VALUES (
          v_new_ciclo_id, v_objetivo.nome_objetivo,
          v_objetivo.descricao_objetivo,
          v_objetivo.texto_pergunta_autoavaliacao,
          v_objetivo.texto_pergunta_gestor,
          CASE 
            WHEN v_objetivo.metrica_id IS NOT NULL 
            THEN (v_metrica_map->>v_objetivo.metrica_id::text)::UUID
            ELSE NULL
          END,
          v_objetivo.ordem
        );
      END LOOP;

      -- Log success
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'ciclo_avaliacao', p_ciclo_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name;
      success := true;
      error_message := null;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'ciclo_avaliacao', p_ciclo_id, p_source_company_id, v_target_company.id, false, SQLERRM);

      company_name := v_target_company.name;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- Function: Replicate Comunicado
-- ============================================
CREATE OR REPLACE FUNCTION public.replicate_comunicado(
  p_comunicado_id UUID,
  p_source_company_id UUID
)
RETURNS TABLE(company_name TEXT, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_company RECORD;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;
  
  v_admin_user_id := auth.uid();

  SELECT * INTO v_source FROM comunicados WHERE id = p_comunicado_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
  END IF;

  FOR v_target_company IN 
    SELECT id, name FROM companies 
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO comunicados (
        company_id, titulo, conteudo, autor_id, autor_nome,
        status, data_publicacao, publico_alvo_tipo, 
        publico_alvo_valor, is_pinned
      ) VALUES (
        v_target_company.id, v_source.titulo, v_source.conteudo,
        v_source.autor_id, v_source.autor_nome,
        v_source.status, v_source.data_publicacao,
        v_source.publico_alvo_tipo, v_source.publico_alvo_valor,
        v_source.is_pinned
      );

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'comunicado', p_comunicado_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name;
      success := true;
      error_message := null;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'comunicado', p_comunicado_id, p_source_company_id, v_target_company.id, false, SQLERRM);

      company_name := v_target_company.name;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- Function: Replicate Questionário NR1/Cuidar+
-- ============================================
CREATE OR REPLACE FUNCTION public.replicate_questionario_cuidar_plus(
  p_questionario_id UUID,
  p_source_company_id UUID
)
RETURNS TABLE(company_name TEXT, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_company RECORD;
  v_new_questionario_id UUID;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;
  
  v_admin_user_id := auth.uid();

  SELECT * INTO v_source 
  FROM questionarios_cuidar_plus WHERE id = p_questionario_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Questionário não encontrado';
  END IF;

  FOR v_target_company IN 
    SELECT id, name FROM companies 
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      -- Create questionario
      INSERT INTO questionarios_cuidar_plus (
        company_id, titulo, descricao, is_active, modelo_analise,
        escala_config, config_calculo, created_by_user_id
      ) VALUES (
        v_target_company.id, v_source.titulo, v_source.descricao,
        v_source.is_active, v_source.modelo_analise,
        v_source.escala_config, v_source.config_calculo, v_admin_user_id
      ) RETURNING id INTO v_new_questionario_id;

      -- Clone perguntas
      INSERT INTO perguntas_cuidar_plus (
        questionario_id, pergunta_texto, tipo_pergunta, order_index,
        dimensao, dimensao_questionario_id, is_invertida, bloco, peso
      )
      SELECT 
        v_new_questionario_id, pergunta_texto, tipo_pergunta, order_index,
        dimensao, NULL, is_invertida, bloco, peso
      FROM perguntas_cuidar_plus
      WHERE questionario_id = p_questionario_id;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'questionario_cuidar_plus', p_questionario_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name;
      success := true;
      error_message := null;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'questionario_cuidar_plus', p_questionario_id, p_source_company_id, v_target_company.id, false, SQLERRM);

      company_name := v_target_company.name;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;