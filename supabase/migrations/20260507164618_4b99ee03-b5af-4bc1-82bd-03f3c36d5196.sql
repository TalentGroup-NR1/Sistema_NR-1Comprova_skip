
-- Tabela tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','concluida')),
  category TEXT CHECK (category IS NULL OR char_length(category) <= 80),
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_status_due ON public.tasks(user_id, status, due_date);
CREATE INDEX idx_tasks_user_position ON public.tasks(user_id, position);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela tasks_reminders
CREATE TABLE public.tasks_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_reminders_user_remind ON public.tasks_reminders(user_id, remind_at);
CREATE INDEX idx_tasks_reminders_task ON public.tasks_reminders(task_id);

ALTER TABLE public.tasks_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_reminders_select_own" ON public.tasks_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_reminders_insert_own" ON public.tasks_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_reminders_update_own" ON public.tasks_reminders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_reminders_delete_own" ON public.tasks_reminders FOR DELETE USING (auth.uid() = user_id);
