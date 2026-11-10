
-- Create public bucket for colaborador avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('colaboradores-avatars', 'colaboradores-avatars', true);

-- Allow authenticated users to view files
CREATE POLICY "Anyone can view colaborador avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'colaboradores-avatars');

-- Allow admins and analistas to upload
CREATE POLICY "Admins and HR can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'colaboradores-avatars'
  AND (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  )
);

-- Allow admins and analistas to update
CREATE POLICY "Admins and HR can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'colaboradores-avatars'
  AND (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  )
);

-- Allow admins and analistas to delete
CREATE POLICY "Admins and HR can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'colaboradores-avatars'
  AND (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  )
);
