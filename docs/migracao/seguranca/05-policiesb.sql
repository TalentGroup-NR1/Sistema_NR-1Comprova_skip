-- SEÇÃO 5: POLICIES (parte 2/2)
DROP POLICY IF EXISTS "RH/Admin podem atualizar metricas_valores" ON public.metricas_valores;
CREATE POLICY "RH/Admin podem atualizar metricas_valores" ON public.metricas_valores AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (metricas_avaliacao ma
     JOIN ciclos_avaliacao ca ON ((ca.id = ma.ciclo_id)))
  WHERE ((ma.id = metricas_valores.metrica_id) AND (admin_master_scope(( SELECT ca_1.company_id
           FROM (metricas_avaliacao ma_1
             JOIN ciclos_avaliacao ca_1 ON ((ca_1.id = ma_1.ciclo_id)))
          WHERE (ma_1.id = metricas_valores.metrica_id))) OR (ca.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "RH/Admin podem deletar metricas_valores" ON public.metricas_valores;
CREATE POLICY "RH/Admin podem deletar metricas_valores" ON public.metricas_valores AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (metricas_avaliacao ma
     JOIN ciclos_avaliacao ca ON ((ca.id = ma.ciclo_id)))
  WHERE ((ma.id = metricas_valores.metrica_id) AND (admin_master_scope(( SELECT ca_1.company_id
           FROM (metricas_avaliacao ma_1
             JOIN ciclos_avaliacao ca_1 ON ((ca_1.id = ma_1.ciclo_id)))
          WHERE (ma_1.id = metricas_valores.metrica_id))) OR (ca.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "RH/Admin podem inserir metricas_valores" ON public.metricas_valores;
CREATE POLICY "RH/Admin podem inserir metricas_valores" ON public.metricas_valores AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (metricas_avaliacao ma
     JOIN ciclos_avaliacao ca ON ((ca.id = ma.ciclo_id)))
  WHERE ((ma.id = metricas_valores.metrica_id) AND (admin_master_scope(( SELECT ca_1.company_id
           FROM (metricas_avaliacao ma_1
             JOIN ciclos_avaliacao ca_1 ON ((ca_1.id = ma_1.ciclo_id)))
          WHERE (ma_1.id = metricas_valores.metrica_id))) OR (ca.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Usuarios podem ver metricas_valores de seus ciclos" ON public.metricas_valores;
CREATE POLICY "Usuarios podem ver metricas_valores de seus ciclos" ON public.metricas_valores AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (metricas_avaliacao ma
     JOIN ciclos_avaliacao ca ON ((ca.id = ma.ciclo_id)))
  WHERE ((ma.id = metricas_valores.metrica_id) AND (admin_master_scope(( SELECT ca_1.company_id
           FROM (metricas_avaliacao ma_1
             JOIN ciclos_avaliacao ca_1 ON ((ca_1.id = ma_1.ciclo_id)))
          WHERE (ma_1.id = metricas_valores.metrica_id))) OR (ca.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS niveis_delete ON public.niveis_maturidade;
CREATE POLICY niveis_delete ON public.niveis_maturidade AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS niveis_insert ON public.niveis_maturidade;
CREATE POLICY niveis_insert ON public.niveis_maturidade AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS niveis_select ON public.niveis_maturidade;
CREATE POLICY niveis_select ON public.niveis_maturidade AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS niveis_update ON public.niveis_maturidade;
CREATE POLICY niveis_update ON public.niveis_maturidade AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) OR admin_master_scope(company_id) OR (user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications AS PERMISSIVE FOR DELETE TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS ghe_riscos_all_admin ON public.nr1_ghe_riscos;
CREATE POLICY ghe_riscos_all_admin ON public.nr1_ghe_riscos AS PERMISSIVE FOR ALL TO authenticated
  USING (((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))))
  WITH CHECK (((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS matriz_config_all_admin ON public.nr1_matriz_config;
CREATE POLICY matriz_config_all_admin ON public.nr1_matriz_config AS PERMISSIVE FOR ALL TO authenticated
  USING (((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))))
  WITH CHECK (((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin empresa e RH gerenciam planos da empresa" ON public.nr1_planos_acao;
CREATE POLICY "Admin empresa e RH gerenciam planos da empresa" ON public.nr1_planos_acao AS PERMISSIVE FOR ALL TO authenticated
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())))
  WITH CHECK (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master gerencia todos os planos NR1" ON public.nr1_planos_acao;
CREATE POLICY "Admin master gerencia todos os planos NR1" ON public.nr1_planos_acao AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Admins atualizam ativações" ON public.nr1_proart_ativacoes;
CREATE POLICY "Admins atualizam ativações" ON public.nr1_proart_ativacoes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admins criam ativações" ON public.nr1_proart_ativacoes;
CREATE POLICY "Admins criam ativações" ON public.nr1_proart_ativacoes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admins veem ativações da empresa" ON public.nr1_proart_ativacoes;
CREATE POLICY "Admins veem ativações da empresa" ON public.nr1_proart_ativacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Colaborador vê ativações vigentes da sua empresa" ON public.nr1_proart_ativacoes;
CREATE POLICY "Colaborador vê ativações vigentes da sua empresa" ON public.nr1_proart_ativacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((company_id = get_my_company_id()) AND (ativo = true) AND (data_inicio <= CURRENT_DATE) AND (data_fim >= CURRENT_DATE)));

DROP POLICY IF EXISTS "Authenticated can read PROART questions" ON public.nr1_proart_perguntas;
CREATE POLICY "Authenticated can read PROART questions" ON public.nr1_proart_perguntas AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin empresa / RH leem respostas PROART da empresa" ON public.nr1_proart_respostas;
CREATE POLICY "Admin empresa / RH leem respostas PROART da empresa" ON public.nr1_proart_respostas AS PERMISSIVE FOR SELECT TO authenticated
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master lê todas respostas PROART" ON public.nr1_proart_respostas;
CREATE POLICY "Admin master lê todas respostas PROART" ON public.nr1_proart_respostas AS PERMISSIVE FOR SELECT TO authenticated
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador insere suas respostas PROART" ON public.nr1_proart_respostas;
CREATE POLICY "Colaborador insere suas respostas PROART" ON public.nr1_proart_respostas AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = nr1_proart_respostas.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaborador lê suas respostas PROART" ON public.nr1_proart_respostas;
CREATE POLICY "Colaborador lê suas respostas PROART" ON public.nr1_proart_respostas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = nr1_proart_respostas.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Gestor lê respostas PROART dos subordinados" ON public.nr1_proart_respostas;
CREATE POLICY "Gestor lê respostas PROART dos subordinados" ON public.nr1_proart_respostas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM (colaboradores c
     JOIN colaboradores g ON ((g.id = c.gestor_id)))
  WHERE ((c.id = nr1_proart_respostas.colaborador_id) AND (g.user_id = auth.uid()))))));

DROP POLICY IF EXISTS regras_sugestao_all_admin ON public.nr1_regras_sugestao;
CREATE POLICY regras_sugestao_all_admin ON public.nr1_regras_sugestao AS PERMISSIVE FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)))
  WITH CHECK ((has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)));

DROP POLICY IF EXISTS catalogo_delete_admin ON public.nr1_riscos_catalogo;
CREATE POLICY catalogo_delete_admin ON public.nr1_riscos_catalogo AS PERMISSIVE FOR DELETE TO authenticated
  USING (((editavel = true) AND (admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS catalogo_insert_admin ON public.nr1_riscos_catalogo;
CREATE POLICY catalogo_insert_admin ON public.nr1_riscos_catalogo AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS catalogo_select_auth ON public.nr1_riscos_catalogo;
CREATE POLICY catalogo_select_auth ON public.nr1_riscos_catalogo AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((company_id IS NULL) AND (editavel = false)) OR (company_id = get_my_company_id()) OR admin_master_scope(company_id)));

DROP POLICY IF EXISTS catalogo_update_admin ON public.nr1_riscos_catalogo;
CREATE POLICY catalogo_update_admin ON public.nr1_riscos_catalogo AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((editavel = true) AND (admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin empresa can manage objetivos via ciclo" ON public.objetivos_ciclo;
CREATE POLICY "Admin empresa can manage objetivos via ciclo" ON public.objetivos_ciclo AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = objetivos_ciclo.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = objetivos_ciclo.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin master full access objetivos_ciclo" ON public.objetivos_ciclo;
CREATE POLICY "Admin master full access objetivos_ciclo" ON public.objetivos_ciclo AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = objetivos_ciclo.ciclo_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = objetivos_ciclo.ciclo_id))));

DROP POLICY IF EXISTS "Analista RH can manage objetivos via ciclo" ON public.objetivos_ciclo;
CREATE POLICY "Analista RH can manage objetivos via ciclo" ON public.objetivos_ciclo AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = objetivos_ciclo.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = objetivos_ciclo.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Colaborador can view objetivos with own avaliacoes" ON public.objetivos_ciclo;
CREATE POLICY "Colaborador can view objetivos with own avaliacoes" ON public.objetivos_ciclo AS PERMISSIVE FOR SELECT TO public
  USING (colaborador_has_avaliacao_in_ciclo(ciclo_id));

DROP POLICY IF EXISTS "Gestor can view objetivos via ciclo" ON public.objetivos_ciclo;
CREATE POLICY "Gestor can view objetivos via ciclo" ON public.objetivos_ciclo AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = objetivos_ciclo.ciclo_id) AND has_role(auth.uid(), 'gestor_departamento'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS onboarding_insert_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_insert_own_company ON public.onboarding_progress AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS onboarding_select_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_select_own_company ON public.onboarding_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS onboarding_update_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_update_own_company ON public.onboarding_progress AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS pdi_checkins_admin_all ON public.pdi_checkins;
CREATE POLICY pdi_checkins_admin_all ON public.pdi_checkins AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT co.company_id
   FROM ((pdi_itens pi2
     JOIN pdis p ON ((p.id = pi2.pdi_id)))
     JOIN colaboradores co ON ((co.id = p.colaborador_id)))
  WHERE (pi2.id = pdi_checkins.pdi_item_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT co.company_id
   FROM ((pdi_itens pi2
     JOIN pdis p ON ((p.id = pi2.pdi_id)))
     JOIN colaboradores co ON ((co.id = p.colaborador_id)))
  WHERE (pi2.id = pdi_checkins.pdi_item_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS pdi_checkins_colaborador_insert ON public.pdi_checkins;
CREATE POLICY pdi_checkins_colaborador_insert ON public.pdi_checkins AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdi_checkins_colaborador_read ON public.pdi_checkins;
CREATE POLICY pdi_checkins_colaborador_read ON public.pdi_checkins AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdi_checkins_gestor_access ON public.pdi_checkins;
CREATE POLICY pdi_checkins_gestor_access ON public.pdi_checkins AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.gestor_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((pdi_itens pi
     JOIN pdis pdi ON ((pdi.id = pi.pdi_id)))
     JOIN colaboradores c ON ((c.id = pdi.gestor_id)))
  WHERE ((pi.id = pdi_checkins.pdi_item_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdi_itens_admin_all ON public.pdi_itens;
CREATE POLICY pdi_itens_admin_all ON public.pdi_itens AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT co.company_id
   FROM (pdis p
     JOIN colaboradores co ON ((co.id = p.colaborador_id)))
  WHERE (p.id = pdi_itens.pdi_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (c.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT co.company_id
   FROM (pdis p
     JOIN colaboradores co ON ((co.id = p.colaborador_id)))
  WHERE (p.id = pdi_itens.pdi_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS pdi_itens_colaborador_insert ON public.pdi_itens;
CREATE POLICY pdi_itens_colaborador_insert ON public.pdi_itens AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (c.user_id = auth.uid()) AND (pdi.created_by_colaborador = true)))));

DROP POLICY IF EXISTS pdi_itens_colaborador_read ON public.pdi_itens;
CREATE POLICY pdi_itens_colaborador_read ON public.pdi_itens AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdi_itens_colaborador_update ON public.pdi_itens;
CREATE POLICY pdi_itens_colaborador_update ON public.pdi_itens AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores c ON ((c.id = pdi.colaborador_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdi_itens_gestor_access ON public.pdi_itens;
CREATE POLICY pdi_itens_gestor_access ON public.pdi_itens AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM (pdis pdi
     JOIN colaboradores g ON ((g.id = pdi.gestor_id)))
  WHERE ((pdi.id = pdi_itens.pdi_id) AND (g.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdis_admin_all ON public.pdis;
CREATE POLICY pdis_admin_all ON public.pdis AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = pdis.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = pdis.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS pdis_colaborador_insert ON public.pdis;
CREATE POLICY pdis_colaborador_insert ON public.pdis AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.user_id = auth.uid())))) AND (created_by_colaborador = true)));

DROP POLICY IF EXISTS pdis_colaborador_read ON public.pdis;
CREATE POLICY pdis_colaborador_read ON public.pdis AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS pdis_colaborador_update ON public.pdis;
CREATE POLICY pdis_colaborador_update ON public.pdis AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.user_id = auth.uid())))) AND (created_by_colaborador = true)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.colaborador_id) AND (c.user_id = auth.uid())))) AND (created_by_colaborador = true)));

DROP POLICY IF EXISTS pdis_gestor_access ON public.pdis;
CREATE POLICY pdis_gestor_access ON public.pdis AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = pdis.gestor_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Admin pode gerenciar perguntas cuidar plus" ON public.perguntas_cuidar_plus;
CREATE POLICY "Admin pode gerenciar perguntas cuidar plus" ON public.perguntas_cuidar_plus AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = perguntas_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT q_1.company_id
           FROM questionarios_cuidar_plus q_1
          WHERE (q_1.id = perguntas_cuidar_plus.questionario_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = perguntas_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT q_1.company_id
           FROM questionarios_cuidar_plus q_1
          WHERE (q_1.id = perguntas_cuidar_plus.questionario_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Colaboradores can read active Cuidar+ questions in their compan" ON public.perguntas_cuidar_plus;
CREATE POLICY "Colaboradores can read active Cuidar+ questions in their compan" ON public.perguntas_cuidar_plus AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = perguntas_cuidar_plus.questionario_id) AND (q.is_active = true) AND (q.company_id = get_my_company_id())))));

DROP POLICY IF EXISTS pgr_alteracoes_admin_company ON public.pgr_alteracoes;
CREATE POLICY pgr_alteracoes_admin_company ON public.pgr_alteracoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_alteracoes.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_alteracoes.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_alteracoes.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_alteracoes.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))));

DROP POLICY IF EXISTS pgr_documentos_admin_company ON public.pgr_documentos;
CREATE POLICY pgr_documentos_admin_company ON public.pgr_documentos AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role])))));

DROP POLICY IF EXISTS pgr_psico_dominios_admin_company ON public.pgr_psicossocial_dominios;
CREATE POLICY pgr_psico_dominios_admin_company ON public.pgr_psicossocial_dominios AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_psicossocial_dominios.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_psicossocial_dominios.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_psicossocial_dominios.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_psicossocial_dominios.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))));

DROP POLICY IF EXISTS pgr_risco_detalhes_admin_company ON public.pgr_risco_detalhes;
CREATE POLICY pgr_risco_detalhes_admin_company ON public.pgr_risco_detalhes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM nr1_ghe_riscos r
  WHERE ((r.id = pgr_risco_detalhes.risco_ghe_id) AND (admin_master_scope(( SELECT gr.company_id
           FROM nr1_ghe_riscos gr
          WHERE (gr.id = pgr_risco_detalhes.risco_ghe_id))) OR ((r.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM nr1_ghe_riscos r
  WHERE ((r.id = pgr_risco_detalhes.risco_ghe_id) AND (admin_master_scope(( SELECT gr.company_id
           FROM nr1_ghe_riscos gr
          WHERE (gr.id = pgr_risco_detalhes.risco_ghe_id))) OR ((r.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))));

DROP POLICY IF EXISTS pgr_secoes_admin_company ON public.pgr_secoes;
CREATE POLICY pgr_secoes_admin_company ON public.pgr_secoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_secoes.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_secoes.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM pgr_documentos d
  WHERE ((d.id = pgr_secoes.documento_id) AND (admin_master_scope(( SELECT d_1.company_id
           FROM pgr_documentos d_1
          WHERE (d_1.id = pgr_secoes.documento_id))) OR ((d.company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role, 'admin_master'::app_role]))))))));

DROP POLICY IF EXISTS "Super admin le auditoria" ON public.platform_audit_logs;
CREATE POLICY "Super admin le auditoria" ON public.platform_audit_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admin registra auditoria" ON public.platform_audit_logs;
CREATE POLICY "Super admin registra auditoria" ON public.platform_audit_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_super_admin() AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "Admin empresa manage own abonos" ON public.ponto_abonos;
CREATE POLICY "Admin empresa manage own abonos" ON public.ponto_abonos AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master manage all abonos" ON public.ponto_abonos;
CREATE POLICY "Admin master manage all abonos" ON public.ponto_abonos AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador read own abonos" ON public.ponto_abonos;
CREATE POLICY "Colaborador read own abonos" ON public.ponto_abonos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Gestor read team abonos" ON public.ponto_abonos;
CREATE POLICY "Gestor read team abonos" ON public.ponto_abonos AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'gestor_departamento'::app_role) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id IN ( SELECT colaboradores_1.id
           FROM colaboradores colaboradores_1
          WHERE (colaboradores_1.user_id = auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access on ponto_compensacoes" ON public.ponto_compensacoes;
CREATE POLICY "Admin master full access on ponto_compensacoes" ON public.ponto_compensacoes AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaboradores read own company compensacoes" ON public.ponto_compensacoes;
CREATE POLICY "Colaboradores read own company compensacoes" ON public.ponto_compensacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Company admins manage own compensacoes" ON public.ponto_compensacoes;
CREATE POLICY "Company admins manage own compensacoes" ON public.ponto_compensacoes AS PERMISSIVE FOR ALL TO authenticated
  USING (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin empresa can manage own company ponto config" ON public.ponto_configuracoes;
CREATE POLICY "Admin empresa can manage own company ponto config" ON public.ponto_configuracoes AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master can manage all ponto config" ON public.ponto_configuracoes;
CREATE POLICY "Admin master can manage all ponto config" ON public.ponto_configuracoes AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "All authenticated can read own company ponto config" ON public.ponto_configuracoes;
CREATE POLICY "All authenticated can read own company ponto config" ON public.ponto_configuracoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS tratativas_modify ON public.ponto_fechamento_tratativas;
CREATE POLICY tratativas_modify ON public.ponto_fechamento_tratativas AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS tratativas_select ON public.ponto_fechamento_tratativas;
CREATE POLICY tratativas_select ON public.ponto_fechamento_tratativas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role, 'gestor_departamento'::app_role])) AND (company_id = get_my_company_id())) OR (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company ponto registros" ON public.ponto_registros;
CREATE POLICY "Admin empresa can manage own company ponto registros" ON public.ponto_registros AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master can manage all ponto registros" ON public.ponto_registros;
CREATE POLICY "Admin master can manage all ponto registros" ON public.ponto_registros AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador can insert own ponto registros" ON public.ponto_registros;
CREATE POLICY "Colaborador can insert own ponto registros" ON public.ponto_registros AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))) AND (((ajuste_manual = false) AND (status_aprovacao = 'aprovado'::text)) OR ((ajuste_manual = true) AND (status_aprovacao = 'pendente'::text)))));

DROP POLICY IF EXISTS "Colaborador can read own ponto registros" ON public.ponto_registros;
CREATE POLICY "Colaborador can read own ponto registros" ON public.ponto_registros AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Colaborador can update own ponto exclusao" ON public.ponto_registros;
CREATE POLICY "Colaborador can update own ponto exclusao" ON public.ponto_registros AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))))
  WITH CHECK ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Gestor can read team ponto registros" ON public.ponto_registros;
CREATE POLICY "Gestor can read team ponto registros" ON public.ponto_registros AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'gestor_departamento'::app_role) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id IN ( SELECT colaboradores_1.id
           FROM colaboradores colaboradores_1
          WHERE (colaboradores_1.user_id = auth.uid())))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company ponto resumo" ON public.ponto_resumo_diario;
CREATE POLICY "Admin empresa can manage own company ponto resumo" ON public.ponto_resumo_diario AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master can manage all ponto resumo" ON public.ponto_resumo_diario;
CREATE POLICY "Admin master can manage all ponto resumo" ON public.ponto_resumo_diario AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador can read own ponto resumo" ON public.ponto_resumo_diario;
CREATE POLICY "Colaborador can read own ponto resumo" ON public.ponto_resumo_diario AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Gestor can read team ponto resumo" ON public.ponto_resumo_diario;
CREATE POLICY "Gestor can read team ponto resumo" ON public.ponto_resumo_diario AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'gestor_departamento'::app_role) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id IN ( SELECT colaboradores_1.id
           FROM colaboradores colaboradores_1
          WHERE (colaboradores_1.user_id = auth.uid())))))));

DROP POLICY IF EXISTS "Admin empresa manage own tipos abono" ON public.ponto_tipos_abono;
CREATE POLICY "Admin empresa manage own tipos abono" ON public.ponto_tipos_abono AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master manage all tipos abono" ON public.ponto_tipos_abono;
CREATE POLICY "Admin master manage all tipos abono" ON public.ponto_tipos_abono AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "All authenticated read own company tipos abono" ON public.ponto_tipos_abono;
CREATE POLICY "All authenticated read own company tipos abono" ON public.ponto_tipos_abono AS PERMISSIVE FOR SELECT TO authenticated
  USING (((company_id = get_my_company_id()) OR admin_master_scope(company_id)));

DROP POLICY IF EXISTS "Admin empresa can update own company profiles" ON public.profiles;
CREATE POLICY "Admin empresa can update own company profiles" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id IS NOT NULL) AND (company_id = get_user_company_id(auth.uid())) AND (NOT is_admin_master(user_id)) AND (NOT has_role(user_id, 'admin_empresa'::app_role))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id IS NOT NULL) AND (company_id = get_user_company_id(auth.uid())) AND (NOT is_admin_master(user_id)) AND (NOT has_role(user_id, 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS "Admin empresa can view company profiles" ON public.profiles;
CREATE POLICY "Admin empresa can view company profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master can manage all profiles" ON public.profiles;
CREATE POLICY "Admin master can manage all profiles" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Admins can view profiles from same company" ON public.profiles;
CREATE POLICY "Admins can view profiles from same company" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id IS NOT NULL) AND (company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)))));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS admin_empresa_manage_promocoes ON public.promocoes_colaborador;
CREATE POLICY admin_empresa_manage_promocoes ON public.promocoes_colaborador AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS admin_master_full_access_promocoes ON public.promocoes_colaborador;
CREATE POLICY admin_master_full_access_promocoes ON public.promocoes_colaborador AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS analista_rh_manage_promocoes ON public.promocoes_colaborador;
CREATE POLICY analista_rh_manage_promocoes ON public.promocoes_colaborador AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS colaborador_view_own_promocoes ON public.promocoes_colaborador;
CREATE POLICY colaborador_view_own_promocoes ON public.promocoes_colaborador AS PERMISSIVE FOR SELECT TO public
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS gestor_view_promocoes ON public.promocoes_colaborador;
CREATE POLICY gestor_view_promocoes ON public.promocoes_colaborador AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = promocoes_colaborador.colaborador_id) AND (c.gestor_id = get_my_colaborador_id()))))));

DROP POLICY IF EXISTS psico_atribuicoes_colab_select ON public.psico_atribuicoes;
CREATE POLICY psico_atribuicoes_colab_select ON public.psico_atribuicoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS psico_atribuicoes_colab_update ON public.psico_atribuicoes;
CREATE POLICY psico_atribuicoes_colab_update ON public.psico_atribuicoes AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((colaborador_id = get_my_colaborador_id()) AND ((status)::text <> 'preenchido'::text)))
  WITH CHECK ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS psico_atribuicoes_rh_all ON public.psico_atribuicoes;
CREATE POLICY psico_atribuicoes_rh_all ON public.psico_atribuicoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_avaliacoes a
  WHERE ((a.id = psico_atribuicoes.avaliacao_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = psico_atribuicoes.colaborador_id))) OR (a.company_id = get_my_company_id())))))))
  WITH CHECK ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_avaliacoes a
  WHERE ((a.id = psico_atribuicoes.avaliacao_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = psico_atribuicoes.colaborador_id))) OR (a.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS psico_avaliacao_ghes_colab_select ON public.psico_avaliacao_ghes;
CREATE POLICY psico_avaliacao_ghes_colab_select ON public.psico_avaliacao_ghes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM psico_atribuicoes t
  WHERE ((t.avaliacao_id = psico_avaliacao_ghes.avaliacao_id) AND (t.colaborador_id = get_my_colaborador_id())))));

DROP POLICY IF EXISTS psico_avaliacao_ghes_rh_all ON public.psico_avaliacao_ghes;
CREATE POLICY psico_avaliacao_ghes_rh_all ON public.psico_avaliacao_ghes AS PERMISSIVE FOR ALL TO authenticated
  USING ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_avaliacoes a
  WHERE ((a.id = psico_avaliacao_ghes.avaliacao_id) AND (admin_master_scope(( SELECT pa.company_id
           FROM psico_avaliacoes pa
          WHERE (pa.id = psico_avaliacao_ghes.avaliacao_id))) OR (a.company_id = get_my_company_id())))))))
  WITH CHECK ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_avaliacoes a
  WHERE ((a.id = psico_avaliacao_ghes.avaliacao_id) AND (admin_master_scope(( SELECT pa.company_id
           FROM psico_avaliacoes pa
          WHERE (pa.id = psico_avaliacao_ghes.avaliacao_id))) OR (a.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS psico_avaliacoes_colab_select ON public.psico_avaliacoes;
CREATE POLICY psico_avaliacoes_colab_select ON public.psico_avaliacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM psico_atribuicoes t
  WHERE ((t.avaliacao_id = t.id) AND (t.colaborador_id = get_my_colaborador_id())))));

DROP POLICY IF EXISTS psico_avaliacoes_rh_all ON public.psico_avaliacoes;
CREATE POLICY psico_avaliacoes_rh_all ON public.psico_avaliacoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((psico_is_rh() AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))))
  WITH CHECK ((psico_is_rh() AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS psico_dimensoes_select ON public.psico_dimensoes;
CREATE POLICY psico_dimensoes_select ON public.psico_dimensoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_dimensoes.instrumento_id) AND ((i.company_id IS NULL) OR (i.company_id = get_my_company_id()) OR admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_dimensoes.instrumento_id))))))));

DROP POLICY IF EXISTS psico_dimensoes_write ON public.psico_dimensoes;
CREATE POLICY psico_dimensoes_write ON public.psico_dimensoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_dimensoes.instrumento_id) AND (i.editavel = true) AND (admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_dimensoes.instrumento_id))) OR (i.company_id = get_my_company_id()))))) AND (NOT psico_instrumento_em_uso(instrumento_id))))
  WITH CHECK ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_dimensoes.instrumento_id) AND (i.editavel = true) AND (admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_dimensoes.instrumento_id))) OR (i.company_id = get_my_company_id()))))) AND (NOT psico_instrumento_em_uso(instrumento_id))));

DROP POLICY IF EXISTS psico_instrumentos_delete ON public.psico_instrumentos;
CREATE POLICY psico_instrumentos_delete ON public.psico_instrumentos AS PERMISSIVE FOR DELETE TO authenticated
  USING ((psico_is_rh() AND (editavel = true) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS psico_instrumentos_insert ON public.psico_instrumentos;
CREATE POLICY psico_instrumentos_insert ON public.psico_instrumentos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((psico_is_rh() AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS psico_instrumentos_select ON public.psico_instrumentos;
CREATE POLICY psico_instrumentos_select ON public.psico_instrumentos AS PERMISSIVE FOR SELECT TO authenticated
  USING (((company_id IS NULL) OR (company_id = get_my_company_id()) OR admin_master_scope(company_id)));

DROP POLICY IF EXISTS psico_instrumentos_update ON public.psico_instrumentos;
CREATE POLICY psico_instrumentos_update ON public.psico_instrumentos AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((psico_is_rh() AND (editavel = true) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))))
  WITH CHECK ((psico_is_rh() AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS psico_perguntas_select ON public.psico_perguntas;
CREATE POLICY psico_perguntas_select ON public.psico_perguntas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_perguntas.instrumento_id) AND ((i.company_id IS NULL) OR (i.company_id = get_my_company_id()) OR admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_perguntas.instrumento_id))))))));

DROP POLICY IF EXISTS psico_perguntas_write ON public.psico_perguntas;
CREATE POLICY psico_perguntas_write ON public.psico_perguntas AS PERMISSIVE FOR ALL TO authenticated
  USING ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_perguntas.instrumento_id) AND (i.editavel = true) AND (admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_perguntas.instrumento_id))) OR (i.company_id = get_my_company_id()))))) AND (NOT psico_instrumento_em_uso(instrumento_id))))
  WITH CHECK ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_instrumentos i
  WHERE ((i.id = psico_perguntas.instrumento_id) AND (i.editavel = true) AND (admin_master_scope(( SELECT pi.company_id
           FROM psico_instrumentos pi
          WHERE (pi.id = psico_perguntas.instrumento_id))) OR (i.company_id = get_my_company_id()))))) AND (NOT psico_instrumento_em_uso(instrumento_id))));

DROP POLICY IF EXISTS psico_respostas_rh_select ON public.psico_respostas;
CREATE POLICY psico_respostas_rh_select ON public.psico_respostas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((psico_is_rh() AND (EXISTS ( SELECT 1
   FROM psico_avaliacoes a
  WHERE ((a.id = psico_respostas.avaliacao_id) AND (admin_master_scope(( SELECT pa.company_id
           FROM psico_avaliacoes pa
          WHERE (pa.id = psico_respostas.avaliacao_id))) OR (a.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Admin master can view access logs" ON public.pulse_access_logs;
CREATE POLICY "Admin master can view access logs" ON public.pulse_access_logs AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(( SELECT pc.company_id
   FROM pulse_campaigns pc
  WHERE (pc.id = pulse_access_logs.campaign_id))));

DROP POLICY IF EXISTS "Admins can insert access logs" ON public.pulse_access_logs;
CREATE POLICY "Admins can insert access logs" ON public.pulse_access_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((admin_id = auth.uid()) AND ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) OR admin_master_scope(( SELECT pc.company_id
   FROM pulse_campaigns pc
  WHERE (pc.id = pulse_access_logs.campaign_id))))));

DROP POLICY IF EXISTS "Admins de empresa podem ver logs da empresa" ON public.pulse_access_logs;
CREATE POLICY "Admins de empresa podem ver logs da empresa" ON public.pulse_access_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM pulse_campaigns c
  WHERE ((c.id = pulse_access_logs.campaign_id) AND (c.company_id = get_my_company_id()))))));

DROP POLICY IF EXISTS "Admin master can manage all campaigns" ON public.pulse_campaigns;
CREATE POLICY "Admin master can manage all campaigns" ON public.pulse_campaigns AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaboradores can view active campaigns" ON public.pulse_campaigns;
CREATE POLICY "Colaboradores can view active campaigns" ON public.pulse_campaigns AS PERMISSIVE FOR SELECT TO public
  USING (((ativo = true) AND (company_id = get_my_company_id()) AND ((CURRENT_DATE >= data_inicio) AND (CURRENT_DATE <= data_fim))));

DROP POLICY IF EXISTS "Company admins can manage own campaigns" ON public.pulse_campaigns;
CREATE POLICY "Company admins can manage own campaigns" ON public.pulse_campaigns AS PERMISSIVE FOR ALL TO public
  USING (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin master can manage all questions" ON public.pulse_questions;
CREATE POLICY "Admin master can manage all questions" ON public.pulse_questions AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT pc.company_id
   FROM pulse_campaigns pc
  WHERE (pc.id = pulse_questions.campaign_id))))
  WITH CHECK (admin_master_scope(( SELECT pc.company_id
   FROM pulse_campaigns pc
  WHERE (pc.id = pulse_questions.campaign_id))));

DROP POLICY IF EXISTS "Company admins can manage own questions" ON public.pulse_questions;
CREATE POLICY "Company admins can manage own questions" ON public.pulse_questions AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS ( SELECT 1
   FROM pulse_campaigns c
  WHERE ((c.id = pulse_questions.campaign_id) AND (c.company_id = get_my_company_id())))) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM pulse_campaigns c
  WHERE ((c.id = pulse_questions.campaign_id) AND (c.company_id = get_my_company_id())))) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Users can view questions of accessible campaigns" ON public.pulse_questions;
CREATE POLICY "Users can view questions of accessible campaigns" ON public.pulse_questions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM pulse_campaigns c
  WHERE ((c.id = pulse_questions.campaign_id) AND (c.company_id = get_my_company_id())))));

DROP POLICY IF EXISTS "Admin master can view all responses" ON public.pulse_responses;
CREATE POLICY "Admin master can view all responses" ON public.pulse_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING (admin_master_scope(( SELECT pc.company_id
   FROM pulse_campaigns pc
  WHERE (pc.id = pulse_responses.campaign_id))));

DROP POLICY IF EXISTS "Colaboradores can insert own responses" ON public.pulse_responses;
CREATE POLICY "Colaboradores can insert own responses" ON public.pulse_responses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((employee_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Colaboradores can view own responses" ON public.pulse_responses;
CREATE POLICY "Colaboradores can view own responses" ON public.pulse_responses AS PERMISSIVE FOR SELECT TO public
  USING ((employee_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Company admins can view company responses" ON public.pulse_responses;
CREATE POLICY "Company admins can view company responses" ON public.pulse_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (EXISTS ( SELECT 1
   FROM pulse_campaigns pc
  WHERE ((pc.id = pulse_responses.campaign_id) AND (pc.company_id = get_my_company_id()))))));

DROP POLICY IF EXISTS "Admins veem pulse surveys da empresa" ON public.pulse_surveys;
CREATE POLICY "Admins veem pulse surveys da empresa" ON public.pulse_surveys AS PERMISSIVE FOR SELECT TO public
  USING ((admin_master_scope(company_id) OR ((get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem criar pulse survey" ON public.pulse_surveys;
CREATE POLICY "Colaboradores podem criar pulse survey" ON public.pulse_surveys AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((employee_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Colaboradores veem seu histórico de pulse" ON public.pulse_surveys;
CREATE POLICY "Colaboradores veem seu histórico de pulse" ON public.pulse_surveys AS PERMISSIVE FOR SELECT TO public
  USING ((employee_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS atrib_admin_all ON public.questionario_atribuicoes;
CREATE POLICY atrib_admin_all ON public.questionario_atribuicoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (descricao_questionario dq
     JOIN descricoes_cargo d ON ((d.id = dq.descricao_cargo_id)))
  WHERE ((dq.id = questionario_atribuicoes.descricao_questionario_id) AND estrut_can_read(d.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (descricao_questionario dq
     JOIN descricoes_cargo d ON ((d.id = dq.descricao_cargo_id)))
  WHERE ((dq.id = questionario_atribuicoes.descricao_questionario_id) AND estrut_can_read(d.company_id)))));

DROP POLICY IF EXISTS atrib_colab_select ON public.questionario_atribuicoes;
CREATE POLICY atrib_colab_select ON public.questionario_atribuicoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS atrib_colab_update ON public.questionario_atribuicoes;
CREATE POLICY atrib_colab_update ON public.questionario_atribuicoes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()))
  WITH CHECK ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS modelos_select ON public.questionario_modelos;
CREATE POLICY modelos_select ON public.questionario_modelos AS PERMISSIVE FOR SELECT TO authenticated
  USING (estrut_can_read(company_id));

DROP POLICY IF EXISTS modelos_write ON public.questionario_modelos;
CREATE POLICY modelos_write ON public.questionario_modelos AS PERMISSIVE FOR ALL TO authenticated
  USING ((estrut_can_read(company_id) AND (admin_master_scope(company_id) OR (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((estrut_can_read(company_id) AND (admin_master_scope(company_id) OR (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS opcoes_all ON public.questionario_opcoes;
CREATE POLICY opcoes_all ON public.questionario_opcoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((questionario_perguntas p
     JOIN questionario_secoes s ON ((s.id = p.secao_id)))
     JOIN questionario_modelos m ON ((m.id = s.modelo_id)))
  WHERE ((p.id = questionario_opcoes.pergunta_id) AND estrut_can_read(m.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((questionario_perguntas p
     JOIN questionario_secoes s ON ((s.id = p.secao_id)))
     JOIN questionario_modelos m ON ((m.id = s.modelo_id)))
  WHERE ((p.id = questionario_opcoes.pergunta_id) AND estrut_can_read(m.company_id)))));

DROP POLICY IF EXISTS perguntas_all ON public.questionario_perguntas;
CREATE POLICY perguntas_all ON public.questionario_perguntas AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (questionario_secoes s
     JOIN questionario_modelos m ON ((m.id = s.modelo_id)))
  WHERE ((s.id = questionario_perguntas.secao_id) AND estrut_can_read(m.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (questionario_secoes s
     JOIN questionario_modelos m ON ((m.id = s.modelo_id)))
  WHERE ((s.id = questionario_perguntas.secao_id) AND estrut_can_read(m.company_id)))));

DROP POLICY IF EXISTS resp_admin_all ON public.questionario_respostas;
CREATE POLICY resp_admin_all ON public.questionario_respostas AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((questionario_atribuicoes a
     JOIN descricao_questionario dq ON ((dq.id = a.descricao_questionario_id)))
     JOIN descricoes_cargo d ON ((d.id = dq.descricao_cargo_id)))
  WHERE ((a.id = questionario_respostas.atribuicao_id) AND estrut_can_read(d.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((questionario_atribuicoes a
     JOIN descricao_questionario dq ON ((dq.id = a.descricao_questionario_id)))
     JOIN descricoes_cargo d ON ((d.id = dq.descricao_cargo_id)))
  WHERE ((a.id = questionario_respostas.atribuicao_id) AND estrut_can_read(d.company_id)))));

DROP POLICY IF EXISTS resp_colab_all ON public.questionario_respostas;
CREATE POLICY resp_colab_all ON public.questionario_respostas AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM questionario_atribuicoes a
  WHERE ((a.id = questionario_respostas.atribuicao_id) AND (a.colaborador_id = get_my_colaborador_id())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM questionario_atribuicoes a
  WHERE ((a.id = questionario_respostas.atribuicao_id) AND (a.colaborador_id = get_my_colaborador_id()) AND (a.status <> 'preenchido'::questionario_atribuicao_status)))));

DROP POLICY IF EXISTS secoes_all ON public.questionario_secoes;
CREATE POLICY secoes_all ON public.questionario_secoes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM questionario_modelos m
  WHERE ((m.id = questionario_secoes.modelo_id) AND estrut_can_read(m.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM questionario_modelos m
  WHERE ((m.id = questionario_secoes.modelo_id) AND estrut_can_read(m.company_id)))));

DROP POLICY IF EXISTS "Admin pode gerenciar questionarios cuidar plus" ON public.questionarios_cuidar_plus;
CREATE POLICY "Admin pode gerenciar questionarios cuidar plus" ON public.questionarios_cuidar_plus AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(company_id) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())))))
  WITH CHECK ((admin_master_scope(company_id) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company templates" ON public.questionnaire_templates;
CREATE POLICY "Admin empresa can manage own company templates" ON public.questionnaire_templates AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND ((company_id IS NULL) OR (company_id = get_user_company_id(auth.uid())))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND ((company_id IS NULL) OR (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Admin master full access questionnaire_templates" ON public.questionnaire_templates;
CREATE POLICY "Admin master full access questionnaire_templates" ON public.questionnaire_templates AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can view templates" ON public.questionnaire_templates;
CREATE POLICY "Analista RH can view templates" ON public.questionnaire_templates AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND ((company_id IS NULL) OR (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Gestor departamento can view questionnaire_templates" ON public.questionnaire_templates;
CREATE POLICY "Gestor departamento can view questionnaire_templates" ON public.questionnaire_templates AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND ((company_id IS NULL) OR (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Admin empresa can manage questions" ON public.questions;
CREATE POLICY "Admin empresa can manage questions" ON public.questions AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM questionnaire_templates qt
  WHERE ((qt.id = questions.questionnaire_template_id) AND ((qt.company_id IS NULL) OR (qt.company_id = get_user_company_id(auth.uid()))))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM questionnaire_templates qt
  WHERE ((qt.id = questions.questionnaire_template_id) AND ((qt.company_id IS NULL) OR (qt.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Admin master full access questions" ON public.questions;
CREATE POLICY "Admin master full access questions" ON public.questions AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT qt.company_id
   FROM questionnaire_templates qt
  WHERE (qt.id = questions.questionnaire_template_id))))
  WITH CHECK (admin_master_scope(( SELECT qt.company_id
   FROM questionnaire_templates qt
  WHERE (qt.id = questions.questionnaire_template_id))));

DROP POLICY IF EXISTS "Analista RH can view questions" ON public.questions;
CREATE POLICY "Analista RH can view questions" ON public.questions AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM questionnaire_templates qt
  WHERE ((qt.id = questions.questionnaire_template_id) AND ((qt.company_id IS NULL) OR (qt.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Colaborador can view questions from own cycles" ON public.questions;
CREATE POLICY "Colaborador can view questions from own cycles" ON public.questions AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (EXISTS ( SELECT 1
   FROM (feedback_cycles fc
     JOIN colaboradores c ON ((c.id = fc.colaborador_id)))
  WHERE ((c.user_id = auth.uid()) AND ((fc.collaborator_questionnaire_template_id = questions.questionnaire_template_id) OR (fc.gestor_questionnaire_template_id = questions.questionnaire_template_id)))))));

DROP POLICY IF EXISTS "Gestor departamento can view questions" ON public.questions;
CREATE POLICY "Gestor departamento can view questions" ON public.questions AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM questionnaire_templates qt
  WHERE ((qt.id = questions.questionnaire_template_id) AND ((qt.company_id IS NULL) OR (qt.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Delete own reports" ON public.relatorios_executivos_salvos;
CREATE POLICY "Delete own reports" ON public.relatorios_executivos_salvos AS PERMISSIVE FOR DELETE TO public
  USING ((admin_master_scope(company_id) OR ((criado_por_user_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Insert own company reports" ON public.relatorios_executivos_salvos;
CREATE POLICY "Insert own company reports" ON public.relatorios_executivos_salvos AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.uid() = criado_por_user_id) AND (admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Update own reports" ON public.relatorios_executivos_salvos;
CREATE POLICY "Update own reports" ON public.relatorios_executivos_salvos AS PERMISSIVE FOR UPDATE TO public
  USING ((admin_master_scope(company_id) OR ((criado_por_user_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())))))
  WITH CHECK ((admin_master_scope(company_id) OR ((criado_por_user_id = auth.uid()) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "View company reports" ON public.relatorios_executivos_salvos;
CREATE POLICY "View company reports" ON public.relatorios_executivos_salvos AS PERMISSIVE FOR SELECT TO public
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Admin master can insert replication logs" ON public.replication_logs;
CREATE POLICY "Admin master can insert replication logs" ON public.replication_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((get_my_role() = 'admin_master'::app_role));

DROP POLICY IF EXISTS "Admin master can view replication logs" ON public.replication_logs;
CREATE POLICY "Admin master can view replication logs" ON public.replication_logs AS PERMISSIVE FOR SELECT TO public
  USING ((get_my_role() = 'admin_master'::app_role));

DROP POLICY IF EXISTS "Admin pode visualizar respostas cuidar plus" ON public.respostas_cuidar_plus;
CREATE POLICY "Admin pode visualizar respostas cuidar plus" ON public.respostas_cuidar_plus AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = respostas_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT q_1.company_id
           FROM (perguntas_cuidar_plus pg
             JOIN questionarios_cuidar_plus q_1 ON ((q_1.id = pg.questionario_id)))
          WHERE (pg.id = respostas_cuidar_plus.pergunta_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "admin_master reads rate limit audit" ON public.security_rate_limit_logs;
CREATE POLICY "admin_master reads rate limit audit" ON public.security_rate_limit_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin_master(auth.uid()));

DROP POLICY IF EXISTS estrut_setores_delete ON public.setores;
CREATE POLICY estrut_setores_delete ON public.setores AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_setores_insert ON public.setores;
CREATE POLICY estrut_setores_insert ON public.setores AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_setores_select ON public.setores;
CREATE POLICY estrut_setores_select ON public.setores AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_setores_update ON public.setores;
CREATE POLICY estrut_setores_update ON public.setores AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_delete_own ON public.tasks AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
CREATE POLICY tasks_insert_own ON public.tasks AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
CREATE POLICY tasks_update_own ON public.tasks AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_reminders_delete_own ON public.tasks_reminders;
CREATE POLICY tasks_reminders_delete_own ON public.tasks_reminders AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_reminders_insert_own ON public.tasks_reminders;
CREATE POLICY tasks_reminders_insert_own ON public.tasks_reminders AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_reminders_select_own ON public.tasks_reminders;
CREATE POLICY tasks_reminders_select_own ON public.tasks_reminders AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS tasks_reminders_update_own ON public.tasks_reminders;
CREATE POLICY tasks_reminders_update_own ON public.tasks_reminders AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS admin_read_own_terms ON public.terms_acceptance;
CREATE POLICY admin_read_own_terms ON public.terms_acceptance AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS super_admin_read_terms ON public.terms_acceptance;
CREATE POLICY super_admin_read_terms ON public.terms_acceptance AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS transf_insert_block ON public.transferencias_colaborador;
CREATE POLICY transf_insert_block ON public.transferencias_colaborador AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS transf_select_admin_rh ON public.transferencias_colaborador;
CREATE POLICY transf_select_admin_rh ON public.transferencias_colaborador AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = transferencias_colaborador.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND ((empresa_origem_id = get_my_company_id()) OR (empresa_destino_id = get_my_company_id())))));

DROP POLICY IF EXISTS "Admins veem progresso de aulas" ON public.treinamento_aula_progresso;
CREATE POLICY "Admins veem progresso de aulas" ON public.treinamento_aula_progresso AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role, 'gestor_departamento'::app_role])) OR admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = treinamento_aula_progresso.colaborador_id)))));

DROP POLICY IF EXISTS "Colaborador gerencia seu progresso de aula" ON public.treinamento_aula_progresso;
CREATE POLICY "Colaborador gerencia seu progresso de aula" ON public.treinamento_aula_progresso AS PERMISSIVE FOR ALL TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()))
  WITH CHECK ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS "Admins gerenciam aulas" ON public.treinamento_aulas;
CREATE POLICY "Admins gerenciam aulas" ON public.treinamento_aulas AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Autenticados podem ver aulas" ON public.treinamento_aulas;
CREATE POLICY "Autenticados podem ver aulas" ON public.treinamento_aulas AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem atualizar seus logs" ON public.treinamento_logs_acesso;
CREATE POLICY "Colaboradores podem atualizar seus logs" ON public.treinamento_logs_acesso AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_logs_acesso.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem inserir seus logs" ON public.treinamento_logs_acesso;
CREATE POLICY "Colaboradores podem inserir seus logs" ON public.treinamento_logs_acesso AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_logs_acesso.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem ver seus logs" ON public.treinamento_logs_acesso;
CREATE POLICY "Colaboradores podem ver seus logs" ON public.treinamento_logs_acesso AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_logs_acesso.colaborador_id) AND (c.user_id = auth.uid())))) OR admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = treinamento_logs_acesso.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role) OR has_role(auth.uid(), 'gestor_departamento'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_logs_acesso.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Admins gerenciam modulos" ON public.treinamento_modulos;
CREATE POLICY "Admins gerenciam modulos" ON public.treinamento_modulos AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Autenticados podem ver modulos" ON public.treinamento_modulos;
CREATE POLICY "Autenticados podem ver modulos" ON public.treinamento_modulos AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem atualizar seu progresso" ON public.treinamento_progresso;
CREATE POLICY "Colaboradores podem atualizar seu progresso" ON public.treinamento_progresso AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_progresso.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem inserir seu progresso" ON public.treinamento_progresso;
CREATE POLICY "Colaboradores podem inserir seu progresso" ON public.treinamento_progresso AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_progresso.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem ver seu progresso" ON public.treinamento_progresso;
CREATE POLICY "Colaboradores podem ver seu progresso" ON public.treinamento_progresso AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_progresso.colaborador_id) AND (c.user_id = auth.uid())))) OR admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = treinamento_progresso.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role) OR has_role(auth.uid(), 'gestor_departamento'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_progresso.colaborador_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_alternativas" ON public.treinamento_quiz_alternativas;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_alternativas" ON public.treinamento_quiz_alternativas AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT t.company_id
   FROM (treinamento_quiz_perguntas qp
     JOIN treinamentos t ON ((t.id = qp.treinamento_id)))
  WHERE (qp.id = treinamento_quiz_alternativas.pergunta_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM (treinamento_quiz_perguntas p
     JOIN treinamentos t ON ((t.id = p.treinamento_id)))
  WHERE ((p.id = treinamento_quiz_alternativas.pergunta_id) AND (t.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT t.company_id
   FROM (treinamento_quiz_perguntas qp
     JOIN treinamentos t ON ((t.id = qp.treinamento_id)))
  WHERE (qp.id = treinamento_quiz_alternativas.pergunta_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM (treinamento_quiz_perguntas p
     JOIN treinamentos t ON ((t.id = p.treinamento_id)))
  WHERE ((p.id = treinamento_quiz_alternativas.pergunta_id) AND (t.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Colaboradores podem ver alternativas de treinamentos publicados" ON public.treinamento_quiz_alternativas;
CREATE POLICY "Colaboradores podem ver alternativas de treinamentos publicados" ON public.treinamento_quiz_alternativas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (treinamento_quiz_perguntas p
     JOIN treinamentos t ON ((t.id = p.treinamento_id)))
  WHERE ((p.id = treinamento_quiz_alternativas.pergunta_id) AND (t.status = 'publicado'::treinamento_status) AND (t.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_config" ON public.treinamento_quiz_config;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_config" ON public.treinamento_quiz_config AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT t.company_id
   FROM treinamentos t
  WHERE (t.id = treinamento_quiz_config.treinamento_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_config.treinamento_id) AND (t.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT t.company_id
   FROM treinamentos t
  WHERE (t.id = treinamento_quiz_config.treinamento_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_config.treinamento_id) AND (t.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Colaboradores podem ver quiz config de treinamentos publicados" ON public.treinamento_quiz_config;
CREATE POLICY "Colaboradores podem ver quiz config de treinamentos publicados" ON public.treinamento_quiz_config AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_config.treinamento_id) AND (t.status = 'publicado'::treinamento_status) AND (t.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin pode gerenciar treinamento_quiz_perguntas" ON public.treinamento_quiz_perguntas;
CREATE POLICY "Admin pode gerenciar treinamento_quiz_perguntas" ON public.treinamento_quiz_perguntas AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(( SELECT t.company_id
   FROM treinamentos t
  WHERE (t.id = treinamento_quiz_perguntas.treinamento_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_perguntas.treinamento_id) AND (t.company_id = get_my_company_id())))))))
  WITH CHECK ((admin_master_scope(( SELECT t.company_id
   FROM treinamentos t
  WHERE (t.id = treinamento_quiz_perguntas.treinamento_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_perguntas.treinamento_id) AND (t.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Colaboradores podem ver perguntas de treinamentos publicados" ON public.treinamento_quiz_perguntas;
CREATE POLICY "Colaboradores podem ver perguntas de treinamentos publicados" ON public.treinamento_quiz_perguntas AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM treinamentos t
  WHERE ((t.id = treinamento_quiz_perguntas.treinamento_id) AND (t.status = 'publicado'::treinamento_status) AND (t.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Colaboradores podem inserir suas tentativas" ON public.treinamento_quiz_tentativas;
CREATE POLICY "Colaboradores podem inserir suas tentativas" ON public.treinamento_quiz_tentativas AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_quiz_tentativas.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Colaboradores podem ver suas tentativas" ON public.treinamento_quiz_tentativas;
CREATE POLICY "Colaboradores podem ver suas tentativas" ON public.treinamento_quiz_tentativas AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_quiz_tentativas.colaborador_id) AND (c.user_id = auth.uid())))) OR admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = treinamento_quiz_tentativas.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role) OR has_role(auth.uid(), 'gestor_departamento'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = treinamento_quiz_tentativas.colaborador_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Admin pode gerenciar treinamentos" ON public.treinamentos;
CREATE POLICY "Admin pode gerenciar treinamentos" ON public.treinamentos AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Colaboradores podem ver treinamentos publicados" ON public.treinamentos;
CREATE POLICY "Colaboradores podem ver treinamentos publicados" ON public.treinamentos AS PERMISSIVE FOR SELECT TO public
  USING ((admin_master_scope(company_id) OR has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role) OR ((status = 'publicado'::treinamento_status) AND ((company_id = get_user_company_id(auth.uid())) OR (get_user_company_id(auth.uid()) = ANY (COALESCE(target_company_ids, ARRAY[]::uuid[])))))));

DROP POLICY IF EXISTS estrut_unidades_delete ON public.unidades_organizacionais;
CREATE POLICY estrut_unidades_delete ON public.unidades_organizacionais AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_unidades_insert ON public.unidades_organizacionais;
CREATE POLICY estrut_unidades_insert ON public.unidades_organizacionais AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_unidades_select ON public.unidades_organizacionais;
CREATE POLICY estrut_unidades_select ON public.unidades_organizacionais AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_unidades_update ON public.unidades_organizacionais;
CREATE POLICY estrut_unidades_update ON public.unidades_organizacionais AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences" ON public.user_preferences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin empresa can view own company user roles" ON public.user_roles;
CREATE POLICY "Admin empresa can view own company user roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = user_roles.user_id) AND (p.company_id = get_user_company_id(auth.uid())) AND (p.company_id IS NOT NULL))))));

DROP POLICY IF EXISTS "Admin master can manage all roles" ON public.user_roles;
CREATE POLICY "Admin master can manage all roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin master full access work_schedules" ON public.work_schedules;
CREATE POLICY "Admin master full access work_schedules" ON public.work_schedules AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Company admins manage work_schedules" ON public.work_schedules;
CREATE POLICY "Company admins manage work_schedules" ON public.work_schedules AS PERMISSIVE FOR ALL TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))))
  WITH CHECK (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Company members read work_schedules" ON public.work_schedules;
CREATE POLICY "Company members read work_schedules" ON public.work_schedules AS PERMISSIVE FOR SELECT TO public
  USING ((company_id = get_my_company_id()));
