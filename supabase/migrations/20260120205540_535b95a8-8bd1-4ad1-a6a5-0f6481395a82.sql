-- Add new values to the treinamento_tipo enum for specific file types
ALTER TYPE treinamento_tipo ADD VALUE IF NOT EXISTS 'pdf';
ALTER TYPE treinamento_tipo ADD VALUE IF NOT EXISTS 'ppt';

-- Allow url_conteudo to be nullable for file uploads (will be set after upload)
ALTER TABLE treinamentos ALTER COLUMN url_conteudo DROP NOT NULL;