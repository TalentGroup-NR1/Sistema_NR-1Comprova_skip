-- Adicionar novos campos para e-mail pessoal e telefone secundário
-- email_pessoal: obrigatório para novos cadastros (mas permitir NULL para retrocompatibilidade)
-- telefone_secundario: opcional

ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS email_pessoal TEXT,
ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;

-- Criar índice para email_pessoal (para buscas futuras)
CREATE INDEX IF NOT EXISTS idx_colaboradores_email_pessoal ON public.colaboradores(email_pessoal);

-- Comentários descritivos
COMMENT ON COLUMN public.colaboradores.email_pessoal IS 'E-mail pessoal do colaborador (obrigatório para novos cadastros)';
COMMENT ON COLUMN public.colaboradores.telefone_secundario IS 'Telefone secundário do colaborador (opcional)';