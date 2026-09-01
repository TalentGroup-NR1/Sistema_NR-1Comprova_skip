
-- Add image_url column to comunicados table
ALTER TABLE public.comunicados ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for comunicados media
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunicados_media', 'comunicados_media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to comunicados_media
CREATE POLICY "Authenticated users can upload comunicados media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comunicados_media');

-- Allow public read access to comunicados_media
CREATE POLICY "Public can view comunicados media"
ON storage.objects FOR SELECT
USING (bucket_id = 'comunicados_media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete comunicados media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comunicados_media');
