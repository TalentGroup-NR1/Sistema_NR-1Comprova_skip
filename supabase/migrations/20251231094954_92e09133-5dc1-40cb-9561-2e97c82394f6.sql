-- =====================================================
-- MÓDULO CUIDAR+ (Saúde Mental - NR1)
-- =====================================================

-- Tabela: questionarios_cuidar_plus
CREATE TABLE public.questionarios_cuidar_plus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  data_ativacao TIMESTAMPTZ,
  data_desativacao TIMESTAMPTZ,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_questionarios_cuidar_plus_company ON public.questionarios_cuidar_plus(company_id);
CREATE INDEX idx_questionarios_cuidar_plus_active ON public.questionarios_cuidar_plus(is_active, company_id);

-- Trigger para updated_at
CREATE TRIGGER update_questionarios_cuidar_plus_updated_at
  BEFORE UPDATE ON public.questionarios_cuidar_plus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.questionarios_cuidar_plus ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin/RH pode gerenciar
CREATE POLICY "Admin pode gerenciar questionarios cuidar plus"
ON public.questionarios_cuidar_plus FOR ALL USING (
  is_admin_master(auth.uid()) OR
  (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid())) OR
  (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()))
) WITH CHECK (
  is_admin_master(auth.uid()) OR
  (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid())) OR
  (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()))
);

-- =====================================================
-- Tabela: perguntas_cuidar_plus
-- =====================================================
CREATE TABLE public.perguntas_cuidar_plus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id UUID NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  pergunta_texto TEXT NOT NULL,
  tipo_pergunta VARCHAR(50) NOT NULL CHECK (tipo_pergunta IN ('LIKERT_5', 'TEXTO_LIVRE')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para ordenação
CREATE INDEX idx_perguntas_cuidar_plus_ordem ON public.perguntas_cuidar_plus(questionario_id, order_index);

-- Trigger para updated_at
CREATE TRIGGER update_perguntas_cuidar_plus_updated_at
  BEFORE UPDATE ON public.perguntas_cuidar_plus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.perguntas_cuidar_plus ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Segue permissão do questionário pai
CREATE POLICY "Admin pode gerenciar perguntas cuidar plus"
ON public.perguntas_cuidar_plus FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = perguntas_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) OR
      (has_role(auth.uid(), 'admin_empresa') AND q.company_id = get_user_company_id(auth.uid())) OR
      (has_role(auth.uid(), 'analista_rh') AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = perguntas_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) OR
      (has_role(auth.uid(), 'admin_empresa') AND q.company_id = get_user_company_id(auth.uid())) OR
      (has_role(auth.uid(), 'analista_rh') AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
);

-- =====================================================
-- Tabela: envios_cuidar_plus (Links Únicos por Colaborador)
-- =====================================================
CREATE TABLE public.envios_cuidar_plus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id UUID NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'RESPONDIDO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  
  UNIQUE(questionario_id, colaborador_id)
);

-- Índices
CREATE INDEX idx_envios_cuidar_plus_token ON public.envios_cuidar_plus(token);
CREATE INDEX idx_envios_cuidar_plus_questionario ON public.envios_cuidar_plus(questionario_id);

-- Enable RLS
ALTER TABLE public.envios_cuidar_plus ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin/RH pode gerenciar envios
CREATE POLICY "Admin pode gerenciar envios cuidar plus"
ON public.envios_cuidar_plus FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = envios_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) OR
      (has_role(auth.uid(), 'admin_empresa') AND q.company_id = get_user_company_id(auth.uid())) OR
      (has_role(auth.uid(), 'analista_rh') AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = envios_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) OR
      (has_role(auth.uid(), 'admin_empresa') AND q.company_id = get_user_company_id(auth.uid())) OR
      (has_role(auth.uid(), 'analista_rh') AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
);

-- =====================================================
-- Tabela: respostas_cuidar_plus (Anonimato Prioritário)
-- =====================================================
CREATE TABLE public.respostas_cuidar_plus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id UUID NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.perguntas_cuidar_plus(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- ID anônimo único por sessão de preenchimento
  resposta_valor TEXT NOT NULL,
  colaborador_id_identificado UUID REFERENCES public.colaboradores(id), -- SOMENTE se deseja_contato = true
  deseja_contato BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para análises anônimas
CREATE INDEX idx_respostas_cuidar_plus_questionario ON public.respostas_cuidar_plus(questionario_id);
CREATE INDEX idx_respostas_cuidar_plus_session ON public.respostas_cuidar_plus(session_id);
CREATE INDEX idx_respostas_cuidar_plus_contato ON public.respostas_cuidar_plus(deseja_contato, colaborador_id_identificado);

-- Enable RLS
ALTER TABLE public.respostas_cuidar_plus ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin/RH pode apenas visualizar (não editar)
CREATE POLICY "Admin pode visualizar respostas cuidar plus"
ON public.respostas_cuidar_plus FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = respostas_cuidar_plus.questionario_id
    AND (
      is_admin_master(auth.uid()) OR
      (has_role(auth.uid(), 'admin_empresa') AND q.company_id = get_user_company_id(auth.uid())) OR
      (has_role(auth.uid(), 'analista_rh') AND q.company_id = get_user_company_id(auth.uid()))
    )
  )
);

-- =====================================================
-- RPC Function: Obter Questionário por Token (Público)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cuidar_plus_by_token(p_token UUID)
RETURNS TABLE (
  questionario_id UUID,
  titulo VARCHAR,
  descricao TEXT,
  colaborador_name VARCHAR,
  already_submitted BOOLEAN,
  perguntas JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.titulo,
    q.descricao,
    c.full_name,
    e.status = 'RESPONDIDO',
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'pergunta_texto', p.pergunta_texto,
        'tipo_pergunta', p.tipo_pergunta,
        'order_index', p.order_index
      ) ORDER BY p.order_index)
      FROM perguntas_cuidar_plus p
      WHERE p.questionario_id = q.id
    )
  FROM envios_cuidar_plus e
  JOIN questionarios_cuidar_plus q ON q.id = e.questionario_id
  JOIN colaboradores c ON c.id = e.colaborador_id
  WHERE e.token = p_token AND q.is_active = true;
END;
$$;

-- =====================================================
-- RPC Function: Submeter Respostas (com Lógica de Privacidade)
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_cuidar_plus_responses(
  p_token UUID,
  p_respostas JSONB,
  p_deseja_contato BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_envio RECORD;
  v_session_id UUID;
  v_resposta JSONB;
BEGIN
  -- Buscar envio
  SELECT e.id, e.status, e.colaborador_id, q.id as questionario_id
  INTO v_envio
  FROM envios_cuidar_plus e
  JOIN questionarios_cuidar_plus q ON q.id = e.questionario_id
  WHERE e.token = p_token;
  
  IF v_envio IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF v_envio.status = 'RESPONDIDO' THEN
    RAISE EXCEPTION 'Este questionário já foi respondido';
  END IF;
  
  -- Gerar session_id anônimo
  v_session_id := gen_random_uuid();
  
  -- Inserir respostas
  FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)
  LOOP
    INSERT INTO respostas_cuidar_plus (
      questionario_id,
      pergunta_id,
      session_id,
      resposta_valor,
      deseja_contato,
      colaborador_id_identificado
    ) VALUES (
      v_envio.questionario_id,
      (v_resposta->>'pergunta_id')::UUID,
      v_session_id,
      v_resposta->>'resposta_valor',
      p_deseja_contato,
      -- PRIVACIDADE: Só vincula ao colaborador se deseja contato
      CASE WHEN p_deseja_contato THEN v_envio.colaborador_id ELSE NULL END
    );
  END LOOP;
  
  -- Marcar envio como respondido
  UPDATE envios_cuidar_plus 
  SET status = 'RESPONDIDO', responded_at = now()
  WHERE id = v_envio.id;
  
  RETURN TRUE;
END;
$$;