-- ============ Tabela de consentimentos ============
CREATE TABLE public.collaborator_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  consent_type text NOT NULL CHECK (consent_type IN ('rh_data','feedback','training','communications')),
  consent_given boolean NOT NULL DEFAULT true,
  consent_date timestamptz NOT NULL DEFAULT now(),
  revoked_date timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, consent_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_consents TO authenticated;
GRANT ALL ON public.collaborator_consents TO service_role;
ALTER TABLE public.collaborator_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH manage consents"
ON public.collaborator_consents
FOR ALL
TO authenticated
USING (
  public.admin_master_scope(company_id)
  OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role,'analista_rh'::app_role])) AND company_id = get_my_company_id())
)
WITH CHECK (
  public.admin_master_scope(company_id)
  OR ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role,'analista_rh'::app_role])) AND company_id = get_my_company_id())
);

CREATE POLICY "Colaborador reads own consents"
ON public.collaborator_consents
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = collaborator_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_collaborator_consents_updated
BEFORE UPDATE ON public.collaborator_consents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill
INSERT INTO public.collaborator_consents (collaborator_id, company_id, consent_type, consent_given, consent_date)
SELECT c.id, c.company_id, t.tipo, true, c.created_at
FROM public.colaboradores c
CROSS JOIN (VALUES ('rh_data'),('feedback'),('training'),('communications')) AS t(tipo)
WHERE c.company_id IS NOT NULL
ON CONFLICT (collaborator_id, consent_type) DO NOTHING;

-- ============ Log de auditoria LGPD ============
CREATE TABLE public.lgpd_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('export','delete','revoke_consent','grant_consent')),
  collaborator_id uuid,
  collaborator_name text,
  requested_by uuid,
  requested_by_email text,
  company_id uuid,
  ip_address text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lgpd_audit_logs TO authenticated;
GRANT ALL ON public.lgpd_audit_logs TO service_role;
ALTER TABLE public.lgpd_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read lgpd logs"
ON public.lgpd_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.admin_master_scope(company_id)
  OR (get_my_role() = 'admin_empresa'::app_role AND company_id = get_my_company_id())
);

CREATE INDEX idx_lgpd_audit_company ON public.lgpd_audit_logs (company_id, created_at DESC);

-- ============ Helper de autorização ============
CREATE OR REPLACE FUNCTION public.lgpd_can_manage(_company_id uuid, _require_admin_empresa boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.admin_master_scope(_company_id)
    OR (
      public.get_my_company_id() = _company_id
      AND (
        public.get_my_role() = 'admin_empresa'::app_role
        OR (NOT _require_admin_empresa AND public.get_my_role() = 'analista_rh'::app_role)
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.lgpd_can_manage(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lgpd_can_manage(uuid, boolean) TO authenticated, service_role;

-- ============ RPC: exportar dados ============
CREATE OR REPLACE FUNCTION public.export_collaborator_data(p_collaborator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, false) THEN
    RAISE EXCEPTION 'Sem permissão para exportar dados deste colaborador';
  END IF;

  v_result := jsonb_build_object(
    'gerado_em', now(),
    'cadastro', to_jsonb(v_colab),
    'dependentes', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.dependentes d WHERE d.colaborador_id = p_collaborator_id),
    'consentimentos', (SELECT coalesce(jsonb_agg(to_jsonb(cc)), '[]'::jsonb) FROM public.collaborator_consents cc WHERE cc.collaborator_id = p_collaborator_id),
    'feedbacks', (SELECT coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) FROM public.feedbacks_colaboradores f WHERE f.colaborador_id = p_collaborator_id),
    'diarios_de_bordo', (SELECT coalesce(jsonb_agg(to_jsonb(fc)), '[]'::jsonb) FROM public.feedback_cycles fc WHERE fc.colaborador_id = p_collaborator_id),
    'avaliacoes', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.avaliacoes a WHERE a.colaborador_id = p_collaborator_id),
    'pdis', (SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM public.pdis p WHERE p.colaborador_id = p_collaborator_id),
    'treinamentos', (SELECT coalesce(jsonb_agg(to_jsonb(tp)), '[]'::jsonb) FROM public.treinamento_progresso tp WHERE tp.colaborador_id = p_collaborator_id),
    'certificados', (SELECT coalesce(jsonb_agg(to_jsonb(ce)), '[]'::jsonb) FROM public.certificates ce WHERE ce.colaborador_id = p_collaborator_id),
    'beneficios', (SELECT coalesce(jsonb_agg(to_jsonb(cb)), '[]'::jsonb) FROM public.colaborador_beneficios cb WHERE cb.colaborador_id = p_collaborator_id),
    'comunicados_lidos', (SELECT coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) FROM public.comunicado_leituras cl WHERE cl.user_id = v_colab.user_id),
    'campanhas_lidas', (SELECT coalesce(jsonb_agg(to_jsonb(cal)), '[]'::jsonb) FROM public.campanha_leituras cal WHERE cal.user_id = v_colab.user_id),
    'ferias_periodos', (SELECT coalesce(jsonb_agg(to_jsonb(fp)), '[]'::jsonb) FROM public.ferias_periodos_aquisitivos fp WHERE fp.colaborador_id = p_collaborator_id),
    'ferias_gozo', (SELECT coalesce(jsonb_agg(to_jsonb(fg)), '[]'::jsonb) FROM public.ferias_gozo fg WHERE fg.colaborador_id = p_collaborator_id),
    'ponto_registros', (SELECT coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb) FROM public.ponto_registros pr WHERE pr.colaborador_id = p_collaborator_id),
    'ponto_resumo_diario', (SELECT coalesce(jsonb_agg(to_jsonb(prd)), '[]'::jsonb) FROM public.ponto_resumo_diario prd WHERE prd.colaborador_id = p_collaborator_id),
    'ponto_abonos', (SELECT coalesce(jsonb_agg(to_jsonb(pa)), '[]'::jsonb) FROM public.ponto_abonos pa WHERE pa.colaborador_id = p_collaborator_id),
    'promocoes', (SELECT coalesce(jsonb_agg(to_jsonb(pm)), '[]'::jsonb) FROM public.promocoes_colaborador pm WHERE pm.colaborador_id = p_collaborator_id),
    'transferencias', (SELECT coalesce(jsonb_agg(to_jsonb(tr)), '[]'::jsonb) FROM public.transferencias_colaborador tr WHERE tr.colaborador_id = p_collaborator_id),
    'desligamentos', (SELECT coalesce(jsonb_agg(to_jsonb(dc)), '[]'::jsonb) FROM public.desligamentos_colaborador dc WHERE dc.colaborador_id = p_collaborator_id),
    'ficha_profissional', (SELECT coalesce(jsonb_agg(to_jsonb(fpr)), '[]'::jsonb) FROM public.ficha_profissional fpr WHERE fpr.colaborador_id = p_collaborator_id),
    'analises_perfil', (SELECT coalesce(jsonb_agg(to_jsonb(ap)), '[]'::jsonb) FROM public.analises_perfil ap WHERE ap.colaborador_id = p_collaborator_id),
    'questionarios_cargo', (SELECT coalesce(jsonb_agg(to_jsonb(qa)), '[]'::jsonb) FROM public.questionario_atribuicoes qa WHERE qa.colaborador_id = p_collaborator_id),
    'psico_atribuicoes', (SELECT coalesce(jsonb_agg(to_jsonb(pat)), '[]'::jsonb) FROM public.psico_atribuicoes pat WHERE pat.colaborador_id = p_collaborator_id),
    'pulse_respostas', (SELECT coalesce(jsonb_agg(to_jsonb(pres)), '[]'::jsonb) FROM public.pulse_responses pres WHERE pres.employee_id = p_collaborator_id),
    'cuidar_plus_respostas', (SELECT coalesce(jsonb_agg(to_jsonb(rc)), '[]'::jsonb) FROM public.respostas_cuidar_plus rc WHERE rc.colaborador_id_identificado = p_collaborator_id),
    'notificacoes', (SELECT coalesce(jsonb_agg(to_jsonb(nt)), '[]'::jsonb) FROM public.notifications nt WHERE nt.user_id = v_colab.user_id)
  );

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES ('export', p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('descricao', format('Exportação de dados LGPD - Colaborador: %s', v_colab.full_name)));

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.export_collaborator_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_collaborator_data(uuid) TO authenticated, service_role;

-- ============ RPC: excluir dados (hard delete) ============
CREATE OR REPLACE FUNCTION public.delete_collaborator_data(p_collaborator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, true) THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode excluir dados LGPD';
  END IF;

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES ('delete', p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('descricao', format('Exclusão de dados LGPD - Colaborador: %s', v_colab.full_name),
                             'cpf', v_colab.cpf, 'matricula', v_colab.matricula));

  -- netos
  DELETE FROM public.avaliacao_respostas_competencias WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.avaliacao_respostas_objetivos WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.avaliacao_links WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.pdi_checkins WHERE autor_id = p_collaborator_id
     OR pdi_item_id IN (SELECT pi2.id FROM public.pdi_itens pi2 JOIN public.pdis p ON p.id = pi2.pdi_id WHERE p.colaborador_id = p_collaborator_id);
  DELETE FROM public.pdi_itens WHERE pdi_id IN (SELECT id FROM public.pdis WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.feedback_responses WHERE feedback_cycle_id IN (SELECT id FROM public.feedback_cycles WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.questionario_respostas WHERE atribuicao_id IN (SELECT id FROM public.questionario_atribuicoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.certificates_audit_logs WHERE certificate_id IN (SELECT id FROM public.certificates WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.banco_horas_fechamentos_auditoria WHERE fechamento_id IN (SELECT id FROM public.banco_horas_fechamentos WHERE colaborador_id = p_collaborator_id);

  -- filhos diretos
  DELETE FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id;
  UPDATE public.avaliacoes SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  DELETE FROM public.pdis WHERE colaborador_id = p_collaborator_id;
  UPDATE public.pdis SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  DELETE FROM public.feedback_cycles WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.feedbacks_colaboradores WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.questionario_atribuicoes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.certificates WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.banco_horas_fechamentos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.acesso_colaborador_audit WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.analises_perfil WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.colaborador_beneficios WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.dependentes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.desligamentos_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.envios_cuidar_plus WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.espelhos_ponto_mensais WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.evolution_reports WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ferias_gozo WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ferias_periodos_aquisitivos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ficha_profissional WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.nr1_proart_respostas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_abonos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_fechamento_tratativas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_registros WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_resumo_diario WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.promocoes_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.psico_atribuicoes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.pulse_responses WHERE employee_id = p_collaborator_id;
  DELETE FROM public.pulse_surveys WHERE employee_id = p_collaborator_id;
  DELETE FROM public.respostas_cuidar_plus WHERE colaborador_id_identificado = p_collaborator_id;
  DELETE FROM public.transferencias_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_aula_progresso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_logs_acesso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_progresso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_quiz_tentativas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.collaborator_consents WHERE collaborator_id = p_collaborator_id;

  -- vínculos por usuário
  IF v_colab.user_id IS NOT NULL THEN
    DELETE FROM public.comunicado_leituras WHERE user_id = v_colab.user_id;
    DELETE FROM public.campanha_leituras WHERE user_id = v_colab.user_id;
    DELETE FROM public.comunicados_visualizacoes WHERE user_id = v_colab.user_id;
    DELETE FROM public.notifications WHERE user_id = v_colab.user_id;
    DELETE FROM public.user_preferences WHERE user_id = v_colab.user_id;
    DELETE FROM public.tasks WHERE user_id = v_colab.user_id;
  END IF;

  -- referências reflexivas
  UPDATE public.colaboradores SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  UPDATE public.colaboradores SET substituicao_colaborador_id = NULL WHERE substituicao_colaborador_id = p_collaborator_id;
  UPDATE public.departamentos SET responsavel_id = NULL WHERE responsavel_id = p_collaborator_id;

  DELETE FROM public.colaboradores WHERE id = p_collaborator_id;

  IF v_colab.user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_colab.user_id;
    DELETE FROM public.profiles WHERE user_id = v_colab.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'colaborador', v_colab.full_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_collaborator_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_collaborator_data(uuid) TO authenticated, service_role;

-- ============ RPC: revogar/conceder consentimento ============
CREATE OR REPLACE FUNCTION public.revoke_consent(p_collaborator_id uuid, p_consent_type text, p_grant boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, false) THEN
    RAISE EXCEPTION 'Sem permissão para alterar consentimentos deste colaborador';
  END IF;
  IF p_consent_type NOT IN ('rh_data','feedback','training','communications') THEN
    RAISE EXCEPTION 'Tipo de consentimento inválido';
  END IF;
  IF p_consent_type = 'rh_data' AND NOT p_grant THEN
    RAISE EXCEPTION 'O consentimento de dados de RH é obrigatório para o uso do sistema';
  END IF;

  INSERT INTO public.collaborator_consents (collaborator_id, company_id, consent_type, consent_given, consent_date, revoked_date, revoked_by)
  VALUES (p_collaborator_id, v_colab.company_id, p_consent_type, p_grant,
          CASE WHEN p_grant THEN now() ELSE now() END,
          CASE WHEN p_grant THEN NULL ELSE now() END,
          CASE WHEN p_grant THEN NULL ELSE auth.uid() END)
  ON CONFLICT (collaborator_id, consent_type) DO UPDATE
    SET consent_given = EXCLUDED.consent_given,
        consent_date = CASE WHEN EXCLUDED.consent_given THEN now() ELSE public.collaborator_consents.consent_date END,
        revoked_date = CASE WHEN EXCLUDED.consent_given THEN NULL ELSE now() END,
        revoked_by = CASE WHEN EXCLUDED.consent_given THEN NULL ELSE auth.uid() END;

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES (CASE WHEN p_grant THEN 'grant_consent' ELSE 'revoke_consent' END,
          p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('consent_type', p_consent_type,
                             'descricao', format('%s de consentimento (%s) - Colaborador: %s',
                                                 CASE WHEN p_grant THEN 'Concessão' ELSE 'Revogação' END,
                                                 p_consent_type, v_colab.full_name)));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_consent(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_consent(uuid, text, boolean) TO authenticated, service_role;