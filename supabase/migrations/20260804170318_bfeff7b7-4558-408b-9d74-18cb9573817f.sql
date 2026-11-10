CREATE TABLE public.descricao_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  descricao text,
  estrutura jsonb NOT NULL DEFAULT '{"blocos": []}'::jsonb,
  padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricao_modelos TO authenticated;
GRANT ALL ON public.descricao_modelos TO service_role;

ALTER TABLE public.descricao_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "descricao_modelos_select" ON public.descricao_modelos
FOR SELECT TO authenticated
USING (is_admin_master(auth.uid()) OR company_id = get_my_company_id());

CREATE POLICY "descricao_modelos_insert" ON public.descricao_modelos
FOR INSERT TO authenticated
WITH CHECK ((is_admin_master(auth.uid()) OR company_id = get_my_company_id())
  AND get_my_role() = ANY (ARRAY['admin_master'::app_role,'admin_empresa'::app_role,'analista_rh'::app_role]));

CREATE POLICY "descricao_modelos_update" ON public.descricao_modelos
FOR UPDATE TO authenticated
USING ((is_admin_master(auth.uid()) OR company_id = get_my_company_id())
  AND get_my_role() = ANY (ARRAY['admin_master'::app_role,'admin_empresa'::app_role,'analista_rh'::app_role]))
WITH CHECK ((is_admin_master(auth.uid()) OR company_id = get_my_company_id())
  AND get_my_role() = ANY (ARRAY['admin_master'::app_role,'admin_empresa'::app_role,'analista_rh'::app_role]));

CREATE POLICY "descricao_modelos_delete" ON public.descricao_modelos
FOR DELETE TO authenticated
USING ((is_admin_master(auth.uid()) OR company_id = get_my_company_id())
  AND get_my_role() = ANY (ARRAY['admin_master'::app_role,'admin_empresa'::app_role]));

CREATE INDEX idx_descricao_modelos_company ON public.descricao_modelos(company_id);

CREATE TRIGGER update_descricao_modelos_updated_at
BEFORE UPDATE ON public.descricao_modelos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.descricoes_cargo
  ADD COLUMN modelo_id uuid REFERENCES public.descricao_modelos(id) ON DELETE SET NULL,
  ADD COLUMN valores jsonb NOT NULL DEFAULT '{}'::jsonb;