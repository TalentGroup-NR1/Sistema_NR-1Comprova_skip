
-- 1. Add columns to colaboradores
ALTER TABLE colaboradores ADD COLUMN is_banco_horas BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE colaboradores ADD COLUMN jornada_diaria_minutos INTEGER DEFAULT 480;

-- 2. Create banco_horas_fechamentos table
CREATE TABLE banco_horas_fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  saldo_minutos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE banco_horas_fechamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banco_horas_fechamentos"
ON banco_horas_fechamentos FOR ALL TO authenticated
USING (
  public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  AND (public.get_my_role() = 'admin_master' OR company_id = public.get_my_company_id())
);

CREATE POLICY "Colaboradores can view own banco_horas_fechamentos"
ON banco_horas_fechamentos FOR SELECT TO authenticated
USING (
  colaborador_id IN (
    SELECT id FROM colaboradores WHERE user_id = auth.uid()
  )
);

-- 3. Add periodo_fechamento_banco to ponto_configuracoes
ALTER TABLE ponto_configuracoes ADD COLUMN periodo_fechamento_banco TEXT NOT NULL DEFAULT 'quadrimestral';
