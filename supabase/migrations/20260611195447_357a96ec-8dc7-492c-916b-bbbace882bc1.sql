DROP POLICY IF EXISTS "Authenticated users can download training files" ON storage.objects;

CREATE POLICY "Authenticated users can download training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treinamentos'
  AND (
    is_admin_master(auth.uid())
    OR has_role(auth.uid(), 'admin_empresa'::app_role)
    OR has_role(auth.uid(), 'analista_rh'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE (t.id)::text = (storage.foldername(objects.name))[1]
        AND t.company_id = get_my_company_id()
        AND t.status = 'publicado'
    )
  )
);