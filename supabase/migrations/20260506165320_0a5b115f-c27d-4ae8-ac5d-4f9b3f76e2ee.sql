ALTER TABLE public.work_schedules
  ADD COLUMN IF NOT EXISTS dias_semana integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS trabalha_feriados boolean NOT NULL DEFAULT false;