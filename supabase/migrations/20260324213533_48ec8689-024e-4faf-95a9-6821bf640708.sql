
DROP POLICY "Colaborador can insert own ponto registros" ON public.ponto_registros;

CREATE POLICY "Colaborador can insert own ponto registros" ON public.ponto_registros
FOR INSERT WITH CHECK (
  colaborador_id IN (
    SELECT id FROM colaboradores WHERE user_id = auth.uid()
  )
  AND (
    (ajuste_manual = false AND status_aprovacao = 'aprovado')
    OR (ajuste_manual = true AND status_aprovacao = 'pendente')
  )
);
