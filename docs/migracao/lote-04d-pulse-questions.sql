-- ============================================================-- LOTE 4D EXTRA — Tabela pulse_questions (depende de pulse_campaigns)-- Rode este script APÓS o lote-03d.sql (onde pulse_campaigns é criada).-- ============================================================

CREATE TABLE IF NOT EXISTS public.pulse_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  pergunta    text NOT NULL,
  tipo        public.pulse_question_type NOT NULL DEFAULT 'escala_0_5'::public.pulse_question_type,
  ordem       integer NOT NULL DEFAULT 0,
  obrigatoria boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_questions_campaign
  ON public.pulse_questions (campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_questions TO authenticated;
GRANT ALL ON public.pulse_questions TO service_role;
