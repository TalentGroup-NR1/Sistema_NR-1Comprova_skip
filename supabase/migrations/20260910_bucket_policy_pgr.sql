-- Permite que gestor_departamento e engenheiro_sst vejam arquivos do bucket (evidências do plano de ação)
DROP POLICY IF EXISTS "Acesso amplo de leitura para documentos_analise" ON storage.objects;
CREATE POLICY "Acesso amplo de leitura para documentos_analise"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos_analise'
  AND (
    is_admin_master(auth.uid())
    OR (
      get_my_role() IN ('admin_empresa', 'analista_rh', 'gestor_departamento', 'engenheiro_sst')
      AND ((storage.foldername(name))[1])::uuid = get_my_company_id()
    )
  )
);
