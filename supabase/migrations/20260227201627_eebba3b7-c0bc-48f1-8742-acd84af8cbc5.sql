
-- Add colaborador_id to analises_perfil for report enrichment
ALTER TABLE public.analises_perfil 
ADD COLUMN colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL;

-- Add admission_date cache for report display
ALTER TABLE public.analises_perfil
ADD COLUMN colaborador_admission_date DATE;
