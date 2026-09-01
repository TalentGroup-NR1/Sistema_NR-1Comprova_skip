-- Tabela de histórico de promoções
CREATE TABLE promocoes_colaborador (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Data da promoção
  data_promocao DATE NOT NULL,
  
  -- Dados anteriores (snapshot)
  cargo_anterior VARCHAR NOT NULL,
  salario_anterior NUMERIC(10,2) NOT NULL,
  nivel_anterior VARCHAR,
  departamento_anterior VARCHAR,
  
  -- Novos dados
  cargo_novo VARCHAR NOT NULL,
  salario_novo NUMERIC(10,2) NOT NULL,
  nivel_novo VARCHAR,
  departamento_novo VARCHAR,
  
  -- Metadados
  motivo TEXT,
  aprovado_por VARCHAR NOT NULL,
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_promocoes_colaborador_id ON promocoes_colaborador(colaborador_id);
CREATE INDEX idx_promocoes_data ON promocoes_colaborador(data_promocao DESC);
CREATE INDEX idx_promocoes_company_id ON promocoes_colaborador(company_id);

-- Habilitar RLS
ALTER TABLE promocoes_colaborador ENABLE ROW LEVEL SECURITY;

-- Admin Master: acesso total
CREATE POLICY "admin_master_full_access_promocoes" ON promocoes_colaborador
FOR ALL USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

-- Admin Empresa: gerencia promoções da própria empresa
CREATE POLICY "admin_empresa_manage_promocoes" ON promocoes_colaborador
FOR ALL USING (
  has_role(auth.uid(), 'admin_empresa') AND 
  company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin_empresa') AND 
  company_id = get_user_company_id(auth.uid())
);

-- Analista RH: gerencia promoções da própria empresa
CREATE POLICY "analista_rh_manage_promocoes" ON promocoes_colaborador
FOR ALL USING (
  has_role(auth.uid(), 'analista_rh') AND 
  company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'analista_rh') AND 
  company_id = get_user_company_id(auth.uid())
);

-- Gestor: apenas visualiza promoções da empresa
CREATE POLICY "gestor_view_promocoes" ON promocoes_colaborador
FOR SELECT USING (
  has_role(auth.uid(), 'gestor_departamento') AND 
  company_id = get_user_company_id(auth.uid())
);

-- Colaborador: visualiza apenas suas próprias promoções
CREATE POLICY "colaborador_view_own_promocoes" ON promocoes_colaborador
FOR SELECT USING (
  colaborador_id IN (
    SELECT id FROM colaboradores WHERE user_id = auth.uid()
  )
);