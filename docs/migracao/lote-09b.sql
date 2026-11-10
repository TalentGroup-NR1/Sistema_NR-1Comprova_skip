-- ============================================================
-- LOTE 9B — Respostas de avaliação (competências e objetivos)
-- Depende de: avaliacoes (09A), competencias_ciclo, objetivos_ciclo
-- ============================================================

CREATE TABLE IF NOT EXISTS public.avaliacao_respostas_competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  competencia_id uuid NOT NULL REFERENCES public.competencias_ciclo(id) ON DELETE CASCADE,
  respondente_tipo public.respondente_avaliacao_tipo NOT NULL,
  nota_valor text NOT NULL,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_respostas_competencias_unq UNIQUE (avaliacao_id, competencia_id, respondente_tipo)
);

CREATE INDEX IF NOT EXISTS idx_arc_avaliacao ON public.avaliacao_respostas_competencias (avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_arc_competencia ON public.avaliacao_respostas_competencias (competencia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacao_respostas_competencias TO authenticated;
GRANT ALL ON public.avaliacao_respostas_competencias TO service_role;

CREATE TABLE IF NOT EXISTS public.avaliacao_respostas_objetivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  objetivo_id uuid NOT NULL REFERENCES public.objetivos_ciclo(id) ON DELETE CASCADE,
  respondente_tipo public.respondente_avaliacao_tipo NOT NULL,
  nota_valor text NOT NULL,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_respostas_objetivos_unq UNIQUE (avaliacao_id, objetivo_id, respondente_tipo)
);

CREATE INDEX IF NOT EXISTS idx_aro_avaliacao ON public.avaliacao_respostas_objetivos (avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_aro_objetivo ON public.avaliacao_respostas_objetivos (objetivo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacao_respostas_objetivos TO authenticated;
GRANT ALL ON public.avaliacao_respostas_objetivos TO service_role;
