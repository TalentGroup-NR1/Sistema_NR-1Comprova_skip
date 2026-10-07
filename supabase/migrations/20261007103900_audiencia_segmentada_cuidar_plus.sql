-- Tabela de vinculo para departamentos alvo da campanha
CREATE TABLE public.questionarios_cuidar_plus_alvos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionario_id UUID NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
    departamento_nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questionario_id, departamento_nome)
);

GRANT ALL ON TABLE public.questionarios_cuidar_plus_alvos TO anon, authenticated, service_role;

-- Adiciona o tipo de audiencia no questionario principal
ALTER TABLE public.questionarios_cuidar_plus 
  ADD COLUMN audiencia_tipo VARCHAR(50) NOT NULL DEFAULT 'todos'
  CHECK (audiencia_tipo IN ('todos', 'departamentos'));

-- Habilitar RLS na nova tabela
ALTER TABLE public.questionarios_cuidar_plus_alvos ENABLE ROW LEVEL SECURITY;

-- Policy de acesso baseada no tenant da campanha
CREATE POLICY "Users can access their company cuidamais alvos"
ON public.questionarios_cuidar_plus_alvos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = questionarios_cuidar_plus_alvos.questionario_id
    AND q.company_id = public.get_my_company_id()
  )
);
