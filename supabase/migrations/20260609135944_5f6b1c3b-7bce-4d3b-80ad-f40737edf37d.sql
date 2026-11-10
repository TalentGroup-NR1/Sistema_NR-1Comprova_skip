
CREATE POLICY "Colaborador can view own dependentes"
ON public.dependentes FOR SELECT
TO authenticated
USING (colaborador_id = public.get_my_colaborador_id());

CREATE POLICY "Colaborador can view own ficha profissional"
ON public.ficha_profissional FOR SELECT
TO authenticated
USING (colaborador_id = public.get_my_colaborador_id());
