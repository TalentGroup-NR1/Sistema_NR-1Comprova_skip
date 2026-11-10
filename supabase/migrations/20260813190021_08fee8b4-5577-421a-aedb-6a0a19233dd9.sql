ALTER POLICY "Admins veem progresso de aulas" ON public.treinamento_aula_progresso
USING (
  (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role, 'gestor_departamento'::app_role]))
  OR public.admin_master_scope((SELECT co.company_id FROM public.colaboradores co WHERE co.id = treinamento_aula_progresso.colaborador_id))
);

ALTER POLICY "Admins insert notifications" ON public.notifications
WITH CHECK (
  (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))
  OR public.admin_master_scope(notifications.company_id)
  OR (user_id = auth.uid())
);

ALTER POLICY "Admins can insert access logs" ON public.pulse_access_logs
WITH CHECK (
  (admin_id = auth.uid())
  AND (
    (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))
    OR public.admin_master_scope((SELECT pc.company_id FROM public.pulse_campaigns pc WHERE pc.id = pulse_access_logs.campaign_id))
  )
);