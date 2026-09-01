-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE PARA O NR1-PRONTO (PARTE 2 — DEMAIS TABELAS)
-- Data: 01/09/2026
-- Schema Validado: alneozvrsuwszlkisbyo
-- NOTA: Exclui colaboradores e banco_horas_fechamentos (já criados no banco).
-- ============================================================================

-- 1. IDENTIDADE E ACESSO (profiles, user_roles)
CREATE INDEX IF NOT EXISTS idx_profiles_company_user 
  ON public.profiles (company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON public.profiles (email);

CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles (role);

-- 2. CONTROLE DE PONTO E ESPELHOS MENSAIS (ponto_registros, espelhos_ponto_mensais)
-- NOTA: Coluna de timestamp em ponto_registros é "data_hora" (e não "data_registro").
CREATE INDEX IF NOT EXISTS idx_ponto_registros_colab_data 
  ON public.ponto_registros (colaborador_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_ponto_registros_company_data 
  ON public.ponto_registros (company_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_espelhos_ponto_mensais_company_periodo 
  ON public.espelhos_ponto_mensais (company_id, ano, mes, status);

CREATE INDEX IF NOT EXISTS idx_espelhos_ponto_mensais_colab 
  ON public.espelhos_ponto_mensais (colaborador_id, ano, mes);

-- 3. CUIDAR+ E ENGAJAMENTO (pulse_campaigns, pulse_responses, cuidar_progressao, notifications)
CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_window 
  ON public.pulse_campaigns (origem, data_inicio, data_fim, ativo);

CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_company_ativo 
  ON public.pulse_campaigns (company_id, ativo);

-- NOTA: Coluna FK para colaboradores em pulse_responses é "employee_id".
CREATE INDEX IF NOT EXISTS idx_pulse_responses_campaign_emp 
  ON public.pulse_responses (campaign_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_cuidar_progressao_company_streak 
  ON public.cuidar_progressao (company_id, streak_semanal);

-- NOTA: Índice parcial otimizado usando "is_read = false".
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_partial 
  ON public.notifications (user_id, created_at DESC) 
  WHERE is_read = false;

-- 4. MENSAGERIA E AUDITORIA (email_send_log, email_unsubscribe_tokens)
CREATE INDEX IF NOT EXISTS idx_email_send_log_msg_status 
  ON public.email_send_log (message_id, status);

CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient_created 
  ON public.email_send_log (recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_active 
  ON public.email_unsubscribe_tokens (token) 
  WHERE used_at IS NULL;
