-- Adicionar campo de data de desligamento na tabela colaboradores
ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS termination_date date NULL;

-- Índice para buscas por mês de desligamento
CREATE INDEX IF NOT EXISTS idx_colaboradores_termination_date 
ON public.colaboradores(termination_date) 
WHERE termination_date IS NOT NULL;

-- Índice para buscas por mês de admissão (para contratados do mês)
CREATE INDEX IF NOT EXISTS idx_colaboradores_admission_date 
ON public.colaboradores(admission_date);

-- Índice para buscas por mês de nascimento (para aniversariantes)
CREATE INDEX IF NOT EXISTS idx_colaboradores_birth_date 
ON public.colaboradores(birth_date);