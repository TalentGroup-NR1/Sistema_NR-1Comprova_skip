-- ============================================================
-- LOTE 9G — Pulso (surveys, respostas, logs) e respostas ProArt NR-1
-- Depende de: companies, colaboradores, pulse_campaigns, pulse_questions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pulse_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  score integer NOT NULL,
  comment text,
  week_number integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_surveys_score_chk CHECK (score >= 0 AND score <= 5)
);

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_company ON public.pulse_surveys (company_id);
CREATE INDEX IF NOT EXISTS idx_pulse_surveys_week ON public.pulse_surveys (company_id, year, week_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_one_per_week ON public.pulse_surveys (employee_id, year, week_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_surveys TO authenticated;
GRANT ALL ON public.pulse_surveys TO service_role;

CREATE TABLE IF NOT EXISTS public.pulse_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.pulse_questions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  resposta text NOT NULL,
  score_numeric numeric(5,2),
  comentario text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pulse_responses_unq UNIQUE (campaign_id, question_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_pulse_responses_campaign ON public.pulse_responses (campaign_id);
CREATE INDEX IF NOT EXISTS idx_pulse_responses_employee ON public.pulse_responses (employee_id);
CREATE INDEX IF NOT EXISTS idx_pulse_responses_question ON public.pulse_responses (question_id);
CREATE INDEX IF NOT EXISTS idx_pulse_responses_created_at_desc ON public.pulse_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_responses_employee_campaign ON public.pulse_responses (employee_id, campaign_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_responses TO authenticated;
GRANT ALL ON public.pulse_responses TO service_role;

CREATE TABLE IF NOT EXISTS public.pulse_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  response_id uuid REFERENCES public.pulse_responses(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.pulse_campaigns(id) ON DELETE SET NULL,
  acao varchar(50) NOT NULL,
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_access_logs_admin ON public.pulse_access_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_pulse_access_logs_campaign ON public.pulse_access_logs (campaign_id);

GRANT SELECT, INSERT ON public.pulse_access_logs TO authenticated;
GRANT ALL ON public.pulse_access_logs TO service_role;

CREATE TABLE IF NOT EXISTS public.nr1_proart_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  escala_1_media numeric(4,2),
  escala_2_media numeric(4,2),
  escala_3_media numeric(4,2),
  escala_4_media numeric(4,2),
  dificuldades text,
  lidar_com_dificuldades text,
  idade integer,
  sexo text,
  cargo text,
  departamento text,
  modalidade_trabalho text,
  pcd boolean,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr1_proart_modalidade_chk CHECK (
    modalidade_trabalho IS NULL
    OR modalidade_trabalho IN ('Presencial','Remoto','Híbrido')
  )
);

CREATE INDEX IF NOT EXISTS idx_nr1_proart_resp_company ON public.nr1_proart_respostas (company_id);
CREATE INDEX IF NOT EXISTS idx_nr1_proart_resp_colab ON public.nr1_proart_respostas (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_nr1_proart_resp_dept ON public.nr1_proart_respostas (company_id, departamento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_proart_respostas TO authenticated;
GRANT ALL ON public.nr1_proart_respostas TO service_role;
