-- Política 1: Admin Master pode ver TODAS as respostas de todas as empresas
CREATE POLICY "Admin master can view all responses"
ON public.pulse_responses
FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'admin_master'
);

-- Política 2: Admin Empresa e Analista RH podem ver respostas da sua empresa
CREATE POLICY "Company admins can view company responses"
ON public.pulse_responses
FOR SELECT
TO authenticated
USING (
  public.get_my_role() IN ('admin_empresa', 'analista_rh')
  AND EXISTS (
    SELECT 1 FROM public.pulse_campaigns pc
    WHERE pc.id = pulse_responses.campaign_id
    AND pc.company_id = public.get_my_company_id()
  )
);