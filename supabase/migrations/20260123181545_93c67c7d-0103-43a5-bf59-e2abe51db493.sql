-- =============================================
-- PULSO 2.0: Sistema de Campanhas Estratégicas
-- =============================================

-- Enum para tipo de pergunta
CREATE TYPE pulse_question_type AS ENUM ('escala_0_5', 'sim_nao', 'texto_livre');

-- Enum para ambiente
CREATE TYPE pulse_ambiente AS ENUM ('empresa', 'cliente');

-- =============================================
-- Tabela: pulse_campaigns (Campanhas de Pesquisa)
-- =============================================
CREATE TABLE public.pulse_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Tabela: pulse_questions (Perguntas da Campanha)
-- =============================================
CREATE TABLE public.pulse_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  tipo pulse_question_type NOT NULL DEFAULT 'escala_0_5',
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatoria BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Tabela: pulse_responses (Respostas dos Colaboradores)
-- =============================================
CREATE TABLE public.pulse_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.pulse_questions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  resposta TEXT NOT NULL,
  comentario TEXT,
  ambiente pulse_ambiente DEFAULT 'empresa',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, question_id, employee_id)
);

-- =============================================
-- Tabela: pulse_access_logs (Auditoria de Acesso)
-- =============================================
CREATE TABLE public.pulse_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  response_id UUID REFERENCES public.pulse_responses(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.pulse_campaigns(id) ON DELETE SET NULL,
  acao VARCHAR(50) NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes para performance
-- =============================================
CREATE INDEX idx_pulse_campaigns_company ON public.pulse_campaigns(company_id);
CREATE INDEX idx_pulse_campaigns_ativo ON public.pulse_campaigns(ativo);
CREATE INDEX idx_pulse_campaigns_dates ON public.pulse_campaigns(data_inicio, data_fim);
CREATE INDEX idx_pulse_questions_campaign ON public.pulse_questions(campaign_id);
CREATE INDEX idx_pulse_responses_campaign ON public.pulse_responses(campaign_id);
CREATE INDEX idx_pulse_responses_employee ON public.pulse_responses(employee_id);
CREATE INDEX idx_pulse_responses_question ON public.pulse_responses(question_id);
CREATE INDEX idx_pulse_access_logs_admin ON public.pulse_access_logs(admin_id);
CREATE INDEX idx_pulse_access_logs_campaign ON public.pulse_access_logs(campaign_id);

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE TRIGGER update_pulse_campaigns_updated_at
  BEFORE UPDATE ON public.pulse_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS: pulse_campaigns
-- =============================================
ALTER TABLE public.pulse_campaigns ENABLE ROW LEVEL SECURITY;

-- Colaboradores veem campanhas ativas da sua empresa
CREATE POLICY "Colaboradores can view active campaigns"
  ON public.pulse_campaigns FOR SELECT
  USING (
    ativo = true 
    AND company_id = public.get_my_company_id()
    AND CURRENT_DATE BETWEEN data_inicio AND data_fim
  );

-- Admins podem gerenciar campanhas da sua empresa
CREATE POLICY "Admins can manage campaigns"
  ON public.pulse_campaigns FOR ALL
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  );

-- =============================================
-- RLS: pulse_questions
-- =============================================
ALTER TABLE public.pulse_questions ENABLE ROW LEVEL SECURITY;

-- Todos podem ver perguntas de campanhas acessíveis
CREATE POLICY "Users can view questions of accessible campaigns"
  ON public.pulse_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pulse_campaigns c
      WHERE c.id = campaign_id
      AND c.company_id = public.get_my_company_id()
    )
  );

-- Admins podem gerenciar perguntas
CREATE POLICY "Admins can manage questions"
  ON public.pulse_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pulse_campaigns c
      WHERE c.id = campaign_id
      AND c.company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pulse_campaigns c
      WHERE c.id = campaign_id
      AND c.company_id = public.get_my_company_id()
      AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    )
  );

-- =============================================
-- RLS: pulse_responses
-- =============================================
ALTER TABLE public.pulse_responses ENABLE ROW LEVEL SECURITY;

-- Colaboradores podem ver apenas suas próprias respostas
CREATE POLICY "Colaboradores can view own responses"
  ON public.pulse_responses FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
    )
  );

-- Colaboradores podem inserir suas próprias respostas
CREATE POLICY "Colaboradores can insert own responses"
  ON public.pulse_responses FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- RLS: pulse_access_logs
-- =============================================
ALTER TABLE public.pulse_access_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin_master pode ver logs de auditoria
CREATE POLICY "Admin master can view access logs"
  ON public.pulse_access_logs FOR SELECT
  USING (public.get_my_role() = 'admin_master');

-- Admins podem inserir logs (via RPC)
CREATE POLICY "System can insert access logs"
  ON public.pulse_access_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- RPC: get_active_pulse_campaign
-- Retorna campanha ativa com perguntas e status de resposta
-- =============================================
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
BEGIN
  -- Buscar colaborador do usuário atual
  SELECT id INTO v_colaborador_id
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
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

-- =============================================
-- RPC: submit_pulse_campaign_response
-- Submete respostas de uma campanha
-- =============================================
CREATE OR REPLACE FUNCTION public.submit_pulse_campaign_response(
  p_campaign_id UUID,
  p_responses JSONB,
  p_ambiente pulse_ambiente DEFAULT 'empresa',
  p_comentario TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_response JSONB;
BEGIN
  -- Buscar colaborador do usuário atual
  SELECT id, company_id INTO v_colaborador_id, v_company_id
  FROM public.colaboradores
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF v_colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  
  -- Verificar se campanha está ativa
  IF NOT EXISTS (
    SELECT 1 FROM public.pulse_campaigns
    WHERE id = p_campaign_id
      AND company_id = v_company_id
      AND ativo = true
      AND CURRENT_DATE BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Campanha não está ativa ou não existe';
  END IF;
  
  -- Verificar se já respondeu
  IF EXISTS (
    SELECT 1 FROM public.pulse_responses
    WHERE campaign_id = p_campaign_id AND employee_id = v_colaborador_id
  ) THEN
    RAISE EXCEPTION 'Você já respondeu esta campanha';
  END IF;
  
  -- Inserir respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    INSERT INTO public.pulse_responses (
      campaign_id, question_id, employee_id, resposta, comentario, ambiente
    ) VALUES (
      p_campaign_id,
      (v_response->>'question_id')::UUID,
      v_colaborador_id,
      v_response->>'resposta',
      p_comentario,
      p_ambiente
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- =============================================
-- RPC: get_pulse_campaign_results
-- Retorna resultados com privacidade condicional
-- =============================================
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_results(
  p_campaign_id UUID,
  p_department TEXT DEFAULT NULL,
  p_ambiente TEXT DEFAULT NULL,
  p_min_score INTEGER DEFAULT NULL,
  p_max_score INTEGER DEFAULT NULL
)
RETURNS TABLE (
  response_id UUID,
  question_id UUID,
  pergunta TEXT,
  resposta TEXT,
  resposta_numerica INTEGER,
  comentario TEXT,
  ambiente TEXT,
  colaborador_nome TEXT,
  departamento TEXT,
  created_at TIMESTAMPTZ,
  is_anonymous BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_admin_id UUID;
BEGIN
  -- Verificar permissão de admin
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  v_company_id := public.get_my_company_id();
  v_admin_id := auth.uid();
  
  -- Verificar se campanha pertence à empresa
  IF NOT EXISTS (
    SELECT 1 FROM public.pulse_campaigns
    WHERE id = p_campaign_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;
  
  -- Registrar acesso
  INSERT INTO public.pulse_access_logs (admin_id, campaign_id, acao, detalhes)
  VALUES (v_admin_id, p_campaign_id, 'visualizou_resultados', jsonb_build_object(
    'filters', jsonb_build_object(
      'department', p_department,
      'ambiente', p_ambiente,
      'min_score', p_min_score,
      'max_score', p_max_score
    )
  ));
  
  RETURN QUERY
  SELECT 
    pr.id as response_id,
    pr.question_id,
    pq.pergunta,
    pr.resposta,
    CASE 
      WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 5
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao' THEN 0
      ELSE NULL
    END as resposta_numerica,
    pr.comentario,
    pr.ambiente::TEXT,
    -- Privacidade condicional: anônimo se score >= 3
    CASE 
      WHEN pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= 3 THEN 'Anônimo'
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 'Anônimo'
      WHEN pq.tipo = 'texto_livre' THEN 'Anônimo'
      ELSE c.full_name::TEXT
    END as colaborador_nome,
    c.department as departamento,
    pr.created_at,
    CASE 
      WHEN pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= 3 THEN true
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN true
      WHEN pq.tipo = 'texto_livre' THEN true
      ELSE false
    END as is_anonymous
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE pr.campaign_id = p_campaign_id
    AND (p_department IS NULL OR c.department = p_department)
    AND (p_ambiente IS NULL OR pr.ambiente::TEXT = p_ambiente)
    AND (
      p_min_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= p_min_score)
    )
    AND (
      p_max_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER <= p_max_score)
    )
  ORDER BY pr.created_at DESC;
END;
$$;

-- =============================================
-- RPC: get_pulse_campaign_stats
-- Retorna estatísticas agregadas da campanha
-- =============================================
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
BEGIN
  v_company_id := public.get_my_company_id();
  
  -- Contar colaboradores ativos
  SELECT COUNT(DISTINCT id) INTO v_total_colaboradores
  FROM public.colaboradores
  WHERE company_id = v_company_id AND status = 'ativo';
  
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pr.employee_id)::BIGINT as total_responses,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC
        ELSE NULL
      END
    ), 2) as avg_score,
    ROUND((COUNT(DISTINCT pr.employee_id)::NUMERIC / NULLIF(v_total_colaboradores, 0)) * 100, 1) as participation_rate,
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
    (
      SELECT jsonb_object_agg(department, avg_score)
      FROM (
        SELECT c2.department, ROUND(AVG(pr2.resposta::NUMERIC), 2) as avg_score
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
        GROUP BY c2.department
      ) d
    ) as department_breakdown
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.campaign_id = p_campaign_id;
END;
$$;

-- =============================================
-- RPC: get_pulse_trend_data
-- Dados para gráfico de tendência
-- =============================================
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
    AND c.data_inicio >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
  GROUP BY c.id, c.titulo, c.data_inicio
  ORDER BY c.data_inicio ASC;
END;
$$;

-- =============================================
-- RPC: get_my_pulse_campaign_history
-- Histórico de respostas do colaborador
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_pulse_campaign_history()
RETURNS TABLE (
  campaign_id UUID,
  titulo VARCHAR,
  data_inicio DATE,
  data_fim DATE,
  responded_at TIMESTAMPTZ,
  responses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colaborador_id UUID;
BEGIN
  SELECT id INTO v_colaborador_id
  FROM public.colaboradores
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.data_inicio,
    c.data_fim,
    MIN(pr.created_at) as responded_at,
    jsonb_agg(
      jsonb_build_object(
        'pergunta', pq.pergunta,
        'tipo', pq.tipo,
        'resposta', pr.resposta,
        'comentario', pr.comentario,
        'ambiente', pr.ambiente
      ) ORDER BY pq.ordem
    ) as responses
  FROM public.pulse_campaigns c
  JOIN public.pulse_responses pr ON pr.campaign_id = c.id
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.employee_id = v_colaborador_id
  GROUP BY c.id, c.titulo, c.data_inicio, c.data_fim
  ORDER BY c.data_inicio DESC;
END;
$$;