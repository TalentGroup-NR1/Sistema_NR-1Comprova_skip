-- Adicionar campo dimensao à tabela perguntas_cuidar_plus
ALTER TABLE public.perguntas_cuidar_plus 
ADD COLUMN IF NOT EXISTS dimensao TEXT DEFAULT NULL;

-- Comentário explicativo das dimensões disponíveis
COMMENT ON COLUMN public.perguntas_cuidar_plus.dimensao IS 'Dimensão da pergunta para análise: CARGA_TRABALHO, CLAREZA_PAPEIS, AUTONOMIA_CONTROLE, APOIO_LIDERANCA, RELACOES_CLIMA, RECONHECIMENTO, EQUILIBRIO_VIDA_TRABALHO, SEGURANCA_PSICOLOGICA';