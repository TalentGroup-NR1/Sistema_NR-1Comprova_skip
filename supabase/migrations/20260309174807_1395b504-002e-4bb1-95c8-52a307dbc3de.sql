ALTER TABLE beneficios_materiais 
  ADD COLUMN IF NOT EXISTS link_externo VARCHAR NULL,
  ALTER COLUMN arquivo_url DROP NOT NULL;