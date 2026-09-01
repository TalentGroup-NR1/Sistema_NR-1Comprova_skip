
-- 1) COLABORADORES: restrict gestor_departamento SELECT to direct reports only
DROP POLICY IF EXISTS "Colaboradores can view their own record" ON public.colaboradores;
CREATE POLICY "Colaboradores can view their own record"
ON public.colaboradores FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin_master(auth.uid())
  OR (
    get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
    AND company_id = get_user_company_id(auth.uid())
  )
  OR (
    get_user_role(auth.uid()) = 'gestor_departamento'::app_role
    AND company_id = get_user_company_id(auth.uid())
    AND gestor_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
  )
);

-- 2) DESLIGAMENTOS_COLABORADOR: scope to user's company via colaborador
DROP POLICY IF EXISTS "RH and Admin can manage desligamentos audit" ON public.desligamentos_colaborador;
CREATE POLICY "Admin master manages all desligamentos"
ON public.desligamentos_colaborador FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Company admins manage own company desligamentos"
ON public.desligamentos_colaborador FOR ALL
USING (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = desligamentos_colaborador.colaborador_id
      AND c.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = desligamentos_colaborador.colaborador_id
      AND c.company_id = get_user_company_id(auth.uid())
  )
);

-- 3) PDI policies: replace email match with direct user_id
DROP POLICY IF EXISTS pdis_colaborador_read ON public.pdis;
CREATE POLICY pdis_colaborador_read ON public.pdis FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.colaboradores c
          WHERE c.id = pdis.colaborador_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS pdis_gestor_access ON public.pdis;
CREATE POLICY pdis_gestor_access ON public.pdis FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.colaboradores c
          WHERE c.id = pdis.gestor_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS pdi_itens_colaborador_read ON public.pdi_itens;
CREATE POLICY pdi_itens_colaborador_read ON public.pdi_itens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pdis pdi
    JOIN public.colaboradores c ON c.id = pdi.colaborador_id
    WHERE pdi.id = pdi_itens.pdi_id AND c.user_id = auth.uid()
  )
);

-- 4) RELATORIOS_EXECUTIVOS_SALVOS: scope by company
DROP POLICY IF EXISTS "Authenticated users can view saved reports" ON public.relatorios_executivos_salvos;
DROP POLICY IF EXISTS "Authenticated users can update saved reports" ON public.relatorios_executivos_salvos;
DROP POLICY IF EXISTS "Authenticated users can insert saved reports" ON public.relatorios_executivos_salvos;
DROP POLICY IF EXISTS "Authenticated users can delete saved reports" ON public.relatorios_executivos_salvos;

CREATE POLICY "View company reports"
ON public.relatorios_executivos_salvos FOR SELECT
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
    AND company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Insert own company reports"
ON public.relatorios_executivos_salvos FOR INSERT
WITH CHECK (
  auth.uid() = criado_por_user_id
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND company_id = get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "Update own reports"
ON public.relatorios_executivos_salvos FOR UPDATE
USING (
  is_admin_master(auth.uid())
  OR (
    criado_por_user_id = auth.uid()
    AND company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    criado_por_user_id = auth.uid()
    AND company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Delete own reports"
ON public.relatorios_executivos_salvos FOR DELETE
USING (
  is_admin_master(auth.uid())
  OR (
    criado_por_user_id = auth.uid()
    AND company_id = get_user_company_id(auth.uid())
  )
);

-- 5) TREINAMENTO_LOGS_ACESSO: scope gestor read to own company
DROP POLICY IF EXISTS "Colaboradores podem ver seus logs" ON public.treinamento_logs_acesso;
CREATE POLICY "Colaboradores podem ver seus logs"
ON public.treinamento_logs_acesso FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.colaboradores c
          WHERE c.id = treinamento_logs_acesso.colaborador_id AND c.user_id = auth.uid())
  OR is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(),'admin_empresa'::app_role)
     OR has_role(auth.uid(),'analista_rh'::app_role)
     OR has_role(auth.uid(),'gestor_departamento'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = treinamento_logs_acesso.colaborador_id
        AND c.company_id = get_user_company_id(auth.uid())
    )
  )
);

-- 6) STORAGE: logos — restrict writes to admins of owning company
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

CREATE POLICY "Admins manage own company logos - insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "Admins manage own company logos - update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "Admins manage own company logos - delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
    )
  )
);

-- 7) STORAGE: certificates — restrict to admins or the colaborador owner
DROP POLICY IF EXISTS "Authenticated users can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own certificates" ON storage.objects;

CREATE POLICY "Certificates - upload by admin or owner colaborador"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_master(auth.uid())
    OR has_role(auth.uid(),'admin_empresa'::app_role)
    OR has_role(auth.uid(),'analista_rh'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Certificates - read scoped"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.certificates cert
    JOIN public.colaboradores c ON c.id = cert.colaborador_id
    WHERE storage.objects.name = 'certificates/' || cert.id || '.pdf'
      AND (
        c.user_id = auth.uid()
        OR is_admin_master(auth.uid())
        OR (
          (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role) OR has_role(auth.uid(),'gestor_departamento'::app_role))
          AND c.company_id = get_user_company_id(auth.uid())
        )
      )
  )
);

-- 8) STORAGE: comunicados_media — restrict writes/deletes to admins of own company
DROP POLICY IF EXISTS "Authenticated users can upload comunicados media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete comunicados media" ON storage.objects;

CREATE POLICY "Comunicados media - admins insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comunicados_media'
  AND (
    is_admin_master(auth.uid())
    OR has_role(auth.uid(),'admin_empresa'::app_role)
    OR has_role(auth.uid(),'analista_rh'::app_role)
  )
);

CREATE POLICY "Comunicados media - admins delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comunicados_media'
  AND (
    is_admin_master(auth.uid())
    OR has_role(auth.uid(),'admin_empresa'::app_role)
    OR has_role(auth.uid(),'analista_rh'::app_role)
  )
);

-- 9) STORAGE: colaboradores-curriculos — scope by colaborador's company
DROP POLICY IF EXISTS "Admin roles can view curriculos" ON storage.objects;
DROP POLICY IF EXISTS "Admin roles can upload curriculos" ON storage.objects;
DROP POLICY IF EXISTS "Admin roles can update curriculos" ON storage.objects;
DROP POLICY IF EXISTS "Admin roles can delete curriculos" ON storage.objects;

CREATE POLICY "Curriculos - admins same-company read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'colaboradores-curriculos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_user_company_id(auth.uid())
      )
    )
  )
);

CREATE POLICY "Curriculos - admins same-company write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'colaboradores-curriculos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_user_company_id(auth.uid())
      )
    )
  )
);

CREATE POLICY "Curriculos - admins same-company update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'colaboradores-curriculos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_user_company_id(auth.uid())
      )
    )
  )
);

CREATE POLICY "Curriculos - admins same-company delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'colaboradores-curriculos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_user_company_id(auth.uid())
      )
    )
  )
);

-- 10) STORAGE: fechamentos-ponto — scope to company in path
DROP POLICY IF EXISTS "Admins manage fechamentos bucket" ON storage.objects;

CREATE POLICY "Fechamentos - admins same-company ALL"
ON storage.objects FOR ALL
USING (
  bucket_id = 'fechamentos-ponto'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'fechamentos-ponto'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(),'admin_empresa'::app_role) OR has_role(auth.uid(),'analista_rh'::app_role))
      AND (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
    )
  )
);
