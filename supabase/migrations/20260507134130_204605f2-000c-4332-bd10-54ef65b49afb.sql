
-- Fix CLT vacation grace period (12 months, not 11)
UPDATE public.ferias_periodos_aquisitivos
SET data_limite_gozo = (data_fim_aquisitivo + interval '12 months')::date
WHERE data_limite_gozo = (data_fim_aquisitivo + interval '11 months')::date;

-- Add new optional columns to ferias_gozo
ALTER TABLE public.ferias_gozo
  ADD COLUMN IF NOT EXISTS abono_pecuniario_dias integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solicitado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- Helper: get colaborador id of current user
CREATE OR REPLACE FUNCTION public.get_my_colaborador_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS for colaborador on ferias_periodos_aquisitivos (read own)
DROP POLICY IF EXISTS "Colaborador can view own periodos aquisitivos" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Colaborador can view own periodos aquisitivos"
ON public.ferias_periodos_aquisitivos
FOR SELECT
USING (colaborador_id = public.get_my_colaborador_id());

-- RLS for colaborador on ferias_gozo
DROP POLICY IF EXISTS "Colaborador can view own ferias gozo" ON public.ferias_gozo;
CREATE POLICY "Colaborador can view own ferias gozo"
ON public.ferias_gozo
FOR SELECT
USING (colaborador_id = public.get_my_colaborador_id());

DROP POLICY IF EXISTS "Colaborador can request own ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can request own ferias"
ON public.ferias_gozo
FOR INSERT
WITH CHECK (
  colaborador_id = public.get_my_colaborador_id()
  AND status = 'planejado'
);

DROP POLICY IF EXISTS "Colaborador can cancel own planejado ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can cancel own planejado ferias"
ON public.ferias_gozo
FOR UPDATE
USING (
  colaborador_id = public.get_my_colaborador_id()
  AND status = 'planejado'
)
WITH CHECK (
  colaborador_id = public.get_my_colaborador_id()
  AND status IN ('planejado','cancelado')
);

DROP POLICY IF EXISTS "Colaborador can delete own planejado ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can delete own planejado ferias"
ON public.ferias_gozo
FOR DELETE
USING (
  colaborador_id = public.get_my_colaborador_id()
  AND status = 'planejado'
);
