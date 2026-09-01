-- =====================================================================
-- 1) STORAGE: abonos-anexos — escopo por empresa
-- Path: {colaborador_id}/...
-- =====================================================================
DROP POLICY IF EXISTS "Admin empresa manage abonos anexos" ON storage.objects;
CREATE POLICY "Admin empresa manage abonos anexos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'abonos-anexos'
  AND get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = get_my_company_id()
  )
)
WITH CHECK (
  bucket_id = 'abonos-anexos'
  AND get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = get_my_company_id()
  )
);

-- =====================================================================
-- 2) STORAGE: comunicados-anexos SELECT — escopo por empresa
-- Path: {comunicado_id}/...
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view comunicados anexos" ON storage.objects;
CREATE POLICY "Authenticated users can view comunicados anexos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comunicados-anexos'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.comunicados c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.company_id = get_my_company_id()
    )
  )
);

-- =====================================================================
-- 3) RLS: comunicados_visualizacoes — admin filtra por empresa
-- =====================================================================
DROP POLICY IF EXISTS "Admin can view all visualizacoes" ON public.comunicados_visualizacoes;
CREATE POLICY "Admin can view all visualizacoes"
ON public.comunicados_visualizacoes
FOR SELECT
TO authenticated
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.comunicados c
      WHERE c.id = comunicados_visualizacoes.comunicado_id
        AND c.company_id = get_my_company_id()
    )
  )
);

-- =====================================================================
-- 4) STORAGE: documentos_analise — escopo por empresa
-- Path: {company_id}/...
-- =====================================================================
DROP POLICY IF EXISTS "Admin roles can read documentos_analise" ON storage.objects;
CREATE POLICY "Admin roles can read documentos_analise"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos_analise'
  AND (
    is_admin_master(auth.uid())
    OR (
      get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
      AND ((storage.foldername(name))[1])::uuid = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "Admin roles can upload documentos_analise" ON storage.objects;
CREATE POLICY "Admin roles can upload documentos_analise"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos_analise'
  AND (
    is_admin_master(auth.uid())
    OR (
      get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
      AND ((storage.foldername(name))[1])::uuid = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "Admin roles can delete documentos_analise" ON storage.objects;
CREATE POLICY "Admin roles can delete documentos_analise"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos_analise'
  AND (
    is_admin_master(auth.uid())
    OR (
      get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
      AND ((storage.foldername(name))[1])::uuid = get_my_company_id()
    )
  )
);

-- =====================================================================
-- 5) RLS: evolution_reports — gestor só vê liderados diretos
-- =====================================================================
DROP POLICY IF EXISTS "Gestor departamento can view evolution_reports" ON public.evolution_reports;
CREATE POLICY "Gestor departamento can view evolution_reports"
ON public.evolution_reports
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND company_id = get_user_company_id(auth.uid())
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE gestor_id = get_my_colaborador_id()
  )
);

-- =====================================================================
-- 6a) RLS: ferias_gozo — gestor só vê liderados diretos
-- =====================================================================
DROP POLICY IF EXISTS "Gestor departamento can view own company ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Gestor departamento can view own company ferias_gozo"
ON public.ferias_gozo
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND company_id = get_user_company_id(auth.uid())
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE gestor_id = get_my_colaborador_id()
  )
);

-- 6b) RLS: ferias_periodos_aquisitivos — gestor só vê liderados diretos
DROP POLICY IF EXISTS "Gestor departamento can view own company ferias_periodos_aquisi" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Gestor departamento can view own company ferias_periodos_aquisi"
ON public.ferias_periodos_aquisitivos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND company_id = get_user_company_id(auth.uid())
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE gestor_id = get_my_colaborador_id()
  )
);

-- =====================================================================
-- 7) RLS: pdi_checkins — usar user_id direto (não email match)
-- =====================================================================
DROP POLICY IF EXISTS "pdi_checkins_colaborador_insert" ON public.pdi_checkins;
CREATE POLICY "pdi_checkins_colaborador_insert"
ON public.pdi_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pdi_itens pi
    JOIN public.pdis pdi ON pdi.id = pi.pdi_id
    JOIN public.colaboradores c ON c.id = pdi.colaborador_id
    WHERE pi.id = pdi_checkins.pdi_item_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "pdi_checkins_colaborador_read" ON public.pdi_checkins;
CREATE POLICY "pdi_checkins_colaborador_read"
ON public.pdi_checkins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pdi_itens pi
    JOIN public.pdis pdi ON pdi.id = pi.pdi_id
    JOIN public.colaboradores c ON c.id = pdi.colaborador_id
    WHERE pi.id = pdi_checkins.pdi_item_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "pdi_checkins_gestor_access" ON public.pdi_checkins;
CREATE POLICY "pdi_checkins_gestor_access"
ON public.pdi_checkins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pdi_itens pi
    JOIN public.pdis pdi ON pdi.id = pi.pdi_id
    JOIN public.colaboradores c ON c.id = pdi.gestor_id
    WHERE pi.id = pdi_checkins.pdi_item_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pdi_itens pi
    JOIN public.pdis pdi ON pdi.id = pi.pdi_id
    JOIN public.colaboradores c ON c.id = pdi.gestor_id
    WHERE pi.id = pdi_checkins.pdi_item_id
      AND c.user_id = auth.uid()
  )
);

-- =====================================================================
-- 8) RLS: treinamento_progresso — escopo por empresa para roles admin/gestor
-- =====================================================================
DROP POLICY IF EXISTS "Colaboradores podem ver seu progresso" ON public.treinamento_progresso;
CREATE POLICY "Colaboradores podem ver seu progresso"
ON public.treinamento_progresso
FOR SELECT
TO authenticated
USING (
  -- O próprio colaborador
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = treinamento_progresso.colaborador_id
      AND c.user_id = auth.uid()
  )
  -- Admin master vê tudo
  OR is_admin_master(auth.uid())
  -- Admin/RH/Gestor da mesma empresa do colaborador
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role)
      OR has_role(auth.uid(), 'analista_rh'::app_role)
      OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = treinamento_progresso.colaborador_id
        AND c.company_id = get_my_company_id()
    )
  )
);

-- =====================================================================
-- 9) RLS: treinamento_quiz_tentativas — escopo por empresa
-- =====================================================================
DROP POLICY IF EXISTS "Colaboradores podem ver suas tentativas" ON public.treinamento_quiz_tentativas;
CREATE POLICY "Colaboradores podem ver suas tentativas"
ON public.treinamento_quiz_tentativas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = treinamento_quiz_tentativas.colaborador_id
      AND c.user_id = auth.uid()
  )
  OR is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role)
      OR has_role(auth.uid(), 'analista_rh'::app_role)
      OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = treinamento_quiz_tentativas.colaborador_id
        AND c.company_id = get_my_company_id()
    )
  )
);

-- =====================================================================
-- 10) STORAGE: treinamentos SELECT — escopo por empresa
-- Path: {treinamento_id}/...
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can download training files" ON storage.objects;
CREATE POLICY "Authenticated users can download training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'treinamentos'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.company_id = get_my_company_id()
    )
  )
);