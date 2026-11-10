DROP POLICY IF EXISTS "Public can view comunicados media" ON storage.objects;

CREATE POLICY "Authenticated users can view comunicados media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'comunicados_media' AND auth.uid() IS NOT NULL);