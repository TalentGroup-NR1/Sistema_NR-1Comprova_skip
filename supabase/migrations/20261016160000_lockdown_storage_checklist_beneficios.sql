-- Migration: Lockdown de Segurança nos Buckets de Storage (checklist-fotos e beneficios-materiais)
-- Data: 2026-10-16
-- Contexto: Elimina vulnerabilidade crítica de acesso cross-tenant em checklist-fotos e beneficios-materiais.

-- 1. Assegurar que os buckets são estritamente privados
UPDATE storage.buckets
SET public = false
WHERE id IN ('checklist-fotos', 'beneficios-materiais');

-- 2. Limpeza de políticas permissivas legadas em checklist-fotos
DROP POLICY IF EXISTS "checklist-fotos-select-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist-fotos-insert-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist-fotos-delete-auth" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_select_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_insert_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_update_scoped" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_delete_scoped" ON storage.objects;

-- 3. Novas Políticas Isoladas por Tenant para checklist-fotos
-- SELECT: Usuário só pode ler fotos da empresa à qual possui vínculo
CREATE POLICY "checklist_fotos_select_scoped"
ON storage.objects
FOR SELECT
TO authenticated
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

-- INSERT: Usuário só pode inserir fotos na pasta da empresa com vínculo ativo
CREATE POLICY "checklist_fotos_insert_scoped"
ON storage.objects
FOR INSERT
TO authenticated
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

-- UPDATE: Usuário só pode atualizar fotos na pasta da empresa com vínculo ativo
CREATE POLICY "checklist_fotos_update_scoped"
ON storage.objects
FOR UPDATE
TO authenticated
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

-- DELETE: Usuário só pode deletar fotos na pasta da empresa com vínculo ativo
CREATE POLICY "checklist_fotos_delete_scoped"
ON storage.objects
FOR DELETE
TO authenticated
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

-- 4. Limpeza e reescrita da política de leitura de beneficios-materiais
DROP POLICY IF EXISTS "beneficios_materiais_read_scoped" ON storage.objects;

CREATE POLICY "beneficios_materiais_read_scoped"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'beneficios-materiais' AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    -- Caso 1: Pasta é o ID do benefício (padrão useBeneficioMateriais / useBeneficioStorage)
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
    -- Caso 2: Pasta é o ID da empresa
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
