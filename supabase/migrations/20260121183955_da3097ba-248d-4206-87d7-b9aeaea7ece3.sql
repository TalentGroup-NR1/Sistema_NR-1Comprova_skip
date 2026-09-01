-- Colaborador pode ver ciclos onde tem avaliação atribuída
CREATE POLICY "Colaborador can view ciclos with own avaliacoes"
ON public.ciclos_avaliacao
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = ciclos_avaliacao.id
    AND c.user_id = auth.uid()
  )
);

-- Colaborador pode ver métricas de ciclos onde tem avaliação
CREATE POLICY "Colaborador can view metricas with own avaliacoes"
ON public.metricas_avaliacao
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = metricas_avaliacao.ciclo_id
    AND c.user_id = auth.uid()
  )
);

-- Colaborador pode ver competências de ciclos onde tem avaliação
CREATE POLICY "Colaborador can view competencias with own avaliacoes"
ON public.competencias_ciclo
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = competencias_ciclo.ciclo_id
    AND c.user_id = auth.uid()
  )
);

-- Colaborador pode ver objetivos de ciclos onde tem avaliação
CREATE POLICY "Colaborador can view objetivos with own avaliacoes"
ON public.objetivos_ciclo
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = objetivos_ciclo.ciclo_id
    AND c.user_id = auth.uid()
  )
);