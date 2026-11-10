-- Migration: 20261007200001_backfill_orphaned_users.sql
-- Backfill profiles and user_roles for orphaned users

-- 1. Insert missing profiles
INSERT INTO public.profiles (id, user_id, full_name, company_id)
SELECT 
  u.id, 
  u.id, 
  COALESCE(c.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 
  c.company_id
FROM auth.users u
LEFT JOIN public.colaboradores c ON c.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
  company_id = COALESCE(profiles.company_id, EXCLUDED.company_id);

-- 2. Insert missing user_roles (Fernanda = gestor_departamento, outros = colaborador)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id, 
  CASE WHEN c.full_name = 'Fernanda Almeida Costa' THEN 'gestor_departamento'::public.app_role ELSE 'colaborador'::public.app_role END
FROM auth.users u
LEFT JOIN public.colaboradores c ON c.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;
