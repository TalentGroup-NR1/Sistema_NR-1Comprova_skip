-- ============================================================
-- CRIAÇÃO ISOLADA — dimensoes_questionario_cuidar_plus e perguntas_cuidar_plus
-- Depende de: public.questionarios_cuidar_plus (Lote 3D)
-- Rode este script caso o Supabase tenha acusado que perguntas_cuidar_plus
-- (ou dimensoes_questionario_cuidar_plus) não existe.
-- ============================================================

-- 1) dimensoes_questionario_cuidar_plus
CREATE TABLE IF NOT EXISTS public.dimensoes_questionario_cuidar_plus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  codigo          varchar(10) NOT NULL,
  titulo          varchar(200) NOT NULL,
  descricao       text,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dimensoes_questionario_id
  ON public.dimensoes_questionario_cuidar_plus (questionario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dimensoes_questionario_cuidar_plus TO authenticated;
GRANT ALL ON public.dimensoes_questionario_cuidar_plus TO service_role;

-- 2) perguntas_cuidar_plus
CREATE TABLE IF NOT EXISTS public.perguntas_cuidar_plus (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id          uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  pergunta_texto           text NOT NULL,
  tipo_pergunta            varchar(50) NOT NULL,
  order_index              integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  escala_config            jsonb,
  dimensao                 text,
  dimensao_questionario_id uuid REFERENCES public.dimensoes_questionario_cuidar_plus(id) ON DELETE SET NULL,
  is_invertida             boolean NOT NULL DEFAULT false,
  bloco                    text,
  peso                     numeric NOT NULL DEFAULT 1,
  CONSTRAINT perguntas_cuidar_plus_tipo_pergunta_check
    CHECK (tipo_pergunta::text = ANY (ARRAY['LIKERT_5','TEXTO_LIVRE']))
);

CREATE INDEX IF NOT EXISTS idx_perguntas_cuidar_plus_ordem
  ON public.perguntas_cuidar_plus (questionario_id, order_index);
CREATE INDEX IF NOT EXISTS idx_perguntas_dimensao_questionario_id
  ON public.perguntas_cuidar_plus (dimensao_questionario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perguntas_cuidar_plus TO authenticated;
GRANT ALL ON public.perguntas_cuidar_plus TO service_role;
