
-- ============================================================
-- 1. Storage: beneficios-materiais bucket — scope by company
-- ============================================================
DROP POLICY IF EXISTS "colaborador_read_beneficios_materiais" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_beneficios_materiais" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_beneficios_materiais" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_beneficios_materiais" ON storage.objects;

CREATE POLICY "beneficios_materiais_read_scoped"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'beneficios-materiais'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.company_id = get_my_company_id()
        AND (
          has_role(auth.uid(), 'admin_empresa'::app_role)
          OR has_role(auth.uid(), 'analista_rh'::app_role)
          OR (
            has_role(auth.uid(), 'colaborador'::app_role)
            AND (
              EXISTS (
                SELECT 1 FROM public.colaboradores c
                JOIN public.colaborador_beneficios cb ON cb.colaborador_id = c.id
                WHERE c.user_id = auth.uid()
                  AND cb.beneficio_id = b.id
                  AND cb.status::text = 'ativo'
              )
              OR EXISTS (
                SELECT 1 FROM public.colaboradores c
                JOIN public.beneficios_departamento bd
                  ON bd.departamento::text = c.department::text
                 AND bd.company_id = c.company_id
                WHERE c.user_id = auth.uid()
                  AND bd.beneficio_id = b.id
              )
            )
          )
        )
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_insert_scoped"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficios-materiais'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.company_id = get_my_company_id()
        AND (
          has_role(auth.uid(), 'admin_empresa'::app_role)
          OR has_role(auth.uid(), 'analista_rh'::app_role)
        )
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_update_scoped"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficios-materiais'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.company_id = get_my_company_id()
        AND (
          has_role(auth.uid(), 'admin_empresa'::app_role)
          OR has_role(auth.uid(), 'analista_rh'::app_role)
        )
    )
  )
);

CREATE POLICY "beneficios_materiais_admin_delete_scoped"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficios-materiais'
  AND (
    is_admin_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.beneficios b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.company_id = get_my_company_id()
        AND (
          has_role(auth.uid(), 'admin_empresa'::app_role)
          OR has_role(auth.uid(), 'analista_rh'::app_role)
        )
    )
  )
);

-- ============================================================
-- 2. Email-based RLS → user_id based RLS
-- ============================================================
DROP POLICY IF EXISTS "pdi_itens_colaborador_update" ON public.pdi_itens;
CREATE POLICY "pdi_itens_colaborador_update"
ON public.pdi_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.pdis pdi
    JOIN public.colaboradores c ON c.id = pdi.colaborador_id
    WHERE pdi.id = pdi_itens.pdi_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "pdi_itens_gestor_access" ON public.pdi_itens;
CREATE POLICY "pdi_itens_gestor_access"
ON public.pdi_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pdis pdi
    JOIN public.colaboradores g ON g.id = pdi.gestor_id
    WHERE pdi.id = pdi_itens.pdi_id
      AND g.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Colaborador can view own feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Colaborador can view own feedback_cycles"
ON public.feedback_cycles FOR SELECT
USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = feedback_cycles.colaborador_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Colaboradores can insert own visualizacoes" ON public.comunicados_visualizacoes;
CREATE POLICY "Colaboradores can insert own visualizacoes"
ON public.comunicados_visualizacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = comunicados_visualizacoes.colaborador_id
      AND c.user_id = auth.uid()
  )
);

-- ============================================================
-- 3. Gestor scope → direct reports only
-- ============================================================
DROP POLICY IF EXISTS "Gestor departamento can manage feedbacks_colaboradores" ON public.feedbacks_colaboradores;
CREATE POLICY "Gestor departamento can manage feedbacks_colaboradores"
ON public.feedbacks_colaboradores FOR ALL
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = feedbacks_colaboradores.colaborador_id
      AND c.gestor_id = get_my_colaborador_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = feedbacks_colaboradores.colaborador_id
      AND c.gestor_id = get_my_colaborador_id()
  )
);

DROP POLICY IF EXISTS "Gestor views ficha_profissional" ON public.ficha_profissional;
CREATE POLICY "Gestor views ficha_profissional"
ON public.ficha_profissional FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = ficha_profissional.colaborador_id
      AND c.gestor_id = get_my_colaborador_id()
  )
);

DROP POLICY IF EXISTS "gestor_view_promocoes" ON public.promocoes_colaborador;
CREATE POLICY "gestor_view_promocoes"
ON public.promocoes_colaborador FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = promocoes_colaborador.colaborador_id
      AND c.gestor_id = get_my_colaborador_id()
  )
);

DROP POLICY IF EXISTS "Gestor can view own avaliacoes" ON public.avaliacoes;
CREATE POLICY "Gestor can view own avaliacoes"
ON public.avaliacoes FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND avaliacoes.gestor_id = get_my_colaborador_id()
);

-- ============================================================
-- 4. PDI admin policies — add company filter
-- ============================================================
DROP POLICY IF EXISTS "pdis_admin_all" ON public.pdis;
CREATE POLICY "pdis_admin_all"
ON public.pdis FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pdis.colaborador_id
        AND c.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pdis.colaborador_id
        AND c.company_id = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "pdi_itens_admin_all" ON public.pdi_itens;
CREATE POLICY "pdi_itens_admin_all"
ON public.pdi_itens FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.pdis pdi
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      WHERE pdi.id = pdi_itens.pdi_id
        AND c.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.pdis pdi
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      WHERE pdi.id = pdi_itens.pdi_id
        AND c.company_id = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "pdi_checkins_admin_all" ON public.pdi_checkins;
CREATE POLICY "pdi_checkins_admin_all"
ON public.pdi_checkins FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.pdi_itens pi
      JOIN public.pdis pdi ON pdi.id = pi.pdi_id
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      WHERE pi.id = pdi_checkins.pdi_item_id
        AND c.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.pdi_itens pi
      JOIN public.pdis pdi ON pdi.id = pi.pdi_id
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      WHERE pi.id = pdi_checkins.pdi_item_id
        AND c.company_id = get_my_company_id()
    )
  )
);

-- ============================================================
-- 5. Training admin policy + quiz tables + categorias — company filter
-- ============================================================
DROP POLICY IF EXISTS "Admin pode gerenciar treinamentos" ON public.treinamentos;
CREATE POLICY "Admin pode gerenciar treinamentos"
ON public.treinamentos FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND treinamentos.company_id = get_my_company_id()
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND treinamentos.company_id = get_my_company_id()
  )
);

-- categorias_treinamento has company_id directly; add explicit admin policy with company filter
DROP POLICY IF EXISTS "Admin pode gerenciar categorias_treinamento" ON public.categorias_treinamento;
CREATE POLICY "Admin pode gerenciar categorias_treinamento"
ON public.categorias_treinamento FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND categorias_treinamento.company_id = get_my_company_id()
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND categorias_treinamento.company_id = get_my_company_id()
  )
);

-- Quiz tables: chain through treinamentos.company_id
DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_config" ON public.treinamento_quiz_config;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_config"
ON public.treinamento_quiz_config FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id = treinamento_quiz_config.treinamento_id
        AND t.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id = treinamento_quiz_config.treinamento_id
        AND t.company_id = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_perguntas" ON public.treinamento_quiz_perguntas;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_perguntas"
ON public.treinamento_quiz_perguntas FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id = treinamento_quiz_perguntas.treinamento_id
        AND t.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id = treinamento_quiz_perguntas.treinamento_id
        AND t.company_id = get_my_company_id()
    )
  )
);

DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_alternativas" ON public.treinamento_quiz_alternativas;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_alternativas"
ON public.treinamento_quiz_alternativas FOR ALL
USING (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamento_quiz_perguntas p
      JOIN public.treinamentos t ON t.id = p.treinamento_id
      WHERE p.id = treinamento_quiz_alternativas.pergunta_id
        AND t.company_id = get_my_company_id()
    )
  )
)
WITH CHECK (
  is_admin_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.treinamento_quiz_perguntas p
      JOIN public.treinamentos t ON t.id = p.treinamento_id
      WHERE p.id = treinamento_quiz_alternativas.pergunta_id
        AND t.company_id = get_my_company_id()
    )
  )
);
