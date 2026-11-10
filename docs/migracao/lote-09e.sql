-- ============================================================
-- LOTE 9E — Diário de Bordo (ciclos de feedback e respostas)
-- Depende de: companies, colaboradores, questionnaire_templates, questions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedback_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  milestone_type public.milestone_type NOT NULL,
  due_date date NOT NULL,
  questionnaire_template_id uuid REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
  collaborator_questionnaire_template_id uuid REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
  gestor_questionnaire_template_id uuid REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
  status public.feedback_cycle_status NOT NULL DEFAULT 'NAO_INICIADO',
  collaborator_token uuid NOT NULL DEFAULT gen_random_uuid(),
  gestor_token uuid NOT NULL DEFAULT gen_random_uuid(),
  gestor_name varchar(255),
  gestor_email varchar(255),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_cycles_collaborator_token_key UNIQUE (collaborator_token),
  CONSTRAINT feedback_cycles_gestor_token_key UNIQUE (gestor_token)
);

CREATE INDEX IF NOT EXISTS idx_feedback_cycles_company_id ON public.feedback_cycles (company_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_colaborador_id ON public.feedback_cycles (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_status ON public.feedback_cycles (status);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_collaborator_token ON public.feedback_cycles (collaborator_token);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_gestor_token ON public.feedback_cycles (gestor_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_cycles TO authenticated;
GRANT ALL ON public.feedback_cycles TO service_role;

CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_cycle_id uuid NOT NULL REFERENCES public.feedback_cycles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  respondent_type public.respondent_type NOT NULL,
  answer_value_numeric integer,
  answer_value_text text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_responses_unq UNIQUE (feedback_cycle_id, question_id, respondent_type)
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_cycle_id ON public.feedback_responses (feedback_cycle_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_responses TO authenticated;
GRANT ALL ON public.feedback_responses TO service_role;
