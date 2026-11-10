
-- 1. Drop unscoped duplicate ALL policies
DROP POLICY IF EXISTS "Admin pode gerenciar categorias" ON public.categorias_treinamento;
DROP POLICY IF EXISTS "Admin pode gerenciar alternativas quiz" ON public.treinamento_quiz_alternativas;
DROP POLICY IF EXISTS "Admin pode gerenciar quiz config" ON public.treinamento_quiz_config;
DROP POLICY IF EXISTS "Admin pode gerenciar perguntas quiz" ON public.treinamento_quiz_perguntas;

-- 2. Tighten profiles: same-company SELECT only for admin roles
DROP POLICY IF EXISTS "Users can view profiles from same company" ON public.profiles;
CREATE POLICY "Admins can view profiles from same company"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_admin_master(auth.uid())
  OR (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  )
);

-- 3. envios_cuidar_plus: allow colaborador to read own envios
CREATE POLICY "Colaborador pode ver seus envios cuidar plus"
ON public.envios_cuidar_plus
FOR SELECT
TO authenticated
USING (colaborador_id = get_my_colaborador_id());

-- 4. pulse_access_logs: allow company admins to read their own company's logs
CREATE POLICY "Admins de empresa podem ver logs da empresa"
ON public.pulse_access_logs
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.pulse_campaigns c
    WHERE c.id = pulse_access_logs.campaign_id
      AND c.company_id = get_my_company_id()
  )
);

-- 5. Storage: beneficios-imagens scoped by benefit's company
DROP POLICY IF EXISTS admin_upload_beneficios_imagens ON storage.objects;
DROP POLICY IF EXISTS admin_update_beneficios_imagens ON storage.objects;
DROP POLICY IF EXISTS admin_delete_beneficios_imagens ON storage.objects;

CREATE POLICY admin_upload_beneficios_imagens
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'beneficios-imagens'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.company_id = get_my_company_id()
    )
  )
);

CREATE POLICY admin_update_beneficios_imagens
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'beneficios-imagens'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.company_id = get_my_company_id()
    )
  )
);

CREATE POLICY admin_delete_beneficios_imagens
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'beneficios-imagens'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.company_id = get_my_company_id()
    )
  )
);

-- 6. Storage: colaboradores-avatars scoped by colaborador's company
DROP POLICY IF EXISTS "Admins and HR can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins and HR can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins and HR can delete avatars" ON storage.objects;

CREATE POLICY "Admins and HR can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'colaboradores-avatars'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR split_part(name, '/', 1) = 'new'
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.company_id = get_my_company_id()
    )
  )
);

CREATE POLICY "Admins and HR can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'colaboradores-avatars'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.company_id = get_my_company_id()
    )
  )
);

CREATE POLICY "Admins and HR can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'colaboradores-avatars'
  AND get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.company_id = get_my_company_id()
    )
  )
);

-- 7. Storage: comunicados_media — update/delete restricted to uploader or admin_master
DROP POLICY IF EXISTS "Comunicados media - admins delete" ON storage.objects;

CREATE POLICY "Comunicados media - owner or master delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comunicados_media'
  AND (
    is_admin_master(auth.uid())
    OR owner = auth.uid()
  )
);

CREATE POLICY "Comunicados media - owner or master update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comunicados_media'
  AND (
    is_admin_master(auth.uid())
    OR owner = auth.uid()
  )
);
