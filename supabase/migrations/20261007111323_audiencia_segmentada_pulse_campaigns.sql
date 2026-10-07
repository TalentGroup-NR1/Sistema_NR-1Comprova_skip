-- ==============================================================================
-- Migration: pulse_campaigns audience segmentation
-- Add audiencia_tipo and alvos table
-- ==============================================================================

-- 1. Add audiencia_tipo to pulse_campaigns
ALTER TABLE public.pulse_campaigns
  ADD COLUMN IF NOT EXISTS audiencia_tipo VARCHAR(50) NOT NULL DEFAULT 'todos'
  CHECK (audiencia_tipo IN ('todos', 'departamentos'));

-- 2. Create pulse_campaigns_alvos table
CREATE TABLE IF NOT EXISTS public.pulse_campaigns_alvos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  departamento_nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, departamento_nome)
);

-- 3. RLS for pulse_campaigns_alvos
ALTER TABLE public.pulse_campaigns_alvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaboradores can view alvos of active campaigns"
  ON public.pulse_campaigns_alvos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pulse_campaigns c
      WHERE c.id = campaign_id
      AND c.company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "Admins can manage alvos"
  ON public.pulse_campaigns_alvos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pulse_campaigns c
      WHERE c.id = campaign_id
      AND c.company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    )
  );

-- 4. Update RLS on pulse_campaigns
DROP POLICY IF EXISTS "Colaboradores can view active campaigns" ON public.pulse_campaigns;

CREATE POLICY "Colaboradores can view active campaigns"
  ON public.pulse_campaigns FOR SELECT
  USING (
    ativo = true 
    AND company_id = public.get_my_company_id()
    AND CURRENT_DATE BETWEEN data_inicio AND data_fim
    AND (
      audiencia_tipo = 'todos'
      OR EXISTS (
        SELECT 1 FROM public.colaboradores c
        JOIN public.pulse_campaigns_alvos pca ON pca.campaign_id = pulse_campaigns.id
        WHERE c.user_id = auth.uid() 
          AND c.company_id = pulse_campaigns.company_id
          AND LOWER(TRIM(c.department)) = LOWER(TRIM(pca.departamento_nome))
      )
    )
  );

-- 5. Update get_active_pulse_campaign RPC
CREATE OR REPLACE FUNCTION public.get_active_pulse_campaign(p_company_id UUID)
RETURNS TABLE (
  campaign_id UUID,
  titulo VARCHAR,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  has_responded BOOLEAN,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colaborador_id UUID;
  v_department VARCHAR;
BEGIN
  -- Buscar colaborador e departamento do usuário atual
  SELECT id, department INTO v_colaborador_id, v_department
  FROM public.colaboradores
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.descricao,
    c.data_inicio,
    c.data_fim,
    EXISTS (
      SELECT 1 FROM public.pulse_responses pr
      WHERE pr.campaign_id = c.id AND pr.employee_id = v_colaborador_id
    ) as has_responded,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'pergunta', q.pergunta,
          'tipo', q.tipo,
          'ordem', q.ordem,
          'obrigatoria', q.obrigatoria
        ) ORDER BY q.ordem
      )
      FROM public.pulse_questions q
      WHERE q.campaign_id = c.id
    ) as questions
  FROM public.pulse_campaigns c
  WHERE c.company_id = p_company_id
    AND c.ativo = true
    AND CURRENT_DATE BETWEEN c.data_inicio AND c.data_fim
    AND (
      c.audiencia_tipo = 'todos'
      OR (
        c.audiencia_tipo = 'departamentos'
        AND v_department IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.pulse_campaigns_alvos pca
          WHERE pca.campaign_id = c.id
            AND LOWER(TRIM(pca.departamento_nome)) = LOWER(TRIM(v_department))
        )
      )
    )
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

-- 6. Update get_pulse_campaign_stats RPC
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_stats(p_campaign_id UUID)
RETURNS TABLE (
  total_responses BIGINT,
  avg_score NUMERIC,
  participation_rate NUMERIC,
  score_distribution JSONB,
  ambiente_breakdown JSONB,
  department_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_total_colaboradores BIGINT;
  v_audiencia_tipo VARCHAR;
  v_total_responses BIGINT;
BEGIN
  v_company_id := public.get_my_company_id();
  
  -- Buscar informações do escopo da campanha
  SELECT audiencia_tipo INTO v_audiencia_tipo
  FROM public.pulse_campaigns
  WHERE id = p_campaign_id;

  -- Contar colaboradores ativos no público-alvo da campanha
  IF v_audiencia_tipo = 'departamentos' THEN
    SELECT COUNT(DISTINCT id) INTO v_total_colaboradores
    FROM public.colaboradores
    WHERE company_id = v_company_id 
      AND status = 'ativo'
      AND LOWER(TRIM(department)) IN (
        SELECT LOWER(TRIM(departamento_nome)) 
        FROM public.pulse_campaigns_alvos 
        WHERE campaign_id = p_campaign_id
      );
  ELSE
    SELECT COUNT(DISTINCT id) INTO v_total_colaboradores
    FROM public.colaboradores
    WHERE company_id = v_company_id AND status = 'ativo';
  END IF;

  -- Obter total de respostas para verificar a trava de anonimato
  SELECT COUNT(DISTINCT employee_id) INTO v_total_responses
  FROM public.pulse_responses
  WHERE campaign_id = p_campaign_id;
  
  RETURN QUERY
  SELECT 
    v_total_responses as total_responses,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC
        ELSE NULL
      END
    ), 2) as avg_score,
    ROUND((v_total_responses::NUMERIC / NULLIF(v_total_colaboradores, 0)) * 100, 1) as participation_rate,
    (
      SELECT jsonb_object_agg(score, count)
      FROM (
        SELECT pr2.resposta as score, COUNT(*) as count
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
        GROUP BY pr2.resposta
      ) s
    ) as score_distribution,
    (
      SELECT jsonb_object_agg(ambiente, count)
      FROM (
        SELECT pr2.ambiente::TEXT, COUNT(DISTINCT pr2.employee_id) as count
        FROM public.pulse_responses pr2
        WHERE pr2.campaign_id = p_campaign_id
        GROUP BY pr2.ambiente
      ) a
    ) as ambiente_breakdown,
    -- Trava de anonimato unificada
    CASE 
      WHEN v_total_responses < 5 THEN NULL
      ELSE (
        SELECT jsonb_object_agg(department, avg_score)
        FROM (
          SELECT c2.department, ROUND(AVG(pr2.resposta::NUMERIC), 2) as avg_score
          FROM public.pulse_responses pr2
          JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
          JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
          WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
          GROUP BY c2.department
        ) d
      )
    END as department_breakdown
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.campaign_id = p_campaign_id;
END;
$$;

-- 7. Update get_pulse_trend_data RPC
CREATE OR REPLACE FUNCTION public.get_pulse_trend_data(
  p_company_id UUID,
  p_months_back INTEGER DEFAULT 6
)
RETURNS TABLE (
  campaign_id UUID,
  titulo VARCHAR,
  data_inicio DATE,
  avg_score NUMERIC,
  total_responses BIGINT,
  ambiente_empresa_avg NUMERIC,
  ambiente_cliente_avg NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.data_inicio,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as avg_score,
    COUNT(DISTINCT pr.employee_id)::BIGINT as total_responses,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' AND pr.ambiente = 'empresa' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as ambiente_empresa_avg,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' AND pr.ambiente = 'cliente' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as ambiente_cliente_avg
  FROM public.pulse_campaigns c
  LEFT JOIN public.pulse_responses pr ON pr.campaign_id = c.id
  LEFT JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE c.company_id = p_company_id
    AND c.audiencia_tipo = 'todos' -- Filtro: apenas campanhas globais compõem a tendência da empresa
    AND c.data_inicio >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
  GROUP BY c.id, c.titulo, c.data_inicio
  ORDER BY c.data_inicio ASC;
END;
$$;
