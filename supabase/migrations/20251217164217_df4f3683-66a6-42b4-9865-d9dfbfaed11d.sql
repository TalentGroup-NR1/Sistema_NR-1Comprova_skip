-- 1. Remover coluna allocation_id da tabela feedback_cycles
ALTER TABLE feedback_cycles DROP COLUMN IF EXISTS allocation_id;

-- 2. Remover coluna allocation da tabela colaboradores
ALTER TABLE colaboradores DROP COLUMN IF EXISTS allocation;

-- 3. Remover tabela allocations (RLS policies são removidas automaticamente)
DROP TABLE IF EXISTS allocations;

-- 4. Remover o enum allocation_status
DROP TYPE IF EXISTS allocation_status;