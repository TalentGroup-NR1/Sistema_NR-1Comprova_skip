-- ============================================================
-- LOTE 6A — Questionário dinâmico (seções, perguntas, opções)
-- Depende de: questionario_modelos (Lote 3C)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.questionario_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.questionario_modelos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'padrao'::text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionario_secoes_modelo
  ON public.questionario_secoes (modelo_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_secoes TO authenticated;
GRANT ALL ON public.questionario_secoes TO service_role;

CREATE TABLE IF NOT EXISTS public.questionario_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id uuid NOT NULL REFERENCES public.questionario_secoes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'texto_longo'::text,
  titulo text NOT NULL,
  texto_ajuda text,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionario_perguntas_secao
  ON public.questionario_perguntas (secao_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_perguntas TO authenticated;
GRANT ALL ON public.questionario_perguntas TO service_role;

CREATE TABLE IF NOT EXISTS public.questionario_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id uuid NOT NULL REFERENCES public.questionario_perguntas(id) ON DELETE CASCADE,
  valor text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionario_opcoes_pergunta
  ON public.questionario_opcoes (pergunta_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_opcoes TO authenticated;
GRANT ALL ON public.questionario_opcoes TO service_role;
