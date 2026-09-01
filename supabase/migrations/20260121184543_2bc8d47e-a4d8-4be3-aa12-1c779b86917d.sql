-- Fix: avoid infinite recursion in RLS by moving cross-table checks into a SECURITY DEFINER function
-- The previous policies queried public.avaliacoes directly, which can recurse if avaliacoes RLS queries ciclos_avaliacao.

-- 1) Helper function (runs with definer privileges; avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.colaborador_has_avaliacao_in_ciclo(_ciclo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = _ciclo_id
      AND c.user_id = auth.uid()
  );
$$;

-- 2) Replace policies created previously with function-based versions

-- ciclos_avaliacao
DROP POLICY IF EXISTS "Colaborador can view ciclos with own avaliacoes" ON public.ciclos_avaliacao;
CREATE POLICY "Colaborador can view ciclos with own avaliacoes"
ON public.ciclos_avaliacao
FOR SELECT
USING (public.colaborador_has_avaliacao_in_ciclo(id));

-- metricas_avaliacao
DROP POLICY IF EXISTS "Colaborador can view metricas with own avaliacoes" ON public.metricas_avaliacao;
CREATE POLICY "Colaborador can view metricas with own avaliacoes"
ON public.metricas_avaliacao
FOR SELECT
USING (public.colaborador_has_avaliacao_in_ciclo(ciclo_id));

-- competencias_ciclo
DROP POLICY IF EXISTS "Colaborador can view competencias with own avaliacoes" ON public.competencias_ciclo;
CREATE POLICY "Colaborador can view competencias with own avaliacoes"
ON public.competencias_ciclo
FOR SELECT
USING (public.colaborador_has_avaliacao_in_ciclo(ciclo_id));

-- objetivos_ciclo
DROP POLICY IF EXISTS "Colaborador can view objetivos with own avaliacoes" ON public.objetivos_ciclo;
CREATE POLICY "Colaborador can view objetivos with own avaliacoes"
ON public.objetivos_ciclo
FOR SELECT
USING (public.colaborador_has_avaliacao_in_ciclo(ciclo_id));
