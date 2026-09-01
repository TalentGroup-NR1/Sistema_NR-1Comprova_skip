
-- Tabela campanhas (escopo: comunicados)
CREATE TABLE public.campanhas_comunicados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo text NOT NULL,
  descricao text,
  imagem_url text,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campanhas_comunicados_company ON public.campanhas_comunicados(company_id);
CREATE INDEX idx_campanhas_comunicados_periodo ON public.campanhas_comunicados(data_inicio, data_fim);

-- Validação de datas via trigger (CHECK não pode usar funções não-imutáveis)
CREATE OR REPLACE FUNCTION public.validate_campanha_datas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data_inicio > NEW.data_fim THEN
    RAISE EXCEPTION 'Data de início deve ser anterior ou igual à data de fim';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_campanha_datas
BEFORE INSERT OR UPDATE ON public.campanhas_comunicados
FOR EACH ROW EXECUTE FUNCTION public.validate_campanha_datas();

-- updated_at trigger (usa função existente)
CREATE TRIGGER trg_campanhas_comunicados_updated_at
BEFORE UPDATE ON public.campanhas_comunicados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular status dinâmico
CREATE OR REPLACE FUNCTION public.calcular_status_campanha(p_data_inicio date, p_data_fim date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN CURRENT_DATE < p_data_inicio THEN 'agendado'
    WHEN CURRENT_DATE > p_data_fim THEN 'encerrado'
    ELSE 'ativo'
  END;
$$;

-- RLS
ALTER TABLE public.campanhas_comunicados ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado da empresa (admin master vê tudo)
CREATE POLICY "Campanhas: leitura por empresa"
ON public.campanhas_comunicados
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR company_id = public.get_my_company_id()
);

-- Insert/Update/Delete: admin master, admin empresa, analista_rh
CREATE POLICY "Campanhas: insert por admin/rh"
ON public.campanhas_comunicados
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin_master'))
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY "Campanhas: update por admin/rh"
ON public.campanhas_comunicados
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY "Campanhas: delete por admin/rh"
ON public.campanhas_comunicados
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

-- RPC: listar campanhas ativas da empresa do usuário (para dashboard colaborador)
CREATE OR REPLACE FUNCTION public.listar_campanhas_ativas()
RETURNS TABLE (
  id uuid,
  company_id uuid,
  titulo text,
  descricao text,
  imagem_url text,
  data_inicio date,
  data_fim date,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.company_id, c.titulo, c.descricao, c.imagem_url,
    c.data_inicio, c.data_fim,
    public.calcular_status_campanha(c.data_inicio, c.data_fim) AS status,
    c.created_at
  FROM public.campanhas_comunicados c
  WHERE public.calcular_status_campanha(c.data_inicio, c.data_fim) = 'ativo'
    AND (
      public.has_role(auth.uid(), 'admin_master')
      OR c.company_id = public.get_my_company_id()
    )
  ORDER BY c.data_inicio DESC, c.created_at DESC;
$$;
