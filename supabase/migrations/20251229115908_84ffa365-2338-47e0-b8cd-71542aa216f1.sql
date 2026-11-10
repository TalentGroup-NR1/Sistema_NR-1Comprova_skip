-- Corrigir política RLS para admin_master em feedback_cycles
DROP POLICY IF EXISTS "Admin master can view all feedback_cycles" ON feedback_cycles;

CREATE POLICY "Admin master full access feedback_cycles" 
ON feedback_cycles
FOR ALL
TO authenticated
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

-- Corrigir política RLS para admin_master em feedback_responses
DROP POLICY IF EXISTS "Admin master can view all feedback_responses" ON feedback_responses;

CREATE POLICY "Admin master full access feedback_responses" 
ON feedback_responses
FOR ALL
TO authenticated
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));