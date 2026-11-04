# INVENTÁRIO DO BANCO DE DADOS EM PRODUÇÃO
**Projeto:** Supabase alneozvrsuwszlkisbyo  
**Data:** 2026-11-04  
**Status:** Baseline auditado em modo READ-ONLY

---

## 1. RESUMO QUANTITATIVO
- **Tabelas públicas:** 163
- **Funções públicas (RPC / Triggers):** 297
- **Políticas de RLS:** 500
- **Triggers ativos:** 161

---

## 2. TABELAS PÚBLICAS (163)
- `acesso_colaborador_audit`
- `admin_notifications`
- `analises_perfil`
- `avaliacao_links`
- `avaliacao_respostas_competencias`
- `avaliacao_respostas_objetivos`
- `avaliacoes`
- `banco_horas_fechamentos`
- `banco_horas_fechamentos_auditoria`
- `banco_horas_perfis`
- `beneficios`
- `beneficios_departamento`
- `beneficios_materiais`
- `beneficios_tipo_contrato`
- `birthday_greeting_acknowledgments`
- `blog_posts`
- `campanha_leituras`
- `campanhas_comunicados`
- `cargos`
- `catalogo_modulos`
- `categorias_treinamento`
- `cbo_ocupacoes`
- `certificates`
- `certificates_audit_logs`
- `checklist_aplicacoes`
- `checklist_fotos`
- `checklist_perguntas`
- `checklist_respostas`
- `checklist_secoes`
- `checklist_templates`
- `ciclos_avaliacao`
- `colaborador_beneficios`
- `colaboradores`
- `collaborator_consents`
- `companies`
- `company_lifecycle_events`
- `company_modules`
- `competencias_ciclo`
- `comunicado_leituras`
- `comunicados`
- `comunicados_anexos`
- `comunicados_visualizacoes`
- `contact_requests`
- `cuidar_alertas`
- `cuidar_badges`
- `cuidar_conteudos`
- `cuidar_insights`
- `cuidar_progressao`
- `cuidar_recomendacoes`
- `cuidar_templates_fixos`
- `denuncias`
- `departamentos`
- `dependentes`
- `descricao_modelos`
- `descricao_questionario`
- `descricoes_cargo`
- `desligamentos_colaborador`
- `dimensoes_questionario_cuidar_plus`
- `email_send_log`
- `email_send_state`
- `email_unsubscribe_tokens`
- `envios_cuidar_plus`
- `espelhos_ponto_mensais`
- `evolution_reports`
- `feedback_cycles`
- `feedback_responses`
- `feedbacks_colaboradores`
- `feriados`
- `ferias_gozo`
- `ferias_periodos_aquisitivos`
- `ficha_profissional`
- `ghe_epis`
- `ghes`
- `lgpd_audit_logs`
- `metricas_avaliacao`
- `metricas_valores`
- `module_visibility`
- `niveis_maturidade`
- `notifications`
- `nr1_ghe_riscos`
- `nr1_matriz_config`
- `nr1_planos_acao`
- `nr1_proart_ativacoes`
- `nr1_proart_perguntas`
- `nr1_proart_respostas`
- `nr1_regras_sugestao`
- `nr1_riscos_catalogo`
- `objetivos_ciclo`
- `onboarding_progress`
- `pdi_checkins`
- `pdi_itens`
- `pdis`
- `perguntas_cuidar_plus`
- `pgr_acao_execucoes`
- `pgr_alteracoes`
- `pgr_documentos`
- `pgr_importacoes`
- `pgr_plano_acao`
- `pgr_psicossocial_dominios`
- `pgr_relatorio_evidencias`
- `pgr_risco_detalhes`
- `pgr_riscos`
- `pgr_secoes`
- `platform_audit_logs`
- `ponto_abonos`
- `ponto_compensacoes`
- `ponto_configuracoes`
- `ponto_fechamento_tratativas`
- `ponto_registros`
- `ponto_resumo_diario`
- `ponto_tipos_abono`
- `profiles`
- `promocoes_colaborador`
- `psico_atribuicoes`
- `psico_avaliacao_ghes`
- `psico_avaliacoes`
- `psico_dimensoes`
- `psico_instrumentos`
- `psico_perguntas`
- `psico_respostas`
- `pulse_access_logs`
- `pulse_acompanhamentos`
- `pulse_campaigns`
- `pulse_campaigns_alvos`
- `pulse_questions`
- `pulse_responses`
- `pulse_surveys`
- `questionario_atribuicoes`
- `questionario_modelos`
- `questionario_opcoes`
- `questionario_perguntas`
- `questionario_respostas`
- `questionario_secoes`
- `questionarios_cuidar_plus`
- `questionarios_cuidar_plus_alvos`
- `questionnaire_templates`
- `questions`
- `rate_limits`
- `relatorios_executivos_salvos`
- `replication_logs`
- `respostas_cuidar_plus`
- `security_rate_limit_logs`
- `setores`
- `suppressed_emails`
- `tasks`
- `tasks_reminders`
- `terms_acceptance`
- `transferencias_colaborador`
- `treinamento_aula_progresso`
- `treinamento_aulas`
- `treinamento_logs_acesso`
- `treinamento_modulos`
- `treinamento_progresso`
- `treinamento_quiz_alternativas`
- `treinamento_quiz_config`
- `treinamento_quiz_perguntas`
- `treinamento_quiz_tentativas`
- `treinamentos`
- `unidades_organizacionais`
- `user_companies`
- `user_preferences`
- `user_roles`
- `work_schedules`

---

## 3. POLÍTICAS RLS (500)
| Tabela | Nome da Policy | Comando | Roles |
| :--- | :--- | :--- | :--- |
| `acesso_colaborador_audit` | `Admins can read audit for their company` | `SELECT` | `{authenticated}` |
| `acesso_colaborador_audit` | `Service role can manage audit` | `ALL` | `{service_role}` |
| `admin_notifications` | `admin_notifications_super_admin_read` | `SELECT` | `{authenticated}` |
| `admin_notifications` | `admin_notifications_super_admin_update` | `UPDATE` | `{authenticated}` |
| `analises_perfil` | `Admin roles can delete analises_perfil` | `DELETE` | `{authenticated}` |
| `analises_perfil` | `Admin roles can insert analises_perfil` | `INSERT` | `{authenticated}` |
| `analises_perfil` | `Admin roles can select analises_perfil` | `SELECT` | `{authenticated}` |
| `analises_perfil` | `Admin roles can update analises_perfil` | `UPDATE` | `{authenticated}` |
| `avaliacao_links` | `Admin empresa can manage own company avaliacao_links` | `ALL` | `{public}` |
| `avaliacao_links` | `Admin master full access avaliacao_links` | `ALL` | `{public}` |
| `avaliacao_links` | `Analista RH can manage own company avaliacao_links` | `ALL` | `{public}` |
| `avaliacao_links` | `Colaborador can view own autoavaliacao links` | `SELECT` | `{public}` |
| `avaliacao_respostas_competencias` | `Admin empresa can manage own company respostas_competencias` | `ALL` | `{public}` |
| `avaliacao_respostas_competencias` | `Admin master full access avaliacao_respostas_competencias` | `ALL` | `{public}` |
| `avaliacao_respostas_competencias` | `Analista RH can manage own company respostas_competencias` | `ALL` | `{public}` |
| `avaliacao_respostas_objetivos` | `Admin empresa can manage own company respostas_objetivos` | `ALL` | `{public}` |
| `avaliacao_respostas_objetivos` | `Admin master full access avaliacao_respostas_objetivos` | `ALL` | `{public}` |
| `avaliacao_respostas_objetivos` | `Analista RH can manage own company respostas_objetivos` | `ALL` | `{public}` |
| `avaliacoes` | `Admin empresa can manage own company avaliacoes` | `ALL` | `{public}` |
| `avaliacoes` | `Admin master full access avaliacoes` | `ALL` | `{public}` |
| `avaliacoes` | `Analista RH can manage own company avaliacoes` | `ALL` | `{public}` |
| `avaliacoes` | `Colaborador can view own avaliacoes` | `SELECT` | `{public}` |
| `avaliacoes` | `Gestor can view own avaliacoes` | `SELECT` | `{public}` |
| `banco_horas_fechamentos` | `Admins insert fechamentos` | `INSERT` | `{authenticated}` |
| `banco_horas_fechamentos` | `Admins select fechamentos` | `SELECT` | `{authenticated}` |
| `banco_horas_fechamentos` | `Admins update fechamentos` | `UPDATE` | `{authenticated}` |
| `banco_horas_fechamentos` | `Colaboradores can view own banco_horas_fechamentos` | `SELECT` | `{authenticated}` |
| `banco_horas_fechamentos` | `Only admin_master deletes fechamentos` | `DELETE` | `{authenticated}` |
| `banco_horas_fechamentos_auditoria` | `Admins read fechamentos auditoria` | `SELECT` | `{authenticated}` |
| `banco_horas_perfis` | `Admin empresa manage perfis banco horas` | `ALL` | `{authenticated}` |
| `banco_horas_perfis` | `Admin master manage perfis banco horas` | `ALL` | `{authenticated}` |
| `banco_horas_perfis` | `Read perfis banco horas da empresa` | `SELECT` | `{authenticated}` |
| `beneficios` | `Admin empresa can manage own company beneficios` | `ALL` | `{public}` |
| `beneficios` | `Admin master full access beneficios` | `ALL` | `{public}` |
| `beneficios` | `Analista RH can manage own company beneficios` | `ALL` | `{public}` |
| `beneficios` | `Colaborador can view active beneficios from own company` | `SELECT` | `{public}` |
| `beneficios` | `Gestor can view own company beneficios` | `SELECT` | `{public}` |
| `beneficios_departamento` | `Admin empresa can manage own company beneficios_departamento` | `ALL` | `{public}` |
| `beneficios_departamento` | `Admin master full access beneficios_departamento` | `ALL` | `{public}` |
| `beneficios_departamento` | `Analista RH can manage own company beneficios_departamento` | `ALL` | `{public}` |
| `beneficios_departamento` | `Colaborador can view beneficios_departamento from own company` | `SELECT` | `{public}` |
| `beneficios_materiais` | `admin_empresa_rh_access_materiais` | `ALL` | `{public}` |
| `beneficios_materiais` | `admin_master_full_access_materiais` | `ALL` | `{public}` |
| `beneficios_materiais` | `colaborador_read_materiais` | `SELECT` | `{authenticated}` |
| `beneficios_tipo_contrato` | `admin_master_full_access_beneficios_tipo_contrato` | `ALL` | `{authenticated}` |
| `beneficios_tipo_contrato` | `colaborador_read_beneficios_tipo_contrato` | `SELECT` | `{authenticated}` |
| `beneficios_tipo_contrato` | `company_admin_access_beneficios_tipo_contrato` | `ALL` | `{authenticated}` |
| `birthday_greeting_acknowledgments` | `Users can insert own greeting acks` | `INSERT` | `{public}` |
| `birthday_greeting_acknowledgments` | `Users can view own greeting acks` | `SELECT` | `{public}` |
| `blog_posts` | `blog_posts_public_read` | `SELECT` | `{public}` |
| `blog_posts` | `blog_posts_super_admin_all` | `ALL` | `{authenticated}` |
| `campanha_leituras` | `Admin empresa can read company campanha leituras` | `SELECT` | `{public}` |
| `campanha_leituras` | `Admin master can read all campanha leituras` | `SELECT` | `{public}` |
| `campanha_leituras` | `Analista RH can read company campanha leituras` | `SELECT` | `{public}` |
| `campanha_leituras` | `Users can insert own campanha leituras` | `INSERT` | `{public}` |
| `campanha_leituras` | `Users can read own campanha leituras` | `SELECT` | `{public}` |
| `campanhas_comunicados` | `Campanhas: delete por admin/rh` | `DELETE` | `{authenticated}` |
| `campanhas_comunicados` | `Campanhas: insert por admin/rh` | `INSERT` | `{authenticated}` |
| `campanhas_comunicados` | `Campanhas: leitura por empresa` | `SELECT` | `{authenticated}` |
| `campanhas_comunicados` | `Campanhas: update por admin/rh` | `UPDATE` | `{authenticated}` |
| `cargos` | `estrut_cargos_delete` | `DELETE` | `{authenticated}` |
| `cargos` | `estrut_cargos_insert` | `INSERT` | `{authenticated}` |
| `cargos` | `estrut_cargos_select` | `SELECT` | `{authenticated}` |
| `cargos` | `estrut_cargos_update` | `UPDATE` | `{authenticated}` |
| `catalogo_modulos` | `Qualquer autenticado pode ler catalogo_modulos` | `SELECT` | `{authenticated}` |
| `categorias_treinamento` | `Admin pode gerenciar categorias_treinamento` | `ALL` | `{public}` |
| `categorias_treinamento` | `Colaboradores podem ver categorias da empresa` | `SELECT` | `{authenticated}` |
| `cbo_ocupacoes` | `cbo_delete` | `DELETE` | `{authenticated}` |
| `cbo_ocupacoes` | `cbo_insert` | `INSERT` | `{authenticated}` |
| `cbo_ocupacoes` | `cbo_select_all` | `SELECT` | `{authenticated}` |
| `cbo_ocupacoes` | `cbo_update` | `UPDATE` | `{authenticated}` |
| `certificates` | `Admin can insert certificates` | `INSERT` | `{public}` |
| `certificates` | `Admin can update certificates` | `UPDATE` | `{public}` |
| `certificates` | `Admin master full access certificates` | `ALL` | `{public}` |
| `certificates` | `Colaborador can insert own certificate` | `INSERT` | `{public}` |
| `certificates` | `Company users can view certificates` | `SELECT` | `{public}` |
| `certificates_audit_logs` | `Admin master full access audit logs` | `ALL` | `{public}` |
| `certificates_audit_logs` | `Company admin can view audit logs` | `SELECT` | `{public}` |
| `certificates_audit_logs` | `Scoped insert audit logs` | `INSERT` | `{authenticated}` |
| `checklist_aplicacoes` | `estrut_checklist_aplicacoes_delete` | `DELETE` | `{authenticated}` |
| `checklist_aplicacoes` | `estrut_checklist_aplicacoes_insert` | `INSERT` | `{authenticated}` |
| `checklist_aplicacoes` | `estrut_checklist_aplicacoes_select` | `SELECT` | `{authenticated}` |
| `checklist_aplicacoes` | `estrut_checklist_aplicacoes_update` | `UPDATE` | `{authenticated}` |
| `checklist_fotos` | `estrut_checklist_fotos_delete` | `DELETE` | `{authenticated}` |
| `checklist_fotos` | `estrut_checklist_fotos_insert` | `INSERT` | `{authenticated}` |
| `checklist_fotos` | `estrut_checklist_fotos_select` | `SELECT` | `{authenticated}` |
| `checklist_fotos` | `estrut_checklist_fotos_update` | `UPDATE` | `{authenticated}` |
| `checklist_perguntas` | `checklist_perguntas_select` | `SELECT` | `{public}` |
| `checklist_perguntas` | `estrut_checklist_perguntas_delete` | `DELETE` | `{authenticated}` |
| `checklist_perguntas` | `estrut_checklist_perguntas_insert` | `INSERT` | `{authenticated}` |
| `checklist_perguntas` | `estrut_checklist_perguntas_select` | `SELECT` | `{authenticated}` |
| `checklist_perguntas` | `estrut_checklist_perguntas_update` | `UPDATE` | `{authenticated}` |
| `checklist_respostas` | `estrut_checklist_respostas_delete` | `DELETE` | `{authenticated}` |
| `checklist_respostas` | `estrut_checklist_respostas_insert` | `INSERT` | `{authenticated}` |
| `checklist_respostas` | `estrut_checklist_respostas_select` | `SELECT` | `{authenticated}` |
| `checklist_respostas` | `estrut_checklist_respostas_update` | `UPDATE` | `{authenticated}` |
| `checklist_secoes` | `checklist_secoes_select` | `SELECT` | `{public}` |
| `checklist_secoes` | `estrut_checklist_secoes_delete` | `DELETE` | `{authenticated}` |
| `checklist_secoes` | `estrut_checklist_secoes_insert` | `INSERT` | `{authenticated}` |
| `checklist_secoes` | `estrut_checklist_secoes_select` | `SELECT` | `{authenticated}` |
| `checklist_secoes` | `estrut_checklist_secoes_update` | `UPDATE` | `{authenticated}` |
| `checklist_templates` | `checklist_templates_select` | `SELECT` | `{public}` |
| `checklist_templates` | `estrut_checklist_templates_delete` | `DELETE` | `{authenticated}` |
| `checklist_templates` | `estrut_checklist_templates_insert` | `INSERT` | `{authenticated}` |
| `checklist_templates` | `estrut_checklist_templates_select` | `SELECT` | `{authenticated}` |
| `checklist_templates` | `estrut_checklist_templates_update` | `UPDATE` | `{authenticated}` |
| `ciclos_avaliacao` | `Admin empresa can manage own company ciclos_avaliacao` | `ALL` | `{public}` |
| `ciclos_avaliacao` | `Admin master full access ciclos_avaliacao` | `ALL` | `{public}` |
| `ciclos_avaliacao` | `Analista RH can manage own company ciclos_avaliacao` | `ALL` | `{public}` |
| `ciclos_avaliacao` | `Colaborador can view ciclos with own avaliacoes` | `SELECT` | `{public}` |
| `ciclos_avaliacao` | `Gestor can view own company ciclos_avaliacao` | `SELECT` | `{public}` |
| `colaborador_beneficios` | `Admin empresa can manage colaborador_beneficios via colaborador` | `ALL` | `{public}` |
| `colaborador_beneficios` | `Admin master full access colaborador_beneficios` | `ALL` | `{public}` |
| `colaborador_beneficios` | `Analista RH can manage colaborador_beneficios via colaborador` | `ALL` | `{public}` |
| `colaborador_beneficios` | `Colaborador can view own beneficios` | `SELECT` | `{public}` |
| `colaboradores` | `Admin empresa can manage own company colaboradores` | `ALL` | `{public}` |
| `colaboradores` | `Admin master full access colaboradores` | `ALL` | `{public}` |
| `colaboradores` | `Analista RH can manage own company colaboradores` | `ALL` | `{public}` |
| `colaboradores` | `Colaboradores can view their own record` | `SELECT` | `{public}` |
| `colaboradores` | `Super admin pode gerenciar colaboradores` | `ALL` | `{authenticated}` |
| `collaborator_consents` | `Colaborador reads own consents` | `SELECT` | `{authenticated}` |
| `collaborator_consents` | `RH manage consents` | `ALL` | `{authenticated}` |
| `companies` | `Admin master can manage companies` | `ALL` | `{authenticated}` |
| `companies` | `Super admin pode atualizar empresas` | `UPDATE` | `{authenticated}` |
| `companies` | `Super admin pode inserir empresas` | `INSERT` | `{authenticated}` |
| `companies` | `Super admin pode remover empresas` | `DELETE` | `{authenticated}` |
| `companies` | `Super admin pode ver empresas` | `SELECT` | `{authenticated}` |
| `companies` | `Users can read linked companies` | `SELECT` | `{authenticated}` |
| `companies` | `Users can view their own company` | `SELECT` | `{authenticated}` |
| `company_lifecycle_events` | `Apenas super_admin e admin_master leem auditoria de ciclo de vi` | `SELECT` | `{authenticated}` |
| `company_modules` | `Super admin can manage company_modules` | `ALL` | `{authenticated}` |
| `company_modules` | `Users can read company_modules for their company` | `SELECT` | `{authenticated}` |
| `competencias_ciclo` | `Admin empresa can manage competencias via ciclo` | `ALL` | `{public}` |
| `competencias_ciclo` | `Admin master full access competencias_ciclo` | `ALL` | `{public}` |
| `competencias_ciclo` | `Analista RH can manage competencias via ciclo` | `ALL` | `{public}` |
| `competencias_ciclo` | `Colaborador can view competencias with own avaliacoes` | `SELECT` | `{public}` |
| `competencias_ciclo` | `Gestor can view competencias via ciclo` | `SELECT` | `{public}` |
| `comunicado_leituras` | `Admin empresa can read company leituras` | `SELECT` | `{public}` |
| `comunicado_leituras` | `Admin master can read all leituras` | `SELECT` | `{public}` |
| `comunicado_leituras` | `Analista RH can read company leituras` | `SELECT` | `{public}` |
| `comunicado_leituras` | `Users can insert own leituras` | `INSERT` | `{public}` |
| `comunicado_leituras` | `Users can read own leituras` | `SELECT` | `{public}` |
| `comunicados` | `Admin empresa can manage own company comunicados` | `ALL` | `{public}` |
| `comunicados` | `Admin master full access comunicados` | `ALL` | `{public}` |
| `comunicados` | `Analista RH can manage own company comunicados` | `ALL` | `{public}` |
| `comunicados` | `Colaboradores can view published comunicados` | `SELECT` | `{public}` |
| `comunicados` | `Gestor departamento can view published comunicados` | `SELECT` | `{public}` |
| `comunicados_anexos` | `Admin empresa can manage own company comunicados_anexos` | `ALL` | `{public}` |
| `comunicados_anexos` | `Admin master full access comunicados_anexos` | `ALL` | `{public}` |
| `comunicados_anexos` | `Analista RH can manage own company comunicados_anexos` | `ALL` | `{public}` |
| `comunicados_anexos` | `Colaboradores can view published comunicados_anexos` | `SELECT` | `{public}` |
| `comunicados_visualizacoes` | `Admin can view all visualizacoes` | `SELECT` | `{authenticated}` |
| `comunicados_visualizacoes` | `Colaboradores can insert own visualizacoes` | `INSERT` | `{public}` |
| `contact_requests` | `Anyone can submit a contact request` | `INSERT` | `{anon,authenticated}` |
| `contact_requests` | `Super admin can read contact requests` | `SELECT` | `{authenticated}` |
| `contact_requests` | `contact_requests_super_admin_update` | `UPDATE` | `{authenticated}` |
| `cuidar_alertas` | `Admin empresa/RH atualiza alertas da empresa` | `UPDATE` | `{public}` |
| `cuidar_alertas` | `Admin empresa/RH lê alertas da empresa` | `SELECT` | `{public}` |
| `cuidar_alertas` | `Admin master atualiza alertas` | `UPDATE` | `{public}` |
| `cuidar_alertas` | `Admin master lê alertas` | `SELECT` | `{public}` |
| `cuidar_badges` | `Admin empresa/RH lê badges da empresa` | `SELECT` | `{public}` |
| `cuidar_badges` | `Admin master lê tudo (badges)` | `SELECT` | `{public}` |
| `cuidar_badges` | `Próprio usuário lê seus badges` | `SELECT` | `{public}` |
| `cuidar_conteudos` | `cuidar_conteudos_admin_empresa_all` | `ALL` | `{public}` |
| `cuidar_conteudos` | `cuidar_conteudos_admin_master_all` | `ALL` | `{public}` |
| `cuidar_conteudos` | `cuidar_conteudos_colaborador_read` | `SELECT` | `{public}` |
| `cuidar_insights` | `Admin master views all insights` | `SELECT` | `{authenticated}` |
| `cuidar_insights` | `Company admins view own insights` | `SELECT` | `{authenticated}` |
| `cuidar_progressao` | `Admin empresa/RH lê da empresa` | `SELECT` | `{public}` |
| `cuidar_progressao` | `Admin master lê tudo` | `SELECT` | `{public}` |
| `cuidar_progressao` | `Próprio usuário lê sua progressão` | `SELECT` | `{public}` |
| `cuidar_recomendacoes` | `Admin empresa/RH lê recomendações da empresa` | `SELECT` | `{public}` |
| `cuidar_recomendacoes` | `Admin master lê tudo (recomendações)` | `SELECT` | `{public}` |
| `cuidar_recomendacoes` | `Colaborador vê suas recomendações` | `SELECT` | `{public}` |
| `cuidar_templates_fixos` | `Admin master manages templates` | `ALL` | `{authenticated}` |
| `cuidar_templates_fixos` | `Authenticated can read templates` | `SELECT` | `{authenticated}` |
| `departamentos` | `estrut_departamentos_delete` | `DELETE` | `{authenticated}` |
| `departamentos` | `estrut_departamentos_insert` | `INSERT` | `{authenticated}` |
| `departamentos` | `estrut_departamentos_select` | `SELECT` | `{authenticated}` |
| `departamentos` | `estrut_departamentos_update` | `UPDATE` | `{authenticated}` |
| `dependentes` | `Admin master full access dependentes` | `ALL` | `{public}` |
| `dependentes` | `Colaborador can view own dependentes` | `SELECT` | `{authenticated}` |
| `dependentes` | `Users can manage dependentes of accessible colaboradores` | `ALL` | `{public}` |
| `descricao_modelos` | `descricao_modelos_delete` | `DELETE` | `{authenticated}` |
| `descricao_modelos` | `descricao_modelos_insert` | `INSERT` | `{authenticated}` |
| `descricao_modelos` | `descricao_modelos_select` | `SELECT` | `{authenticated}` |
| `descricao_modelos` | `descricao_modelos_update` | `UPDATE` | `{authenticated}` |
| `descricao_questionario` | `descq_all` | `ALL` | `{authenticated}` |
| `descricoes_cargo` | `descricoes_cargo_delete` | `DELETE` | `{authenticated}` |
| `descricoes_cargo` | `descricoes_cargo_insert` | `INSERT` | `{authenticated}` |
| `descricoes_cargo` | `descricoes_cargo_select` | `SELECT` | `{authenticated}` |
| `descricoes_cargo` | `descricoes_cargo_update` | `UPDATE` | `{authenticated}` |
| `desligamentos_colaborador` | `Admin master manages all desligamentos` | `ALL` | `{public}` |
| `desligamentos_colaborador` | `Company admins manage own company desligamentos` | `ALL` | `{public}` |
| `dimensoes_questionario_cuidar_plus` | `Admin pode gerenciar dimensoes questionario cuidar plus` | `ALL` | `{public}` |
| `email_send_log` | `Service role can insert send log` | `INSERT` | `{public}` |
| `email_send_log` | `Service role can read send log` | `SELECT` | `{public}` |
| `email_send_log` | `Service role can update send log` | `UPDATE` | `{public}` |
| `email_send_state` | `Service role can manage send state` | `ALL` | `{public}` |
| `email_unsubscribe_tokens` | `Service role can insert tokens` | `INSERT` | `{public}` |
| `email_unsubscribe_tokens` | `Service role can mark tokens as used` | `UPDATE` | `{public}` |
| `email_unsubscribe_tokens` | `Service role can read tokens` | `SELECT` | `{public}` |
| `envios_cuidar_plus` | `Admin pode gerenciar envios cuidar plus` | `ALL` | `{public}` |
| `envios_cuidar_plus` | `Colaborador pode ver seus envios cuidar plus` | `SELECT` | `{authenticated}` |
| `espelhos_ponto_mensais` | `espelho_mensal_admin_company` | `ALL` | `{authenticated}` |
| `espelhos_ponto_mensais` | `espelho_mensal_colab_select` | `SELECT` | `{authenticated}` |
| `evolution_reports` | `Admin empresa can manage own company evolution_reports` | `ALL` | `{public}` |
| `evolution_reports` | `Admin master full access evolution_reports` | `ALL` | `{public}` |
| `evolution_reports` | `Analista RH can manage own company evolution_reports` | `ALL` | `{public}` |
| `evolution_reports` | `Gestor departamento can view evolution_reports` | `SELECT` | `{authenticated}` |
| `feedback_cycles` | `Admin empresa can manage own company feedback_cycles` | `ALL` | `{public}` |
| `feedback_cycles` | `Admin master full access feedback_cycles` | `ALL` | `{authenticated}` |
| `feedback_cycles` | `Analista RH can manage own company feedback_cycles` | `ALL` | `{public}` |
| `feedback_cycles` | `Colaborador can view own feedback_cycles` | `SELECT` | `{public}` |
| `feedback_cycles` | `Super admin pode gerenciar feedback_cycles` | `ALL` | `{authenticated}` |
| `feedback_cycles` | `Users can view own feedback cycles via colaborador link` | `SELECT` | `{public}` |
| `feedback_responses` | `Admin empresa can manage own company feedback_responses` | `ALL` | `{public}` |
| `feedback_responses` | `Admin master full access feedback_responses` | `ALL` | `{authenticated}` |
| `feedback_responses` | `Analista RH can manage own company feedback_responses` | `ALL` | `{public}` |
| `feedback_responses` | `Colaborador can view own feedback_responses` | `SELECT` | `{public}` |
| `feedback_responses` | `Gestor departamento can view feedback_responses` | `SELECT` | `{public}` |
| `feedback_responses` | `Super admin pode gerenciar feedback_responses` | `ALL` | `{authenticated}` |
| `feedbacks_colaboradores` | `Admin empresa can manage own company feedbacks_colaboradores` | `ALL` | `{public}` |
| `feedbacks_colaboradores` | `Admin master full access feedbacks_colaboradores` | `ALL` | `{public}` |
| `feedbacks_colaboradores` | `Analista RH can manage own company feedbacks_colaboradores` | `ALL` | `{public}` |
| `feedbacks_colaboradores` | `Gestor departamento can manage feedbacks_colaboradores` | `ALL` | `{public}` |
| `feriados` | `Admin empresa gerencia feriados da empresa` | `ALL` | `{public}` |
| `feriados` | `Admin master gerencia feriados globais e qualquer empresa` | `ALL` | `{public}` |
| `feriados` | `Feriados visíveis para empresa e globais` | `SELECT` | `{public}` |
| `ferias_gozo` | `Admin empresa can manage own company ferias_gozo` | `ALL` | `{public}` |
| `ferias_gozo` | `Admin master full access ferias_gozo` | `ALL` | `{public}` |
| `ferias_gozo` | `Analista RH can manage own company ferias_gozo` | `ALL` | `{public}` |
| `ferias_gozo` | `Colaborador can cancel own planejado ferias` | `UPDATE` | `{public}` |
| `ferias_gozo` | `Colaborador can delete own planejado ferias` | `DELETE` | `{public}` |
| `ferias_gozo` | `Colaborador can request own ferias` | `INSERT` | `{public}` |
| `ferias_gozo` | `Colaborador can view own ferias gozo` | `SELECT` | `{public}` |
| `ferias_gozo` | `Gestor departamento can update own subordinates ferias_gozo` | `UPDATE` | `{authenticated}` |
| `ferias_gozo` | `Gestor departamento can view own company ferias_gozo` | `SELECT` | `{authenticated}` |
| `ferias_periodos_aquisitivos` | `Admin empresa can manage own company ferias_periodos_aquisitivo` | `ALL` | `{public}` |
| `ferias_periodos_aquisitivos` | `Admin master full access ferias_periodos_aquisitivos` | `ALL` | `{public}` |
| `ferias_periodos_aquisitivos` | `Analista RH can manage own company ferias_periodos_aquisitivos` | `ALL` | `{public}` |
| `ferias_periodos_aquisitivos` | `Colaborador can view own periodos aquisitivos` | `SELECT` | `{public}` |
| `ferias_periodos_aquisitivos` | `Gestor departamento can view own company ferias_periodos_aquisi` | `SELECT` | `{authenticated}` |
| `ficha_profissional` | `Admin empresa manages ficha_profissional` | `ALL` | `{public}` |
| `ficha_profissional` | `Admin master full access ficha_profissional` | `ALL` | `{public}` |
| `ficha_profissional` | `Colaborador can view own ficha profissional` | `SELECT` | `{authenticated}` |
| `ficha_profissional` | `Gestor views ficha_profissional` | `SELECT` | `{public}` |
| `ghe_epis` | `estrut_epis_delete` | `DELETE` | `{authenticated}` |
| `ghe_epis` | `estrut_epis_insert` | `INSERT` | `{authenticated}` |
| `ghe_epis` | `estrut_epis_select` | `SELECT` | `{authenticated}` |
| `ghe_epis` | `estrut_epis_update` | `UPDATE` | `{authenticated}` |
| `ghes` | `estrut_ghes_delete` | `DELETE` | `{authenticated}` |
| `ghes` | `estrut_ghes_insert` | `INSERT` | `{authenticated}` |
| `ghes` | `estrut_ghes_select` | `SELECT` | `{authenticated}` |
| `ghes` | `estrut_ghes_update` | `UPDATE` | `{authenticated}` |
| `lgpd_audit_logs` | `Admins read lgpd logs` | `SELECT` | `{authenticated}` |
| `metricas_avaliacao` | `Admin empresa can manage metricas via ciclo` | `ALL` | `{public}` |
| `metricas_avaliacao` | `Admin master full access metricas_avaliacao` | `ALL` | `{public}` |
| `metricas_avaliacao` | `Analista RH can manage metricas via ciclo` | `ALL` | `{public}` |
| `metricas_avaliacao` | `Colaborador can view metricas with own avaliacoes` | `SELECT` | `{public}` |
| `metricas_avaliacao` | `Gestor can view metricas via ciclo` | `SELECT` | `{public}` |
| `metricas_valores` | `RH/Admin podem atualizar metricas_valores` | `UPDATE` | `{authenticated}` |
| `metricas_valores` | `RH/Admin podem deletar metricas_valores` | `DELETE` | `{authenticated}` |
| `metricas_valores` | `RH/Admin podem inserir metricas_valores` | `INSERT` | `{authenticated}` |
| `metricas_valores` | `Usuarios podem ver metricas_valores de seus ciclos` | `SELECT` | `{authenticated}` |
| `module_visibility` | `Admins can manage module_visibility` | `ALL` | `{public}` |
| `module_visibility` | `Users can read module_visibility for their company` | `SELECT` | `{public}` |
| `niveis_maturidade` | `niveis_delete` | `DELETE` | `{authenticated}` |
| `niveis_maturidade` | `niveis_insert` | `INSERT` | `{authenticated}` |
| `niveis_maturidade` | `niveis_select` | `SELECT` | `{authenticated}` |
| `niveis_maturidade` | `niveis_update` | `UPDATE` | `{authenticated}` |
| `notifications` | `Admins insert notifications` | `INSERT` | `{public}` |
| `notifications` | `Users can delete own notifications` | `DELETE` | `{public}` |
| `notifications` | `Users read own notifications` | `SELECT` | `{public}` |
| `notifications` | `Users update own notifications` | `UPDATE` | `{public}` |
| `nr1_ghe_riscos` | `ghe_riscos_all_admin` | `ALL` | `{authenticated}` |
| `nr1_matriz_config` | `matriz_config_all_admin` | `ALL` | `{authenticated}` |
| `nr1_planos_acao` | `Admin empresa e RH gerenciam planos da empresa` | `ALL` | `{authenticated}` |
| `nr1_planos_acao` | `Admin master gerencia todos os planos NR1` | `ALL` | `{authenticated}` |
| `nr1_proart_ativacoes` | `Admins atualizam ativações` | `UPDATE` | `{authenticated}` |
| `nr1_proart_ativacoes` | `Admins criam ativações` | `INSERT` | `{authenticated}` |
| `nr1_proart_ativacoes` | `Admins veem ativações da empresa` | `SELECT` | `{authenticated}` |
| `nr1_proart_ativacoes` | `Colaborador vê ativações vigentes da sua empresa` | `SELECT` | `{authenticated}` |
| `nr1_proart_perguntas` | `Authenticated can read PROART questions` | `SELECT` | `{authenticated}` |
| `nr1_proart_respostas` | `Admin empresa / RH leem respostas PROART da empresa` | `SELECT` | `{authenticated}` |
| `nr1_proart_respostas` | `Admin master lê todas respostas PROART` | `SELECT` | `{authenticated}` |
| `nr1_proart_respostas` | `Colaborador insere suas respostas PROART` | `INSERT` | `{authenticated}` |
| `nr1_proart_respostas` | `Colaborador lê suas respostas PROART` | `SELECT` | `{authenticated}` |
| `nr1_proart_respostas` | `Gestor lê respostas PROART dos subordinados` | `SELECT` | `{authenticated}` |
| `nr1_regras_sugestao` | `regras_sugestao_all_admin` | `ALL` | `{authenticated}` |
| `nr1_riscos_catalogo` | `catalogo_delete_admin` | `DELETE` | `{authenticated}` |
| `nr1_riscos_catalogo` | `catalogo_insert_admin` | `INSERT` | `{authenticated}` |
| `nr1_riscos_catalogo` | `catalogo_select_auth` | `SELECT` | `{authenticated}` |
| `nr1_riscos_catalogo` | `catalogo_update_admin` | `UPDATE` | `{authenticated}` |
| `objetivos_ciclo` | `Admin empresa can manage objetivos via ciclo` | `ALL` | `{public}` |
| `objetivos_ciclo` | `Admin master full access objetivos_ciclo` | `ALL` | `{public}` |
| `objetivos_ciclo` | `Analista RH can manage objetivos via ciclo` | `ALL` | `{public}` |
| `objetivos_ciclo` | `Colaborador can view objetivos with own avaliacoes` | `SELECT` | `{public}` |
| `objetivos_ciclo` | `Gestor can view objetivos via ciclo` | `SELECT` | `{public}` |
| `onboarding_progress` | `onboarding_insert_own_company` | `INSERT` | `{authenticated}` |
| `onboarding_progress` | `onboarding_select_own_company` | `SELECT` | `{authenticated}` |
| `onboarding_progress` | `onboarding_update_own_company` | `UPDATE` | `{authenticated}` |
| `pdi_checkins` | `pdi_checkins_admin_all` | `ALL` | `{public}` |
| `pdi_checkins` | `pdi_checkins_colaborador_insert` | `INSERT` | `{authenticated}` |
| `pdi_checkins` | `pdi_checkins_colaborador_read` | `SELECT` | `{authenticated}` |
| `pdi_checkins` | `pdi_checkins_gestor_access` | `ALL` | `{authenticated}` |
| `pdi_itens` | `pdi_itens_admin_all` | `ALL` | `{public}` |
| `pdi_itens` | `pdi_itens_colaborador_insert` | `INSERT` | `{authenticated}` |
| `pdi_itens` | `pdi_itens_colaborador_read` | `SELECT` | `{public}` |
| `pdi_itens` | `pdi_itens_colaborador_update` | `UPDATE` | `{public}` |
| `pdi_itens` | `pdi_itens_gestor_access` | `ALL` | `{public}` |
| `pdis` | `pdis_admin_all` | `ALL` | `{public}` |
| `pdis` | `pdis_colaborador_insert` | `INSERT` | `{authenticated}` |
| `pdis` | `pdis_colaborador_read` | `SELECT` | `{public}` |
| `pdis` | `pdis_colaborador_update` | `UPDATE` | `{authenticated}` |
| `pdis` | `pdis_gestor_access` | `ALL` | `{public}` |
| `perguntas_cuidar_plus` | `Admin pode gerenciar perguntas cuidar plus` | `ALL` | `{public}` |
| `perguntas_cuidar_plus` | `Colaboradores can read active Cuidar+ questions in their compan` | `SELECT` | `{authenticated}` |
| `pgr_acao_execucoes` | `Acesso as execucoes da propria empresa` | `ALL` | `{public}` |
| `pgr_acao_execucoes` | `Admin master acessa todas execucoes` | `ALL` | `{public}` |
| `pgr_alteracoes` | `pgr_alteracoes_admin_company` | `ALL` | `{authenticated}` |
| `pgr_documentos` | `pgr_documentos_admin_company` | `ALL` | `{authenticated}` |
| `pgr_importacoes` | `Admin e RH gerenciam importacoes da propria empresa` | `ALL` | `{authenticated}` |
| `pgr_importacoes` | `Admin master acessa todas as importacoes pgr` | `ALL` | `{authenticated}` |
| `pgr_plano_acao` | `Acesso as acoes da propria empresa` | `ALL` | `{public}` |
| `pgr_plano_acao` | `Admin master acessa todo o plano de acao` | `ALL` | `{authenticated}` |
| `pgr_plano_acao` | `Gestor departamento can view department pgr_plano_acao` | `SELECT` | `{public}` |
| `pgr_psicossocial_dominios` | `pgr_psico_dominios_admin_company` | `ALL` | `{authenticated}` |
| `pgr_relatorio_evidencias` | `Colaboradores podem inserir relatorios na mesma empresa` | `INSERT` | `{authenticated}` |
| `pgr_relatorio_evidencias` | `Colaboradores podem visualizar relatorios da mesma empresa` | `SELECT` | `{authenticated}` |
| `pgr_risco_detalhes` | `pgr_risco_detalhes_admin_company` | `ALL` | `{authenticated}` |
| `pgr_riscos` | `Admin e RH gerenciam riscos da propria empresa` | `ALL` | `{authenticated}` |
| `pgr_riscos` | `Admin master acessa todos os riscos pgr` | `ALL` | `{authenticated}` |
| `pgr_riscos` | `Gestor departamento visualiza riscos` | `SELECT` | `{authenticated}` |
| `pgr_secoes` | `pgr_secoes_admin_company` | `ALL` | `{authenticated}` |
| `platform_audit_logs` | `Super admin le auditoria` | `SELECT` | `{authenticated}` |
| `platform_audit_logs` | `Super admin registra auditoria` | `INSERT` | `{authenticated}` |
| `ponto_abonos` | `Admin empresa manage own abonos` | `ALL` | `{authenticated}` |
| `ponto_abonos` | `Admin master manage all abonos` | `ALL` | `{authenticated}` |
| `ponto_abonos` | `Colaborador read own abonos` | `SELECT` | `{authenticated}` |
| `ponto_abonos` | `Gestor read team abonos` | `SELECT` | `{authenticated}` |
| `ponto_compensacoes` | `Admin master full access on ponto_compensacoes` | `ALL` | `{authenticated}` |
| `ponto_compensacoes` | `Colaboradores read own company compensacoes` | `SELECT` | `{authenticated}` |
| `ponto_compensacoes` | `Company admins manage own compensacoes` | `ALL` | `{authenticated}` |
| `ponto_configuracoes` | `Admin empresa can manage own company ponto config` | `ALL` | `{authenticated}` |
| `ponto_configuracoes` | `Admin master can manage all ponto config` | `ALL` | `{authenticated}` |
| `ponto_configuracoes` | `All authenticated can read own company ponto config` | `SELECT` | `{authenticated}` |
| `ponto_fechamento_tratativas` | `tratativas_modify` | `ALL` | `{authenticated}` |
| `ponto_fechamento_tratativas` | `tratativas_select` | `SELECT` | `{authenticated}` |
| `ponto_registros` | `Admin empresa can manage own company ponto registros` | `ALL` | `{authenticated}` |
| `ponto_registros` | `Admin master can manage all ponto registros` | `ALL` | `{authenticated}` |
| `ponto_registros` | `Colaborador can insert own ponto registros` | `INSERT` | `{public}` |
| `ponto_registros` | `Colaborador can read own ponto registros` | `SELECT` | `{authenticated}` |
| `ponto_registros` | `Colaborador can update own ponto exclusao` | `UPDATE` | `{authenticated}` |
| `ponto_registros` | `Gestor can read team ponto registros` | `SELECT` | `{authenticated}` |
| `ponto_resumo_diario` | `Admin empresa can manage own company ponto resumo` | `ALL` | `{authenticated}` |
| `ponto_resumo_diario` | `Admin master can manage all ponto resumo` | `ALL` | `{authenticated}` |
| `ponto_resumo_diario` | `Colaborador can read own ponto resumo` | `SELECT` | `{authenticated}` |
| `ponto_resumo_diario` | `Gestor can read team ponto resumo` | `SELECT` | `{authenticated}` |
| `ponto_tipos_abono` | `Admin empresa manage own tipos abono` | `ALL` | `{authenticated}` |
| `ponto_tipos_abono` | `Admin master manage all tipos abono` | `ALL` | `{authenticated}` |
| `ponto_tipos_abono` | `All authenticated read own company tipos abono` | `SELECT` | `{authenticated}` |
| `profiles` | `Admin empresa can update own company profiles` | `UPDATE` | `{authenticated}` |
| `profiles` | `Admin empresa can view company profiles` | `SELECT` | `{authenticated}` |
| `profiles` | `Admin master can manage all profiles` | `ALL` | `{authenticated}` |
| `profiles` | `Admins can view profiles from same company` | `SELECT` | `{authenticated}` |
| `profiles` | `Super admin pode gerenciar profiles` | `ALL` | `{authenticated}` |
| `profiles` | `Users can update own profile` | `UPDATE` | `{authenticated}` |
| `profiles` | `Users can view own profile` | `SELECT` | `{authenticated}` |
| `promocoes_colaborador` | `admin_empresa_manage_promocoes` | `ALL` | `{public}` |
| `promocoes_colaborador` | `admin_master_full_access_promocoes` | `ALL` | `{public}` |
| `promocoes_colaborador` | `analista_rh_manage_promocoes` | `ALL` | `{public}` |
| `promocoes_colaborador` | `colaborador_view_own_promocoes` | `SELECT` | `{public}` |
| `promocoes_colaborador` | `gestor_view_promocoes` | `SELECT` | `{public}` |
| `psico_atribuicoes` | `psico_atribuicoes_colab_select` | `SELECT` | `{authenticated}` |
| `psico_atribuicoes` | `psico_atribuicoes_colab_update` | `UPDATE` | `{authenticated}` |
| `psico_atribuicoes` | `psico_atribuicoes_rh_all` | `ALL` | `{authenticated}` |
| `psico_avaliacao_ghes` | `psico_avaliacao_ghes_colab_select` | `SELECT` | `{authenticated}` |
| `psico_avaliacao_ghes` | `psico_avaliacao_ghes_rh_all` | `ALL` | `{authenticated}` |
| `psico_avaliacoes` | `psico_avaliacoes_colab_select` | `SELECT` | `{authenticated}` |
| `psico_avaliacoes` | `psico_avaliacoes_rh_all` | `ALL` | `{authenticated}` |
| `psico_dimensoes` | `psico_dimensoes_select` | `SELECT` | `{authenticated}` |
| `psico_dimensoes` | `psico_dimensoes_write` | `ALL` | `{authenticated}` |
| `psico_instrumentos` | `psico_instrumentos_delete` | `DELETE` | `{authenticated}` |
| `psico_instrumentos` | `psico_instrumentos_insert` | `INSERT` | `{authenticated}` |
| `psico_instrumentos` | `psico_instrumentos_select` | `SELECT` | `{authenticated}` |
| `psico_instrumentos` | `psico_instrumentos_update` | `UPDATE` | `{authenticated}` |
| `psico_perguntas` | `psico_perguntas_select` | `SELECT` | `{authenticated}` |
| `psico_perguntas` | `psico_perguntas_write` | `ALL` | `{authenticated}` |
| `psico_respostas` | `psico_respostas_rh_select` | `SELECT` | `{authenticated}` |
| `pulse_access_logs` | `Admin master can view access logs` | `SELECT` | `{public}` |
| `pulse_access_logs` | `Admins can insert access logs` | `INSERT` | `{authenticated}` |
| `pulse_access_logs` | `Admins de empresa podem ver logs da empresa` | `SELECT` | `{authenticated}` |
| `pulse_acompanhamentos` | `Acompanhamentos DELETE` | `DELETE` | `{authenticated}` |
| `pulse_acompanhamentos` | `Acompanhamentos INSERT` | `INSERT` | `{authenticated}` |
| `pulse_acompanhamentos` | `Acompanhamentos SELECT` | `SELECT` | `{authenticated}` |
| `pulse_acompanhamentos` | `Acompanhamentos UPDATE` | `UPDATE` | `{authenticated}` |
| `pulse_campaigns` | `Admin master can manage all campaigns` | `ALL` | `{public}` |
| `pulse_campaigns` | `Colaboradores can view active campaigns` | `SELECT` | `{public}` |
| `pulse_campaigns` | `Company admins can manage own campaigns` | `ALL` | `{public}` |
| `pulse_campaigns_alvos` | `Admins can manage alvos` | `ALL` | `{public}` |
| `pulse_campaigns_alvos` | `Colaboradores can view alvos of active campaigns` | `SELECT` | `{public}` |
| `pulse_questions` | `Admin master can manage all questions` | `ALL` | `{public}` |
| `pulse_questions` | `Company admins can manage own questions` | `ALL` | `{public}` |
| `pulse_questions` | `Users can view questions of accessible campaigns` | `SELECT` | `{public}` |
| `pulse_responses` | `Admin master can view all responses` | `SELECT` | `{authenticated}` |
| `pulse_responses` | `Colaboradores can insert own responses` | `INSERT` | `{public}` |
| `pulse_responses` | `Colaboradores can view own responses` | `SELECT` | `{public}` |
| `pulse_responses` | `Company admins can view company responses` | `SELECT` | `{authenticated}` |
| `pulse_surveys` | `Admins veem pulse surveys da empresa` | `SELECT` | `{public}` |
| `pulse_surveys` | `Colaboradores podem criar pulse survey` | `INSERT` | `{public}` |
| `pulse_surveys` | `Colaboradores veem seu histórico de pulse` | `SELECT` | `{public}` |
| `questionario_atribuicoes` | `atrib_admin_all` | `ALL` | `{authenticated}` |
| `questionario_atribuicoes` | `atrib_colab_select` | `SELECT` | `{authenticated}` |
| `questionario_atribuicoes` | `atrib_colab_update` | `UPDATE` | `{authenticated}` |
| `questionario_modelos` | `modelos_select` | `SELECT` | `{authenticated}` |
| `questionario_modelos` | `modelos_write` | `ALL` | `{authenticated}` |
| `questionario_opcoes` | `opcoes_all` | `ALL` | `{authenticated}` |
| `questionario_perguntas` | `perguntas_all` | `ALL` | `{authenticated}` |
| `questionario_respostas` | `resp_admin_all` | `ALL` | `{authenticated}` |
| `questionario_respostas` | `resp_colab_all` | `ALL` | `{authenticated}` |
| `questionario_secoes` | `secoes_all` | `ALL` | `{authenticated}` |
| `questionarios_cuidar_plus` | `Admin pode gerenciar questionarios cuidar plus` | `ALL` | `{public}` |
| `questionarios_cuidar_plus_alvos` | `questionarios_cuidar_plus_alvos_admin_delete_scoped` | `DELETE` | `{authenticated}` |
| `questionarios_cuidar_plus_alvos` | `questionarios_cuidar_plus_alvos_admin_insert_scoped` | `INSERT` | `{authenticated}` |
| `questionarios_cuidar_plus_alvos` | `questionarios_cuidar_plus_alvos_admin_update_scoped` | `UPDATE` | `{authenticated}` |
| `questionarios_cuidar_plus_alvos` | `questionarios_cuidar_plus_alvos_select_scoped` | `SELECT` | `{authenticated}` |
| `questionnaire_templates` | `Admin empresa can manage own company templates` | `ALL` | `{public}` |
| `questionnaire_templates` | `Admin master full access questionnaire_templates` | `ALL` | `{public}` |
| `questionnaire_templates` | `Analista RH can view templates` | `SELECT` | `{public}` |
| `questionnaire_templates` | `Gestor departamento can view questionnaire_templates` | `SELECT` | `{public}` |
| `questions` | `Admin empresa can manage questions` | `ALL` | `{public}` |
| `questions` | `Admin master full access questions` | `ALL` | `{public}` |
| `questions` | `Analista RH can view questions` | `SELECT` | `{public}` |
| `questions` | `Colaborador can view questions from own cycles` | `SELECT` | `{public}` |
| `questions` | `Gestor departamento can view questions` | `SELECT` | `{public}` |
| `rate_limits` | `deny_all_direct_access` | `ALL` | `{anon,authenticated}` |
| `relatorios_executivos_salvos` | `Delete own reports` | `DELETE` | `{public}` |
| `relatorios_executivos_salvos` | `Insert own company reports` | `INSERT` | `{public}` |
| `relatorios_executivos_salvos` | `Update own reports` | `UPDATE` | `{public}` |
| `relatorios_executivos_salvos` | `View company reports` | `SELECT` | `{public}` |
| `replication_logs` | `Admin master can insert replication logs` | `INSERT` | `{public}` |
| `replication_logs` | `Admin master can view replication logs` | `SELECT` | `{public}` |
| `respostas_cuidar_plus` | `Admin pode visualizar respostas cuidar plus` | `SELECT` | `{public}` |
| `security_rate_limit_logs` | `admin_master reads rate limit audit` | `SELECT` | `{authenticated}` |
| `setores` | `estrut_setores_delete` | `DELETE` | `{authenticated}` |
| `setores` | `estrut_setores_insert` | `INSERT` | `{authenticated}` |
| `setores` | `estrut_setores_select` | `SELECT` | `{authenticated}` |
| `setores` | `estrut_setores_update` | `UPDATE` | `{authenticated}` |
| `suppressed_emails` | `Service role can insert suppressed emails` | `INSERT` | `{public}` |
| `suppressed_emails` | `Service role can read suppressed emails` | `SELECT` | `{public}` |
| `tasks` | `tasks_delete_own` | `DELETE` | `{public}` |
| `tasks` | `tasks_insert_own` | `INSERT` | `{public}` |
| `tasks` | `tasks_select_own` | `SELECT` | `{public}` |
| `tasks` | `tasks_update_own` | `UPDATE` | `{public}` |
| `tasks_reminders` | `tasks_reminders_delete_own` | `DELETE` | `{public}` |
| `tasks_reminders` | `tasks_reminders_insert_own` | `INSERT` | `{public}` |
| `tasks_reminders` | `tasks_reminders_select_own` | `SELECT` | `{public}` |
| `tasks_reminders` | `tasks_reminders_update_own` | `UPDATE` | `{public}` |
| `terms_acceptance` | `admin_read_own_terms` | `SELECT` | `{authenticated}` |
| `terms_acceptance` | `super_admin_read_terms` | `SELECT` | `{authenticated}` |
| `transferencias_colaborador` | `transf_insert_block` | `INSERT` | `{authenticated}` |
| `transferencias_colaborador` | `transf_select_admin_rh` | `SELECT` | `{authenticated}` |
| `treinamento_aula_progresso` | `Admins veem progresso de aulas` | `SELECT` | `{authenticated}` |
| `treinamento_aula_progresso` | `Colaborador gerencia seu progresso de aula` | `ALL` | `{authenticated}` |
| `treinamento_aulas` | `Admins gerenciam aulas` | `ALL` | `{authenticated}` |
| `treinamento_aulas` | `Aulas da propria empresa` | `SELECT` | `{authenticated}` |
| `treinamento_logs_acesso` | `Colaboradores podem atualizar seus logs` | `UPDATE` | `{authenticated}` |
| `treinamento_logs_acesso` | `Colaboradores podem inserir seus logs` | `INSERT` | `{authenticated}` |
| `treinamento_logs_acesso` | `Colaboradores podem ver seus logs` | `SELECT` | `{public}` |
| `treinamento_modulos` | `Admins gerenciam modulos` | `ALL` | `{authenticated}` |
| `treinamento_modulos` | `Modulos da propria empresa` | `SELECT` | `{authenticated}` |
| `treinamento_progresso` | `Colaboradores podem atualizar seu progresso` | `UPDATE` | `{authenticated}` |
| `treinamento_progresso` | `Colaboradores podem inserir seu progresso` | `INSERT` | `{authenticated}` |
| `treinamento_progresso` | `Colaboradores podem ver seu progresso` | `SELECT` | `{authenticated}` |
| `treinamento_quiz_alternativas` | `Admin pode gerenciar treinamento_quiz_alternativas` | `ALL` | `{public}` |
| `treinamento_quiz_alternativas` | `Colaboradores podem ver alternativas de treinamentos publicados` | `SELECT` | `{authenticated}` |
| `treinamento_quiz_config` | `Admin pode gerenciar treinamento_quiz_config` | `ALL` | `{public}` |
| `treinamento_quiz_config` | `Colaboradores podem ver quiz config de treinamentos publicados` | `SELECT` | `{authenticated}` |
| `treinamento_quiz_perguntas` | `Admin pode gerenciar treinamento_quiz_perguntas` | `ALL` | `{public}` |
| `treinamento_quiz_perguntas` | `Colaboradores podem ver perguntas de treinamentos publicados` | `SELECT` | `{authenticated}` |
| `treinamento_quiz_tentativas` | `Colaboradores podem inserir suas tentativas` | `INSERT` | `{authenticated}` |
| `treinamento_quiz_tentativas` | `Colaboradores podem ver suas tentativas` | `SELECT` | `{authenticated}` |
| `treinamentos` | `Admin pode gerenciar treinamentos` | `ALL` | `{public}` |
| `treinamentos` | `Colaboradores podem ver treinamentos publicados` | `SELECT` | `{public}` |
| `unidades_organizacionais` | `estrut_unidades_delete` | `DELETE` | `{authenticated}` |
| `unidades_organizacionais` | `estrut_unidades_insert` | `INSERT` | `{authenticated}` |
| `unidades_organizacionais` | `estrut_unidades_select` | `SELECT` | `{authenticated}` |
| `unidades_organizacionais` | `estrut_unidades_update` | `UPDATE` | `{authenticated}` |
| `user_companies` | `user_companies_select` | `SELECT` | `{authenticated}` |
| `user_companies` | `user_companies_write` | `ALL` | `{authenticated}` |
| `user_preferences` | `Users can insert own preferences` | `INSERT` | `{authenticated}` |
| `user_preferences` | `Users can read own preferences` | `SELECT` | `{authenticated}` |
| `user_preferences` | `Users can update own preferences` | `UPDATE` | `{authenticated}` |
| `user_roles` | `Admin empresa can view own company user roles` | `SELECT` | `{authenticated}` |
| `user_roles` | `Admin master can manage all roles` | `ALL` | `{authenticated}` |
| `user_roles` | `Users can view own role` | `SELECT` | `{authenticated}` |
| `work_schedules` | `Admin master full access work_schedules` | `ALL` | `{public}` |
| `work_schedules` | `Company admins manage work_schedules` | `ALL` | `{public}` |
| `work_schedules` | `Company members read work_schedules` | `SELECT` | `{public}` |

---

## 4. TRIGGERS ATIVOS (161)
| Tabela | Trigger | Função Executada |
| :--- | :--- | :--- |
| `analises_perfil` | `update_analises_perfil_updated_at` | `update_updated_at_column` |
| `avaliacao_respostas_competencias` | `update_avaliacao_respostas_competencias_updated_at` | `update_updated_at_column` |
| `avaliacao_respostas_objetivos` | `update_avaliacao_respostas_objetivos_updated_at` | `update_updated_at_column` |
| `avaliacoes` | `trg_notify_avaliacao_criada` | `notify_avaliacao_criada` |
| `avaliacoes` | `trigger_notify_autoavaliacao_concluida_pdi` | `notify_autoavaliacao_concluida_pdi` |
| `avaliacoes` | `update_avaliacoes_updated_at` | `update_updated_at_column` |
| `banco_horas_fechamentos` | `update_banco_horas_fechamentos_updated_at` | `update_updated_at_column` |
| `banco_horas_perfis` | `trg_banco_horas_perfis_updated_at` | `update_updated_at_column` |
| `beneficios` | `trg_guard_beneficios` | `check_module_enabled_trigger` |
| `beneficios` | `update_beneficios_updated_at` | `update_updated_at_column` |
| `blog_posts` | `update_blog_posts_updated_at` | `update_updated_at_column` |
| `campanhas_comunicados` | `trg_campanhas_comunicados_updated_at` | `update_updated_at_column` |
| `campanhas_comunicados` | `trg_validate_campanha_datas` | `validate_campanha_datas` |
| `cargos` | `trg_cargos_updated` | `update_updated_at_column` |
| `categorias_treinamento` | `update_categorias_treinamento_updated_at` | `update_updated_at_column` |
| `cbo_ocupacoes` | `trg_cbo_updated` | `update_updated_at_column` |
| `certificates` | `update_certificates_updated_at` | `update_updated_at_column` |
| `checklist_aplicacoes` | `trg_guard_checklist_aplicacoes` | `check_module_enabled_trigger` |
| `ciclos_avaliacao` | `trg_guard_ciclos_avaliacao` | `check_module_enabled_trigger` |
| `ciclos_avaliacao` | `update_ciclos_avaliacao_updated_at` | `update_updated_at_column` |
| `colaborador_beneficios` | `update_colaborador_beneficios_updated_at` | `update_updated_at_column` |
| `colaboradores` | `on_colaborador_created` | `create_feedback_cycles_for_colaborador` |
| `colaboradores` | `trg_auto_link_colaborador_user` | `trg_auto_link_colaborador_user` |
| `colaboradores` | `trg_prevent_delete_colaborador_with_user` | `check_colaborador_delete_permission` |
| `colaboradores` | `trg_recalc_resumo_colab` | `trg_recalc_resumo_colab` |
| `colaboradores` | `trg_sync_colaborador_cargo` | `sync_colaborador_cargo` |
| `colaboradores` | `trg_validate_colaborador_ferias_legado` | `validate_colaborador_ferias_legado` |
| `colaboradores` | `trigger_sync_profile_on_colaborador_status` | `sync_profile_is_active` |
| `colaboradores` | `update_colaboradores_updated_at` | `update_updated_at_column` |
| `collaborator_consents` | `trg_collaborator_consents_updated` | `update_updated_at_column` |
| `companies` | `trg_new_company_modules` | `handle_new_company_modules` |
| `companies` | `trg_seed_tipos_abono_nova_empresa` | `seed_tipos_abono_nova_empresa` |
| `companies` | `update_companies_updated_at` | `update_updated_at_column` |
| `company_lifecycle_events` | `trg_prevent_lifecycle_events_update_delete` | `prevent_lifecycle_events_modification` |
| `competencias_ciclo` | `update_competencias_ciclo_updated_at` | `update_updated_at_column` |
| `comunicados` | `trg_guard_comunicados` | `check_module_enabled_trigger` |
| `comunicados` | `update_comunicados_updated_at` | `update_updated_at_column` |
| `contact_requests` | `trigger_notify_contact_request` | `notify_new_contact_request` |
| `cron.job` | `cron_job_cache_invalidate` | `job_cache_invalidate` |
| `cuidar_conteudos` | `trg_cuidar_conteudos_updated_at` | `update_updated_at_column` |
| `cuidar_progressao` | `update_cuidar_progressao_updated_at` | `update_updated_at_column` |
| `cuidar_templates_fixos` | `update_cuidar_templates_fixos_updated_at` | `update_updated_at_column` |
| `denuncias` | `trg_denuncias_notificar` | `trg_notificar_nova_denuncia` |
| `denuncias` | `trg_denuncias_updated_at` | `update_updated_at_column` |
| `denuncias` | `trg_guard_denuncias` | `check_module_enabled_trigger` |
| `departamentos` | `trg_departamentos_updated` | `update_updated_at_column` |
| `descricao_modelos` | `update_descricao_modelos_updated_at` | `update_updated_at_column` |
| `descricao_questionario` | `trg_dq_updated` | `update_updated_at_column` |
| `descricoes_cargo` | `update_descricoes_cargo_updated_at` | `update_updated_at_column` |
| `desligamentos_colaborador` | `trg_guard_desligamentos_colaborador` | `check_module_enabled_trigger` |
| `dimensoes_questionario_cuidar_plus` | `update_dimensoes_questionario_updated_at` | `update_updated_at_column` |
| `espelhos_ponto_mensais` | `trg_espelho_mensal_updated_at` | `update_updated_at_column` |
| `evolution_reports` | `update_evolution_reports_updated_at` | `update_updated_at_column` |
| `feedback_cycles` | `trg_guard_feedback_cycles` | `check_module_enabled_trigger` |
| `feedback_cycles` | `update_feedback_cycles_updated_at` | `update_updated_at_column` |
| `feedbacks_colaboradores` | `update_feedbacks_colaboradores_updated_at` | `update_updated_at_column` |
| `ferias_gozo` | `trg_ferias_gozo_auto_periodo` | `tg_ferias_gozo_auto_periodo` |
| `ferias_gozo` | `trg_guard_ferias_gozo` | `check_module_enabled_trigger` |
| `ferias_gozo` | `trg_guard_gestor_ferias_update` | `fn_guard_gestor_ferias_update` |
| `ferias_gozo` | `update_ferias_gozo_updated_at` | `update_updated_at_column` |
| `ferias_periodos_aquisitivos` | `trg_guard_ferias_periodos` | `check_module_enabled_trigger` |
| `ferias_periodos_aquisitivos` | `update_ferias_periodos_aquisitivos_updated_at` | `update_updated_at_column` |
| `ficha_profissional` | `update_ficha_profissional_updated_at` | `update_updated_at_column` |
| `ghe_epis` | `trg_ghe_epis_updated` | `update_updated_at_column` |
| `ghes` | `trg_ghes_updated` | `update_updated_at_column` |
| `metricas_avaliacao` | `sync_metricas_valores_trigger` | `sync_metricas_valores` |
| `metricas_avaliacao` | `update_metricas_avaliacao_updated_at` | `update_updated_at_column` |
| `niveis_maturidade` | `update_niveis_maturidade_updated_at` | `update_updated_at_column` |
| `notifications` | `trg_validate_notification_priority` | `validate_notification_priority` |
| `nr1_ghe_riscos` | `trg_nr1_ghe_riscos_updated` | `update_updated_at_column` |
| `nr1_matriz_config` | `trg_nr1_matriz_config_updated` | `update_updated_at_column` |
| `nr1_planos_acao` | `trg_nr1_planos_acao_updated_at` | `update_updated_at_column` |
| `nr1_proart_ativacoes` | `trg_set_proart_ativacao_company_id` | `set_proart_ativacao_company_id` |
| `nr1_proart_respostas` | `trg_set_proart_company_id` | `set_proart_company_id` |
| `nr1_regras_sugestao` | `trg_nr1_regras_sugestao_updated` | `update_updated_at_column` |
| `nr1_riscos_catalogo` | `trg_nr1_riscos_catalogo_updated` | `update_updated_at_column` |
| `objetivos_ciclo` | `update_objetivos_ciclo_updated_at` | `update_updated_at_column` |
| `onboarding_progress` | `update_onboarding_progress_updated_at` | `update_updated_at_column` |
| `pdi_itens` | `update_pdi_itens_updated_at` | `update_updated_at_column` |
| `pdis` | `update_pdis_updated_at` | `update_updated_at_column` |
| `perguntas_cuidar_plus` | `update_perguntas_cuidar_plus_updated_at` | `update_updated_at_column` |
| `pgr_acao_execucoes` | `trg_pgr_acao_execucoes_updated_at` | `moddatetime` |
| `pgr_alteracoes` | `trg_pgr_alteracoes_updated` | `update_updated_at_column` |
| `pgr_documentos` | `trg_pgr_documentos_updated` | `update_updated_at_column` |
| `pgr_importacoes` | `trg_guard_pgr_importacoes` | `check_module_enabled_trigger` |
| `pgr_importacoes` | `trg_pgr_importacoes_updated_at` | `update_updated_at_column` |
| `pgr_plano_acao` | `trg_pgr_plano_acao_updated_at` | `update_updated_at_column` |
| `pgr_psicossocial_dominios` | `trg_pgr_psico_dominios_updated` | `update_updated_at_column` |
| `pgr_risco_detalhes` | `trg_pgr_risco_detalhes_updated` | `update_updated_at_column` |
| `pgr_riscos` | `trg_pgr_riscos_updated_at` | `update_updated_at_column` |
| `pgr_secoes` | `trg_pgr_secoes_updated` | `update_updated_at_column` |
| `ponto_abonos` | `a1_block_ponto_periodo_fechado` | `block_ponto_periodo_fechado` |
| `ponto_abonos` | `trg_aplicar_abono_resumo` | `aplicar_abono_resumo` |
| `ponto_abonos` | `update_ponto_abonos_updated_at` | `update_updated_at_column` |
| `ponto_configuracoes` | `trg_recalc_resumo_cfg` | `trg_recalc_resumo_cfg` |
| `ponto_configuracoes` | `trg_validate_faixas_hora_extra` | `validate_faixas_hora_extra` |
| `ponto_configuracoes` | `update_ponto_configuracoes_updated_at` | `update_updated_at_column` |
| `ponto_registros` | `a0_normalizar_tipo_ponto_registro` | `normalizar_tipo_ponto_registro` |
| `ponto_registros` | `a1_block_ponto_periodo_fechado` | `block_ponto_periodo_fechado` |
| `ponto_registros` | `trg_block_ponto_em_abono` | `block_ponto_em_abono` |
| `ponto_registros` | `trg_block_ponto_em_ferias` | `block_ponto_em_ferias` |
| `ponto_registros` | `trg_ponto_recalc_resumo` | `trg_recalc_resumo_ponto` |
| `ponto_registros` | `trg_ponto_registros_block_collab_changes` | `ponto_registros_block_collab_changes` |
| `ponto_registros` | `trg_validar_sequencia_ponto` | `validar_sequencia_ponto` |
| `ponto_resumo_diario` | `a1_block_resumo_periodo_fechado` | `block_ponto_periodo_fechado` |
| `ponto_resumo_diario` | `update_ponto_resumo_diario_updated_at` | `update_updated_at_column` |
| `ponto_tipos_abono` | `update_ponto_tipos_abono_updated_at` | `update_updated_at_column` |
| `profiles` | `trg_sync_profile_user_company` | `handle_sync_profile_user_company` |
| `profiles` | `update_profiles_updated_at` | `update_updated_at_column` |
| `psico_atribuicoes` | `trg_psico_atribuicoes_updated` | `update_updated_at_column` |
| `psico_atribuicoes` | `trg_psico_notify_atribuicao` | `psico_notify_atribuicao` |
| `psico_atribuicoes` | `trg_psico_notify_preenchido` | `psico_notify_preenchido` |
| `psico_avaliacoes` | `trg_psico_avaliacoes_updated` | `update_updated_at_column` |
| `psico_dimensoes` | `trg_psico_dimensoes_updated` | `update_updated_at_column` |
| `psico_instrumentos` | `trg_psico_instrumentos_updated` | `update_updated_at_column` |
| `psico_perguntas` | `trg_psico_perguntas_updated` | `update_updated_at_column` |
| `pulse_acompanhamentos` | `trg_pulse_acompanhamento_status_trigger` | `trg_pulse_acompanhamento_status` |
| `pulse_acompanhamentos` | `trg_pulse_acompanhamentos_updated_at` | `update_updated_at_column` |
| `pulse_campaigns` | `trg_guard_pulse_campaigns` | `check_module_enabled_trigger` |
| `pulse_campaigns` | `update_pulse_campaigns_updated_at` | `update_updated_at_column` |
| `pulse_responses` | `trg_pulse_response_critica` | `trigger_pulse_acompanhamento_critico` |
| `questionario_atribuicoes` | `trg_notify_questionario_atribuido` | `notify_questionario_atribuido` |
| `questionario_atribuicoes` | `trg_notify_questionario_status` | `notify_questionario_status` |
| `questionario_atribuicoes` | `trg_qa_updated` | `update_updated_at_column` |
| `questionario_modelos` | `trg_qm_updated` | `update_updated_at_column` |
| `questionario_perguntas` | `trg_qp_updated` | `update_updated_at_column` |
| `questionario_respostas` | `trg_qr_updated` | `update_updated_at_column` |
| `questionario_secoes` | `trg_qs_updated` | `update_updated_at_column` |
| `questionarios_cuidar_plus` | `trg_guard_questionarios_cuidar_plus` | `check_module_enabled_trigger` |
| `questionarios_cuidar_plus` | `update_questionarios_cuidar_plus_updated_at` | `update_updated_at_column` |
| `questionnaire_templates` | `update_questionnaire_templates_updated_at` | `update_updated_at_column` |
| `questions` | `update_questions_updated_at` | `update_updated_at_column` |
| `realtime.subscription` | `tr_check_filters` | `subscription_check_filters` |
| `relatorios_executivos_salvos` | `trg_guard_relatorios_salvos` | `check_module_enabled_trigger` |
| `relatorios_executivos_salvos` | `update_relatorios_executivos_salvos_updated_at` | `update_updated_at_column` |
| `setores` | `trg_setores_updated` | `update_updated_at_column` |
| `storage.buckets` | `enforce_bucket_name_length_trigger` | `enforce_bucket_name_length` |
| `storage.buckets` | `enforce_versioning_status_transition` | `enforce_versioning_status_transition` |
| `storage.buckets` | `protect_active_lifecycle_states` | `protect_active_lifecycle_states` |
| `storage.buckets` | `protect_bucket_control_insert` | `protect_bucket_control_columns` |
| `storage.buckets` | `protect_bucket_control_update` | `protect_bucket_control_columns` |
| `storage.buckets` | `protect_bucket_control_update_role` | `enforce_bucket_lifecycle_service_role` |
| `storage.buckets` | `protect_buckets_delete` | `protect_delete` |
| `storage.buckets` | `wake_lifecycle_on_policy_write` | `wake_lifecycle_state` |
| `storage.buckets` | `wake_lifecycle_on_versioning_enable` | `wake_lifecycle_state` |
| `storage.objects` | `protect_objects_delete` | `protect_delete` |
| `storage.objects` | `update_objects_updated_at` | `update_updated_at_column` |
| `tasks` | `trg_guard_tasks` | `check_module_enabled_trigger` |
| `tasks` | `trg_tasks_updated_at` | `update_updated_at_column` |
| `treinamento_aula_progresso` | `trg_treinamento_aula_progresso_updated` | `update_updated_at_column` |
| `treinamento_aulas` | `trg_treinamento_aulas_updated` | `update_updated_at_column` |
| `treinamento_modulos` | `trg_treinamento_modulos_updated` | `update_updated_at_column` |
| `treinamento_progresso` | `update_treinamento_progresso_updated_at` | `update_updated_at_column` |
| `treinamentos` | `trg_guard_treinamentos` | `check_module_enabled_trigger` |
| `treinamentos` | `update_treinamentos_updated_at` | `update_updated_at_column` |
| `unidades_organizacionais` | `trg_unidades_updated` | `update_updated_at_column` |
| `user_companies` | `trg_user_companies_updated_at` | `update_updated_at_column` |
| `user_roles` | `trg_sync_user_role_to_company` | `handle_sync_user_role_to_company` |
| `work_schedules` | `trg_recalc_resumo_ws` | `trg_recalc_resumo_ws` |
| `work_schedules` | `trg_validate_horarios_por_dia` | `validate_horarios_por_dia` |
| `work_schedules` | `update_work_schedules_updated_at` | `update_updated_at_column` |

---

## 5. FUNÇÕES PÚBLICAS E ÚLTIMA MIGRATION DE ORIGEM (297)
| Função | Argumentos | Última Migration Identificada |
| :--- | :--- | :--- |
| `_relatorios_ponto_scope` | `` | `20260724232927_f421d2e4-c595-4d9f-9302-e81ff4ac0bd7.sql` |
| `accept_company_terms` | `p_terms_version text, p_privacy_version text, p_ip_address text, p_user_agent text` | `20261015100000_accept_company_terms_rpc.sql` |
| `admin_master_scope` | `_company_id uuid` | `20260813185928_89bce8d8-b135-47ee-919e-49f3fbd515c3.sql` |
| `admin_update_user_role` | `p_user_id uuid, p_company_id uuid, p_new_role app_role` | `20261027151000_admin_update_user_role_last_admin_guard.sql` |
| `aep_sugerir_perigos` | `p_aplicacao_id uuid` | `20260903101000_checklist_aep.sql` |
| `agregar_badges_semana` | `p_company_id uuid, p_ano integer, p_semana integer` | `20260520203028_988bf5eb-2629-4147-a4ea-c14e7c1912f2.sql` |
| `agregar_recomendacoes_rh` | `p_company_id uuid, p_ano integer, p_semana integer` | `20260520204058_ca67f5a1-55a4-4063-b268-8def6d646d80.sql` |
| `aplicar_abono_resumo` | `` | `20260716175308_b82b9dc6-223c-4e0a-b5f4-f17a0700bbcd.sql` |
| `aprovar_ferias_gozo` | `p_gozo_id uuid` | `20261027160000_gestor_aprovar_ferias_policy.sql` |
| `assinar_espelho_mensal` | `p_espelho_id uuid` | `20260608140548_18e056ed-424e-49db-929d-6bc151860b65.sql` |
| `assinar_periodo_ponto` | `p_fechamento_id uuid` | `20260508182642_e5ff8984-b264-4c4c-85fc-2f68919e0dde.sql` |
| `atualizar_branding_empresa` | `_brand_name text, _brand_primary_color text, _brand_logo_url text, _cnpj text, _remove_logo boolean, _telefone text, _segmento text, _cep text, _logradouro text, _numero text, _complemento text, _bairro text, _cidade text, _estado text, _target_company_id uuid` | `20261014170000_expand_atualizar_branding_empresa.sql` |
| `atualizar_status_denuncia` | `p_id uuid, p_novo_status text` | `20260525170932_9253ccf4-dacb-4bbd-bbe5-c04ac25564b7.sql` |
| `atualizar_streak_cuidar` | `p_user_id uuid, p_company_id uuid, p_data_campanha date` | `20260520200602_426d0ba3-9ce8-4c68-a471-2c62a370384d.sql` |
| `block_ponto_em_abono` | `` | `20260716174118_a8814dd9-a218-4dc7-8f19-7b031a771f3c.sql` |
| `block_ponto_em_ferias` | `` | `20260506125202_4c92e533-433e-44ec-9209-dc2aa691ce6c.sql` |
| `block_ponto_periodo_fechado` | `` | `20260508162327_d7f4ee4e-142c-4f1e-9af1-aa5779ba191e.sql` |
| `buscar_campanhas_pendentes` | `p_user_id uuid` | `20260528114631_52e77dc4-b8b4-4cf5-82aa-b9cd4812d494.sql` |
| `buscar_comunicados_pendentes` | `p_user_id uuid` | `20260528113354_69db13f9-483d-48da-ab19-6c822883e214.sql` |
| `calc_horas_mensais_colab` | `p_colab uuid` | `20260724232927_f421d2e4-c595-4d9f-9302-e81ff4ac0bd7.sql` |
| `calc_minutos_noturnos_br` | `p_inicio timestamp with time zone, p_fim timestamp with time zone` | `20260508143440_0d1ff0a6-ed6f-49e0-8183-79b5f0816030.sql` |
| `calc_trabalhadores_ghe` | `p_ghe_id uuid` | `20260728170518_236204bd-a63e-4ec4-a5ba-0f3a59eaf1bc.sql` |
| `calcular_status_campanha` | `p_data_inicio date, p_data_fim date` | `20260525144327_c1153855-fcf8-4054-a08c-cff333eac1ae.sql` |
| `can_access_cuidar_plus_alvos` | `p_questionario_id uuid` | `20261016190000_etapa4_ciclo_b_remover_fallbacks_profiles.sql` |
| `can_access_pulse_campaign_alvos` | `p_campaign_id uuid` | `20261007133000_fix_pulse_campaigns_rls_recursion.sql` |
| `can_manage_cuidar_plus_alvos` | `p_questionario_id uuid` | `20261016190000_etapa4_ciclo_b_remover_fallbacks_profiles.sql` |
| `check_colaborador_delete_permission` | `` | `20261021170000_prevent_delete_colaborador_with_user.sql` |
| `check_email_exists` | `p_email text` | `20261016200000_guard_check_email_exists.sql` |
| `check_email_vinculacao` | `p_email text, p_company_id uuid` | `20261021220000_guard_inteligente_vinculacao.sql` |
| `check_emails_exist_batch` | `p_emails text[], p_company_id uuid` | `20261021220000_guard_inteligente_vinculacao.sql` |
| `check_module_enabled_trigger` | `` | `20261019150000_fix_guard_module_enabled_tables_without_company_id.sql` |
| `check_rate_limit` | `p_user_id uuid, p_bucket text, p_max_req integer, p_window_seconds integer` | `20260625163039_5e9bf6d7-189e-4730-a052-b855efc4e9fc.sql` |
| `citext` | `character` | `*Não mapeada em migrations/*` |
| `citext` | `boolean` | `*Não mapeada em migrations/*` |
| `citext` | `inet` | `*Não mapeada em migrations/*` |
| `citext_cmp` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_eq` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_ge` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_gt` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_hash` | `citext` | `*Não mapeada em migrations/*` |
| `citext_hash_extended` | `citext, bigint` | `*Não mapeada em migrations/*` |
| `citext_larger` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_le` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_lt` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_ne` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_pattern_cmp` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_pattern_ge` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_pattern_gt` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_pattern_le` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_pattern_lt` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citext_smaller` | `citext, citext` | `*Não mapeada em migrations/*` |
| `citextin` | `cstring` | `*Não mapeada em migrations/*` |
| `citextout` | `citext` | `*Não mapeada em migrations/*` |
| `citextrecv` | `internal` | `*Não mapeada em migrations/*` |
| `citextsend` | `citext` | `*Não mapeada em migrations/*` |
| `colaborador_has_avaliacao_in_ciclo` | `_ciclo_id uuid` | `20260121184543_2bc8d47e-a4d8-4be3-aa12-1c779b86917d.sql` |
| `count_replication_targets` | `p_source_company_id uuid` | `20260129121552_ab13249c-4e75-4050-aece-39a665fd29a1.sql` |
| `create_feedback_cycles_for_colaborador` | `` | `20251216195032_07a175ff-0a19-4163-b5ff-d42e0d3f532a.sql` |
| `criar_denuncia` | `p_titulo text, p_mensagem text, p_anonimo boolean, p_tipo text, p_categoria text, p_origem text` | `20261007224200_rate_limit_criar_denuncia.sql` |
| `delete_collaborator_data` | `p_collaborator_id uuid` | `20260813190210_dd0d21c0-318c-4756-a101-00fb87813f68.sql` |
| `delete_email` | `queue_name text, message_id bigint` | `20261007223645_fix_rpc_search_path.sql` |
| `editar_batida_ponto` | `p_batida_id uuid, p_novo_horario timestamp with time zone` | `20260528211951_9e8adc8f-38b4-426d-905d-3ff130a30bc7.sql` |
| `email_queue_dispatch` | `` | `*Não mapeada em migrations/*` |
| `email_queue_wake` | `` | `*Não mapeada em migrations/*` |
| `enqueue_email` | `queue_name text, payload jsonb` | `20261007223645_fix_rpc_search_path.sql` |
| `ensure_meus_periodos_aquisitivos` | `` | `20260507141206_fb3ffeff-97ab-4953-8ec2-026d1c3db913.sql` |
| `ensure_periodos_aquisitivos_company` | `p_company_id uuid` | `20260602151332_32e85830-2f92-456e-9f00-18d16ba4e13a.sql` |
| `estrut_can_read` | `_company_id uuid` | `20261008101500_estrutura_failclosed.sql` |
| `excluir_batida_ponto` | `p_batida_id uuid` | `20260528205422_f105cfb9-01b8-456e-b727-76a9e19c280b.sql` |
| `export_collaborator_data` | `p_collaborator_id uuid` | `20260813190210_dd0d21c0-318c-4756-a101-00fb87813f68.sql` |
| `fechar_espelho_mensal` | `p_company_id uuid, p_ano integer, p_mes integer, p_colaboradores_ids uuid[]` | `20260608131651_28239dfa-ad42-4fd7-8c41-19f21d515924.sql` |
| `fechar_periodo_ponto` | `p_company_id uuid, p_periodo_inicio date, p_periodo_fim date, p_colaboradores_ids uuid[]` | `20260602141931_2bbe0f24-3fb5-4d8c-9200-55d7fa739b72.sql` |
| `fn_guard_gestor_ferias_update` | `` | `20261027160000_gestor_aprovar_ferias_policy.sql` |
| `gerar_alertas_coletivos_cuidar` | `p_company_id uuid, p_ano integer, p_semana integer` | `20260522131654_1776f28e-5d65-4ae3-95e9-72d1e7573255.sql` |
| `gerar_alertas_individuais_cuidar` | `p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric` | `20260520204958_0ed11acc-a582-423b-bb90-825c6780af86.sql` |
| `gerar_badges_cuidar` | `p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric` | `20260520203028_988bf5eb-2629-4147-a4ea-c14e7c1912f2.sql` |
| `gerar_campanhas_cuidar_ano` | `p_company_id uuid, p_ano integer` | `20260522131035_abd6a3b1-3835-42c6-b680-86e455da982f.sql` |
| `gerar_planos_acao_proart` | `p_ativacao_id uuid` | `20260623210430_c95c517c-7e56-456a-932f-622e2bd8e6e3.sql` |
| `gerar_recomendacoes_cuidar` | `p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric` | `20260520204058_ca67f5a1-55a4-4063-b268-8def6d646d80.sql` |
| `get_active_pulse_campaign` | `p_company_id uuid` | `20261007111323_audiencia_segmentada_pulse_campaigns.sql` |
| `get_admin_notifications` | `p_limit integer` | `20260817203541_7623e02a-76e3-4311-9c0f-6665d25b8818.sql` |
| `get_alertas_nr1_v1` | `p_company_id uuid, p_data_inicio date, p_data_fim date` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_aniversariantes_globais_mes` | `p_company_id uuid` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_aniversariantes_globais_mes` | `` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_avaliacao_by_token` | `p_token text` | `20260109113342_9bce6e3b-e150-4ebd-8110-56a6fa0fac46.sql` |
| `get_cargos_by_ghe` | `p_ghe_id uuid` | `20260728170518_236204bd-a63e-4ec4-a5ba-0f3a59eaf1bc.sql` |
| `get_colaboradores_by_cargo` | `p_cargo_id uuid` | `20260728170518_236204bd-a63e-4ec4-a5ba-0f3a59eaf1bc.sql` |
| `get_colaboradores_seguro` | `p_company_id uuid, p_gestor_id uuid` | `20261027161000_gestor_colaboradores_department_view.sql` |
| `get_company_branding_by_email` | `p_email text` | `20261014160000_fix_security_grants_and_super_admin_policies.sql` |
| `get_company_branding_by_slug` | `p_slug text` | `20261014140000_whitelabel_login_branding.sql` |
| `get_company_users` | `p_company_id uuid` | `20261027140000_rpc_get_company_users.sql` |
| `get_cuidar_drilldown` | `p_company_id uuid` | `20261009174000_drilldown_atitudes.sql` |
| `get_cuidar_plus_by_token` | `p_token uuid` | `20251231094954_92e09133-5dc1-40cb-9561-2e97c82394f6.sql` |
| `get_cuidar_plus_resultados_agregados` | `p_dimensao text, p_months integer` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_dashboard_comunicados` | `p_limit integer` | `20260218162442_89d544c7-b981-4f6f-bcfb-fe0e1a7f52e7.sql` |
| `get_employee_pulse_history` | `p_employee_id uuid, p_limit integer` | `20261008132500_pulse_gestor_historico_fix.sql` |
| `get_employee_report_data` | `p_employee_id uuid, p_data_inicio date, p_data_fim date` | `20260921151500_get_employee_report_data_rpc.sql` |
| `get_espelho_responsavel` | `p_espelho_id uuid` | `20260716191955_6b287a19-1375-4c50-a525-659833fa06f8.sql` |
| `get_estrutura_organizacional` | `p_company_id uuid` | `20261008101500_estrutura_failclosed.sql` |
| `get_executive_report_data` | `p_company_id uuid, p_year integer, p_gestao_tecnica text, p_empresa_cliente text` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_executive_report_data` | `p_company_id uuid, p_year integer` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_feedback_cycle_by_token` | `p_token uuid` | `20260813163032_6f9eb218-fa9a-48fc-8d09-c7453763a792.sql` |
| `get_ghe_epis` | `p_ghe_id uuid` | `20260728170518_236204bd-a63e-4ec4-a5ba-0f3a59eaf1bc.sql` |
| `get_meus_espelhos_mensais` | `` | `20260608130638_878ce75e-7e3e-446d-b9c6-aaec3567bdf3.sql` |
| `get_meus_fechamentos_mensais` | `p_colaborador_id uuid` | `20260508174110_2dcc7613-79a1-4520-a3cf-228e6de31055.sql` |
| `get_my_colaborador_department` | `` | `20261028090000_fix_colaboradores_policy_recursion.sql` |
| `get_my_colaborador_id` | `` | `20260522185905_698e5321-9814-4285-9ea3-3d86ef31ff6b.sql` |
| `get_my_company_branding` | `p_company_id uuid` | `20261014150000_direct_company_branding.sql` |
| `get_my_company_id` | `` | `20261021180000_harden_desligamento_access_and_sessions.sql` |
| `get_my_pulse_campaign_history` | `` | `20260123220518_572b3a83-5bbf-4758-976d-1e9669fffb38.sql` |
| `get_my_role` | `` | `20261021190000_multi_role_active_role.sql` |
| `get_pending_pulse_respondents` | `p_company_id uuid` | `20260123193959_86868ca5-0a6b-4af5-a09c-ae8ffcb2102a.sql` |
| `get_plataforma_empresas` | `` | `20260813183809_7c4c7830-3446-4630-95dd-feb77bad88b3.sql` |
| `get_plataforma_metrics` | `` | `20261029160000_company_lifecycle_state_machine.sql` |
| `get_proart_ativacao_vigente` | `` | `20260623200716_fb85693e-550e-4ff5-b97d-205a61fdb6a4.sql` |
| `get_pulse_campaign_results` | `p_campaign_id uuid, p_department text, p_min_score integer, p_max_score integer, p_limit integer, p_offset integer` | `20261008103000_pulse_gestor_leitura.sql` |
| `get_pulse_campaign_stats` | `p_campaign_id uuid` | `20261008120000_pulse_gestor_escopo_fix.sql` |
| `get_pulse_colaboradores_list` | `p_company_id uuid, p_department text` | `20261008120000_pulse_gestor_escopo_fix.sql` |
| `get_pulse_comments` | `p_company_id uuid, p_year integer, p_week_number integer` | `20260121165958_d5306bc5-a280-49cd-bd28-5188237abad6.sql` |
| `get_pulse_dashboard` | `p_company_id uuid, p_year integer, p_weeks_back integer` | `20261008103000_pulse_gestor_leitura.sql` |
| `get_pulse_fiscalizacao` | `p_company_id uuid` | `20261008142000_pulse_fiscalizacao_admin.sql` |
| `get_pulse_trend_data` | `p_company_id uuid, p_months_back integer` | `20261007111323_audiencia_segmentada_pulse_campaigns.sql` |
| `get_questionario_para_colaborador` | `p_atribuicao_id uuid` | `20260804140736_c2f5d747-9fcf-4173-b05c-edbdd7fa3de0.sql` |
| `get_relatorio_absenteismo_v1` | `p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_relatorio_absenteismo_v1` | `p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text, p_empresa_cliente text` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_relatorio_jornada_v1` | `p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text, p_empresa_cliente text` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_relatorio_jornada_v1` | `p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text` | `20261007140300_fix_get_cuidar_plus_resultados_agregados.sql` |
| `get_saldos_para_fechamento` | `p_company_id uuid, p_periodo_inicio date, p_periodo_fim date` | `20260528230014_676421b2-fd31-4550-b78f-7cbd007e200c.sql` |
| `get_user_company_id` | `_user_id uuid` | `20261021180000_harden_desligamento_access_and_sessions.sql` |
| `get_user_notifications` | `p_limit integer` | `20260218163817_01f0aa12-5e61-4610-bbb9-9be0d6dc6dff.sql` |
| `get_user_role` | `_user_id uuid` | `20261021180000_harden_desligamento_access_and_sessions.sql` |
| `get_visible_modules` | `p_company_id uuid` | `20261016190000_etapa4_ciclo_b_remover_fallbacks_profiles.sql` |
| `handle_new_company_modules` | `` | `20261103180000_ponto_eletronico_default_disabled.sql` |
| `handle_new_user_role` | `` | `20251216135330_8a81b457-cca6-4958-9044-83f72d843f5e.sql` |
| `handle_sync_profile_user_company` | `` | `20261014120000_multiempresa_user_companies.sql` |
| `handle_sync_user_role_to_company` | `` | `20261027150000_fix_trigger_sync_user_roles_admin_guard.sql` |
| `has_company_access` | `_company_id uuid` | `20261021180000_harden_desligamento_access_and_sessions.sql` |
| `has_role` | `_user_id uuid, _role app_role` | `20261021180000_harden_desligamento_access_and_sessions.sql` |
| `is_admin_master` | `_user_id uuid` | `20261014160000_fix_security_grants_and_super_admin_policies.sql` |
| `is_dia_previsto` | `p_colaborador_id uuid, p_data date` | `20260521165114_4fb66c5a-066b-4135-9899-8a94b1579510.sql` |
| `is_module_enabled` | `p_company_id uuid, p_module_key text` | `20261013110000_company_modules.sql` |
| `is_periodo_fechado` | `p_colaborador_id uuid, p_data date` | `20260608130638_878ce75e-7e3e-446d-b9c6-aaec3567bdf3.sql` |
| `is_super_admin` | `_user_id uuid` | `20260813183809_7c4c7830-3446-4630-95dd-feb77bad88b3.sql` |
| `lgpd_can_manage` | `_company_id uuid, _require_admin_empresa boolean` | `20260813190210_dd0d21c0-318c-4756-a101-00fb87813f68.sql` |
| `listar_campanhas_ativas` | `` | `20260526164509_7b5eefa0-6c3a-4d2b-921e-02723560736f.sql` |
| `listar_denuncias_admin` | `` | `20260915204500_fix_listar_denuncias_admin_full_name.sql` |
| `marcar_ferias_gozadas` | `p_gozo_id uuid` | `20260507144711_87e7ee9d-5323-4f99-8f75-fdca420b59bb.sql` |
| `mark_admin_notification_read` | `p_id uuid` | `20260817203541_7623e02a-76e3-4311-9c0f-6665d25b8818.sql` |
| `mark_all_admin_notifications_read` | `` | `20260817203541_7623e02a-76e3-4311-9c0f-6665d25b8818.sql` |
| `mark_all_notifications_read` | `` | `20260218163817_01f0aa12-5e61-4610-bbb9-9be0d6dc6dff.sql` |
| `mark_notification_read` | `p_notification_id uuid` | `20260218163817_01f0aa12-5e61-4610-bbb9-9be0d6dc6dff.sql` |
| `max` | `citext` | `*Não mapeada em migrations/*` |
| `min` | `citext` | `*Não mapeada em migrations/*` |
| `minuto_epoch` | `ts timestamp with time zone` | `20260508135457_6fd5494e-dbdf-4afa-8ac1-1aca5f5a33b9.sql` |
| `move_to_dlq` | `source_queue text, dlq_name text, message_id bigint, payload jsonb` | `20261007223645_fix_rpc_search_path.sql` |
| `my_company_status` | `` | `20260813183838_6565152d-f593-4231-807f-923aedb31393.sql` |
| `normalizar_tipo_ponto_registro` | `` | `20260722193537_7d2ac224-a699-47fd-8c15-d616d01a453b.sql` |
| `notify_autoavaliacao_concluida_pdi` | `` | `20260218180253_df3cbdce-d03e-442d-8c9f-ea864318bbb3.sql` |
| `notify_avaliacao_criada` | `` | `20260218170004_e8064913-bad7-462e-8133-9e803be7fc14.sql` |
| `notify_new_contact_request` | `` | `20260817203541_7623e02a-76e3-4311-9c0f-6665d25b8818.sql` |
| `notify_questionario_atribuido` | `` | `20260804140736_c2f5d747-9fcf-4173-b05c-edbdd7fa3de0.sql` |
| `notify_questionario_status` | `` | `20260804140736_c2f5d747-9fcf-4173-b05c-edbdd7fa3de0.sql` |
| `nr1_assert_ghe_company` | `p_ghe_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_delete_risco_ghe` | `p_risco_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_get_matriz` | `p_company_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_get_matriz_config` | `p_company_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_get_matriz_por_ghe` | `p_ghe_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_save_matriz_config` | `p_company_id uuid, p_config jsonb` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_save_risco_ghe` | `p_ghe_id uuid, p_risco_data jsonb` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_sugerir_riscos` | `p_ghe_id uuid` | `20260805142538_4d24ac65-2df5-4a86-8479-9a8fd24aab55.sql` |
| `nr1_sync_psicossociais` | `p_avaliacao_id uuid` | `20260805142633_61c8dd2d-b0c4-4351-9855-274929ee66a2.sql` |
| `pgr_assert_documento_acesso` | `p_documento_id uuid` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pgr_confirmar_parse` | `p_importacao_id uuid, p_user_id uuid` | `20261016190000_etapa4_ciclo_b_remover_fallbacks_profiles.sql` |
| `pgr_criar_documento` | `p_company_id uuid` | `20260806181006_784e8db0-b93d-4d36-9a33-cb57165ccf7e.sql` |
| `pgr_get_dados_automaticos` | `p_documento_id uuid` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pgr_get_dados_psicossociais` | `p_documento_id uuid` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pgr_get_documento` | `p_documento_id uuid` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pgr_save_documento` | `p_documento_id uuid, p_titulo text, p_vigencia_inicio date, p_vigencia_fim date, p_cnae text, p_grau_risco text, p_endereco text, p_responsavel_tecnico jsonb, p_anexo_art_path text, p_updated_at timestamp with time zone` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pgr_save_risco_detalhe` | `p_risco_ghe_id uuid, p_detalhes jsonb` | `20260806184327_95a4a7df-6972-4e6d-b0f5-1f3cafa4ef7c.sql` |
| `pgr_save_secoes` | `p_documento_id uuid, p_secoes jsonb` | `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql` |
| `pick_periodo_aquisitivo_for_gozo` | `p_colaborador_id uuid, p_data_inicio_gozo date` | `20260521180807_c8ed1405-bc17-4c63-a29c-849f1c812046.sql` |
| `pode_acessar_modulo_ponto` | `` | `20260909160000_ponto_normalizar_regime_e_backfill.sql` |
| `ponto_registros_block_collab_changes` | `` | `20260629133539_a4f67814-8e04-49b3-9625-9bcaa01cc067.sql` |
| `prevent_lifecycle_events_modification` | `` | `20261029160000_company_lifecycle_state_machine.sql` |
| `psico_assert_editavel` | `p_instrumento_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_atribuir_colaboradores` | `p_avaliacao_id uuid, p_colaborador_ids uuid[]` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_criar_avaliacao` | `p_titulo text, p_instrumento_id uuid, p_data_inicio date, p_data_fim date, p_ghe_ids uuid[], p_modo_anonimato boolean` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_delete_dimensao` | `p_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_delete_pergunta` | `p_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_duplicar_instrumento` | `p_instrumento_id uuid, p_novo_nome text` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_gerar_planos` | `p_avaliacao_id uuid, p_agrupamento text` | `20260805131319_09af5ad3-bf41-47f8-b1c0-9881de20b0f7.sql` |
| `psico_get_acompanhamento` | `p_avaliacao_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_get_avaliacoes` | `` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_get_heatmap` | `p_avaliacao_id uuid, p_agrupamento text` | `20260805131319_09af5ad3-bf41-47f8-b1c0-9881de20b0f7.sql` |
| `psico_get_instrumento_completo` | `p_instrumento_id uuid` | `20260805131319_09af5ad3-bf41-47f8-b1c0-9881de20b0f7.sql` |
| `psico_get_instrumentos` | `` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_get_questionario` | `p_atribuicao_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_get_resultados_gerais` | `p_avaliacao_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_instrumento_em_uso` | `_instrumento_id uuid` | `20260805124530_3d7445fe-480f-42f7-b49d-6f2ca18bcb79.sql` |
| `psico_is_rh` | `` | `20260805124530_3d7445fe-480f-42f7-b49d-6f2ca18bcb79.sql` |
| `psico_minhas_avaliacoes` | `` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_notify_atribuicao` | `` | `20260805124530_3d7445fe-480f-42f7-b49d-6f2ca18bcb79.sql` |
| `psico_notify_preenchido` | `` | `20260805124530_3d7445fe-480f-42f7-b49d-6f2ca18bcb79.sql` |
| `psico_reabrir_questionario` | `p_atribuicao_id uuid` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_reordenar_perguntas` | `p_instrumento_id uuid, p_ids uuid[]` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_save_dimensao` | `p_id uuid, p_instrumento_id uuid, p_nome text, p_tipo text, p_descricao text, p_ordem integer, p_corte_medio numeric, p_corte_alto numeric` | `20260805131319_09af5ad3-bf41-47f8-b1c0-9881de20b0f7.sql` |
| `psico_save_dimensao` | `p_id uuid, p_instrumento_id uuid, p_nome text, p_tipo text, p_descricao text, p_ordem integer` | `20260805131319_09af5ad3-bf41-47f8-b1c0-9881de20b0f7.sql` |
| `psico_save_instrumento` | `p_id uuid, p_nome text, p_versao text, p_descricao text, p_referencia text, p_ativo boolean` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_save_pergunta` | `p_id uuid, p_instrumento_id uuid, p_dimensao_id uuid, p_texto text, p_tipo_escala text, p_inverter boolean, p_ordem integer` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_save_rascunho` | `p_atribuicao_id uuid, p_rascunho jsonb` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `psico_save_respostas` | `p_atribuicao_id uuid, p_respostas jsonb` | `20260805125126_d2045c4f-22b2-46af-a440-3e39c73745d7.sql` |
| `reabrir_espelho_mensal` | `p_espelho_id uuid, p_motivo text` | `20260608130638_878ce75e-7e3e-446d-b9c6-aaec3567bdf3.sql` |
| `reabrir_periodo_ponto` | `p_fechamento_id uuid, p_motivo text` | `20260508182642_e5ff8984-b264-4c4c-85fc-2f68919e0dde.sql` |
| `reabrir_periodo_ponto_massa` | `p_company_id uuid, p_periodo_inicio date, p_periodo_fim date, p_motivo text` | `20260508182642_e5ff8984-b264-4c4c-85fc-2f68919e0dde.sql` |
| `reabrir_questionario` | `p_atribuicao_id uuid` | `20260804140736_c2f5d747-9fcf-4173-b05c-edbdd7fa3de0.sql` |
| `read_email_batch` | `queue_name text, batch_size integer, vt integer` | `20261007223645_fix_rpc_search_path.sql` |
| `reaplicar_abonos_dia` | `p_colab uuid, p_data date` | `20260716175308_b82b9dc6-223c-4e0a-b5f4-f17a0700bbcd.sql` |
| `recalcular_insights_cuidar` | `p_company_id uuid, p_escopo text, p_ano integer, p_semana integer, p_mes integer` | `20260520194604_9f92d88b-7774-4e13-90b1-b37fc514b066.sql` |
| `recalcular_resumo_diario` | `p_colaborador_id uuid, p_data date` | `20260724191820_904251e1-08c3-4d1a-b20f-32258ca8de6b.sql` |
| `recalcular_vinculacao_gozos` | `p_colaborador_id uuid` | `20260521180807_c8ed1405-bc17-4c63-a29c-849f1c812046.sql` |
| `recusar_ferias_gozo` | `p_gozo_id uuid, p_motivo text` | `20261027160000_gestor_aprovar_ferias_policy.sql` |
| `regexp_match` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `regexp_match` | `citext, citext` | `*Não mapeada em migrations/*` |
| `regexp_matches` | `citext, citext` | `*Não mapeada em migrations/*` |
| `regexp_matches` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `regexp_replace` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `regexp_replace` | `citext, citext, text, text` | `*Não mapeada em migrations/*` |
| `regexp_split_to_array` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `regexp_split_to_array` | `citext, citext` | `*Não mapeada em migrations/*` |
| `regexp_split_to_table` | `citext, citext` | `*Não mapeada em migrations/*` |
| `regexp_split_to_table` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `registrar_acao_alerta` | `p_alerta_id uuid, p_acao text, p_novo_status text` | `20260520204958_0ed11acc-a582-423b-bb90-825c6780af86.sql` |
| `registrar_leitura_campanha` | `p_campanha_id uuid, p_user_id uuid` | `20260528114631_52e77dc4-b8b4-4cf5-82aa-b9cd4812d494.sql` |
| `registrar_leitura_comunicado` | `p_comunicado_id uuid, p_user_id uuid` | `20260528113354_69db13f9-483d-48da-ab19-6c822883e214.sql` |
| `registrar_promocao` | `p_colaborador_id uuid, p_company_id uuid, p_data_promocao date, p_cargo_novo text, p_salario_novo numeric, p_nivel_novo text, p_departamento_novo text, p_motivo text, p_aprovado_por text, p_observacoes text` | `20260225142217_fdeafda1-fd1d-4dcd-8596-9a5179a714c7.sql` |
| `registrar_tratativa_fechamento` | `p_company_id uuid, p_colaborador_id uuid, p_periodo_inicio date, p_periodo_fim date, p_acao tratativa_saldo_acao, p_observacao text` | `20260602141931_2bbe0f24-3fb5-4d8c-9200-55d7fa739b72.sql` |
| `relatorio_leituras_campanha` | `p_campanha_id uuid` | `20260623171635_b247b153-2e88-4f55-ac4d-14cab08ab1c8.sql` |
| `relatorio_leituras_comunicado` | `p_comunicado_id uuid` | `20260623171635_b247b153-2e88-4f55-ac4d-14cab08ab1c8.sql` |
| `replace` | `citext, citext, citext` | `*Não mapeada em migrations/*` |
| `replicate_beneficios_to_all_companies` | `p_source_company_id uuid` | `20260525133743_d5f56a50-7c15-4561-8664-1e716baa4c75.sql` |
| `replicate_ciclo_avaliacao` | `p_source_ciclo_id uuid, p_source_company_id uuid, p_target_company_ids uuid[]` | `20261013110000_company_modules.sql` |
| `replicate_ciclo_avaliacao` | `p_ciclo_id uuid, p_source_company_id uuid` | `20261013110000_company_modules.sql` |
| `replicate_comunicado` | `p_comunicado_id uuid, p_source_company_id uuid` | `20260129121552_ab13249c-4e75-4050-aece-39a665fd29a1.sql` |
| `replicate_cuidar_conteudo_to_all` | `p_id uuid` | `20260526130823_42de814b-8e5b-45d8-b7f9-bfb667c26980.sql` |
| `replicate_pulse_campaign` | `p_campaign_id uuid, p_source_company_id uuid` | `20261013110000_company_modules.sql` |
| `replicate_pulse_campaign` | `p_source_campaign_id uuid, p_source_company_id uuid, p_target_company_ids uuid[]` | `20261013110000_company_modules.sql` |
| `replicate_questionario_cuidar_plus` | `p_questionario_id uuid, p_source_company_id uuid` | `20260129121552_ab13249c-4e75-4050-aece-39a665fd29a1.sql` |
| `replicate_questionnaire_template` | `p_template_id uuid, p_source_company_id uuid` | `20260320163530_ae6072e6-3bfc-4294-8e8f-d969a83f48a6.sql` |
| `require_admin_role` | `` | `*Não mapeada em migrations/*` |
| `resolve_feedback_template` | `p_company_id uuid, p_milestone milestone_type, p_respondent respondent_type` | `20260813163032_6f9eb218-fa9a-48fc-8d09-c7453763a792.sql` |
| `revoke_consent` | `p_collaborator_id uuid, p_consent_type text, p_grant boolean` | `20260813190210_dd0d21c0-318c-4756-a101-00fb87813f68.sql` |
| `search_cbo` | `p_termo text` | `20260728170518_236204bd-a63e-4ec4-a5ba-0f3a59eaf1bc.sql` |
| `seed_tipos_abono_nova_empresa` | `` | `20260508115555_3a5e8ea2-403f-49e1-8676-e232eeaf4e53.sql` |
| `set_active_company` | `p_company_id uuid` | `20261021200000_set_active_company_reset_role.sql` |
| `set_active_role` | `p_role app_role` | `20261021190000_multi_role_active_role.sql` |
| `set_proart_ativacao_company_id` | `` | `20260623200716_fb85693e-550e-4ff5-b97d-205a61fdb6a4.sql` |
| `set_proart_company_id` | `` | `20260623192131_5c2fc4e9-3560-4ba7-b022-a9d98da2e055.sql` |
| `sincronizar_claim_company_id` | `` | `20260909150000_backfill_company_claims_and_rpc.sql` |
| `sincronizar_pgr_acoes` | `p_importacao_id uuid` | `20260910_pgr_sync_acoes.sql` |
| `split_part` | `citext, citext, integer` | `*Não mapeada em migrations/*` |
| `strpos` | `citext, citext` | `*Não mapeada em migrations/*` |
| `submit_avaliacao_responses` | `p_token text, p_respostas_competencias json, p_respostas_objetivos json, p_finalizar boolean` | `20260111002234_5d6a0fde-d583-4d97-9a76-fe292eb0f2bc.sql` |
| `submit_cuidar_plus_responses` | `p_token uuid, p_respostas jsonb, p_deseja_contato boolean` | `20251231094954_92e09133-5dc1-40cb-9561-2e97c82394f6.sql` |
| `submit_feedback_responses` | `p_token uuid, p_responses jsonb` | `20251216182537_6e15781b-bbd4-4b46-a70d-7871927711dc.sql` |
| `submit_pulse_campaign_response` | `p_campaign_id uuid, p_responses jsonb, p_comentario text, p_esfera text` | `20260526144225_c300f685-a94b-4dd0-9d33-f448ad018d81.sql` |
| `suspender_empresa` | `_company_id uuid, _ativar boolean, _ip text` | `20260813183809_7c4c7830-3446-4630-95dd-feb77bad88b3.sql` |
| `sync_colaborador_cargo` | `` | `20261021150000_sync_colaborador_cargo_department.sql` |
| `sync_metricas_valores` | `` | `20260111002234_5d6a0fde-d583-4d97-9a76-fe292eb0f2bc.sql` |
| `sync_profile_is_active` | `` | `20261021190000_multi_role_active_role.sql` |
| `texticlike` | `citext, text` | `*Não mapeada em migrations/*` |
| `texticlike` | `citext, citext` | `*Não mapeada em migrations/*` |
| `texticnlike` | `citext, citext` | `*Não mapeada em migrations/*` |
| `texticnlike` | `citext, text` | `*Não mapeada em migrations/*` |
| `texticregexeq` | `citext, text` | `*Não mapeada em migrations/*` |
| `texticregexeq` | `citext, citext` | `*Não mapeada em migrations/*` |
| `texticregexne` | `citext, citext` | `*Não mapeada em migrations/*` |
| `texticregexne` | `citext, text` | `*Não mapeada em migrations/*` |
| `tg_ferias_gozo_auto_periodo` | `` | `20260521180807_c8ed1405-bc17-4c63-a29c-849f1c812046.sql` |
| `transferir_colaborador` | `p_colaborador_id uuid, p_empresa_destino_id uuid, p_motivo text` | `20260623140641_57b96aa4-a51e-4b05-a71d-596d5539a34d.sql` |
| `transition_company_lifecycle` | `_company_id uuid, _target_status text, _reason text` | `20261029160000_company_lifecycle_state_machine.sql` |
| `translate` | `citext, citext, text` | `*Não mapeada em migrations/*` |
| `trg_auto_link_colaborador_user` | `` | `20261021220000_guard_inteligente_vinculacao.sql` |
| `trg_notificar_nova_denuncia` | `` | `20260915205500_trigger_notificar_nova_denuncia.sql` |
| `trg_pulse_acompanhamento_status` | `` | `20261008135500_pulse_gestor_ciclo2_3.sql` |
| `trg_recalc_resumo_cfg` | `` | `20260722203001_1d1aa583-3a7e-4a36-9cb7-6af4f491a033.sql` |
| `trg_recalc_resumo_colab` | `` | `20260722203001_1d1aa583-3a7e-4a36-9cb7-6af4f491a033.sql` |
| `trg_recalc_resumo_ponto` | `` | `20260508135457_6fd5494e-dbdf-4afa-8ac1-1aca5f5a33b9.sql` |
| `trg_recalc_resumo_ws` | `` | `20260722203001_1d1aa583-3a7e-4a36-9cb7-6af4f491a033.sql` |
| `trigger_pulse_acompanhamento_critico` | `` | `20261008135500_pulse_gestor_ciclo2_3.sql` |
| `update_updated_at_column` | `` | `20260122174238_d234396b-abe4-45de-8d74-e76597e73d60.sql` |
| `validar_sequencia_ponto` | `` | `20260722193537_7d2ac224-a699-47fd-8c15-d616d01a453b.sql` |
| `validate_campanha_datas` | `` | `20260525144327_c1153855-fcf8-4054-a08c-cff333eac1ae.sql` |
| `validate_certificate` | `p_code text` | `20260120213726_7133b9f3-6870-45e5-bd2a-3f73daf2b485.sql` |
| `validate_colaborador_ferias_legado` | `` | `20260521123223_43d0c355-4c92-453a-8a24-450f6b6a27e0.sql` |
| `validate_faixas_hora_extra` | `` | `20260521162214_77a5504d-ee27-42bc-87f2-7166e53f50ee.sql` |
| `validate_horarios_por_dia` | `` | `20260521163513_7e2ed637-82bd-45aa-aa6f-175d2146ff76.sql` |
| `validate_notification_priority` | `` | `20260218163817_01f0aa12-5e61-4610-bbb9-9be0d6dc6dff.sql` |
