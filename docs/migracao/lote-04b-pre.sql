-- ============================================================
-- LOTE 4B (PRÉ) — tabela public.tasks
-- Rode ANTES do lote-04b.sql (tasks_reminders depende dela).
-- Ela pertencia ao Lote 1, mas não foi criada no seu banco.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  due_date     timestamptz,
  priority     text NOT NULL DEFAULT 'media'::text,
  status       text NOT NULL DEFAULT 'pendente'::text,
  category     text,
  "position"   integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_check CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT tasks_description_check CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT tasks_category_check CHECK (category IS NULL OR char_length(category) <= 80),
  CONSTRAINT tasks_priority_check CHECK (priority = ANY (ARRAY['baixa','media','alta'])),
  CONSTRAINT tasks_status_check CHECK (status = ANY (ARRAY['pendente','concluida']))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON public.tasks (user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_position ON public.tasks (user_id, "position");

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
