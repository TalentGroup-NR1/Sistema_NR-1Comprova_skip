
CREATE TABLE public.cuidar_conteudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('video','artigo','cartilha')),
  url text NOT NULL,
  categoria text NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cuidar_conteudos_company ON public.cuidar_conteudos(company_id);
CREATE INDEX idx_cuidar_conteudos_status ON public.cuidar_conteudos(status);

ALTER TABLE public.cuidar_conteudos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cuidar_conteudos_updated_at
BEFORE UPDATE ON public.cuidar_conteudos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- admin_master: tudo
CREATE POLICY "cuidar_conteudos_admin_master_all"
ON public.cuidar_conteudos FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

-- admin_empresa / analista_rh: CRUD no escopo da empresa
CREATE POLICY "cuidar_conteudos_admin_empresa_all"
ON public.cuidar_conteudos FOR ALL
USING (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND company_id = get_my_company_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND company_id = get_my_company_id()
);

-- colaborador / gestor: leitura de ativos da empresa ou globais
CREATE POLICY "cuidar_conteudos_colaborador_read"
ON public.cuidar_conteudos FOR SELECT
USING (
  status = 'ativo'
  AND (
    company_id IS NULL
    OR company_id = get_my_company_id()
  )
);
