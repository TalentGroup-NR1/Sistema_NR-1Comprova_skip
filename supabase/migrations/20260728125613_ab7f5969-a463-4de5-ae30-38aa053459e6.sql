DROP POLICY IF EXISTS colaborador_read_materiais ON public.beneficios_materiais;
CREATE POLICY colaborador_read_materiais ON public.beneficios_materiais
FOR SELECT TO authenticated
USING (
  is_admin_master(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.beneficios b
    JOIN public.colaboradores c ON c.user_id = auth.uid()
    WHERE b.id = beneficios_materiais.beneficio_id
      AND b.company_id = c.company_id
  )
);

DROP POLICY IF EXISTS beneficios_materiais_read_scoped ON storage.objects;
CREATE POLICY beneficios_materiais_read_scoped ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'beneficios-materiais');