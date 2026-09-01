-- Corrigir política RLS do bucket treinamentos para garantir acesso autenticado

-- Remover política antiga
DROP POLICY IF EXISTS "Authenticated can download training files" ON storage.objects;

-- Criar política corrigida com verificação explícita de autenticação
CREATE POLICY "Authenticated users can download training files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'treinamentos'
  AND auth.uid() IS NOT NULL
);