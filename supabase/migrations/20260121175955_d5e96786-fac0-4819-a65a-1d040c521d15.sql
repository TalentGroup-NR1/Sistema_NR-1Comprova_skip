-- Allow collaboradores to view their own avaliacoes (where they are the colaborador_id)
CREATE POLICY "Colaborador can view own avaliacoes"
ON public.avaliacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = avaliacoes.colaborador_id
    AND c.user_id = auth.uid()
  )
);

-- Allow collaboradores to view ONLY autoavaliacao links (tipo = 'autoavaliacao') of their own avaliacoes
-- This ensures they cannot see gestor links
CREATE POLICY "Colaborador can view own autoavaliacao links"
ON public.avaliacao_links
FOR SELECT
USING (
  tipo = 'autoavaliacao'
  AND EXISTS (
    SELECT 1 FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.id = avaliacao_links.avaliacao_id
    AND c.user_id = auth.uid()
  )
);