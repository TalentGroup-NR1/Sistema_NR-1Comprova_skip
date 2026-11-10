-- Add new columns to colaboradores
ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS alinhamento_notas TEXT,
ADD COLUMN IF NOT EXISTS curriculo_path TEXT;

-- Create private bucket for curriculos
INSERT INTO storage.buckets (id, name, public)
VALUES ('colaboradores-curriculos', 'colaboradores-curriculos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket: SELECT
CREATE POLICY "Admin roles can view curriculos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'colaboradores-curriculos'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- RLS policies for the bucket: INSERT
CREATE POLICY "Admin roles can upload curriculos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'colaboradores-curriculos'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- RLS policies for the bucket: UPDATE
CREATE POLICY "Admin roles can update curriculos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'colaboradores-curriculos'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- RLS policies for the bucket: DELETE
CREATE POLICY "Admin roles can delete curriculos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'colaboradores-curriculos'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);