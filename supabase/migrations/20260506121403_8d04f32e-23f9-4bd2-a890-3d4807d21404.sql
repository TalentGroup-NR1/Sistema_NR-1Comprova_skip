
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  entrada_manha TIME,
  saida_manha TIME,
  entrada_tarde TIME,
  saida_tarde TIME,
  carga_diaria_minutos INTEGER NOT NULL DEFAULT 480,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_schedules_company ON public.work_schedules(company_id);

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master full access work_schedules"
ON public.work_schedules FOR ALL
USING (public.has_role(auth.uid(), 'admin_master'))
WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Company members read work_schedules"
ON public.work_schedules FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Company admins manage work_schedules"
ON public.work_schedules FOR ALL
USING (
  company_id = public.get_my_company_id()
  AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
);

CREATE TRIGGER update_work_schedules_updated_at
BEFORE UPDATE ON public.work_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.colaboradores
ADD COLUMN work_schedule_id UUID REFERENCES public.work_schedules(id) ON DELETE SET NULL;

CREATE INDEX idx_colaboradores_work_schedule ON public.colaboradores(work_schedule_id);
