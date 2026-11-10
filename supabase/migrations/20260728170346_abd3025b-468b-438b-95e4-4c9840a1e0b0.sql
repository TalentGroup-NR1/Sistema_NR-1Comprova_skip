-- ENUMs
CREATE TYPE public.unidade_tipo AS ENUM ('matriz','filial','centro_distribuicao','escritorio');
CREATE TYPE public.tipo_exposicao AS ENUM ('continua','intermitente','eventual');

-- ============ UNIDADES ============
CREATE TABLE public.unidades_organizacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  tipo public.unidade_tipo NOT NULL DEFAULT 'matriz',
  endereco text,
  cidade text,
  estado text,
  cep text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_unidades_company ON public.unidades_organizacionais(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades_organizacionais TO authenticated;
GRANT ALL ON public.unidades_organizacionais TO service_role;
ALTER TABLE public.unidades_organizacionais ENABLE ROW LEVEL SECURITY;

-- ============ DEPARTAMENTOS ============
CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  unidade_id uuid NOT NULL REFERENCES public.unidades_organizacionais(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  codigo text,
  responsavel_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_departamentos_company ON public.departamentos(company_id);
CREATE INDEX idx_departamentos_unidade ON public.departamentos(unidade_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departamentos TO authenticated;
GRANT ALL ON public.departamentos TO service_role;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

-- ============ SETORES ============
CREATE TABLE public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  ambiente_fisico text,
  andar text,
  localizacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_setores_company ON public.setores(company_id);
CREATE INDEX idx_setores_departamento ON public.setores(departamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- ============ GHEs ============
CREATE TABLE public.ghes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
  codigo text,
  nome text NOT NULL,
  descricao text,
  tipo_exposicao public.tipo_exposicao NOT NULL DEFAULT 'continua',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ghes_company ON public.ghes(company_id);
CREATE INDEX idx_ghes_setor ON public.ghes(setor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghes TO authenticated;
GRANT ALL ON public.ghes TO service_role;
ALTER TABLE public.ghes ENABLE ROW LEVEL SECURITY;

-- ============ CARGOS ============
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  cbo_codigo text,
  cbo_descricao text,
  tarefa_prescrita text,
  tarefa_real text,
  descricao_atividades text,
  carga_horaria_semanal numeric,
  tempo_exposicao_horas_dia numeric,
  risco_exposicao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cargos_company ON public.cargos(company_id);
CREATE INDEX idx_cargos_ghe ON public.cargos(ghe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- ============ GHE EPIs ============
CREATE TABLE public.ghe_epis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE CASCADE,
  nome_epi text NOT NULL,
  ca_numero text,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ghe_epis_ghe ON public.ghe_epis(ghe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghe_epis TO authenticated;
GRANT ALL ON public.ghe_epis TO service_role;
ALTER TABLE public.ghe_epis ENABLE ROW LEVEL SECURITY;

-- ============ CBO (global) ============
CREATE TABLE public.cbo_ocupacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cbo_titulo ON public.cbo_ocupacoes(titulo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbo_ocupacoes TO authenticated;
GRANT ALL ON public.cbo_ocupacoes TO service_role;
ALTER TABLE public.cbo_ocupacoes ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS updated_at ============
CREATE TRIGGER trg_unidades_updated BEFORE UPDATE ON public.unidades_organizacionais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_departamentos_updated BEFORE UPDATE ON public.departamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_setores_updated BEFORE UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ghes_updated BEFORE UPDATE ON public.ghes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cargos_updated BEFORE UPDATE ON public.cargos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ghe_epis_updated BEFORE UPDATE ON public.ghe_epis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cbo_updated BEFORE UPDATE ON public.cbo_ocupacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ POLICIES ============
-- unidades
CREATE POLICY "estrut_unidades_select" ON public.unidades_organizacionais FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_unidades_insert" ON public.unidades_organizacionais FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_unidades_update" ON public.unidades_organizacionais FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_unidades_delete" ON public.unidades_organizacionais FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- departamentos
CREATE POLICY "estrut_departamentos_select" ON public.departamentos FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_departamentos_insert" ON public.departamentos FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_departamentos_update" ON public.departamentos FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_departamentos_delete" ON public.departamentos FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- setores
CREATE POLICY "estrut_setores_select" ON public.setores FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_setores_insert" ON public.setores FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_setores_update" ON public.setores FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_setores_delete" ON public.setores FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- ghes
CREATE POLICY "estrut_ghes_select" ON public.ghes FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_ghes_insert" ON public.ghes FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_ghes_update" ON public.ghes FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_ghes_delete" ON public.ghes FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- cargos
CREATE POLICY "estrut_cargos_select" ON public.cargos FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_cargos_insert" ON public.cargos FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_cargos_update" ON public.cargos FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_cargos_delete" ON public.cargos FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- ghe_epis
CREATE POLICY "estrut_epis_select" ON public.ghe_epis FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_epis_insert" ON public.ghe_epis FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_epis_update" ON public.ghe_epis FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_epis_delete" ON public.ghe_epis FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- cbo (global)
CREATE POLICY "cbo_select_all" ON public.cbo_ocupacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cbo_insert" ON public.cbo_ocupacoes FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR public.get_my_role() IN ('admin_empresa','analista_rh'));
CREATE POLICY "cbo_update" ON public.cbo_ocupacoes FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR public.get_my_role() IN ('admin_empresa','analista_rh'))
WITH CHECK (public.is_admin_master(auth.uid()) OR public.get_my_role() IN ('admin_empresa','analista_rh'));
CREATE POLICY "cbo_delete" ON public.cbo_ocupacoes FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR public.get_my_role() = 'admin_empresa');