CREATE TABLE public.niveis_maturidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);

CREATE INDEX idx_niveis_maturidade_company ON public.niveis_maturidade(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.niveis_maturidade TO authenticated;
GRANT ALL ON public.niveis_maturidade TO service_role;

ALTER TABLE public.niveis_maturidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "niveis_select" ON public.niveis_maturidade
  FOR SELECT TO authenticated
  USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());

CREATE POLICY "niveis_insert" ON public.niveis_maturidade
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  );

CREATE POLICY "niveis_update" ON public.niveis_maturidade
  FOR UPDATE TO authenticated
  USING (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  )
  WITH CHECK (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  );

CREATE POLICY "niveis_delete" ON public.niveis_maturidade
  FOR DELETE TO authenticated
  USING (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() = 'admin_empresa')
  );

CREATE TRIGGER update_niveis_maturidade_updated_at
  BEFORE UPDATE ON public.niveis_maturidade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed dos níveis atuais para cada empresa
INSERT INTO public.niveis_maturidade (company_id, nome, ordem)
SELECT c.id, n.nome, n.ordem
FROM public.companies c
CROSS JOIN (VALUES
  ('Júnior',1),('Júnior I',2),('Júnior II',3),('Júnior III',4),
  ('Pleno',5),('Pleno I',6),('Pleno II',7),('Pleno III',8),
  ('Sênior',9),('Sênior I',10),('Sênior II',11),('Sênior III',12),
  ('Especialista',13),('Especialista I',14),('Especialista II',15),('Especialista III',16)
) AS n(nome, ordem)
ON CONFLICT (company_id, nome) DO NOTHING;

-- job_level: enum -> texto (preserva valores)
ALTER TABLE public.colaboradores
  ALTER COLUMN job_level TYPE text USING job_level::text;