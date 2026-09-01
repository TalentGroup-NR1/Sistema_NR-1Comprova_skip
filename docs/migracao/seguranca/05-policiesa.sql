-- SEÇÃO 5: POLICIES (parte 1/2)
-- SEÇÃO 5: POLICIES
DROP POLICY IF EXISTS "Admins can read audit for their company" ON public.acesso_colaborador_audit;
CREATE POLICY "Admins can read audit for their company" ON public.acesso_colaborador_audit AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Service role can manage audit" ON public.acesso_colaborador_audit;
CREATE POLICY "Service role can manage audit" ON public.acesso_colaborador_audit AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS admin_notifications_super_admin_read ON public.admin_notifications;
CREATE POLICY admin_notifications_super_admin_read ON public.admin_notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS admin_notifications_super_admin_update ON public.admin_notifications;
CREATE POLICY admin_notifications_super_admin_update ON public.admin_notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admin roles can delete analises_perfil" ON public.analises_perfil;
CREATE POLICY "Admin roles can delete analises_perfil" ON public.analises_perfil AS PERMISSIVE FOR DELETE TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin roles can insert analises_perfil" ON public.analises_perfil;
CREATE POLICY "Admin roles can insert analises_perfil" ON public.analises_perfil AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (created_by = auth.uid())));

DROP POLICY IF EXISTS "Admin roles can select analises_perfil" ON public.analises_perfil;
CREATE POLICY "Admin roles can select analises_perfil" ON public.analises_perfil AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin roles can update analises_perfil" ON public.analises_perfil;
CREATE POLICY "Admin roles can update analises_perfil" ON public.analises_perfil AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin empresa can manage own company avaliacao_links" ON public.avaliacao_links;
CREATE POLICY "Admin empresa can manage own company avaliacao_links" ON public.avaliacao_links AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_links.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_links.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access avaliacao_links" ON public.avaliacao_links;
CREATE POLICY "Admin master full access avaliacao_links" ON public.avaliacao_links AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_links.avaliacao_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_links.avaliacao_id))));

DROP POLICY IF EXISTS "Analista RH can manage own company avaliacao_links" ON public.avaliacao_links;
CREATE POLICY "Analista RH can manage own company avaliacao_links" ON public.avaliacao_links AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_links.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_links.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Colaborador can view own autoavaliacao links" ON public.avaliacao_links;
CREATE POLICY "Colaborador can view own autoavaliacao links" ON public.avaliacao_links AS PERMISSIVE FOR SELECT TO public
  USING (((tipo = 'autoavaliacao'::avaliacao_link_tipo) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN colaboradores c ON ((c.id = a.colaborador_id)))
  WHERE ((a.id = avaliacao_links.avaliacao_id) AND (c.user_id = auth.uid()))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company respostas_competencias" ON public.avaliacao_respostas_competencias;
CREATE POLICY "Admin empresa can manage own company respostas_competencias" ON public.avaliacao_respostas_competencias AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_competencias.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_competencias.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access avaliacao_respostas_competencias" ON public.avaliacao_respostas_competencias;
CREATE POLICY "Admin master full access avaliacao_respostas_competencias" ON public.avaliacao_respostas_competencias AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_respostas_competencias.avaliacao_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_respostas_competencias.avaliacao_id))));

DROP POLICY IF EXISTS "Analista RH can manage own company respostas_competencias" ON public.avaliacao_respostas_competencias;
CREATE POLICY "Analista RH can manage own company respostas_competencias" ON public.avaliacao_respostas_competencias AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_competencias.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_competencias.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company respostas_objetivos" ON public.avaliacao_respostas_objetivos;
CREATE POLICY "Admin empresa can manage own company respostas_objetivos" ON public.avaliacao_respostas_objetivos AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_objetivos.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_objetivos.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access avaliacao_respostas_objetivos" ON public.avaliacao_respostas_objetivos;
CREATE POLICY "Admin master full access avaliacao_respostas_objetivos" ON public.avaliacao_respostas_objetivos AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_respostas_objetivos.avaliacao_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM (avaliacoes av
     JOIN ciclos_avaliacao ca ON ((ca.id = av.ciclo_id)))
  WHERE (av.id = avaliacao_respostas_objetivos.avaliacao_id))));

DROP POLICY IF EXISTS "Analista RH can manage own company respostas_objetivos" ON public.avaliacao_respostas_objetivos;
CREATE POLICY "Analista RH can manage own company respostas_objetivos" ON public.avaliacao_respostas_objetivos AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_objetivos.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM (avaliacoes a
     JOIN ciclos_avaliacao c ON ((c.id = a.ciclo_id)))
  WHERE ((a.id = avaliacao_respostas_objetivos.avaliacao_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company avaliacoes" ON public.avaliacoes;
CREATE POLICY "Admin empresa can manage own company avaliacoes" ON public.avaliacoes AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = avaliacoes.ciclo_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = avaliacoes.ciclo_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access avaliacoes" ON public.avaliacoes;
CREATE POLICY "Admin master full access avaliacoes" ON public.avaliacoes AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = avaliacoes.ciclo_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = avaliacoes.ciclo_id))));

DROP POLICY IF EXISTS "Analista RH can manage own company avaliacoes" ON public.avaliacoes;
CREATE POLICY "Analista RH can manage own company avaliacoes" ON public.avaliacoes AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = avaliacoes.ciclo_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = avaliacoes.ciclo_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Colaborador can view own avaliacoes" ON public.avaliacoes;
CREATE POLICY "Colaborador can view own avaliacoes" ON public.avaliacoes AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = avaliacoes.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Gestor can view own avaliacoes" ON public.avaliacoes;
CREATE POLICY "Gestor can view own avaliacoes" ON public.avaliacoes AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (gestor_id = get_my_colaborador_id())));

DROP POLICY IF EXISTS "Admins insert fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins insert fechamentos" ON public.banco_horas_fechamentos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admins select fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins select fechamentos" ON public.banco_horas_fechamentos AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admins update fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins update fechamentos" ON public.banco_horas_fechamentos AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(company_id) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Colaboradores can view own banco_horas_fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Colaboradores can view own banco_horas_fechamentos" ON public.banco_horas_fechamentos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Only admin_master deletes fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Only admin_master deletes fechamentos" ON public.banco_horas_fechamentos AS PERMISSIVE FOR DELETE TO authenticated
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Admins read fechamentos auditoria" ON public.banco_horas_fechamentos_auditoria;
CREATE POLICY "Admins read fechamentos auditoria" ON public.banco_horas_fechamentos_auditoria AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role])) AND (admin_master_scope(( SELECT f.company_id
   FROM banco_horas_fechamentos f
  WHERE (f.id = banco_horas_fechamentos_auditoria.fechamento_id))) OR (EXISTS ( SELECT 1
   FROM banco_horas_fechamentos f
  WHERE ((f.id = banco_horas_fechamentos_auditoria.fechamento_id) AND (f.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Admin empresa manage perfis banco horas" ON public.banco_horas_perfis;
CREATE POLICY "Admin empresa manage perfis banco horas" ON public.banco_horas_perfis AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master manage perfis banco horas" ON public.banco_horas_perfis;
CREATE POLICY "Admin master manage perfis banco horas" ON public.banco_horas_perfis AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Read perfis banco horas da empresa" ON public.banco_horas_perfis;
CREATE POLICY "Read perfis banco horas da empresa" ON public.banco_horas_perfis AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin empresa can manage own company beneficios" ON public.beneficios;
CREATE POLICY "Admin empresa can manage own company beneficios" ON public.beneficios AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin master full access beneficios" ON public.beneficios;
CREATE POLICY "Admin master full access beneficios" ON public.beneficios AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company beneficios" ON public.beneficios;
CREATE POLICY "Analista RH can manage own company beneficios" ON public.beneficios AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Colaborador can view active beneficios from own company" ON public.beneficios;
CREATE POLICY "Colaborador can view active beneficios from own company" ON public.beneficios AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (ativo = true)));

DROP POLICY IF EXISTS "Gestor can view own company beneficios" ON public.beneficios;
CREATE POLICY "Gestor can view own company beneficios" ON public.beneficios AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin empresa can manage own company beneficios_departamento" ON public.beneficios_departamento;
CREATE POLICY "Admin empresa can manage own company beneficios_departamento" ON public.beneficios_departamento AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin master full access beneficios_departamento" ON public.beneficios_departamento;
CREATE POLICY "Admin master full access beneficios_departamento" ON public.beneficios_departamento AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company beneficios_departamento" ON public.beneficios_departamento;
CREATE POLICY "Analista RH can manage own company beneficios_departamento" ON public.beneficios_departamento AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Colaborador can view beneficios_departamento from own company" ON public.beneficios_departamento;
CREATE POLICY "Colaborador can view beneficios_departamento from own company" ON public.beneficios_departamento AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS admin_master_full_access_beneficios_empresa_cliente ON public.beneficios_empresa_cliente;
CREATE POLICY admin_master_full_access_beneficios_empresa_cliente ON public.beneficios_empresa_cliente AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS colaborador_read_beneficios_empresa_cliente ON public.beneficios_empresa_cliente;
CREATE POLICY colaborador_read_beneficios_empresa_cliente ON public.beneficios_empresa_cliente AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS company_admin_access_beneficios_empresa_cliente ON public.beneficios_empresa_cliente;
CREATE POLICY company_admin_access_beneficios_empresa_cliente ON public.beneficios_empresa_cliente AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS admin_empresa_rh_access_materiais ON public.beneficios_materiais;
CREATE POLICY admin_empresa_rh_access_materiais ON public.beneficios_materiais AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS ( SELECT 1
   FROM beneficios b
  WHERE ((b.id = beneficios_materiais.beneficio_id) AND (b.company_id = get_my_company_id())))) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM beneficios b
  WHERE ((b.id = beneficios_materiais.beneficio_id) AND (b.company_id = get_my_company_id())))) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS admin_master_full_access_materiais ON public.beneficios_materiais;
CREATE POLICY admin_master_full_access_materiais ON public.beneficios_materiais AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT b.company_id
   FROM beneficios b
  WHERE (b.id = beneficios_materiais.beneficio_id))))
  WITH CHECK (admin_master_scope(( SELECT b.company_id
   FROM beneficios b
  WHERE (b.id = beneficios_materiais.beneficio_id))));

DROP POLICY IF EXISTS colaborador_read_materiais ON public.beneficios_materiais;
CREATE POLICY colaborador_read_materiais ON public.beneficios_materiais AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(( SELECT b.company_id
   FROM beneficios b
  WHERE (b.id = beneficios_materiais.beneficio_id))) OR (EXISTS ( SELECT 1
   FROM (beneficios b
     JOIN colaboradores c ON ((c.user_id = auth.uid())))
  WHERE ((b.id = beneficios_materiais.beneficio_id) AND (b.company_id = c.company_id))))));

DROP POLICY IF EXISTS admin_master_full_access_beneficios_tipo_contrato ON public.beneficios_tipo_contrato;
CREATE POLICY admin_master_full_access_beneficios_tipo_contrato ON public.beneficios_tipo_contrato AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS colaborador_read_beneficios_tipo_contrato ON public.beneficios_tipo_contrato;
CREATE POLICY colaborador_read_beneficios_tipo_contrato ON public.beneficios_tipo_contrato AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS company_admin_access_beneficios_tipo_contrato ON public.beneficios_tipo_contrato;
CREATE POLICY company_admin_access_beneficios_tipo_contrato ON public.beneficios_tipo_contrato AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())))
  WITH CHECK (((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Users can insert own greeting acks" ON public.birthday_greeting_acknowledgments;
CREATE POLICY "Users can insert own greeting acks" ON public.birthday_greeting_acknowledgments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view own greeting acks" ON public.birthday_greeting_acknowledgments;
CREATE POLICY "Users can view own greeting acks" ON public.birthday_greeting_acknowledgments AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS blog_posts_public_read ON public.blog_posts;
CREATE POLICY blog_posts_public_read ON public.blog_posts AS PERMISSIVE FOR SELECT TO public
  USING ((status = 'published'::text));

DROP POLICY IF EXISTS blog_posts_super_admin_all ON public.blog_posts;
CREATE POLICY blog_posts_super_admin_all ON public.blog_posts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admin empresa can read company campanha leituras" ON public.campanha_leituras;
CREATE POLICY "Admin empresa can read company campanha leituras" ON public.campanha_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin master can read all campanha leituras" ON public.campanha_leituras;
CREATE POLICY "Admin master can read all campanha leituras" ON public.campanha_leituras AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can read company campanha leituras" ON public.campanha_leituras;
CREATE POLICY "Analista RH can read company campanha leituras" ON public.campanha_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own campanha leituras" ON public.campanha_leituras;
CREATE POLICY "Users can insert own campanha leituras" ON public.campanha_leituras AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read own campanha leituras" ON public.campanha_leituras;
CREATE POLICY "Users can read own campanha leituras" ON public.campanha_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Campanhas: delete por admin/rh" ON public.campanhas_comunicados;
CREATE POLICY "Campanhas: delete por admin/rh" ON public.campanhas_comunicados AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Campanhas: insert por admin/rh" ON public.campanhas_comunicados;
CREATE POLICY "Campanhas: insert por admin/rh" ON public.campanhas_comunicados AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Campanhas: leitura por empresa" ON public.campanhas_comunicados;
CREATE POLICY "Campanhas: leitura por empresa" ON public.campanhas_comunicados AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Campanhas: update por admin/rh" ON public.campanhas_comunicados;
CREATE POLICY "Campanhas: update por admin/rh" ON public.campanhas_comunicados AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS estrut_cargos_delete ON public.cargos;
CREATE POLICY estrut_cargos_delete ON public.cargos AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_cargos_insert ON public.cargos;
CREATE POLICY estrut_cargos_insert ON public.cargos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_cargos_select ON public.cargos;
CREATE POLICY estrut_cargos_select ON public.cargos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_cargos_update ON public.cargos;
CREATE POLICY estrut_cargos_update ON public.cargos AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Admin pode gerenciar categorias_treinamento" ON public.categorias_treinamento;
CREATE POLICY "Admin pode gerenciar categorias_treinamento" ON public.categorias_treinamento AS PERMISSIVE FOR ALL TO public
  USING ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Colaboradores podem ver categorias da empresa" ON public.categorias_treinamento;
CREATE POLICY "Colaboradores podem ver categorias da empresa" ON public.categorias_treinamento AS PERMISSIVE FOR SELECT TO authenticated
  USING (((company_id = get_user_company_id(auth.uid())) OR admin_master_scope(company_id)));

DROP POLICY IF EXISTS cbo_delete ON public.cbo_ocupacoes;
CREATE POLICY cbo_delete ON public.cbo_ocupacoes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_admin_master(auth.uid()) OR (get_my_role() = 'admin_empresa'::app_role)));

DROP POLICY IF EXISTS cbo_insert ON public.cbo_ocupacoes;
CREATE POLICY cbo_insert ON public.cbo_ocupacoes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin_master(auth.uid()) OR (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS cbo_select_all ON public.cbo_ocupacoes;
CREATE POLICY cbo_select_all ON public.cbo_ocupacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS cbo_update ON public.cbo_ocupacoes;
CREATE POLICY cbo_update ON public.cbo_ocupacoes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_admin_master(auth.uid()) OR (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK ((is_admin_master(auth.uid()) OR (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;
CREATE POLICY "Admin can insert certificates" ON public.certificates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((company_id = get_user_company_id(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin can update certificates" ON public.certificates;
CREATE POLICY "Admin can update certificates" ON public.certificates AS PERMISSIVE FOR UPDATE TO public
  USING (((company_id = get_user_company_id(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin master full access certificates" ON public.certificates;
CREATE POLICY "Admin master full access certificates" ON public.certificates AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador can insert own certificate" ON public.certificates;
CREATE POLICY "Colaborador can insert own certificate" ON public.certificates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((company_id = get_user_company_id(auth.uid())) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Company users can view certificates" ON public.certificates;
CREATE POLICY "Company users can view certificates" ON public.certificates AS PERMISSIVE FOR SELECT TO public
  USING (((company_id = get_user_company_id(auth.uid())) AND (admin_master_scope(company_id) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role, 'gestor_departamento'::app_role])) OR (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))))));

DROP POLICY IF EXISTS "Admin master full access audit logs" ON public.certificates_audit_logs;
CREATE POLICY "Admin master full access audit logs" ON public.certificates_audit_logs AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ce.company_id
   FROM certificates ce
  WHERE (ce.id = certificates_audit_logs.certificate_id))));

DROP POLICY IF EXISTS "Company admin can view audit logs" ON public.certificates_audit_logs;
CREATE POLICY "Company admin can view audit logs" ON public.certificates_audit_logs AS PERMISSIVE FOR SELECT TO public
  USING (((certificate_id IN ( SELECT certificates.id
   FROM certificates
  WHERE (certificates.company_id = get_user_company_id(auth.uid())))) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Scoped insert audit logs" ON public.certificates_audit_logs;
CREATE POLICY "Scoped insert audit logs" ON public.certificates_audit_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM certificates c
  WHERE ((c.id = certificates_audit_logs.certificate_id) AND (admin_master_scope(( SELECT ce.company_id
           FROM certificates ce
          WHERE (ce.id = certificates_audit_logs.certificate_id))) OR (c.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company ciclos_avaliacao" ON public.ciclos_avaliacao;
CREATE POLICY "Admin empresa can manage own company ciclos_avaliacao" ON public.ciclos_avaliacao AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access ciclos_avaliacao" ON public.ciclos_avaliacao;
CREATE POLICY "Admin master full access ciclos_avaliacao" ON public.ciclos_avaliacao AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company ciclos_avaliacao" ON public.ciclos_avaliacao;
CREATE POLICY "Analista RH can manage own company ciclos_avaliacao" ON public.ciclos_avaliacao AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaborador can view ciclos with own avaliacoes" ON public.ciclos_avaliacao;
CREATE POLICY "Colaborador can view ciclos with own avaliacoes" ON public.ciclos_avaliacao AS PERMISSIVE FOR SELECT TO public
  USING (colaborador_has_avaliacao_in_ciclo(id));

DROP POLICY IF EXISTS "Gestor can view own company ciclos_avaliacao" ON public.ciclos_avaliacao;
CREATE POLICY "Gestor can view own company ciclos_avaliacao" ON public.ciclos_avaliacao AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin empresa can manage colaborador_beneficios via colaborador" ON public.colaborador_beneficios;
CREATE POLICY "Admin empresa can manage colaborador_beneficios via colaborador" ON public.colaborador_beneficios AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access colaborador_beneficios" ON public.colaborador_beneficios;
CREATE POLICY "Admin master full access colaborador_beneficios" ON public.colaborador_beneficios AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = colaborador_beneficios.colaborador_id))))
  WITH CHECK (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = colaborador_beneficios.colaborador_id))));

DROP POLICY IF EXISTS "Analista RH can manage colaborador_beneficios via colaborador" ON public.colaborador_beneficios;
CREATE POLICY "Analista RH can manage colaborador_beneficios via colaborador" ON public.colaborador_beneficios AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Colaborador can view own beneficios" ON public.colaborador_beneficios;
CREATE POLICY "Colaborador can view own beneficios" ON public.colaborador_beneficios AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = colaborador_beneficios.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company colaboradores" ON public.colaboradores;
CREATE POLICY "Admin empresa can manage own company colaboradores" ON public.colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access colaboradores" ON public.colaboradores;
CREATE POLICY "Admin master full access colaboradores" ON public.colaboradores AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company colaboradores" ON public.colaboradores;
CREATE POLICY "Analista RH can manage own company colaboradores" ON public.colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaboradores can view their own record" ON public.colaboradores;
CREATE POLICY "Colaboradores can view their own record" ON public.colaboradores AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = auth.uid()) OR admin_master_scope(company_id) OR ((get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_user_company_id(auth.uid()))) OR ((get_user_role(auth.uid()) = 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (gestor_id = get_my_colaborador_id()))));

DROP POLICY IF EXISTS "Colaborador reads own consents" ON public.collaborator_consents;
CREATE POLICY "Colaborador reads own consents" ON public.collaborator_consents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = collaborator_consents.collaborator_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "RH manage consents" ON public.collaborator_consents;
CREATE POLICY "RH manage consents" ON public.collaborator_consents AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))))
  WITH CHECK ((admin_master_scope(company_id) OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin master can manage companies" ON public.companies;
CREATE POLICY "Admin master can manage companies" ON public.companies AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(id))
  WITH CHECK (admin_master_scope(id));

DROP POLICY IF EXISTS "Super admin pode ver empresas" ON public.companies;
CREATE POLICY "Super admin pode ver empresas" ON public.companies AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(id) OR (id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin empresa can manage competencias via ciclo" ON public.competencias_ciclo;
CREATE POLICY "Admin empresa can manage competencias via ciclo" ON public.competencias_ciclo AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = competencias_ciclo.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = competencias_ciclo.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin master full access competencias_ciclo" ON public.competencias_ciclo;
CREATE POLICY "Admin master full access competencias_ciclo" ON public.competencias_ciclo AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = competencias_ciclo.ciclo_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = competencias_ciclo.ciclo_id))));

DROP POLICY IF EXISTS "Analista RH can manage competencias via ciclo" ON public.competencias_ciclo;
CREATE POLICY "Analista RH can manage competencias via ciclo" ON public.competencias_ciclo AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = competencias_ciclo.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = competencias_ciclo.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Colaborador can view competencias with own avaliacoes" ON public.competencias_ciclo;
CREATE POLICY "Colaborador can view competencias with own avaliacoes" ON public.competencias_ciclo AS PERMISSIVE FOR SELECT TO public
  USING (colaborador_has_avaliacao_in_ciclo(ciclo_id));

DROP POLICY IF EXISTS "Gestor can view competencias via ciclo" ON public.competencias_ciclo;
CREATE POLICY "Gestor can view competencias via ciclo" ON public.competencias_ciclo AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = competencias_ciclo.ciclo_id) AND has_role(auth.uid(), 'gestor_departamento'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin empresa can read company leituras" ON public.comunicado_leituras;
CREATE POLICY "Admin empresa can read company leituras" ON public.comunicado_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin master can read all leituras" ON public.comunicado_leituras;
CREATE POLICY "Admin master can read all leituras" ON public.comunicado_leituras AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can read company leituras" ON public.comunicado_leituras;
CREATE POLICY "Analista RH can read company leituras" ON public.comunicado_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Users can insert own leituras" ON public.comunicado_leituras;
CREATE POLICY "Users can insert own leituras" ON public.comunicado_leituras AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read own leituras" ON public.comunicado_leituras;
CREATE POLICY "Users can read own leituras" ON public.comunicado_leituras AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin empresa can manage own company comunicados" ON public.comunicados;
CREATE POLICY "Admin empresa can manage own company comunicados" ON public.comunicados AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access comunicados" ON public.comunicados;
CREATE POLICY "Admin master full access comunicados" ON public.comunicados AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company comunicados" ON public.comunicados;
CREATE POLICY "Analista RH can manage own company comunicados" ON public.comunicados AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaboradores can view published comunicados" ON public.comunicados;
CREATE POLICY "Colaboradores can view published comunicados" ON public.comunicados AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (status = 'publicado'::comunicado_status) AND (data_publicacao <= now()) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Gestor departamento can view published comunicados" ON public.comunicados;
CREATE POLICY "Gestor departamento can view published comunicados" ON public.comunicados AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (status = 'publicado'::comunicado_status) AND (data_publicacao <= now()) AND (company_id = get_user_company_id(auth.uid()))));

DROP POLICY IF EXISTS "Admin empresa can manage own company comunicados_anexos" ON public.comunicados_anexos;
CREATE POLICY "Admin empresa can manage own company comunicados_anexos" ON public.comunicados_anexos AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin master full access comunicados_anexos" ON public.comunicados_anexos;
CREATE POLICY "Admin master full access comunicados_anexos" ON public.comunicados_anexos AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND admin_master_scope(( SELECT cm.company_id
           FROM comunicados cm
          WHERE (cm.id = comunicados_anexos.comunicado_id)))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND admin_master_scope(( SELECT cm.company_id
           FROM comunicados cm
          WHERE (cm.id = comunicados_anexos.comunicado_id)))))));

DROP POLICY IF EXISTS "Analista RH can manage own company comunicados_anexos" ON public.comunicados_anexos;
CREATE POLICY "Analista RH can manage own company comunicados_anexos" ON public.comunicados_anexos AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Colaboradores can view published comunicados_anexos" ON public.comunicados_anexos;
CREATE POLICY "Colaboradores can view published comunicados_anexos" ON public.comunicados_anexos AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_anexos.comunicado_id) AND (c.status = 'publicado'::comunicado_status) AND (c.data_publicacao <= now()) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin can view all visualizacoes" ON public.comunicados_visualizacoes;
CREATE POLICY "Admin can view all visualizacoes" ON public.comunicados_visualizacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(( SELECT cm.company_id
   FROM comunicados cm
  WHERE (cm.id = comunicados_visualizacoes.comunicado_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM comunicados c
  WHERE ((c.id = comunicados_visualizacoes.comunicado_id) AND (c.company_id = get_my_company_id())))))));

DROP POLICY IF EXISTS "Colaboradores can insert own visualizacoes" ON public.comunicados_visualizacoes;
CREATE POLICY "Colaboradores can insert own visualizacoes" ON public.comunicados_visualizacoes AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = comunicados_visualizacoes.colaborador_id) AND (c.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Super admin can read contact requests" ON public.contact_requests;
CREATE POLICY "Super admin can read contact requests" ON public.contact_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS contact_requests_super_admin_update ON public.contact_requests;
CREATE POLICY contact_requests_super_admin_update ON public.contact_requests AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admin empresa/RH atualiza alertas da empresa" ON public.cuidar_alertas;
CREATE POLICY "Admin empresa/RH atualiza alertas da empresa" ON public.cuidar_alertas AS PERMISSIVE FOR UPDATE TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Admin empresa/RH lê alertas da empresa" ON public.cuidar_alertas;
CREATE POLICY "Admin empresa/RH lê alertas da empresa" ON public.cuidar_alertas AS PERMISSIVE FOR SELECT TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Admin master atualiza alertas" ON public.cuidar_alertas;
CREATE POLICY "Admin master atualiza alertas" ON public.cuidar_alertas AS PERMISSIVE FOR UPDATE TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Admin master lê alertas" ON public.cuidar_alertas;
CREATE POLICY "Admin master lê alertas" ON public.cuidar_alertas AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Admin empresa/RH lê badges da empresa" ON public.cuidar_badges;
CREATE POLICY "Admin empresa/RH lê badges da empresa" ON public.cuidar_badges AS PERMISSIVE FOR SELECT TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Admin master lê tudo (badges)" ON public.cuidar_badges;
CREATE POLICY "Admin master lê tudo (badges)" ON public.cuidar_badges AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Próprio usuário lê seus badges" ON public.cuidar_badges;
CREATE POLICY "Próprio usuário lê seus badges" ON public.cuidar_badges AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS cuidar_conteudos_admin_empresa_all ON public.cuidar_conteudos;
CREATE POLICY cuidar_conteudos_admin_empresa_all ON public.cuidar_conteudos AS PERMISSIVE FOR ALL TO public
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())))
  WITH CHECK (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS cuidar_conteudos_admin_master_all ON public.cuidar_conteudos;
CREATE POLICY cuidar_conteudos_admin_master_all ON public.cuidar_conteudos AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS cuidar_conteudos_colaborador_read ON public.cuidar_conteudos;
CREATE POLICY cuidar_conteudos_colaborador_read ON public.cuidar_conteudos AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'ativo'::text) AND ((company_id IS NULL) OR (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin master views all insights" ON public.cuidar_insights;
CREATE POLICY "Admin master views all insights" ON public.cuidar_insights AS PERMISSIVE FOR SELECT TO authenticated
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Company admins view own insights" ON public.cuidar_insights;
CREATE POLICY "Company admins view own insights" ON public.cuidar_insights AS PERMISSIVE FOR SELECT TO authenticated
  USING (((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin empresa/RH lê da empresa" ON public.cuidar_progressao;
CREATE POLICY "Admin empresa/RH lê da empresa" ON public.cuidar_progressao AS PERMISSIVE FOR SELECT TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Admin master lê tudo" ON public.cuidar_progressao;
CREATE POLICY "Admin master lê tudo" ON public.cuidar_progressao AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Próprio usuário lê sua progressão" ON public.cuidar_progressao;
CREATE POLICY "Próprio usuário lê sua progressão" ON public.cuidar_progressao AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin empresa/RH lê recomendações da empresa" ON public.cuidar_recomendacoes;
CREATE POLICY "Admin empresa/RH lê recomendações da empresa" ON public.cuidar_recomendacoes AS PERMISSIVE FOR SELECT TO public
  USING (((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))));

DROP POLICY IF EXISTS "Admin master lê tudo (recomendações)" ON public.cuidar_recomendacoes;
CREATE POLICY "Admin master lê tudo (recomendações)" ON public.cuidar_recomendacoes AS PERMISSIVE FOR SELECT TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador vê suas recomendações" ON public.cuidar_recomendacoes;
CREATE POLICY "Colaborador vê suas recomendações" ON public.cuidar_recomendacoes AS PERMISSIVE FOR SELECT TO public
  USING (((contexto = 'colaborador'::text) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "Admin master manages templates" ON public.cuidar_templates_fixos;
CREATE POLICY "Admin master manages templates" ON public.cuidar_templates_fixos AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = 'admin_master'::app_role))
  WITH CHECK ((get_my_role() = 'admin_master'::app_role));

DROP POLICY IF EXISTS "Authenticated can read templates" ON public.cuidar_templates_fixos;
CREATE POLICY "Authenticated can read templates" ON public.cuidar_templates_fixos AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS estrut_departamentos_delete ON public.departamentos;
CREATE POLICY estrut_departamentos_delete ON public.departamentos AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_departamentos_insert ON public.departamentos;
CREATE POLICY estrut_departamentos_insert ON public.departamentos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_departamentos_select ON public.departamentos;
CREATE POLICY estrut_departamentos_select ON public.departamentos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_departamentos_update ON public.departamentos;
CREATE POLICY estrut_departamentos_update ON public.departamentos AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Admin master full access dependentes" ON public.dependentes;
CREATE POLICY "Admin master full access dependentes" ON public.dependentes AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = dependentes.colaborador_id))))
  WITH CHECK (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = dependentes.colaborador_id))));

DROP POLICY IF EXISTS "Colaborador can view own dependentes" ON public.dependentes;
CREATE POLICY "Colaborador can view own dependentes" ON public.dependentes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS "Users can manage dependentes of accessible colaboradores" ON public.dependentes;
CREATE POLICY "Users can manage dependentes of accessible colaboradores" ON public.dependentes AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = dependentes.colaborador_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = dependentes.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (c.company_id = get_user_company_id(auth.uid()))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = dependentes.colaborador_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = dependentes.colaborador_id))) OR ((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (c.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS descricao_modelos_delete ON public.descricao_modelos;
CREATE POLICY descricao_modelos_delete ON public.descricao_modelos AS PERMISSIVE FOR DELETE TO authenticated
  USING (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role]))));

DROP POLICY IF EXISTS descricao_modelos_insert ON public.descricao_modelos;
CREATE POLICY descricao_modelos_insert ON public.descricao_modelos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS descricao_modelos_select ON public.descricao_modelos;
CREATE POLICY descricao_modelos_select ON public.descricao_modelos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS descricao_modelos_update ON public.descricao_modelos;
CREATE POLICY descricao_modelos_update ON public.descricao_modelos AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS descq_all ON public.descricao_questionario;
CREATE POLICY descq_all ON public.descricao_questionario AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM descricoes_cargo d
  WHERE ((d.id = descricao_questionario.descricao_cargo_id) AND estrut_can_read(d.company_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM descricoes_cargo d
  WHERE ((d.id = descricao_questionario.descricao_cargo_id) AND estrut_can_read(d.company_id)))));

DROP POLICY IF EXISTS descricoes_cargo_delete ON public.descricoes_cargo;
CREATE POLICY descricoes_cargo_delete ON public.descricoes_cargo AS PERMISSIVE FOR DELETE TO authenticated
  USING (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role]))));

DROP POLICY IF EXISTS descricoes_cargo_insert ON public.descricoes_cargo;
CREATE POLICY descricoes_cargo_insert ON public.descricoes_cargo AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS descricoes_cargo_select ON public.descricoes_cargo;
CREATE POLICY descricoes_cargo_select ON public.descricoes_cargo AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS descricoes_cargo_update ON public.descricoes_cargo;
CREATE POLICY descricoes_cargo_update ON public.descricoes_cargo AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))))
  WITH CHECK (((admin_master_scope(company_id) OR (company_id = get_my_company_id())) AND (get_my_role() = ANY (ARRAY['admin_master'::app_role, 'admin_empresa'::app_role, 'analista_rh'::app_role]))));

DROP POLICY IF EXISTS "Admin master manages all desligamentos" ON public.desligamentos_colaborador;
CREATE POLICY "Admin master manages all desligamentos" ON public.desligamentos_colaborador AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = desligamentos_colaborador.colaborador_id))))
  WITH CHECK (admin_master_scope(( SELECT co.company_id
   FROM colaboradores co
  WHERE (co.id = desligamentos_colaborador.colaborador_id))));

DROP POLICY IF EXISTS "Company admins manage own company desligamentos" ON public.desligamentos_colaborador;
CREATE POLICY "Company admins manage own company desligamentos" ON public.desligamentos_colaborador AS PERMISSIVE FOR ALL TO public
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = desligamentos_colaborador.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = desligamentos_colaborador.colaborador_id) AND (c.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin pode gerenciar dimensoes questionario cuidar plus" ON public.dimensoes_questionario_cuidar_plus;
CREATE POLICY "Admin pode gerenciar dimensoes questionario cuidar plus" ON public.dimensoes_questionario_cuidar_plus AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = dimensoes_questionario_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT q_1.company_id
           FROM questionarios_cuidar_plus q_1
          WHERE (q_1.id = dimensoes_questionario_cuidar_plus.questionario_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = dimensoes_questionario_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT q_1.company_id
           FROM questionarios_cuidar_plus q_1
          WHERE (q_1.id = dimensoes_questionario_cuidar_plus.questionario_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS empresas_clientes_delete ON public.empresas_clientes;
CREATE POLICY empresas_clientes_delete ON public.empresas_clientes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS empresas_clientes_insert ON public.empresas_clientes;
CREATE POLICY empresas_clientes_insert ON public.empresas_clientes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS empresas_clientes_select ON public.empresas_clientes;
CREATE POLICY empresas_clientes_select ON public.empresas_clientes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS empresas_clientes_update ON public.empresas_clientes;
CREATE POLICY empresas_clientes_update ON public.empresas_clientes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Admin pode gerenciar envios cuidar plus" ON public.envios_cuidar_plus;
CREATE POLICY "Admin pode gerenciar envios cuidar plus" ON public.envios_cuidar_plus AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = envios_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = envios_cuidar_plus.colaborador_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM questionarios_cuidar_plus q
  WHERE ((q.id = envios_cuidar_plus.questionario_id) AND (admin_master_scope(( SELECT co.company_id
           FROM colaboradores co
          WHERE (co.id = envios_cuidar_plus.colaborador_id))) OR (has_role(auth.uid(), 'admin_empresa'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))) OR (has_role(auth.uid(), 'analista_rh'::app_role) AND (q.company_id = get_user_company_id(auth.uid()))))))));

DROP POLICY IF EXISTS "Colaborador pode ver seus envios cuidar plus" ON public.envios_cuidar_plus;
CREATE POLICY "Colaborador pode ver seus envios cuidar plus" ON public.envios_cuidar_plus AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS espelho_mensal_admin_company ON public.espelhos_ponto_mensais;
CREATE POLICY espelho_mensal_admin_company ON public.espelhos_ponto_mensais AS PERMISSIVE FOR ALL TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role) OR has_role(auth.uid(), 'gestor_departamento'::app_role)))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)))));

DROP POLICY IF EXISTS espelho_mensal_colab_select ON public.espelhos_ponto_mensais;
CREATE POLICY espelho_mensal_colab_select ON public.espelhos_ponto_mensais AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Admin empresa can manage own company evolution_reports" ON public.evolution_reports;
CREATE POLICY "Admin empresa can manage own company evolution_reports" ON public.evolution_reports AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access evolution_reports" ON public.evolution_reports;
CREATE POLICY "Admin master full access evolution_reports" ON public.evolution_reports AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company evolution_reports" ON public.evolution_reports;
CREATE POLICY "Analista RH can manage own company evolution_reports" ON public.evolution_reports AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Gestor departamento can view evolution_reports" ON public.evolution_reports;
CREATE POLICY "Gestor departamento can view evolution_reports" ON public.evolution_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id = get_my_colaborador_id())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Admin empresa can manage own company feedback_cycles" ON public.feedback_cycles AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Admin master full access feedback_cycles" ON public.feedback_cycles AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Analista RH can manage own company feedback_cycles" ON public.feedback_cycles AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaborador can view own feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Colaborador can view own feedback_cycles" ON public.feedback_cycles AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = feedback_cycles.colaborador_id) AND (c.user_id = auth.uid()))))));

DROP POLICY IF EXISTS "Users can view own feedback cycles via colaborador link" ON public.feedback_cycles;
CREATE POLICY "Users can view own feedback cycles via colaborador link" ON public.feedback_cycles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.user_id = auth.uid()))) OR admin_master_scope(company_id) OR ((get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role, 'gestor_departamento'::app_role])) AND (company_id = get_user_company_id(auth.uid())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company feedback_responses" ON public.feedback_responses;
CREATE POLICY "Admin empresa can manage own company feedback_responses" ON public.feedback_responses AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM feedback_cycles fc
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (fc.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (EXISTS ( SELECT 1
   FROM feedback_cycles fc
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (fc.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin master full access feedback_responses" ON public.feedback_responses;
CREATE POLICY "Admin master full access feedback_responses" ON public.feedback_responses AS PERMISSIVE FOR ALL TO authenticated
  USING (admin_master_scope(( SELECT fc.company_id
   FROM feedback_cycles fc
  WHERE (fc.id = feedback_responses.feedback_cycle_id))))
  WITH CHECK (admin_master_scope(( SELECT fc.company_id
   FROM feedback_cycles fc
  WHERE (fc.id = feedback_responses.feedback_cycle_id))));

DROP POLICY IF EXISTS "Analista RH can manage own company feedback_responses" ON public.feedback_responses;
CREATE POLICY "Analista RH can manage own company feedback_responses" ON public.feedback_responses AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM feedback_cycles fc
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (fc.company_id = get_user_company_id(auth.uid())))))))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (EXISTS ( SELECT 1
   FROM feedback_cycles fc
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (fc.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Colaborador can view own feedback_responses" ON public.feedback_responses;
CREATE POLICY "Colaborador can view own feedback_responses" ON public.feedback_responses AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'colaborador'::app_role) AND (EXISTS ( SELECT 1
   FROM (feedback_cycles fc
     JOIN colaboradores c ON ((c.id = fc.colaborador_id)))
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (c.user_id = auth.uid()))))));

DROP POLICY IF EXISTS "Gestor departamento can view feedback_responses" ON public.feedback_responses;
CREATE POLICY "Gestor departamento can view feedback_responses" ON public.feedback_responses AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM feedback_cycles fc
  WHERE ((fc.id = feedback_responses.feedback_cycle_id) AND (fc.company_id = get_user_company_id(auth.uid())))))));

DROP POLICY IF EXISTS "Admin empresa can manage own company feedbacks_colaboradores" ON public.feedbacks_colaboradores;
CREATE POLICY "Admin empresa can manage own company feedbacks_colaboradores" ON public.feedbacks_colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access feedbacks_colaboradores" ON public.feedbacks_colaboradores;
CREATE POLICY "Admin master full access feedbacks_colaboradores" ON public.feedbacks_colaboradores AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company feedbacks_colaboradores" ON public.feedbacks_colaboradores;
CREATE POLICY "Analista RH can manage own company feedbacks_colaboradores" ON public.feedbacks_colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Gestor departamento can manage feedbacks_colaboradores" ON public.feedbacks_colaboradores;
CREATE POLICY "Gestor departamento can manage feedbacks_colaboradores" ON public.feedbacks_colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = feedbacks_colaboradores.colaborador_id) AND (c.gestor_id = get_my_colaborador_id()))))))
  WITH CHECK ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = feedbacks_colaboradores.colaborador_id) AND (c.gestor_id = get_my_colaborador_id()))))));

DROP POLICY IF EXISTS "Admin empresa gerencia feriados da empresa" ON public.feriados;
CREATE POLICY "Admin empresa gerencia feriados da empresa" ON public.feriados AS PERMISSIVE FOR ALL TO public
  USING (((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin_empresa'::app_role)))
  WITH CHECK (((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin_empresa'::app_role)));

DROP POLICY IF EXISTS "Admin master gerencia feriados globais e qualquer empresa" ON public.feriados;
CREATE POLICY "Admin master gerencia feriados globais e qualquer empresa" ON public.feriados AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Feriados visíveis para empresa e globais" ON public.feriados;
CREATE POLICY "Feriados visíveis para empresa e globais" ON public.feriados AS PERMISSIVE FOR SELECT TO public
  USING (((company_id IS NULL) OR admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin empresa can manage own company ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Admin empresa can manage own company ferias_gozo" ON public.ferias_gozo AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Admin master full access ferias_gozo" ON public.ferias_gozo AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Analista RH can manage own company ferias_gozo" ON public.ferias_gozo AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaborador can cancel own planejado ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can cancel own planejado ferias" ON public.ferias_gozo AS PERMISSIVE FOR UPDATE TO public
  USING (((colaborador_id = get_my_colaborador_id()) AND (status = 'planejado'::ferias_gozo_status)))
  WITH CHECK (((colaborador_id = get_my_colaborador_id()) AND (status = ANY (ARRAY['planejado'::ferias_gozo_status, 'cancelado'::ferias_gozo_status]))));

DROP POLICY IF EXISTS "Colaborador can delete own planejado ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can delete own planejado ferias" ON public.ferias_gozo AS PERMISSIVE FOR DELETE TO public
  USING (((colaborador_id = get_my_colaborador_id()) AND (status = 'planejado'::ferias_gozo_status)));

DROP POLICY IF EXISTS "Colaborador can request own ferias" ON public.ferias_gozo;
CREATE POLICY "Colaborador can request own ferias" ON public.ferias_gozo AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((colaborador_id = get_my_colaborador_id()) AND (status = 'planejado'::ferias_gozo_status)));

DROP POLICY IF EXISTS "Colaborador can view own ferias gozo" ON public.ferias_gozo;
CREATE POLICY "Colaborador can view own ferias gozo" ON public.ferias_gozo AS PERMISSIVE FOR SELECT TO public
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS "Gestor departamento can view own company ferias_gozo" ON public.ferias_gozo;
CREATE POLICY "Gestor departamento can view own company ferias_gozo" ON public.ferias_gozo AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id = get_my_colaborador_id())))));

DROP POLICY IF EXISTS "Admin empresa can manage own company ferias_periodos_aquisitivo" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Admin empresa can manage own company ferias_periodos_aquisitivo" ON public.ferias_periodos_aquisitivos AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'admin_empresa'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Admin master full access ferias_periodos_aquisitivos" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Admin master full access ferias_periodos_aquisitivos" ON public.ferias_periodos_aquisitivos AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id))
  WITH CHECK (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Analista RH can manage own company ferias_periodos_aquisitivos" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Analista RH can manage own company ferias_periodos_aquisitivos" ON public.ferias_periodos_aquisitivos AS PERMISSIVE FOR ALL TO public
  USING ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)))
  WITH CHECK ((has_role(auth.uid(), 'analista_rh'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (company_id IS NOT NULL)));

DROP POLICY IF EXISTS "Colaborador can view own periodos aquisitivos" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Colaborador can view own periodos aquisitivos" ON public.ferias_periodos_aquisitivos AS PERMISSIVE FOR SELECT TO public
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS "Gestor departamento can view own company ferias_periodos_aquisi" ON public.ferias_periodos_aquisitivos;
CREATE POLICY "Gestor departamento can view own company ferias_periodos_aquisi" ON public.ferias_periodos_aquisitivos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (company_id = get_user_company_id(auth.uid())) AND (colaborador_id IN ( SELECT colaboradores.id
   FROM colaboradores
  WHERE (colaboradores.gestor_id = get_my_colaborador_id())))));

DROP POLICY IF EXISTS "Admin empresa manages ficha_profissional" ON public.ficha_profissional;
CREATE POLICY "Admin empresa manages ficha_profissional" ON public.ficha_profissional AS PERMISSIVE FOR ALL TO public
  USING (((has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role)) AND (company_id = get_my_company_id())));

DROP POLICY IF EXISTS "Admin master full access ficha_profissional" ON public.ficha_profissional;
CREATE POLICY "Admin master full access ficha_profissional" ON public.ficha_profissional AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(company_id));

DROP POLICY IF EXISTS "Colaborador can view own ficha profissional" ON public.ficha_profissional;
CREATE POLICY "Colaborador can view own ficha profissional" ON public.ficha_profissional AS PERMISSIVE FOR SELECT TO authenticated
  USING ((colaborador_id = get_my_colaborador_id()));

DROP POLICY IF EXISTS "Gestor views ficha_profissional" ON public.ficha_profissional;
CREATE POLICY "Gestor views ficha_profissional" ON public.ficha_profissional AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'gestor_departamento'::app_role) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = ficha_profissional.colaborador_id) AND (c.gestor_id = get_my_colaborador_id()))))));

DROP POLICY IF EXISTS estrut_epis_delete ON public.ghe_epis;
CREATE POLICY estrut_epis_delete ON public.ghe_epis AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_epis_insert ON public.ghe_epis;
CREATE POLICY estrut_epis_insert ON public.ghe_epis AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_epis_select ON public.ghe_epis;
CREATE POLICY estrut_epis_select ON public.ghe_epis AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_epis_update ON public.ghe_epis;
CREATE POLICY estrut_epis_update ON public.ghe_epis AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_ghes_delete ON public.ghes;
CREATE POLICY estrut_ghes_delete ON public.ghes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = 'admin_empresa'::app_role))));

DROP POLICY IF EXISTS estrut_ghes_insert ON public.ghes;
CREATE POLICY estrut_ghes_insert ON public.ghes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS estrut_ghes_select ON public.ghes;
CREATE POLICY estrut_ghes_select ON public.ghes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((admin_master_scope(company_id) OR (company_id = get_my_company_id())));

DROP POLICY IF EXISTS estrut_ghes_update ON public.ghes;
CREATE POLICY estrut_ghes_update ON public.ghes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))))
  WITH CHECK ((admin_master_scope(company_id) OR ((company_id = get_my_company_id()) AND (get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])))));

DROP POLICY IF EXISTS "Admins read lgpd logs" ON public.lgpd_audit_logs;
CREATE POLICY "Admins read lgpd logs" ON public.lgpd_audit_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_super_admin() OR admin_master_scope(company_id) OR ((get_my_role() = 'admin_empresa'::app_role) AND (company_id = get_my_company_id()))));

DROP POLICY IF EXISTS "Admin empresa can manage metricas via ciclo" ON public.metricas_avaliacao;
CREATE POLICY "Admin empresa can manage metricas via ciclo" ON public.metricas_avaliacao AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = metricas_avaliacao.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = metricas_avaliacao.ciclo_id) AND has_role(auth.uid(), 'admin_empresa'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Admin master full access metricas_avaliacao" ON public.metricas_avaliacao;
CREATE POLICY "Admin master full access metricas_avaliacao" ON public.metricas_avaliacao AS PERMISSIVE FOR ALL TO public
  USING (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = metricas_avaliacao.ciclo_id))))
  WITH CHECK (admin_master_scope(( SELECT ca.company_id
   FROM ciclos_avaliacao ca
  WHERE (ca.id = metricas_avaliacao.ciclo_id))));

DROP POLICY IF EXISTS "Analista RH can manage metricas via ciclo" ON public.metricas_avaliacao;
CREATE POLICY "Analista RH can manage metricas via ciclo" ON public.metricas_avaliacao AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = metricas_avaliacao.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = metricas_avaliacao.ciclo_id) AND has_role(auth.uid(), 'analista_rh'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));

DROP POLICY IF EXISTS "Colaborador can view metricas with own avaliacoes" ON public.metricas_avaliacao;
CREATE POLICY "Colaborador can view metricas with own avaliacoes" ON public.metricas_avaliacao AS PERMISSIVE FOR SELECT TO public
  USING (colaborador_has_avaliacao_in_ciclo(ciclo_id));

DROP POLICY IF EXISTS "Gestor can view metricas via ciclo" ON public.metricas_avaliacao;
CREATE POLICY "Gestor can view metricas via ciclo" ON public.metricas_avaliacao AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM ciclos_avaliacao c
  WHERE ((c.id = metricas_avaliacao.ciclo_id) AND has_role(auth.uid(), 'gestor_departamento'::app_role) AND (c.company_id = get_user_company_id(auth.uid()))))));
