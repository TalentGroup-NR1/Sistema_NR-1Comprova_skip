
CREATE TABLE public.relatorios_executivos_salvos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  parecer_html TEXT NOT NULL DEFAULT '',
  criado_por_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, ano)
);

ALTER TABLE public.relatorios_executivos_salvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view saved reports"
  ON public.relatorios_executivos_salvos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert saved reports"
  ON public.relatorios_executivos_salvos FOR INSERT
  WITH CHECK (auth.uid() = criado_por_user_id);

CREATE POLICY "Authenticated users can update saved reports"
  ON public.relatorios_executivos_salvos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_relatorios_executivos_salvos_updated_at
  BEFORE UPDATE ON public.relatorios_executivos_salvos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
