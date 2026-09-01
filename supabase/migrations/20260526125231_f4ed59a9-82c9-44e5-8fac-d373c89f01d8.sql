
-- 1) Bucket privado para materiais do Cuidar+
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cuidar-materiais',
  'cuidar-materiais',
  false,
  524288000, -- 500 MB
  ARRAY[
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    'application/pdf',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png','image/jpeg','image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Novas colunas em cuidar_conteudos
ALTER TABLE public.cuidar_conteudos
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'url',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS tamanho_bytes bigint;

ALTER TABLE public.cuidar_conteudos
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE public.cuidar_conteudos
  DROP CONSTRAINT IF EXISTS cuidar_conteudos_origem_check;
ALTER TABLE public.cuidar_conteudos
  ADD CONSTRAINT cuidar_conteudos_origem_check
  CHECK (origem IN ('url','upload'));

ALTER TABLE public.cuidar_conteudos
  DROP CONSTRAINT IF EXISTS cuidar_conteudos_origem_payload_check;
ALTER TABLE public.cuidar_conteudos
  ADD CONSTRAINT cuidar_conteudos_origem_payload_check
  CHECK (
    (origem = 'url' AND url IS NOT NULL AND length(url) > 0)
    OR
    (origem = 'upload' AND storage_path IS NOT NULL AND length(storage_path) > 0)
  );

-- 3) RLS policies do bucket cuidar-materiais
DROP POLICY IF EXISTS "cuidar_materiais_admin_master_all" ON storage.objects;
DROP POLICY IF EXISTS "cuidar_materiais_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "cuidar_materiais_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "cuidar_materiais_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "cuidar_materiais_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "cuidar_materiais_colab_select" ON storage.objects;

-- Admin master: tudo
CREATE POLICY "cuidar_materiais_admin_master_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() = 'admin_master'
)
WITH CHECK (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() = 'admin_master'
);

-- Admin de empresa / Analista RH: leitura de arquivos da própria empresa ou globais
CREATE POLICY "cuidar_materiais_admin_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
  AND (
    (storage.foldername(name))[1] = COALESCE(public.get_my_company_id()::text, '')
    OR (storage.foldername(name))[1] = 'global'
  )
);

CREATE POLICY "cuidar_materiais_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
  AND (storage.foldername(name))[1] = COALESCE(public.get_my_company_id()::text, '')
);

CREATE POLICY "cuidar_materiais_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
  AND (storage.foldername(name))[1] = COALESCE(public.get_my_company_id()::text, '')
);

CREATE POLICY "cuidar_materiais_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
  AND (storage.foldername(name))[1] = COALESCE(public.get_my_company_id()::text, '')
);

-- Colaboradores e gestores: apenas leitura da própria empresa ou globais
CREATE POLICY "cuidar_materiais_colab_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cuidar-materiais'
  AND public.get_my_role() IN ('colaborador','gestor_departamento')
  AND (
    (storage.foldername(name))[1] = COALESCE(public.get_my_company_id()::text, '')
    OR (storage.foldername(name))[1] = 'global'
  )
);
