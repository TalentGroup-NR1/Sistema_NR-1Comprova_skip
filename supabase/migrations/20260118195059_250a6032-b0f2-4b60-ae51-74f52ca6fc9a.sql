-- Enums para treinamentos
CREATE TYPE treinamento_tipo AS ENUM ('arquivo', 'link', 'video');
CREATE TYPE treinamento_status AS ENUM ('rascunho', 'publicado', 'arquivado');
CREATE TYPE conclusao_status AS ENUM ('nao_iniciado', 'em_andamento', 'apto_concluir', 'concluido');

-- Categorias de treinamentos
CREATE TABLE public.categorias_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Treinamentos
CREATE TABLE public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_treinamento(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo treinamento_tipo NOT NULL,
  
  -- Conteúdo (URL para arquivo no storage ou link externo)
  url_conteudo TEXT NOT NULL,
  nome_arquivo VARCHAR(255),
  
  -- Metadados
  duracao_estimada_minutos INTEGER,
  nivel VARCHAR(50),
  idioma VARCHAR(50) DEFAULT 'Português',
  tags TEXT[],
  
  -- Regras de conclusão
  tempo_minimo_minutos INTEGER DEFAULT 0,
  quiz_obrigatorio BOOLEAN DEFAULT false,
  termo_ciencia_obrigatorio BOOLEAN DEFAULT false,
  texto_termo_ciencia TEXT DEFAULT 'Li e compreendi todo o conteúdo deste treinamento.',
  
  -- Status
  status treinamento_status DEFAULT 'rascunho',
  publicado_em TIMESTAMPTZ,
  publicado_por_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuração do quiz por treinamento
CREATE TABLE public.treinamento_quiz_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL UNIQUE REFERENCES treinamentos(id) ON DELETE CASCADE,
  nota_minima NUMERIC(5,2) DEFAULT 70.00,
  tentativas_maximas INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz (perguntas do treinamento)
CREATE TABLE public.treinamento_quiz_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  pergunta_texto TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alternativas do quiz
CREATE TABLE public.treinamento_quiz_alternativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id UUID NOT NULL REFERENCES treinamento_quiz_perguntas(id) ON DELETE CASCADE,
  texto_alternativa TEXT NOT NULL,
  is_correta BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0
);

-- Log de acesso (evidência por sessão)
CREATE TABLE public.treinamento_logs_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  tempo_acumulado_segundos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progresso do colaborador por treinamento
CREATE TABLE public.treinamento_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  
  status conclusao_status DEFAULT 'nao_iniciado',
  tempo_total_minutos INTEGER DEFAULT 0,
  
  -- Quiz
  quiz_tentativas INTEGER DEFAULT 0,
  quiz_melhor_nota NUMERIC(5,2),
  quiz_aprovado BOOLEAN DEFAULT false,
  quiz_data_aprovacao TIMESTAMPTZ,
  
  -- Termo de ciência
  termo_aceito BOOLEAN DEFAULT false,
  termo_aceito_em TIMESTAMPTZ,
  termo_ip VARCHAR(45),
  
  -- Conclusão
  concluido_em TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(treinamento_id, colaborador_id)
);

-- Histórico de tentativas do quiz
CREATE TABLE public.treinamento_quiz_tentativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  nota_obtida NUMERIC(5,2) NOT NULL,
  total_perguntas INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  aprovado BOOLEAN NOT NULL,
  respostas JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vinculação de treinamentos a itens do PDI
ALTER TABLE public.pdi_itens 
ADD COLUMN treinamento_id UUID REFERENCES treinamentos(id) ON DELETE SET NULL;

-- Triggers para updated_at
CREATE TRIGGER update_categorias_treinamento_updated_at
BEFORE UPDATE ON categorias_treinamento
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treinamentos_updated_at
BEFORE UPDATE ON treinamentos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treinamento_progresso_updated_at
BEFORE UPDATE ON treinamento_progresso
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE categorias_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_quiz_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_quiz_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_quiz_alternativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_quiz_tentativas ENABLE ROW LEVEL SECURITY;

-- Policies para categorias_treinamento
CREATE POLICY "Admin pode gerenciar categorias"
ON categorias_treinamento FOR ALL TO authenticated
USING (
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh')
)
WITH CHECK (
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh')
);

CREATE POLICY "Colaboradores podem ver categorias da empresa"
ON categorias_treinamento FOR SELECT TO authenticated
USING (
  company_id = get_user_company_id(auth.uid()) OR
  is_admin_master(auth.uid())
);

-- Policies para treinamentos
CREATE POLICY "Admin pode gerenciar treinamentos"
ON treinamentos FOR ALL TO authenticated
USING (
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh')
)
WITH CHECK (
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh')
);

CREATE POLICY "Colaboradores podem ver treinamentos publicados"
ON treinamentos FOR SELECT TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()) AND status = 'publicado') OR
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh')
);

-- Policies para quiz config
CREATE POLICY "Admin pode gerenciar quiz config"
ON treinamento_quiz_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
);

CREATE POLICY "Colaboradores podem ver quiz config de treinamentos publicados"
ON treinamento_quiz_config FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND t.status = 'publicado' AND t.company_id = get_user_company_id(auth.uid())
  )
);

-- Policies para perguntas do quiz
CREATE POLICY "Admin pode gerenciar perguntas quiz"
ON treinamento_quiz_perguntas FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
);

CREATE POLICY "Colaboradores podem ver perguntas de treinamentos publicados"
ON treinamento_quiz_perguntas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamentos t 
    WHERE t.id = treinamento_id AND t.status = 'publicado' AND t.company_id = get_user_company_id(auth.uid())
  )
);

-- Policies para alternativas do quiz
CREATE POLICY "Admin pode gerenciar alternativas quiz"
ON treinamento_quiz_alternativas FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamento_quiz_perguntas p
    JOIN treinamentos t ON t.id = p.treinamento_id
    WHERE p.id = pergunta_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM treinamento_quiz_perguntas p
    JOIN treinamentos t ON t.id = p.treinamento_id
    WHERE p.id = pergunta_id AND (
      is_admin_master(auth.uid()) OR 
      has_role(auth.uid(), 'admin_empresa') OR 
      has_role(auth.uid(), 'analista_rh')
    )
  )
);

CREATE POLICY "Colaboradores podem ver alternativas de treinamentos publicados"
ON treinamento_quiz_alternativas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinamento_quiz_perguntas p
    JOIN treinamentos t ON t.id = p.treinamento_id
    WHERE p.id = pergunta_id AND t.status = 'publicado' AND t.company_id = get_user_company_id(auth.uid())
  )
);

-- Policies para logs de acesso
CREATE POLICY "Colaboradores podem inserir seus logs"
ON treinamento_logs_acesso FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores podem atualizar seus logs"
ON treinamento_logs_acesso FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores podem ver seus logs"
ON treinamento_logs_acesso FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  ) OR
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh') OR
  has_role(auth.uid(), 'gestor_departamento')
);

-- Policies para progresso
CREATE POLICY "Colaboradores podem inserir seu progresso"
ON treinamento_progresso FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores podem atualizar seu progresso"
ON treinamento_progresso FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores podem ver seu progresso"
ON treinamento_progresso FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  ) OR
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh') OR
  has_role(auth.uid(), 'gestor_departamento')
);

-- Policies para tentativas do quiz
CREATE POLICY "Colaboradores podem inserir suas tentativas"
ON treinamento_quiz_tentativas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Colaboradores podem ver suas tentativas"
ON treinamento_quiz_tentativas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  ) OR
  is_admin_master(auth.uid()) OR 
  has_role(auth.uid(), 'admin_empresa') OR 
  has_role(auth.uid(), 'analista_rh') OR
  has_role(auth.uid(), 'gestor_departamento')
);

-- Storage bucket para treinamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('treinamentos', 'treinamentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: RH/Admin pode fazer upload
CREATE POLICY "RH can upload training files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'treinamentos' AND
  (is_admin_master(auth.uid()) OR has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'analista_rh'))
);

-- Policy: RH/Admin pode deletar
CREATE POLICY "RH can delete training files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'treinamentos' AND
  (is_admin_master(auth.uid()) OR has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'analista_rh'))
);

-- Policy: Colaboradores podem baixar
CREATE POLICY "Authenticated can download training files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'treinamentos');