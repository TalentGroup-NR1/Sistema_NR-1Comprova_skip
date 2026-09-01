-- ============================================================
-- LOTE 8F — Progresso de treinamentos
-- Depende de: treinamentos, treinamento_aulas (Lote 6), colaboradores (07B)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.treinamento_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status public.conclusao_status DEFAULT 'nao_iniciado',
  tempo_total_minutos integer DEFAULT 0,
  quiz_tentativas integer DEFAULT 0,
  quiz_melhor_nota numeric(5,2),
  quiz_aprovado boolean DEFAULT false,
  quiz_data_aprovacao timestamptz,
  termo_aceito boolean DEFAULT false,
  termo_aceito_em timestamptz,
  termo_ip varchar(45),
  concluido_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT treinamento_progresso_treinamento_id_colaborador_id_key UNIQUE (treinamento_id, colaborador_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_progresso TO authenticated;
GRANT ALL ON public.treinamento_progresso TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_aula_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.treinamento_aulas(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  concluida boolean NOT NULL DEFAULT false,
  tempo_assistido_segundos integer NOT NULL DEFAULT 0,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT treinamento_aula_progresso_aula_id_colaborador_id_key UNIQUE (aula_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_aula_progresso_colab ON public.treinamento_aula_progresso (colaborador_id, treinamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_aula_progresso TO authenticated;
GRANT ALL ON public.treinamento_aula_progresso TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_quiz_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nota_obtida numeric(5,2) NOT NULL,
  total_perguntas integer NOT NULL,
  acertos integer NOT NULL,
  aprovado boolean NOT NULL,
  respostas jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_quiz_tentativas TO authenticated;
GRANT ALL ON public.treinamento_quiz_tentativas TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  tempo_acumulado_segundos integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_logs_acesso TO authenticated;
GRANT ALL ON public.treinamento_logs_acesso TO service_role;
