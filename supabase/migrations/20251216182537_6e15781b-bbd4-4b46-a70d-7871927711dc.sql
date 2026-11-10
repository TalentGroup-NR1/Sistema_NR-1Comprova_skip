-- ============================================
-- FASE 1: MÓDULO DIÁRIO DE BORDO - ESTRUTURA DE BANCO DE DADOS
-- ============================================

-- 1. CRIAR ENUMS
-- ============================================

-- Tipo de marco (milestone)
CREATE TYPE milestone_type AS ENUM ('30_DIAS', '80_DIAS', '120_DIAS', 'GERAL');

-- Tipo de pergunta
CREATE TYPE question_type AS ENUM ('ESCALA_NUMERICA', 'TEXTO_LIVRE', 'SIM_NAO');

-- Tipo de respondente
CREATE TYPE respondent_type AS ENUM ('COLABORADOR', 'GESTOR', 'AMBOS');

-- Status do ciclo de feedback
CREATE TYPE feedback_cycle_status AS ENUM (
  'NAO_INICIADO', 
  'LINKS_GERADOS', 
  'COLAB_RESPONDIDO', 
  'GESTOR_RESPONDIDO', 
  'CONCLUIDO', 
  'ATRASADO'
);

-- 2. TABELA: questionnaire_templates
-- ============================================
CREATE TABLE public.questionnaire_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type milestone_type,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_questionnaire_templates_updated_at
  BEFORE UPDATE ON public.questionnaire_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para questionnaire_templates
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Admin master pode gerenciar todos os templates
CREATE POLICY "Admin master full access questionnaire_templates"
  ON public.questionnaire_templates
  FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

-- Admin empresa pode gerenciar templates da sua empresa ou globais (company_id IS NULL)
CREATE POLICY "Admin empresa can manage own company templates"
  ON public.questionnaire_templates
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND (
      company_id IS NULL 
      OR company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND (
      company_id IS NULL 
      OR company_id = get_user_company_id(auth.uid())
    )
  );

-- Analista RH pode visualizar templates da sua empresa ou globais
CREATE POLICY "Analista RH can view templates"
  ON public.questionnaire_templates
  FOR SELECT
  USING (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND (
      company_id IS NULL 
      OR company_id = get_user_company_id(auth.uid())
    )
  );

-- 3. TABELA: questions
-- ============================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 10,
  respondent_type respondent_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para questions (herda do template pai)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Admin master pode gerenciar todas as perguntas
CREATE POLICY "Admin master full access questions"
  ON public.questions
  FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

-- Admin empresa pode gerenciar perguntas de templates acessíveis
CREATE POLICY "Admin empresa can manage questions"
  ON public.questions
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.questionnaire_templates qt
      WHERE qt.id = questions.questionnaire_template_id
      AND (qt.company_id IS NULL OR qt.company_id = get_user_company_id(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.questionnaire_templates qt
      WHERE qt.id = questions.questionnaire_template_id
      AND (qt.company_id IS NULL OR qt.company_id = get_user_company_id(auth.uid()))
    )
  );

-- Analista RH pode visualizar perguntas de templates acessíveis
CREATE POLICY "Analista RH can view questions"
  ON public.questions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.questionnaire_templates qt
      WHERE qt.id = questions.questionnaire_template_id
      AND (qt.company_id IS NULL OR qt.company_id = get_user_company_id(auth.uid()))
    )
  );

-- 4. TABELA: feedback_cycles
-- ============================================
CREATE TABLE public.feedback_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES public.allocations(id) ON DELETE SET NULL,
  milestone_type milestone_type NOT NULL,
  due_date DATE NOT NULL,
  questionnaire_template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE RESTRICT,
  status feedback_cycle_status NOT NULL DEFAULT 'NAO_INICIADO',
  collaborator_token UUID NOT NULL DEFAULT gen_random_uuid(),
  gestor_token UUID NOT NULL DEFAULT gen_random_uuid(),
  gestor_name VARCHAR(255),
  gestor_email VARCHAR(255),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collaborator_token),
  UNIQUE(gestor_token)
);

-- Trigger para updated_at
CREATE TRIGGER update_feedback_cycles_updated_at
  BEFORE UPDATE ON public.feedback_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_feedback_cycles_company_id ON public.feedback_cycles(company_id);
CREATE INDEX idx_feedback_cycles_colaborador_id ON public.feedback_cycles(colaborador_id);
CREATE INDEX idx_feedback_cycles_status ON public.feedback_cycles(status);
CREATE INDEX idx_feedback_cycles_collaborator_token ON public.feedback_cycles(collaborator_token);
CREATE INDEX idx_feedback_cycles_gestor_token ON public.feedback_cycles(gestor_token);

-- RLS para feedback_cycles
ALTER TABLE public.feedback_cycles ENABLE ROW LEVEL SECURITY;

-- Admin master pode visualizar todos os ciclos
CREATE POLICY "Admin master can view all feedback_cycles"
  ON public.feedback_cycles
  FOR SELECT
  USING (is_admin_master(auth.uid()));

-- Admin empresa pode gerenciar ciclos da sua empresa
CREATE POLICY "Admin empresa can manage own company feedback_cycles"
  ON public.feedback_cycles
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  );

-- Analista RH pode gerenciar ciclos da sua empresa
CREATE POLICY "Analista RH can manage own company feedback_cycles"
  ON public.feedback_cycles
  FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  );

-- Colaborador pode visualizar seus próprios ciclos
CREATE POLICY "Colaborador can view own feedback_cycles"
  ON public.feedback_cycles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'colaborador'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = feedback_cycles.colaborador_id
      AND c.corporate_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- 5. TABELA: feedback_responses
-- ============================================
CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_cycle_id UUID NOT NULL REFERENCES public.feedback_cycles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  respondent_type respondent_type NOT NULL,
  answer_value_numeric INTEGER,
  answer_value_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feedback_cycle_id, question_id, respondent_type)
);

-- Índices para performance
CREATE INDEX idx_feedback_responses_cycle_id ON public.feedback_responses(feedback_cycle_id);

-- RLS para feedback_responses
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Admin master pode visualizar todas as respostas
CREATE POLICY "Admin master can view all feedback_responses"
  ON public.feedback_responses
  FOR SELECT
  USING (is_admin_master(auth.uid()));

-- Admin empresa pode gerenciar respostas de ciclos da sua empresa
CREATE POLICY "Admin empresa can manage own company feedback_responses"
  ON public.feedback_responses
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.feedback_cycles fc
      WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.feedback_cycles fc
      WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
    )
  );

-- Analista RH pode gerenciar respostas de ciclos da sua empresa
CREATE POLICY "Analista RH can manage own company feedback_responses"
  ON public.feedback_responses
  FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.feedback_cycles fc
      WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.feedback_cycles fc
      WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
    )
  );

-- 6. FUNÇÃO PARA BUSCAR CICLO POR TOKEN (para formulário público)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_feedback_cycle_by_token(p_token UUID)
RETURNS TABLE (
  cycle_id UUID,
  colaborador_name VARCHAR,
  milestone_type milestone_type,
  respondent_type respondent_type,
  template_id UUID,
  already_submitted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
BEGIN
  -- Verificar se é token de colaborador
  SELECT fc.id INTO v_cycle_id
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;
  
  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    -- Verificar se é token de gestor
    SELECT fc.id INTO v_cycle_id
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;
    
    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    END IF;
  END IF;
  
  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    fc.id AS cycle_id,
    c.full_name AS colaborador_name,
    fc.milestone_type,
    v_respondent AS respondent_type,
    fc.questionnaire_template_id AS template_id,
    EXISTS (
      SELECT 1 FROM feedback_responses fr 
      WHERE fr.feedback_cycle_id = fc.id 
      AND fr.respondent_type = v_respondent
    ) AS already_submitted
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.id = v_cycle_id;
END;
$$;

-- 7. FUNÇÃO PARA SUBMETER RESPOSTAS (para formulário público)
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_feedback_responses(
  p_token UUID,
  p_responses JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
  v_response JSONB;
  v_current_status feedback_cycle_status;
  v_new_status feedback_cycle_status;
BEGIN
  -- Identificar ciclo e tipo de respondente
  SELECT fc.id, fc.status INTO v_cycle_id, v_current_status
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;
  
  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    SELECT fc.id, fc.status INTO v_cycle_id, v_current_status
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;
    
    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    ELSE
      RAISE EXCEPTION 'Token inválido';
    END IF;
  END IF;
  
  -- Verificar se já respondeu
  IF EXISTS (
    SELECT 1 FROM feedback_responses fr 
    WHERE fr.feedback_cycle_id = v_cycle_id 
    AND fr.respondent_type = v_respondent
  ) THEN
    RAISE EXCEPTION 'Este formulário já foi respondido';
  END IF;
  
  -- Inserir respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    INSERT INTO feedback_responses (
      feedback_cycle_id,
      question_id,
      respondent_type,
      answer_value_numeric,
      answer_value_text
    ) VALUES (
      v_cycle_id,
      (v_response->>'question_id')::UUID,
      v_respondent,
      (v_response->>'answer_value_numeric')::INTEGER,
      v_response->>'answer_value_text'
    );
  END LOOP;
  
  -- Atualizar status do ciclo
  IF v_respondent = 'COLABORADOR' THEN
    IF v_current_status = 'GESTOR_RESPONDIDO' THEN
      v_new_status := 'CONCLUIDO';
    ELSE
      v_new_status := 'COLAB_RESPONDIDO';
    END IF;
  ELSE -- GESTOR
    IF v_current_status = 'COLAB_RESPONDIDO' THEN
      v_new_status := 'CONCLUIDO';
    ELSE
      v_new_status := 'GESTOR_RESPONDIDO';
    END IF;
  END IF;
  
  UPDATE feedback_cycles SET status = v_new_status WHERE id = v_cycle_id;
  
  RETURN TRUE;
END;
$$;

-- 8. SEED DATA: TEMPLATES INICIAIS DE QUESTIONÁRIO
-- ============================================

-- Template 30 Dias (Global - company_id NULL)
INSERT INTO public.questionnaire_templates (id, company_id, template_name, description, milestone_type, is_active)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  NULL,
  'Diário de Bordo - 30 Dias',
  'Questionário padrão para avaliação do período inicial de 30 dias de adaptação do colaborador.',
  '30_DIAS',
  true
);

-- Perguntas do Template 30 Dias
INSERT INTO public.questions (questionnaire_template_id, question_text, question_type, scale_min, scale_max, respondent_type, order_index) VALUES
-- Perguntas para AMBOS
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie as atividades, metas, objetivos e desafios do dia-a-dia compartilhados pela gestão técnica.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 1),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie a receptividade da gestão técnica e da equipe em que está inserido(a) durante esses primeiros 30 dias.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 2),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie o diálogo com a gestão técnica e equipe a respeito do trabalho desenvolvido, suporte, feedback sobre as atividades.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 3),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Feedback, críticas, sugestões, elogios.', 'TEXTO_LIVRE', NULL, NULL, 'AMBOS', 10),
-- Perguntas exclusivas COLABORADOR
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie sua satisfação com ambiente de trabalho (mesmo que remoto), atividades, equipe, liderança, projetos.', 'ESCALA_NUMERICA', 1, 10, 'COLABORADOR', 4),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Algum alinhamento é necessário ser feito com o cliente ou a TG Mais? Algum ponto de atenção, algo que precise ser corrigido e você gostaria de compartilhar?', 'TEXTO_LIVRE', NULL, NULL, 'COLABORADOR', 11),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Você aprova a TG Mais e o cliente no período de experiência?', 'SIM_NAO', NULL, NULL, 'COLABORADOR', 12),
-- Perguntas exclusivas GESTOR
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie o desempenho do(a) profissional referente às demandas do dia-a-dia, cumprimento das metas, objetivos e desafios.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 5),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Avalie como está a adaptação do(a) profissional considerando ambiente de trabalho (mesmo que remoto), equipe, liderança, negócio, projetos.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 6),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Algum alinhamento é necessário ser feito com o(a) profissional, algum ponto de atenção, algo que precise ser corrigido?', 'TEXTO_LIVRE', NULL, NULL, 'GESTOR', 13),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'O profissional está aprovado no período de experiência?', 'SIM_NAO', NULL, NULL, 'GESTOR', 14);

-- Template 80 Dias (Global - company_id NULL)
INSERT INTO public.questionnaire_templates (id, company_id, template_name, description, milestone_type, is_active)
VALUES (
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  NULL,
  'Diário de Bordo - 80 Dias',
  'Questionário padrão para avaliação do período intermediário de 80 dias de adaptação do colaborador.',
  '80_DIAS',
  true
);

-- Perguntas do Template 80 Dias
INSERT INTO public.questions (questionnaire_template_id, question_text, question_type, scale_min, scale_max, respondent_type, order_index) VALUES
-- Perguntas para AMBOS
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie as atividades, metas, objetivos e desafios do dia-a-dia compartilhados pela gestão técnica.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 1),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie a receptividade da gestão técnica e da equipe em que está inserido(a) durante esses 80 dias.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 2),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie o diálogo com a gestão técnica e equipe a respeito do trabalho desenvolvido, suporte, feedback sobre as atividades.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 3),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie a evolução da integração e colaboração com a equipe desde o início.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 4),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Feedback, críticas, sugestões, elogios.', 'TEXTO_LIVRE', NULL, NULL, 'AMBOS', 10),
-- Perguntas exclusivas COLABORADOR
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie sua satisfação com ambiente de trabalho (mesmo que remoto), atividades, equipe, liderança, projetos.', 'ESCALA_NUMERICA', 1, 10, 'COLABORADOR', 5),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Algum alinhamento é necessário ser feito com o cliente ou a TG Mais? Algum ponto de atenção, algo que precise ser corrigido e você gostaria de compartilhar?', 'TEXTO_LIVRE', NULL, NULL, 'COLABORADOR', 11),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Você aprova a TG Mais e o cliente no período de experiência?', 'SIM_NAO', NULL, NULL, 'COLABORADOR', 12),
-- Perguntas exclusivas GESTOR
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie o desempenho do(a) profissional referente às demandas do dia-a-dia, cumprimento das metas, objetivos e desafios.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 6),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Avalie como está a adaptação do(a) profissional considerando ambiente de trabalho (mesmo que remoto), equipe, liderança, negócio, projetos.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 7),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Algum alinhamento é necessário ser feito com o(a) profissional, algum ponto de atenção, algo que precise ser corrigido?', 'TEXTO_LIVRE', NULL, NULL, 'GESTOR', 13),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'O profissional está aprovado no período de experiência?', 'SIM_NAO', NULL, NULL, 'GESTOR', 14);

-- Template 120 Dias (Global - company_id NULL)
INSERT INTO public.questionnaire_templates (id, company_id, template_name, description, milestone_type, is_active)
VALUES (
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  NULL,
  'Diário de Bordo - 120 Dias',
  'Questionário padrão para avaliação final do período de 120 dias - conclusão do período de experiência.',
  '120_DIAS',
  true
);

-- Perguntas do Template 120 Dias
INSERT INTO public.questions (questionnaire_template_id, question_text, question_type, scale_min, scale_max, respondent_type, order_index) VALUES
-- Perguntas para AMBOS
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie as atividades, metas, objetivos e desafios do dia-a-dia compartilhados pela gestão técnica ao longo dos 120 dias.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 1),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie a receptividade da gestão técnica e da equipe durante todo o período de experiência.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 2),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie o diálogo com a gestão técnica e equipe a respeito do trabalho desenvolvido, suporte, feedback sobre as atividades.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 3),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie a evolução profissional e técnica durante o período de experiência.', 'ESCALA_NUMERICA', 1, 10, 'AMBOS', 4),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Feedback final, críticas, sugestões, elogios sobre todo o período.', 'TEXTO_LIVRE', NULL, NULL, 'AMBOS', 10),
-- Perguntas exclusivas COLABORADOR
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie sua satisfação geral com ambiente de trabalho (mesmo que remoto), atividades, equipe, liderança, projetos.', 'ESCALA_NUMERICA', 1, 10, 'COLABORADOR', 5),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Pretende continuar na TG Mais e no cliente? Quais são suas expectativas para o futuro?', 'TEXTO_LIVRE', NULL, NULL, 'COLABORADOR', 11),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Você aprova a TG Mais e o cliente após o período de experiência completo?', 'SIM_NAO', NULL, NULL, 'COLABORADOR', 12),
-- Perguntas exclusivas GESTOR
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie o desempenho geral do(a) profissional durante todo o período de experiência.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 6),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Avalie a adaptação final do(a) profissional ao ambiente, equipe, liderança e projetos.', 'ESCALA_NUMERICA', 1, 10, 'GESTOR', 7),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Há pontos de desenvolvimento ou treinamentos recomendados para este profissional?', 'TEXTO_LIVRE', NULL, NULL, 'GESTOR', 13),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'O profissional está aprovado e recomendado para continuidade após o período de experiência?', 'SIM_NAO', NULL, NULL, 'GESTOR', 14);