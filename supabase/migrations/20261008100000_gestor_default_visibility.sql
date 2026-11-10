INSERT INTO public.module_visibility (company_id, module_key, role, visible)
  SELECT id, module_key, 'gestor_departamento', false
  FROM public.companies CROSS JOIN (VALUES
    ('/estrutura-organizacional'),
    ('/mapa-riscos-nr1')
  ) AS m(module_key)
  ON CONFLICT (company_id, module_key, role) DO NOTHING;
