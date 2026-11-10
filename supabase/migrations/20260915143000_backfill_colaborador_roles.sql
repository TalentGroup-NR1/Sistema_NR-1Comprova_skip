BEGIN;
  SET LOCAL ROLE postgres;
  
  -- Garante que todos os usuarios listados em colaboradores tenham a role 'colaborador'
  INSERT INTO public.user_roles (user_id, role)
  SELECT c.user_id, 'colaborador'
  FROM public.colaboradores c
  WHERE c.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = c.user_id AND ur.role = 'colaborador'
    );

COMMIT;
