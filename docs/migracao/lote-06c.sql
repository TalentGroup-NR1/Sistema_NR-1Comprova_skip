-- ============================================================
-- LOTE 6C — Quiz de treinamento
-- Depende de: treinamentos (Lote 6B)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.treinamento_quiz_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL UNIQUE REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  nota_minima numeric(5,2) DEFAULT 70.00,
  tentativas_maximas integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_quiz_config TO authenticated;
GRANT ALL ON public.treinamento_quiz_config TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_quiz_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  pergunta_texto text NOT NULL,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treinamento_quiz_perguntas_treinamento
  ON public.treinamento_quiz_perguntas (treinamento_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_quiz_perguntas TO authenticated;
GRANT ALL ON public.treinamento_quiz_perguntas TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_quiz_alternativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id uuid NOT NULL REFERENCES public.treinamento_quiz_perguntas(id) ON DELETE CASCADE,
  texto_alternativa text NOT NULL,
  is_correta boolean DEFAULT false,
  ordem integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_treinamento_quiz_alternativas_pergunta
  ON public.treinamento_quiz_alternativas (pergunta_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_quiz_alternativas TO authenticated;
GRANT ALL ON public.treinamento_quiz_alternativas TO service_role;
