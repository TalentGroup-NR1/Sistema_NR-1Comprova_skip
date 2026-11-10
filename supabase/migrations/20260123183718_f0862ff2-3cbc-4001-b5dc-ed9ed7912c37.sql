-- =============================================
-- Correção das Políticas RLS para Campanhas de Pulso
-- Problema: admin_master tem company_id = NULL, causando falha na política atual
-- =============================================

-- 1. Remover políticas antigas da tabela pulse_campaigns
DROP POLICY IF EXISTS "Admins can manage campaigns" ON pulse_campaigns;

-- 2. Criar política para admin_master (acesso total a todas as empresas)
CREATE POLICY "Admin master can manage all campaigns" 
ON pulse_campaigns FOR ALL 
TO public
USING (get_my_role() = 'admin_master')
WITH CHECK (get_my_role() = 'admin_master');

-- 3. Criar política para admin_empresa e analista_rh (apenas sua empresa)
CREATE POLICY "Company admins can manage own campaigns" 
ON pulse_campaigns FOR ALL 
TO public
USING (
  company_id = get_my_company_id() 
  AND get_my_role() IN ('admin_empresa', 'analista_rh')
)
WITH CHECK (
  company_id = get_my_company_id() 
  AND get_my_role() IN ('admin_empresa', 'analista_rh')
);

-- 4. Remover políticas antigas da tabela pulse_questions
DROP POLICY IF EXISTS "Admins can manage questions" ON pulse_questions;

-- 5. Criar política para admin_master nas perguntas
CREATE POLICY "Admin master can manage all questions" 
ON pulse_questions FOR ALL 
TO public
USING (get_my_role() = 'admin_master')
WITH CHECK (get_my_role() = 'admin_master');

-- 6. Criar política para admin_empresa e analista_rh nas perguntas
CREATE POLICY "Company admins can manage own questions" 
ON pulse_questions FOR ALL 
TO public
USING (
  EXISTS (
    SELECT 1 FROM pulse_campaigns c
    WHERE c.id = pulse_questions.campaign_id
    AND c.company_id = get_my_company_id()
  )
  AND get_my_role() IN ('admin_empresa', 'analista_rh')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pulse_campaigns c
    WHERE c.id = pulse_questions.campaign_id
    AND c.company_id = get_my_company_id()
  )
  AND get_my_role() IN ('admin_empresa', 'analista_rh')
);