-- 1. CATALOGO
CREATE TABLE public.nr1_riscos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL,
  nome varchar(200) NOT NULL,
  categoria varchar(30) NOT NULL,
  descricao text,
  fatores_risco text,
  medidas_controle text,
  palavras_chave text,
  editavel boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr1_riscos_catalogo_categoria_chk CHECK (categoria IN ('fisico','quimico','biologico','ergonomico','psicossocial','acidente'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_riscos_catalogo TO authenticated;
GRANT ALL ON public.nr1_riscos_catalogo TO service_role;
ALTER TABLE public.nr1_riscos_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_select_auth" ON public.nr1_riscos_catalogo
  FOR SELECT TO authenticated
  USING (company_id IS NULL OR company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()));

CREATE POLICY "catalogo_insert_admin" ON public.nr1_riscos_catalogo
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'admin_master')
     OR public.has_role(auth.uid(),'admin_empresa')
     OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  );

CREATE POLICY "catalogo_update_admin" ON public.nr1_riscos_catalogo
  FOR UPDATE TO authenticated
  USING (
    editavel = true
    AND (public.has_role(auth.uid(),'admin_master')
         OR public.has_role(auth.uid(),'admin_empresa')
         OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  )
  WITH CHECK (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());

CREATE POLICY "catalogo_delete_admin" ON public.nr1_riscos_catalogo
  FOR DELETE TO authenticated
  USING (
    editavel = true
    AND (public.has_role(auth.uid(),'admin_master')
         OR public.has_role(auth.uid(),'admin_empresa')
         OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  );

-- 2. RISCOS POR GHE
CREATE TABLE public.nr1_ghe_riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  risco_id uuid REFERENCES public.nr1_riscos_catalogo(id) ON DELETE SET NULL,
  nome_risco varchar(200) NOT NULL,
  categoria varchar(30) NOT NULL,
  probabilidade int NOT NULL CHECK (probabilidade BETWEEN 1 AND 5),
  severidade int NOT NULL CHECK (severidade BETWEEN 1 AND 5),
  nivel_risco int GENERATED ALWAYS AS (probabilidade * severidade) STORED,
  fonte varchar(30) NOT NULL DEFAULT 'manual',
  origem_dados text,
  descricao text,
  controles_existentes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr1_ghe_riscos_categoria_chk CHECK (categoria IN ('fisico','quimico','biologico','ergonomico','psicossocial','acidente')),
  CONSTRAINT nr1_ghe_riscos_fonte_chk CHECK (fonte IN ('manual','automatico','psicossocial'))
);
CREATE INDEX idx_nr1_ghe_riscos_ghe ON public.nr1_ghe_riscos(ghe_id) WHERE ativo;
CREATE INDEX idx_nr1_ghe_riscos_company ON public.nr1_ghe_riscos(company_id) WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_ghe_riscos TO authenticated;
GRANT ALL ON public.nr1_ghe_riscos TO service_role;
ALTER TABLE public.nr1_ghe_riscos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghe_riscos_all_admin" ON public.nr1_ghe_riscos
  FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin_master')
     OR public.has_role(auth.uid(),'admin_empresa')
     OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  )
  WITH CHECK (
    (public.has_role(auth.uid(),'admin_master')
     OR public.has_role(auth.uid(),'admin_empresa')
     OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  );

-- 3. CONFIG DA MATRIZ
CREATE TABLE public.nr1_matriz_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  corte_verde int NOT NULL DEFAULT 4,
  corte_amarelo int NOT NULL DEFAULT 9,
  corte_laranja int NOT NULL DEFAULT 14,
  corte_vermelho int NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_matriz_config TO authenticated;
GRANT ALL ON public.nr1_matriz_config TO service_role;
ALTER TABLE public.nr1_matriz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matriz_config_all_admin" ON public.nr1_matriz_config
  FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin_master')
     OR public.has_role(auth.uid(),'admin_empresa')
     OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  )
  WITH CHECK (
    (public.has_role(auth.uid(),'admin_master')
     OR public.has_role(auth.uid(),'admin_empresa')
     OR public.has_role(auth.uid(),'analista_rh'))
    AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  );

-- 4. REGRAS DE SUGESTAO
CREATE TABLE public.nr1_regras_sugestao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_catalogo_id uuid REFERENCES public.nr1_riscos_catalogo(id) ON DELETE CASCADE,
  campo_busca varchar(30),
  palavras_chave text,
  probabilidade_sugerida int NOT NULL DEFAULT 3 CHECK (probabilidade_sugerida BETWEEN 1 AND 5),
  severidade_sugerida int NOT NULL DEFAULT 3 CHECK (severidade_sugerida BETWEEN 1 AND 5),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nr1_regras_sugestao_risco ON public.nr1_regras_sugestao(risco_catalogo_id) WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_regras_sugestao TO authenticated;
GRANT ALL ON public.nr1_regras_sugestao TO service_role;
ALTER TABLE public.nr1_regras_sugestao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regras_sugestao_all_admin" ON public.nr1_regras_sugestao
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin_master')
    OR public.has_role(auth.uid(),'admin_empresa')
    OR public.has_role(auth.uid(),'analista_rh')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin_master')
    OR public.has_role(auth.uid(),'admin_empresa')
    OR public.has_role(auth.uid(),'analista_rh')
  );

-- TRIGGERS updated_at
CREATE TRIGGER trg_nr1_riscos_catalogo_updated BEFORE UPDATE ON public.nr1_riscos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nr1_ghe_riscos_updated BEFORE UPDATE ON public.nr1_ghe_riscos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nr1_matriz_config_updated BEFORE UPDATE ON public.nr1_matriz_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nr1_regras_sugestao_updated BEFORE UPDATE ON public.nr1_regras_sugestao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REALTIME
ALTER TABLE public.nr1_ghe_riscos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nr1_ghe_riscos;