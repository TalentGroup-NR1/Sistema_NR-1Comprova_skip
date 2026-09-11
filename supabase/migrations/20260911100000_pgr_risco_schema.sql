-- Migration: pgr_risco_schema (adiciona campos agnósticos de estrutura)
ALTER TABLE public.nr1_ghe_riscos
  ADD COLUMN IF NOT EXISTS grupo_exposto text,
  ADD COLUMN IF NOT EXISTS nivel integer,
  ADD COLUMN IF NOT EXISTS classificacao text,
  ADD COLUMN IF NOT EXISTS escala_matriz text,
  ADD COLUMN IF NOT EXISTS fonte text,
  ADD COLUMN IF NOT EXISTS confianca integer;
