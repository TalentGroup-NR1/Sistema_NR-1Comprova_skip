-- ============================================================
-- LOTE 7F — Relatórios, feedbacks e respostas vinculadas ao colaborador
-- Depende de: colaboradores (07b), questionarios_cuidar_plus (Lote 3D),
--             perguntas_cuidar_plus (Lote 4D), psico_avaliacoes/perguntas (Lote 5C), ghes (Lote 6D)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.evolution_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES auth.users(id),
  report_text text,
  period_start date,
  period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evolution_reports_colaborador ON public.evolution_reports (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_evolution_reports_company ON public.evolution_reports (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_reports TO authenticated;
GRANT ALL ON public.evolution_reports TO service_role;

CREATE TABLE IF NOT EXISTS public.feedbacks_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  registrado_por_user_id uuid NOT NULL,
  registrado_por_nome varchar(255) NOT NULL,
  data_feedback date NOT NULL DEFAULT CURRENT_DATE,
  assunto text NOT NULL,
  detalhes_conversa text NOT NULL,
  prazo_retorno date,
  alerta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_colaboradores_colaborador_id ON public.feedbacks_colaboradores (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_colaboradores_company_id ON public.feedbacks_colaboradores (company_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_colaboradores_data_feedback ON public.feedbacks_colaboradores (data_feedback DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks_colaboradores TO authenticated;
GRANT ALL ON public.feedbacks_colaboradores TO service_role;

CREATE TABLE IF NOT EXISTS public.envios_cuidar_plus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status varchar(20) NOT NULL DEFAULT 'PENDENTE'::varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT envios_cuidar_plus_quest_colab_key UNIQUE (questionario_id, colaborador_id),
  CONSTRAINT envios_cuidar_plus_status_check CHECK (status::text = ANY (ARRAY['PENDENTE','RESPONDIDO']))
);

CREATE INDEX IF NOT EXISTS idx_envios_cuidar_plus_token ON public.envios_cuidar_plus (token);
CREATE INDEX IF NOT EXISTS idx_envios_cuidar_plus_questionario ON public.envios_cuidar_plus (questionario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.envios_cuidar_plus TO authenticated;
GRANT ALL ON public.envios_cuidar_plus TO service_role;

CREATE TABLE IF NOT EXISTS public.respostas_cuidar_plus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  pergunta_id uuid NOT NULL REFERENCES public.perguntas_cuidar_plus(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  resposta_valor text NOT NULL,
  colaborador_id_identificado uuid REFERENCES public.colaboradores(id),
  deseja_contato boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_respostas_cuidar_plus_questionario ON public.respostas_cuidar_plus (questionario_id);
CREATE INDEX IF NOT EXISTS idx_respostas_cuidar_plus_session ON public.respostas_cuidar_plus (session_id);
CREATE INDEX IF NOT EXISTS idx_respostas_cuidar_plus_contato ON public.respostas_cuidar_plus (deseja_contato, colaborador_id_identificado);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.respostas_cuidar_plus TO authenticated;
GRANT ALL ON public.respostas_cuidar_plus TO service_role;

CREATE TABLE IF NOT EXISTS public.psico_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  pergunta_id uuid NOT NULL REFERENCES public.psico_perguntas(id) ON DELETE CASCADE,
  valor_resposta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psico_respostas_avaliacao ON public.psico_respostas (avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_psico_respostas_pergunta ON public.psico_respostas (pergunta_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_respostas TO authenticated;
GRANT ALL ON public.psico_respostas TO service_role;
