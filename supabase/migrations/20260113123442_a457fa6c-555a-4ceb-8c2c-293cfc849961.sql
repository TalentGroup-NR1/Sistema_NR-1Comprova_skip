-- Adicionar coluna escala_config para configuração personalizada de escalas Likert
ALTER TABLE public.perguntas_cuidar_plus 
ADD COLUMN IF NOT EXISTS escala_config jsonb DEFAULT NULL;

-- Atualizar perguntas Likert existentes com a escala padrão
UPDATE public.perguntas_cuidar_plus 
SET escala_config = '[
  {"value": 1, "label": "Discordo totalmente"},
  {"value": 2, "label": "Discordo"},
  {"value": 3, "label": "Nem concordo nem discordo"},
  {"value": 4, "label": "Concordo"},
  {"value": 5, "label": "Concordo totalmente"}
]'::jsonb
WHERE tipo_pergunta = 'LIKERT_5' AND escala_config IS NULL;