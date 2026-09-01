
-- Add new job_level enum values
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Júnior';
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Pleno';
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Sênior';
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Especialista I';
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Especialista II';
ALTER TYPE public.job_level ADD VALUE IF NOT EXISTS 'Especialista III';
