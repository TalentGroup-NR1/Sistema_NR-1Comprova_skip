-- Phase 1/2: add new enum values (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_empresa';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analista_rh';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_departamento';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'colaborador';