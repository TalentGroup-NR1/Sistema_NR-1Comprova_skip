BEGIN;

-- 1. Aplicar a migration
UPDATE storage.buckets
SET public = false
WHERE id IN ('checklist-fotos', 'beneficios-materiais');

DROP POLICY IF EXISTS "checklist-fotos-select-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist-fotos-insert-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist-fotos-delete-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_select_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_insert_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_update_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_delete_scoped" ON storage.objects;

CREATE POLICY "checklist_fotos_select_scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "checklist_fotos_insert_scoped"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "checklist_fotos_update_scoped"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "checklist_fotos_delete_scoped"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'checklist-fotos' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id::text = (storage.foldername(objects.name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "beneficios_materiais_read_scoped" ON storage.objects;

CREATE POLICY "beneficios_materiais_read_scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(objects.name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.user_id = auth.uid() AND uc.company_id = b.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.company_id = b.company_id
          )
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- Preparar dados de teste para benefícios
INSERT INTO public.beneficios (id, company_id, nome, categoria)
VALUES ('00000000-0000-0000-0000-000000000001', '4553d74e-90d6-4988-b529-853b8b8db993', 'Beneficio Teste TG', 'saude'),
       ('00000000-0000-0000-0000-000000000002', '540d02bd-8d5d-429b-b695-8a66f46c499d', 'Beneficio Teste NRCP', 'alimentacao')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
  ('00000000-0000-0000-0000-000000000011', 'beneficios-materiais', '00000000-0000-0000-0000-000000000001/doc_tg.pdf', (SELECT user_id FROM public.user_companies WHERE company_id = '4553d74e-90d6-4988-b529-853b8b8db993' LIMIT 1)),
  ('00000000-0000-0000-0000-000000000012', 'beneficios-materiais', '00000000-0000-0000-0000-000000000002/doc_nrcp.pdf', (SELECT user_id FROM public.profiles WHERE full_name ILIKE 'Mary %' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- MUDAR PARA ROLE AUTHENTICATED COMO MARY (NRCP)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE full_name ILIKE 'Mary %' LIMIT 1), 'role', 'authenticated')::text, true);

-- [PROVA 1: NEGAÇÃO] Mary (NRCP) não pode listar fotos da Horizonte
SELECT '1. negacao_mary_le_fotos_horizonte' AS prova, count(*) AS qtd_visivel
FROM storage.objects
WHERE bucket_id = 'checklist-fotos' AND (storage.foldername(name))[1] = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

-- [PROVA 2: NEGAÇÃO BENEFICIOS] Mary (NRCP) não pode listar material da TG MAIS
SELECT '2. negacao_mary_le_material_tg' AS prova, count(*) AS qtd_visivel
FROM storage.objects
WHERE bucket_id = 'beneficios-materiais' AND name = '00000000-0000-0000-0000-000000000001/doc_tg.pdf';

-- [PROVA 3: PERMISSÃO BENEFICIOS] Mary (NRCP) pode listar material de sua empresa
SELECT '3. permissao_mary_le_material_nrcp' AS prova, count(*) AS qtd_visivel
FROM storage.objects
WHERE bucket_id = 'beneficios-materiais' AND name = '00000000-0000-0000-0000-000000000002/doc_nrcp.pdf';

-- MUDAR PARA ROLE AUTHENTICATED COMO USUÁRIO DA HORIZONTE
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_companies WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' LIMIT 1), 'role', 'authenticated')::text, true);

-- [PROVA 4: PERMISSÃO HORIZONTE] Usuário da Horizonte lê suas fotos legítimas
SELECT '4. permissao_horizonte_le_fotos_proprias' AS prova, count(*) AS qtd_visivel
FROM storage.objects
WHERE bucket_id = 'checklist-fotos' AND (storage.foldername(name))[1] = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

ROLLBACK;
