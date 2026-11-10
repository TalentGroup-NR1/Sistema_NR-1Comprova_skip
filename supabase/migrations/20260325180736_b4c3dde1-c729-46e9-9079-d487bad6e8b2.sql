CREATE POLICY "Colaborador can update own ponto exclusao"
ON public.ponto_registros
FOR UPDATE
TO authenticated
USING (
  colaborador_id IN (
    SELECT id FROM colaboradores WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  colaborador_id IN (
    SELECT id FROM colaboradores WHERE user_id = auth.uid()
  )
);