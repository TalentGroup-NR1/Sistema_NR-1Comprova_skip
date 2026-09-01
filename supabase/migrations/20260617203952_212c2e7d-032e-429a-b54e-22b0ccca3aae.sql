
-- 1) Allow colaboradores to download their own ponto closing PDFs from the private bucket
CREATE POLICY "Colaboradores can read own ponto closing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fechamentos-ponto'
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(name))[3] = c.id::text
  )
);

-- 2) Allow colaboradores (and any authenticated user in the same company) to read
--    questions from active Cuidar+ questionnaires belonging to their company.
CREATE POLICY "Colaboradores can read active Cuidar+ questions in their company"
ON public.perguntas_cuidar_plus FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = perguntas_cuidar_plus.questionario_id
      AND q.is_active = true
      AND q.company_id = public.get_my_company_id()
  )
);
