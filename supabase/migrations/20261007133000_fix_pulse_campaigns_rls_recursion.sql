-- Fix infinite recursion between pulse_campaigns and pulse_campaigns_alvos

-- 1. Create a security definer function to bypass RLS when checking campaign ownership
CREATE OR REPLACE FUNCTION public.can_access_pulse_campaign_alvos(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pulse_campaigns c
    WHERE c.id = p_campaign_id
    AND c.company_id = public.get_my_company_id()
  );
$$;

-- 2. Update the policy on pulse_campaigns_alvos to use the function
DROP POLICY IF EXISTS "Colaboradores can view alvos of active campaigns" ON public.pulse_campaigns_alvos;
CREATE POLICY "Colaboradores can view alvos of active campaigns"
  ON public.pulse_campaigns_alvos FOR SELECT
  USING (
    public.can_access_pulse_campaign_alvos(campaign_id)
  );

DROP POLICY IF EXISTS "Admins can manage alvos" ON public.pulse_campaigns_alvos;
CREATE POLICY "Admins can manage alvos"
  ON public.pulse_campaigns_alvos FOR ALL
  USING (
    public.can_access_pulse_campaign_alvos(campaign_id)
    AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  );
