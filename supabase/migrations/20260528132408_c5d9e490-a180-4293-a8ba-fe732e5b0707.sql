
-- 1) Certificates bucket: tighten INSERT policy
DROP POLICY IF EXISTS "Certificates - upload by admin or owner colaborador" ON storage.objects;

CREATE POLICY "Certificates - upload by admin or owner colaborador"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM certificates cert
      JOIN colaboradores c ON c.id = cert.colaborador_id
      WHERE storage.objects.name = ('certificates/' || cert.id || '.pdf')
        AND (
          c.user_id = auth.uid()
          OR (
            (has_role(auth.uid(), 'admin_empresa'::app_role)
             OR has_role(auth.uid(), 'analista_rh'::app_role))
            AND c.company_id = get_user_company_id(auth.uid())
          )
        )
    )
  )
);

-- 2) Comunicados-anexos: validate company ownership on INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admin can upload comunicados anexos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update comunicados anexos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete comunicados anexos" ON storage.objects;

CREATE POLICY "Admin can upload comunicados anexos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comunicados-anexos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin_empresa'::app_role)
       OR has_role(auth.uid(), 'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM comunicados c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_my_company_id()
      )
    )
  )
);

CREATE POLICY "Admin can update comunicados anexos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'comunicados-anexos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin_empresa'::app_role)
       OR has_role(auth.uid(), 'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM comunicados c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_my_company_id()
      )
    )
  )
);

CREATE POLICY "Admin can delete comunicados anexos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'comunicados-anexos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin_empresa'::app_role)
       OR has_role(auth.uid(), 'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM comunicados c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.company_id = get_my_company_id()
      )
    )
  )
);

-- 3) Treinamentos bucket: validate company on INSERT/DELETE
DROP POLICY IF EXISTS "RH can upload training files" ON storage.objects;
DROP POLICY IF EXISTS "RH can delete training files" ON storage.objects;

CREATE POLICY "RH can upload training files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'treinamentos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin_empresa'::app_role)
       OR has_role(auth.uid(), 'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM treinamentos t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.company_id = get_my_company_id()
      )
    )
  )
);

CREATE POLICY "RH can delete training files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'treinamentos'
  AND (
    is_admin_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin_empresa'::app_role)
       OR has_role(auth.uid(), 'analista_rh'::app_role))
      AND EXISTS (
        SELECT 1 FROM treinamentos t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.company_id = get_my_company_id()
      )
    )
  )
);
