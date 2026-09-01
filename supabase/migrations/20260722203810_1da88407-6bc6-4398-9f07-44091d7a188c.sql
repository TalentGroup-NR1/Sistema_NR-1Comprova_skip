
CREATE TABLE public.banco_horas_perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  periodo_fechamento_banco TEXT NOT NULL DEFAULT 'mensal',
  banco_horas_inicio DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT banco_horas_perfis_periodo_check CHECK (
    periodo_fechamento_banco IN ('mensal','bimestral','trimestral','quadrimestral','semestral','anual')
  )
);

CREATE UNIQUE INDEX banco_horas_perfis_padrao_unique
  ON public.banco_horas_perfis(company_id) WHERE is_padrao = true;

CREATE INDEX idx_banco_horas_perfis_company ON public.banco_horas_perfis(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas_perfis TO authenticated;
GRANT ALL ON public.banco_horas_perfis TO service_role;

ALTER TABLE public.banco_horas_perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read perfis banco horas da empresa"
  ON public.banco_horas_perfis FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin_master'::app_role OR company_id = get_my_company_id());

CREATE POLICY "Admin master manage perfis banco horas"
  ON public.banco_horas_perfis FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin_master'::app_role)
  WITH CHECK (get_my_role() = 'admin_master'::app_role);

CREATE POLICY "Admin empresa manage perfis banco horas"
  ON public.banco_horas_perfis FOR ALL
  TO authenticated
  USING (get_my_role() = ANY(ARRAY['admin_empresa'::app_role,'analista_rh'::app_role])
         AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = ANY(ARRAY['admin_empresa'::app_role,'analista_rh'::app_role])
         AND company_id = get_my_company_id());

CREATE TRIGGER trg_banco_horas_perfis_updated_at
  BEFORE UPDATE ON public.banco_horas_perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna no colaborador
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS banco_horas_perfil_id UUID REFERENCES public.banco_horas_perfis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_banco_horas_perfil
  ON public.colaboradores(banco_horas_perfil_id);

-- Seed: um perfil "Padrão" por empresa a partir de ponto_configuracoes
INSERT INTO public.banco_horas_perfis (company_id, nome, periodo_fechamento_banco, banco_horas_inicio, ativo, is_padrao)
SELECT
  pc.company_id,
  'Padrão',
  COALESCE(pc.periodo_fechamento_banco, 'mensal'),
  pc.banco_horas_inicio,
  true,
  true
FROM public.ponto_configuracoes pc
WHERE NOT EXISTS (
  SELECT 1 FROM public.banco_horas_perfis p
  WHERE p.company_id = pc.company_id AND p.is_padrao = true
);
