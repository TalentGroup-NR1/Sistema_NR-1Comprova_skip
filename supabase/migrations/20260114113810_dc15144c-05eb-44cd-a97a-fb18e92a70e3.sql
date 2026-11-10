-- Make the comunicados-anexos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'comunicados-anexos';

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view comunicados anexos" ON storage.objects;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view comunicados anexos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comunicados-anexos' 
  AND auth.uid() IS NOT NULL
);