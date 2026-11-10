-- Tabela principal para pesquisas de pulso semanal
CREATE TABLE public.pulse_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 5),
  comment TEXT,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_pulse_surveys_company ON public.pulse_surveys(company_id);
CREATE INDEX idx_pulse_surveys_week ON public.pulse_surveys(company_id, year, week_number);

-- Constraint: apenas 1 resposta por colaborador por semana
CREATE UNIQUE INDEX idx_pulse_one_per_week ON public.pulse_surveys(employee_id, year, week_number);

-- Habilitar RLS
ALTER TABLE public.pulse_surveys ENABLE ROW LEVEL SECURITY;

-- Policy: Colaboradores podem inserir apenas suas próprias respostas
CREATE POLICY "Colaboradores podem criar pulse survey"
ON public.pulse_surveys
FOR INSERT
WITH CHECK (
  employee_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
);

-- Policy: Colaboradores podem ver apenas suas próprias respostas
CREATE POLICY "Colaboradores veem seu histórico de pulse"
ON public.pulse_surveys
FOR SELECT
USING (
  employee_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
);

-- Policy: Admins podem ver dados da empresa usando funções auxiliares existentes
CREATE POLICY "Admins veem pulse surveys da empresa"
ON public.pulse_surveys
FOR SELECT
USING (
  is_admin_master(auth.uid()) 
  OR (
    (get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh'))
    AND company_id = get_user_company_id(auth.uid())
  )
);

-- Função RPC para obter dados agregados do dashboard (sem expor employee_id)
CREATE OR REPLACE FUNCTION public.get_pulse_dashboard(
  p_company_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  p_weeks_back INTEGER DEFAULT 4
)
RETURNS TABLE (
  week_number INTEGER,
  year INTEGER,
  total_responses BIGINT,
  avg_score NUMERIC,
  score_0 BIGINT,
  score_1 BIGINT,
  score_2 BIGINT,
  score_3 BIGINT,
  score_4 BIGINT,
  score_5 BIGINT,
  comments_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week INTEGER;
BEGIN
  current_week := EXTRACT(WEEK FROM now())::INTEGER;
  
  RETURN QUERY
  SELECT 
    ps.week_number,
    ps.year,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(ps.score)::NUMERIC, 2) as avg_score,
    COUNT(CASE WHEN ps.score = 0 THEN 1 END)::BIGINT as score_0,
    COUNT(CASE WHEN ps.score = 1 THEN 1 END)::BIGINT as score_1,
    COUNT(CASE WHEN ps.score = 2 THEN 1 END)::BIGINT as score_2,
    COUNT(CASE WHEN ps.score = 3 THEN 1 END)::BIGINT as score_3,
    COUNT(CASE WHEN ps.score = 4 THEN 1 END)::BIGINT as score_4,
    COUNT(CASE WHEN ps.score = 5 THEN 1 END)::BIGINT as score_5,
    COUNT(CASE WHEN ps.comment IS NOT NULL AND ps.comment != '' THEN 1 END)::BIGINT as comments_count
  FROM public.pulse_surveys ps
  WHERE ps.company_id = p_company_id
    AND ps.year = p_year
    AND ps.week_number >= (current_week - p_weeks_back)
    AND ps.week_number <= current_week
  GROUP BY ps.week_number, ps.year
  ORDER BY ps.year DESC, ps.week_number DESC;
END;
$$;

-- Função RPC para obter comentários anônimos
CREATE OR REPLACE FUNCTION public.get_pulse_comments(
  p_company_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  p_week_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  score INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.score,
    ps.comment,
    ps.created_at
  FROM public.pulse_surveys ps
  WHERE ps.company_id = p_company_id
    AND ps.year = p_year
    AND (p_week_number IS NULL OR ps.week_number = p_week_number)
    AND ps.comment IS NOT NULL 
    AND ps.comment != ''
  ORDER BY ps.created_at DESC
  LIMIT 50;
END;
$$;

-- Função para obter colaboradores que não responderam na semana atual
CREATE OR REPLACE FUNCTION public.get_pending_pulse_respondents(
  p_company_id UUID
)
RETURNS TABLE (
  colaborador_id UUID,
  full_name TEXT,
  corporate_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week INTEGER;
  current_year INTEGER;
BEGIN
  current_week := EXTRACT(WEEK FROM now())::INTEGER;
  current_year := EXTRACT(YEAR FROM now())::INTEGER;
  
  RETURN QUERY
  SELECT 
    c.id as colaborador_id,
    c.full_name::TEXT,
    c.corporate_email::TEXT
  FROM public.colaboradores c
  WHERE c.company_id = p_company_id
    AND c.status = 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM public.pulse_surveys ps
      WHERE ps.employee_id = c.id
        AND ps.week_number = current_week
        AND ps.year = current_year
    );
END;
$$;