-- 1. Simplify hierarchy: make parent links optional
ALTER TABLE public.departamentos ALTER COLUMN unidade_id DROP NOT NULL;
ALTER TABLE public.ghes ALTER COLUMN setor_id DROP NOT NULL;
ALTER TABLE public.cargos ALTER COLUMN ghe_id DROP NOT NULL;

-- 2. Simplify colaborador cargo sync (no longer walks the hierarchy)
CREATE OR REPLACE FUNCTION public.sync_colaborador_cargo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_nome text;
BEGIN
  IF NEW.cargo_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id) THEN
    SELECT c.nome INTO v_nome FROM public.cargos c WHERE c.id = NEW.cargo_id;
    IF v_nome IS NOT NULL THEN NEW.job_title := v_nome; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Job descriptions
CREATE TABLE public.descricoes_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo text NOT NULL,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE RESTRICT,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  ghe_id uuid REFERENCES public.ghes(id) ON DELETE RESTRICT,
  cbo_codigo text,
  cbo_descricao text,
  maturidade text,
  reporte text,
  alocacao text,
  descricao_sumaria text,
  grupo_organizacional text,
  nivel_maturidade text,
  responsabilidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  formacao_academica text,
  cursos_necessarios text,
  cursos_desejaveis text,
  habilidades_comportamentais text,
  fator_experiencia text,
  fator_complexidade text,
  fator_responsabilidade_erros text,
  fator_responsabilidade_sigilo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_descricoes_cargo_company ON public.descricoes_cargo(company_id);
CREATE INDEX idx_descricoes_cargo_cargo ON public.descricoes_cargo(cargo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricoes_cargo TO authenticated;
GRANT ALL ON public.descricoes_cargo TO service_role;

ALTER TABLE public.descricoes_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "descricoes_cargo_select" ON public.descricoes_cargo
FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());

CREATE POLICY "descricoes_cargo_insert" ON public.descricoes_cargo
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  AND public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
);

CREATE POLICY "descricoes_cargo_update" ON public.descricoes_cargo
FOR UPDATE TO authenticated
USING (
  (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  AND public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
)
WITH CHECK (
  (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  AND public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
);

CREATE POLICY "descricoes_cargo_delete" ON public.descricoes_cargo
FOR DELETE TO authenticated
USING (
  (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id())
  AND public.get_my_role() IN ('admin_master','admin_empresa')
);

CREATE TRIGGER update_descricoes_cargo_updated_at
BEFORE UPDATE ON public.descricoes_cargo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Data migration: departamentos, cargos e GHE padrão a partir dos colaboradores
INSERT INTO public.departamentos (company_id, nome, ativo)
SELECT DISTINCT c.company_id, btrim(c.department), true
FROM public.colaboradores c
WHERE c.department IS NOT NULL AND btrim(c.department) <> '' AND c.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.departamentos d
    WHERE d.company_id = c.company_id AND lower(d.nome) = lower(btrim(c.department))
  );

INSERT INTO public.cargos (company_id, nome, ativo, risco_exposicao)
SELECT DISTINCT c.company_id, btrim(c.job_title), true, false
FROM public.colaboradores c
WHERE c.job_title IS NOT NULL AND btrim(c.job_title) <> '' AND c.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.cargos g
    WHERE g.company_id = c.company_id AND lower(g.nome) = lower(btrim(c.job_title))
  );

INSERT INTO public.ghes (company_id, codigo, nome, tipo_exposicao, ativo)
SELECT co.id, 'GHE 01', 'GHE 01 - Geral', 'continua'::tipo_exposicao, true
FROM public.companies co
WHERE NOT EXISTS (SELECT 1 FROM public.ghes g WHERE g.company_id = co.id);