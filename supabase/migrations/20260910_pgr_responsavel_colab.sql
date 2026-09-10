-- Migration: pgr_plano_acao — trocar FK responsavel_id de profiles.id para colaboradores.id
-- Aplicar MANUALMENTE no SQL Editor do projeto alneozvrsuwszlkisbyo
-- NUNCA usar supabase db push

-- Passo 1: Nulificar responsavel_id que apontam para profiles.id
--           (UUIDs que não existem em colaboradores.id)
UPDATE public.pgr_plano_acao
SET responsavel_id = NULL
WHERE responsavel_id IS NOT NULL
  AND responsavel_id NOT IN (SELECT id FROM public.colaboradores);

-- Passo 2: Remover a FK antiga (profiles.id)
ALTER TABLE public.pgr_plano_acao
  DROP CONSTRAINT IF EXISTS pgr_plano_acao_responsavel_id_fkey;

-- Passo 3: Adicionar nova FK apontando para colaboradores.id
ALTER TABLE public.pgr_plano_acao
  ADD CONSTRAINT pgr_plano_acao_responsavel_id_fkey
  FOREIGN KEY (responsavel_id)
  REFERENCES public.colaboradores(id)
  ON DELETE SET NULL;

-- Verificação pós-migration:
-- SELECT tc.constraint_name, ccu.table_name AS foreign_table_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = rc.unique_constraint_name
-- WHERE tc.table_name = 'pgr_plano_acao' AND tc.constraint_type = 'FOREIGN KEY';
