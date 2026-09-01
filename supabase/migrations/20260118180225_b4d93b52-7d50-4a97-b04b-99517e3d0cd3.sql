-- Add new columns to questionarios_cuidar_plus for flexible model support
ALTER TABLE public.questionarios_cuidar_plus
ADD COLUMN IF NOT EXISTS modelo_analise TEXT NOT NULL DEFAULT 'PADRAO',
ADD COLUMN IF NOT EXISTS escala_config JSONB DEFAULT '[{"valor": 1, "rotulo": "Discordo Totalmente"}, {"valor": 2, "rotulo": "Discordo"}, {"valor": 3, "rotulo": "Neutro"}, {"valor": 4, "rotulo": "Concordo"}, {"valor": 5, "rotulo": "Concordo Totalmente"}]'::jsonb,
ADD COLUMN IF NOT EXISTS config_calculo JSONB DEFAULT '{"limite_risco": 2, "alerta_media_minima": 3.0, "alerta_risco_percentual": 35, "alerta_queda_delta": 0.3}'::jsonb;

-- Add constraint for modelo_analise values
ALTER TABLE public.questionarios_cuidar_plus
ADD CONSTRAINT questionarios_modelo_analise_check 
CHECK (modelo_analise IN ('PADRAO', 'MATRIZ_RISCOS'));

-- Create table for custom dimensions per questionnaire
CREATE TABLE public.dimensoes_questionario_cuidar_plus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questionario_id UUID NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_dimensoes_questionario_id ON public.dimensoes_questionario_cuidar_plus(questionario_id);

-- Enable RLS
ALTER TABLE public.dimensoes_questionario_cuidar_plus ENABLE ROW LEVEL SECURITY;

-- RLS policies for dimensoes_questionario_cuidar_plus (same pattern as parent table questionarios_cuidar_plus)
CREATE POLICY "Admin pode gerenciar dimensoes questionario cuidar plus"
ON public.dimensoes_questionario_cuidar_plus
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = dimensoes_questionario_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) 
      OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND q.company_id = get_user_company_id(auth.uid()))
      OR (has_role(auth.uid(), 'analista_rh'::app_role) AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = questionario_id
    AND (
      is_admin_master(auth.uid()) 
      OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND q.company_id = get_user_company_id(auth.uid()))
      OR (has_role(auth.uid(), 'analista_rh'::app_role) AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
);

-- Add new columns to perguntas_cuidar_plus for analytical metadata
ALTER TABLE public.perguntas_cuidar_plus
ADD COLUMN IF NOT EXISTS dimensao_questionario_id UUID REFERENCES public.dimensoes_questionario_cuidar_plus(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_invertida BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bloco TEXT,
ADD COLUMN IF NOT EXISTS peso NUMERIC NOT NULL DEFAULT 1;

-- Add index for dimension lookups
CREATE INDEX idx_perguntas_dimensao_questionario_id ON public.perguntas_cuidar_plus(dimensao_questionario_id);

-- Trigger for updated_at on dimensoes
CREATE TRIGGER update_dimensoes_questionario_updated_at
BEFORE UPDATE ON public.dimensoes_questionario_cuidar_plus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();