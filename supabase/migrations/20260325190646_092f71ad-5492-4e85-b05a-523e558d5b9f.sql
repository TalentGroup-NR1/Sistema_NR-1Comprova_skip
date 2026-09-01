
CREATE TABLE public.ponto_compensacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT NOT NULL,
  descricao TEXT NOT NULL,
  total_horas_compensar INTEGER NOT NULL,
  dias_compensacao INTEGER NOT NULL,
  minutos_extras_dia INTEGER GENERATED ALWAYS AS (total_horas_compensar / NULLIF(dias_compensacao, 0)) STORED,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ponto_compensacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master full access on ponto_compensacoes"
  ON public.ponto_compensacoes
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin_master')
  WITH CHECK (public.get_my_role() = 'admin_master');

CREATE POLICY "Company admins manage own compensacoes"
  ON public.ponto_compensacoes
  FOR ALL
  TO authenticated
  USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa', 'analista_rh'))
  WITH CHECK (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa', 'analista_rh'));

CREATE POLICY "Colaboradores read own company compensacoes"
  ON public.ponto_compensacoes
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_my_company_id());
