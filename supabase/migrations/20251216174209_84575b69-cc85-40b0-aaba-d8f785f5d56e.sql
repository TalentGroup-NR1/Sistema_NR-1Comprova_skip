-- Adicionar novos campos à tabela allocations
ALTER TABLE public.allocations 
  ADD COLUMN manager_name VARCHAR(255),
  ADD COLUMN client_name VARCHAR(255);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.allocations.manager_name IS 'Nome do gestor responsável pela alocação';
COMMENT ON COLUMN public.allocations.client_name IS 'Nome do cliente da alocação';