-- Add termination-related columns to colaboradores table
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_desligamento TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_desligamento TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_detalhado TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS desligado_por_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS desligado_em TIMESTAMPTZ;

-- Create audit table for terminations
CREATE TABLE public.desligamentos_colaborador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('desligar', 'reativar')),
  data_desligamento DATE,
  tipo_desligamento TEXT,
  motivo TEXT,
  observacao TEXT,
  criado_por_user_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on the audit table
ALTER TABLE public.desligamentos_colaborador ENABLE ROW LEVEL SECURITY;

-- RLS policy: only RH/Admin can read/write audit records
CREATE POLICY "RH and Admin can manage desligamentos audit"
ON public.desligamentos_colaborador
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin_master', 'admin_empresa', 'analista_rh')
  )
);

-- Create trigger function to sync profiles.is_active when colaborador status changes
CREATE OR REPLACE FUNCTION public.sync_profile_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- When colaborador becomes DESLIGADO, deactivate profile
  IF NEW.status = 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = false WHERE user_id = NEW.user_id;
  END IF;
  
  -- When colaborador is reactivated from DESLIGADO, activate profile
  IF OLD.status = 'DESLIGADO' AND NEW.status != 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = true WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic profile sync
CREATE TRIGGER trigger_sync_profile_on_colaborador_status
  AFTER UPDATE ON public.colaboradores
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_profile_is_active();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores(status);
CREATE INDEX IF NOT EXISTS idx_desligamentos_colaborador_id ON public.desligamentos_colaborador(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_desligamentos_criado_em ON public.desligamentos_colaborador(criado_em DESC);