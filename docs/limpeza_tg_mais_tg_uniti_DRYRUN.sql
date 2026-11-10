-- DRY-RUN: este script NÃO altera dados. Termina com ROLLBACK.
-- ============================================================================
-- SCRIPT DE LIMPEZA INTEGRAL DAS EMPRESAS LEGADAS (TG MAIS e TG UNITI)
-- SISTEMA NR1COMPROVA - BANCO DE PRODUÇÃO SUPABASE
-- DATA DE CRIAÇÃO: 13/10/2026
-- VERSÃO: 1.1 (COM INCLUSÃO EXPLICITA DO MÓDULO PSICO: RESPOSTAS, ATRIBUIÇÕES, GHES)
-- 
-- OBJETIVO:
--   Remover com segurança estrita todos os dados das empresas:
--     1) TG MAIS SERVIÇOS DE TECNOLOGIA E RH LTDA (b496582a-fe27-4131-a6fc-bc540f470100)
--     2) TG UNITI SERVIÇOS LTDA (fcdfc7aa-f768-4547-82eb-a8bf583ff756)
--   
-- SALVAGUARDAS RÍGIDAS DESTE SCRIPT:
--   - Transação atômica única (BEGIN / ROLLBACK).
--   - Preservação TOTAL e INEGOCIÁVEL da empresa piloto ativa:
--       Horizonte Contabilidade (8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4).
--   - Preservação TOTAL de catálogos e sementes globais (AND company_id IS NOT NULL).
--   - Zero uso de DROP TABLE ou TRUNCATE. Todo DELETE possui cláusula WHERE estrita.
--   - Verificação com SELECT count(*) pré e pós em CADA UMA das etapas.
--   - Remoção posterior de vínculos das 25 contas legadas em auth.users.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ETAPA 0: PROVA DE INTEGRIDADE PRÉVIA E DESVINCULAÇÃO DE AUTO-REFERÊNCIAS
-- ============================================================================

-- Verificação da Piloto Ativa (Horizonte Contabilidade) antes de qualquer alteração
SELECT 'HORIZONTE_PRE_STATUS' AS ponto_de_controle, count(*) AS empresas_ativas 
FROM public.companies 
WHERE id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' AND status = 'active';

SELECT 'HORIZONTE_PRE_COLABORADORES' AS ponto_de_controle, count(*) AS total_colaboradores 
FROM public.colaboradores 
WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

-- Desvinculação de auto-referências e relacionamentos circulares nas empresas legadas
-- para evitar que um registro impeça a deleção de seu superior hierárquico
UPDATE public.departamentos 
SET responsavel_id = NULL 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

UPDATE public.colaboradores 
SET gestor_id = NULL, substituicao_colaborador_id = NULL 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 1: public.certificates_audit_logs [INDIRECT]
-- ============================================================================
SELECT 'PRE_certificates_audit_logs' AS etapa, count(*) AS registros_alvo 
FROM public."certificates_audit_logs" 
WHERE certificate_id IN (SELECT id FROM public.certificates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."certificates_audit_logs" 
WHERE certificate_id IN (SELECT id FROM public.certificates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_certificates_audit_logs' AS etapa, count(*) AS registros_remanescentes 
FROM public."certificates_audit_logs" 
WHERE certificate_id IN (SELECT id FROM public.certificates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 2: public.certificates [DIRECT]
-- ============================================================================
SELECT 'PRE_certificates' AS etapa, count(*) AS registros_alvo 
FROM public."certificates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."certificates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_certificates' AS etapa, count(*) AS registros_remanescentes 
FROM public."certificates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 3: public.pulse_access_logs [INDIRECT]
-- ============================================================================
SELECT 'PRE_pulse_access_logs' AS etapa, count(*) AS registros_alvo 
FROM public."pulse_access_logs" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pulse_access_logs" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pulse_access_logs' AS etapa, count(*) AS registros_remanescentes 
FROM public."pulse_access_logs" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 4: public.pulse_responses [INDIRECT]
-- ============================================================================
SELECT 'PRE_pulse_responses' AS etapa, count(*) AS registros_alvo 
FROM public."pulse_responses" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pulse_responses" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pulse_responses' AS etapa, count(*) AS registros_remanescentes 
FROM public."pulse_responses" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 5: public.pulse_campaigns_alvos [INDIRECT]
-- ============================================================================
SELECT 'PRE_pulse_campaigns_alvos' AS etapa, count(*) AS registros_alvo 
FROM public."pulse_campaigns_alvos" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pulse_campaigns_alvos" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pulse_campaigns_alvos' AS etapa, count(*) AS registros_remanescentes 
FROM public."pulse_campaigns_alvos" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 6: public.pulse_questions [INDIRECT]
-- ============================================================================
SELECT 'PRE_pulse_questions' AS etapa, count(*) AS registros_alvo 
FROM public."pulse_questions" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pulse_questions" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pulse_questions' AS etapa, count(*) AS registros_remanescentes 
FROM public."pulse_questions" 
WHERE campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 7: public.treinamento_logs_acesso [INDIRECT]
-- ============================================================================
SELECT 'PRE_treinamento_logs_acesso' AS etapa, count(*) AS registros_alvo 
FROM public."treinamento_logs_acesso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."treinamento_logs_acesso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_treinamento_logs_acesso' AS etapa, count(*) AS registros_remanescentes 
FROM public."treinamento_logs_acesso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 8: public.treinamento_progresso [INDIRECT]
-- ============================================================================
SELECT 'PRE_treinamento_progresso' AS etapa, count(*) AS registros_alvo 
FROM public."treinamento_progresso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."treinamento_progresso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_treinamento_progresso' AS etapa, count(*) AS registros_remanescentes 
FROM public."treinamento_progresso" 
WHERE treinamento_id IN (SELECT id FROM public.treinamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 9: public.banco_horas_fechamentos_auditoria [INDIRECT]
-- ============================================================================
SELECT 'PRE_banco_horas_fechamentos_auditoria' AS etapa, count(*) AS registros_alvo 
FROM public."banco_horas_fechamentos_auditoria" 
WHERE fechamento_id IN (SELECT id FROM public.banco_horas_fechamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."banco_horas_fechamentos_auditoria" 
WHERE fechamento_id IN (SELECT id FROM public.banco_horas_fechamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_banco_horas_fechamentos_auditoria' AS etapa, count(*) AS registros_remanescentes 
FROM public."banco_horas_fechamentos_auditoria" 
WHERE fechamento_id IN (SELECT id FROM public.banco_horas_fechamentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 10: public.espelhos_ponto_mensais [DIRECT]
-- ============================================================================
SELECT 'PRE_espelhos_ponto_mensais' AS etapa, count(*) AS registros_alvo 
FROM public."espelhos_ponto_mensais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."espelhos_ponto_mensais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_espelhos_ponto_mensais' AS etapa, count(*) AS registros_remanescentes 
FROM public."espelhos_ponto_mensais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 11: public.ponto_fechamento_tratativas [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_ponto_fechamento_tratativas' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_fechamento_tratativas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_fechamento_tratativas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_fechamento_tratativas' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_fechamento_tratativas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 12: public.banco_horas_fechamentos [DIRECT]
-- ============================================================================
SELECT 'PRE_banco_horas_fechamentos' AS etapa, count(*) AS registros_alvo 
FROM public."banco_horas_fechamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."banco_horas_fechamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_banco_horas_fechamentos' AS etapa, count(*) AS registros_remanescentes 
FROM public."banco_horas_fechamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 13: public.ponto_registros [DIRECT]
-- ============================================================================
SELECT 'PRE_ponto_registros' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_registros" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_registros" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_registros' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_registros" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 14: public.ponto_resumo_diario [DIRECT]
-- ============================================================================
SELECT 'PRE_ponto_resumo_diario' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_resumo_diario" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_resumo_diario" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_resumo_diario' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_resumo_diario" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 15: public.ponto_abonos [DIRECT]
-- ============================================================================
SELECT 'PRE_ponto_abonos' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_abonos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_abonos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_abonos' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_abonos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 16: public.ferias_gozo [DIRECT]
-- ============================================================================
SELECT 'PRE_ferias_gozo' AS etapa, count(*) AS registros_alvo 
FROM public."ferias_gozo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ferias_gozo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ferias_gozo' AS etapa, count(*) AS registros_remanescentes 
FROM public."ferias_gozo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 17: public.ferias_periodos_aquisitivos [DIRECT]
-- ============================================================================
SELECT 'PRE_ferias_periodos_aquisitivos' AS etapa, count(*) AS registros_alvo 
FROM public."ferias_periodos_aquisitivos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ferias_periodos_aquisitivos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ferias_periodos_aquisitivos' AS etapa, count(*) AS registros_remanescentes 
FROM public."ferias_periodos_aquisitivos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 18: public.promocoes_colaborador [DIRECT]
-- ============================================================================
SELECT 'PRE_promocoes_colaborador' AS etapa, count(*) AS registros_alvo 
FROM public."promocoes_colaborador" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."promocoes_colaborador" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_promocoes_colaborador' AS etapa, count(*) AS registros_remanescentes 
FROM public."promocoes_colaborador" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 19: public.desligamentos_colaborador [INDIRECT]
-- ============================================================================
SELECT 'PRE_desligamentos_colaborador' AS etapa, count(*) AS registros_alvo 
FROM public."desligamentos_colaborador" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."desligamentos_colaborador" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_desligamentos_colaborador' AS etapa, count(*) AS registros_remanescentes 
FROM public."desligamentos_colaborador" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 20: public.colaborador_beneficios [INDIRECT]
-- ============================================================================
SELECT 'PRE_colaborador_beneficios' AS etapa, count(*) AS registros_alvo 
FROM public."colaborador_beneficios" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."colaborador_beneficios" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_colaborador_beneficios' AS etapa, count(*) AS registros_remanescentes 
FROM public."colaborador_beneficios" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 21: public.beneficios_materiais [INDIRECT]
-- ============================================================================
SELECT 'PRE_beneficios_materiais' AS etapa, count(*) AS registros_alvo 
FROM public."beneficios_materiais" 
WHERE beneficio_id IN (SELECT id FROM public.beneficios WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."beneficios_materiais" 
WHERE beneficio_id IN (SELECT id FROM public.beneficios WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_beneficios_materiais' AS etapa, count(*) AS registros_remanescentes 
FROM public."beneficios_materiais" 
WHERE beneficio_id IN (SELECT id FROM public.beneficios WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 22: public.dependentes [INDIRECT]
-- ============================================================================
SELECT 'PRE_dependentes' AS etapa, count(*) AS registros_alvo 
FROM public."dependentes" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."dependentes" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_dependentes' AS etapa, count(*) AS registros_remanescentes 
FROM public."dependentes" 
WHERE colaborador_id IN (SELECT id FROM public.colaboradores WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 23: public.collaborator_consents [DIRECT]
-- ============================================================================
SELECT 'PRE_collaborator_consents' AS etapa, count(*) AS registros_alvo 
FROM public."collaborator_consents" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."collaborator_consents" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_collaborator_consents' AS etapa, count(*) AS registros_remanescentes 
FROM public."collaborator_consents" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 24: public.feedbacks_colaboradores [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_feedbacks_colaboradores' AS etapa, count(*) AS registros_alvo 
FROM public."feedbacks_colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."feedbacks_colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_feedbacks_colaboradores' AS etapa, count(*) AS registros_remanescentes 
FROM public."feedbacks_colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 25: public.feedback_responses [INDIRECT]
-- ============================================================================
SELECT 'PRE_feedback_responses' AS etapa, count(*) AS registros_alvo 
FROM public."feedback_responses" 
WHERE feedback_cycle_id IN (SELECT id FROM public.feedback_cycles WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."feedback_responses" 
WHERE feedback_cycle_id IN (SELECT id FROM public.feedback_cycles WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_feedback_responses' AS etapa, count(*) AS registros_remanescentes 
FROM public."feedback_responses" 
WHERE feedback_cycle_id IN (SELECT id FROM public.feedback_cycles WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 26: public.feedback_cycles [DIRECT]
-- ============================================================================
SELECT 'PRE_feedback_cycles' AS etapa, count(*) AS registros_alvo 
FROM public."feedback_cycles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."feedback_cycles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_feedback_cycles' AS etapa, count(*) AS registros_remanescentes 
FROM public."feedback_cycles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 27: public.questions [INDIRECT]
-- ============================================================================
SELECT 'PRE_questions' AS etapa, count(*) AS registros_alvo 
FROM public."questions" 
WHERE questionnaire_template_id IN (SELECT id FROM public.questionnaire_templates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL);

DELETE FROM public."questions" 
WHERE questionnaire_template_id IN (SELECT id FROM public.questionnaire_templates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL);

SELECT 'POS_questions' AS etapa, count(*) AS registros_remanescentes 
FROM public."questions" 
WHERE questionnaire_template_id IN (SELECT id FROM public.questionnaire_templates WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL);

-- ============================================================================
-- ETAPA 28: public.questionnaire_templates [HYBRID]
-- ============================================================================
SELECT 'PRE_questionnaire_templates' AS etapa, count(*) AS registros_alvo 
FROM public."questionnaire_templates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

DELETE FROM public."questionnaire_templates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

SELECT 'POS_questionnaire_templates' AS etapa, count(*) AS registros_remanescentes 
FROM public."questionnaire_templates" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

-- ============================================================================
-- ETAPA 29: public.questionario_modelos [DIRECT]
-- ============================================================================
SELECT 'PRE_questionario_modelos' AS etapa, count(*) AS registros_alvo 
FROM public."questionario_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."questionario_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_questionario_modelos' AS etapa, count(*) AS registros_remanescentes 
FROM public."questionario_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 30: public.comunicados_anexos [INDIRECT]
-- ============================================================================
SELECT 'PRE_comunicados_anexos' AS etapa, count(*) AS registros_alvo 
FROM public."comunicados_anexos" 
WHERE comunicado_id IN (SELECT id FROM public.comunicados WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."comunicados_anexos" 
WHERE comunicado_id IN (SELECT id FROM public.comunicados WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_comunicados_anexos' AS etapa, count(*) AS registros_remanescentes 
FROM public."comunicados_anexos" 
WHERE comunicado_id IN (SELECT id FROM public.comunicados WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 31: public.campanha_leituras [DIRECT]
-- ============================================================================
SELECT 'PRE_campanha_leituras' AS etapa, count(*) AS registros_alvo 
FROM public."campanha_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."campanha_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_campanha_leituras' AS etapa, count(*) AS registros_remanescentes 
FROM public."campanha_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 32: public.comunicado_leituras [DIRECT]
-- ============================================================================
SELECT 'PRE_comunicado_leituras' AS etapa, count(*) AS registros_alvo 
FROM public."comunicado_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."comunicado_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_comunicado_leituras' AS etapa, count(*) AS registros_remanescentes 
FROM public."comunicado_leituras" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 33: public.acesso_colaborador_audit [DIRECT]
-- ============================================================================
SELECT 'PRE_acesso_colaborador_audit' AS etapa, count(*) AS registros_alvo 
FROM public."acesso_colaborador_audit" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."acesso_colaborador_audit" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_acesso_colaborador_audit' AS etapa, count(*) AS registros_remanescentes 
FROM public."acesso_colaborador_audit" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 34: public.pgr_risco_detalhes [INDIRECT]
-- ============================================================================
SELECT 'PRE_pgr_risco_detalhes' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_risco_detalhes" 
WHERE risco_ghe_id IN (SELECT id FROM public.nr1_ghe_riscos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pgr_risco_detalhes" 
WHERE risco_ghe_id IN (SELECT id FROM public.nr1_ghe_riscos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pgr_risco_detalhes' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_risco_detalhes" 
WHERE risco_ghe_id IN (SELECT id FROM public.nr1_ghe_riscos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 35: public.pgr_secoes [INDIRECT]
-- ============================================================================
SELECT 'PRE_pgr_secoes' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_secoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pgr_secoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pgr_secoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_secoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 36: public.pgr_psicossocial_dominios [INDIRECT]
-- ============================================================================
SELECT 'PRE_pgr_psicossocial_dominios' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_psicossocial_dominios" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pgr_psicossocial_dominios" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pgr_psicossocial_dominios' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_psicossocial_dominios" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 37: public.pgr_relatorio_evidencias [DIRECT]
-- ============================================================================
SELECT 'PRE_pgr_relatorio_evidencias' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_relatorio_evidencias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."pgr_relatorio_evidencias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_pgr_relatorio_evidencias' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_relatorio_evidencias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 38: public.pgr_acao_execucoes [DIRECT]
-- ============================================================================
SELECT 'PRE_pgr_acao_execucoes' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_acao_execucoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."pgr_acao_execucoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_pgr_acao_execucoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_acao_execucoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 39: public.pgr_alteracoes [INDIRECT]
-- ============================================================================
SELECT 'PRE_pgr_alteracoes' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_alteracoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."pgr_alteracoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_pgr_alteracoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_alteracoes" 
WHERE documento_id IN (SELECT id FROM public.pgr_documentos WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 40: public.pgr_documentos [DIRECT]
-- ============================================================================
SELECT 'PRE_pgr_documentos' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_documentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."pgr_documentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_pgr_documentos' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_documentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 41: public.pgr_importacoes [DIRECT]
-- ============================================================================
SELECT 'PRE_pgr_importacoes' AS etapa, count(*) AS registros_alvo 
FROM public."pgr_importacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."pgr_importacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_pgr_importacoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."pgr_importacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 42: public.cuidar_alertas [DIRECT]
-- ============================================================================
SELECT 'PRE_cuidar_alertas' AS etapa, count(*) AS registros_alvo 
FROM public."cuidar_alertas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cuidar_alertas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cuidar_alertas' AS etapa, count(*) AS registros_remanescentes 
FROM public."cuidar_alertas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 43: public.cuidar_badges [DIRECT]
-- ============================================================================
SELECT 'PRE_cuidar_badges' AS etapa, count(*) AS registros_alvo 
FROM public."cuidar_badges" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cuidar_badges" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cuidar_badges' AS etapa, count(*) AS registros_remanescentes 
FROM public."cuidar_badges" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 44: public.cuidar_insights [DIRECT]
-- ============================================================================
SELECT 'PRE_cuidar_insights' AS etapa, count(*) AS registros_alvo 
FROM public."cuidar_insights" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cuidar_insights" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cuidar_insights' AS etapa, count(*) AS registros_remanescentes 
FROM public."cuidar_insights" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 45: public.cuidar_progressao [DIRECT]
-- ============================================================================
SELECT 'PRE_cuidar_progressao' AS etapa, count(*) AS registros_alvo 
FROM public."cuidar_progressao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cuidar_progressao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cuidar_progressao' AS etapa, count(*) AS registros_remanescentes 
FROM public."cuidar_progressao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 46: public.cuidar_recomendacoes [DIRECT]
-- ============================================================================
SELECT 'PRE_cuidar_recomendacoes' AS etapa, count(*) AS registros_alvo 
FROM public."cuidar_recomendacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cuidar_recomendacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cuidar_recomendacoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."cuidar_recomendacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 47: public.pulse_campaigns [DIRECT]
-- ============================================================================
SELECT 'PRE_pulse_campaigns' AS etapa, count(*) AS registros_alvo 
FROM public."pulse_campaigns" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."pulse_campaigns" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_pulse_campaigns' AS etapa, count(*) AS registros_remanescentes 
FROM public."pulse_campaigns" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 48: public.campanhas_comunicados [DIRECT]
-- ============================================================================
SELECT 'PRE_campanhas_comunicados' AS etapa, count(*) AS registros_alvo 
FROM public."campanhas_comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."campanhas_comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_campanhas_comunicados' AS etapa, count(*) AS registros_remanescentes 
FROM public."campanhas_comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 49: public.comunicados [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_comunicados' AS etapa, count(*) AS registros_alvo 
FROM public."comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_comunicados' AS etapa, count(*) AS registros_remanescentes 
FROM public."comunicados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 50: public.treinamentos [DIRECT]
-- ============================================================================
SELECT 'PRE_treinamentos' AS etapa, count(*) AS registros_alvo 
FROM public."treinamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."treinamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_treinamentos' AS etapa, count(*) AS registros_remanescentes 
FROM public."treinamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 51: public.categorias_treinamento [DIRECT]
-- ============================================================================
SELECT 'PRE_categorias_treinamento' AS etapa, count(*) AS registros_alvo 
FROM public."categorias_treinamento" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."categorias_treinamento" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_categorias_treinamento' AS etapa, count(*) AS registros_remanescentes 
FROM public."categorias_treinamento" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 52: public.beneficios_tipo_contrato [DIRECT]
-- ============================================================================
SELECT 'PRE_beneficios_tipo_contrato' AS etapa, count(*) AS registros_alvo 
FROM public."beneficios_tipo_contrato" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."beneficios_tipo_contrato" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_beneficios_tipo_contrato' AS etapa, count(*) AS registros_remanescentes 
FROM public."beneficios_tipo_contrato" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 53: public.beneficios [DIRECT]
-- ============================================================================
SELECT 'PRE_beneficios' AS etapa, count(*) AS registros_alvo 
FROM public."beneficios" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."beneficios" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_beneficios' AS etapa, count(*) AS registros_remanescentes 
FROM public."beneficios" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 54: public.denuncias [DIRECT]
-- ============================================================================
SELECT 'PRE_denuncias' AS etapa, count(*) AS registros_alvo 
FROM public."denuncias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."denuncias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_denuncias' AS etapa, count(*) AS registros_remanescentes 
FROM public."denuncias" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 55: public.evolution_reports [DIRECT]
-- ============================================================================
SELECT 'PRE_evolution_reports' AS etapa, count(*) AS registros_alvo 
FROM public."evolution_reports" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."evolution_reports" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_evolution_reports' AS etapa, count(*) AS registros_remanescentes 
FROM public."evolution_reports" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 56: public.nr1_planos_acao [DIRECT]
-- ============================================================================
SELECT 'PRE_nr1_planos_acao' AS etapa, count(*) AS registros_alvo 
FROM public."nr1_planos_acao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."nr1_planos_acao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_nr1_planos_acao' AS etapa, count(*) AS registros_remanescentes 
FROM public."nr1_planos_acao" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 57: public.nr1_proart_respostas [DIRECT]
-- ============================================================================
SELECT 'PRE_nr1_proart_respostas' AS etapa, count(*) AS registros_alvo 
FROM public."nr1_proart_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."nr1_proart_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_nr1_proart_respostas' AS etapa, count(*) AS registros_remanescentes 
FROM public."nr1_proart_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 58: public.nr1_proart_ativacoes [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_nr1_proart_ativacoes' AS etapa, count(*) AS registros_alvo 
FROM public."nr1_proart_ativacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."nr1_proart_ativacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_nr1_proart_ativacoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."nr1_proart_ativacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 59: public.checklist_respostas [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_checklist_respostas' AS etapa, count(*) AS registros_alvo 
FROM public."checklist_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."checklist_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_checklist_respostas' AS etapa, count(*) AS registros_remanescentes 
FROM public."checklist_respostas" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 60: public.checklist_aplicacoes [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_checklist_aplicacoes' AS etapa, count(*) AS registros_alvo 
FROM public."checklist_aplicacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."checklist_aplicacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_checklist_aplicacoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."checklist_aplicacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 61: public.notifications [DIRECT]
-- ============================================================================
SELECT 'PRE_notifications' AS etapa, count(*) AS registros_alvo 
FROM public."notifications" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."notifications" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_notifications' AS etapa, count(*) AS registros_remanescentes 
FROM public."notifications" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 62: public.lgpd_audit_logs [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_lgpd_audit_logs' AS etapa, count(*) AS registros_alvo 
FROM public."lgpd_audit_logs" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."lgpd_audit_logs" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_lgpd_audit_logs' AS etapa, count(*) AS registros_remanescentes 
FROM public."lgpd_audit_logs" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 63: public.nr1_matriz_config [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_nr1_matriz_config' AS etapa, count(*) AS registros_alvo 
FROM public."nr1_matriz_config" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."nr1_matriz_config" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_nr1_matriz_config' AS etapa, count(*) AS registros_remanescentes 
FROM public."nr1_matriz_config" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 64: public.psico_respostas [INDIRECT]
-- ============================================================================
SELECT 'PRE_psico_respostas' AS etapa, count(*) AS registros_alvo 
FROM public."psico_respostas" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."psico_respostas" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_psico_respostas' AS etapa, count(*) AS registros_remanescentes 
FROM public."psico_respostas" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 65: public.psico_atribuicoes [INDIRECT]
-- ============================================================================
SELECT 'PRE_psico_atribuicoes' AS etapa, count(*) AS registros_alvo 
FROM public."psico_atribuicoes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."psico_atribuicoes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_psico_atribuicoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."psico_atribuicoes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 66: public.psico_avaliacao_ghes [INDIRECT]
-- ============================================================================
SELECT 'PRE_psico_avaliacao_ghes' AS etapa, count(*) AS registros_alvo 
FROM public."psico_avaliacao_ghes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

DELETE FROM public."psico_avaliacao_ghes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

SELECT 'POS_psico_avaliacao_ghes' AS etapa, count(*) AS registros_remanescentes 
FROM public."psico_avaliacao_ghes" 
WHERE avaliacao_id IN (SELECT id FROM public.psico_avaliacoes WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756'));

-- ============================================================================
-- ETAPA 67: public.psico_avaliacoes [DIRECT]
-- ============================================================================
SELECT 'PRE_psico_avaliacoes' AS etapa, count(*) AS registros_alvo 
FROM public."psico_avaliacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."psico_avaliacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_psico_avaliacoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."psico_avaliacoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 68: public.birthday_greeting_acknowledgments [USER_CHILD]
-- ============================================================================
SELECT 'PRE_birthday_greeting_acknowledgments' AS etapa, count(*) AS registros_alvo 
FROM public."birthday_greeting_acknowledgments" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

DELETE FROM public."birthday_greeting_acknowledgments" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

SELECT 'POS_birthday_greeting_acknowledgments' AS etapa, count(*) AS registros_remanescentes 
FROM public."birthday_greeting_acknowledgments" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

-- ============================================================================
-- ETAPA 69: public.tasks [USER_CHILD]
-- ============================================================================
SELECT 'PRE_tasks' AS etapa, count(*) AS registros_alvo 
FROM public."tasks" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

DELETE FROM public."tasks" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

SELECT 'POS_tasks' AS etapa, count(*) AS registros_remanescentes 
FROM public."tasks" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

-- ============================================================================
-- ETAPA 70: public.user_preferences [USER_CHILD]
-- ============================================================================
SELECT 'PRE_user_preferences' AS etapa, count(*) AS registros_alvo 
FROM public."user_preferences" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

DELETE FROM public."user_preferences" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

SELECT 'POS_user_preferences' AS etapa, count(*) AS registros_remanescentes 
FROM public."user_preferences" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

-- ============================================================================
-- ETAPA 71: public.user_roles [USER_CHILD]
-- ============================================================================
SELECT 'PRE_user_roles' AS etapa, count(*) AS registros_alvo 
FROM public."user_roles" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

DELETE FROM public."user_roles" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

SELECT 'POS_user_roles' AS etapa, count(*) AS registros_remanescentes 
FROM public."user_roles" 
WHERE user_id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
  );

-- ============================================================================
-- ETAPA 72: public.descricoes_cargo [DIRECT]
-- ============================================================================
SELECT 'PRE_descricoes_cargo' AS etapa, count(*) AS registros_alvo 
FROM public."descricoes_cargo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."descricoes_cargo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_descricoes_cargo' AS etapa, count(*) AS registros_remanescentes 
FROM public."descricoes_cargo" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 73: public.colaboradores [DIRECT]
-- ============================================================================
SELECT 'PRE_colaboradores' AS etapa, count(*) AS registros_alvo 
FROM public."colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_colaboradores' AS etapa, count(*) AS registros_remanescentes 
FROM public."colaboradores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 74: public.nr1_ghe_riscos [DIRECT_NO_FK]
-- ============================================================================
SELECT 'PRE_nr1_ghe_riscos' AS etapa, count(*) AS registros_alvo 
FROM public."nr1_ghe_riscos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."nr1_ghe_riscos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_nr1_ghe_riscos' AS etapa, count(*) AS registros_remanescentes 
FROM public."nr1_ghe_riscos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 75: public.cargos [DIRECT]
-- ============================================================================
SELECT 'PRE_cargos' AS etapa, count(*) AS registros_alvo 
FROM public."cargos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."cargos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_cargos' AS etapa, count(*) AS registros_remanescentes 
FROM public."cargos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 76: public.ghe_epis [DIRECT]
-- ============================================================================
SELECT 'PRE_ghe_epis' AS etapa, count(*) AS registros_alvo 
FROM public."ghe_epis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ghe_epis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ghe_epis' AS etapa, count(*) AS registros_remanescentes 
FROM public."ghe_epis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 77: public.ghes [DIRECT]
-- ============================================================================
SELECT 'PRE_ghes' AS etapa, count(*) AS registros_alvo 
FROM public."ghes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ghes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ghes' AS etapa, count(*) AS registros_remanescentes 
FROM public."ghes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 78: public.setores [DIRECT]
-- ============================================================================
SELECT 'PRE_setores' AS etapa, count(*) AS registros_alvo 
FROM public."setores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."setores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_setores' AS etapa, count(*) AS registros_remanescentes 
FROM public."setores" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 79: public.departamentos [DIRECT]
-- ============================================================================
SELECT 'PRE_departamentos' AS etapa, count(*) AS registros_alvo 
FROM public."departamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."departamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_departamentos' AS etapa, count(*) AS registros_remanescentes 
FROM public."departamentos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 80: public.unidades_organizacionais [DIRECT]
-- ============================================================================
SELECT 'PRE_unidades_organizacionais' AS etapa, count(*) AS registros_alvo 
FROM public."unidades_organizacionais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."unidades_organizacionais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_unidades_organizacionais' AS etapa, count(*) AS registros_remanescentes 
FROM public."unidades_organizacionais" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 81: public.banco_horas_perfis [DIRECT]
-- ============================================================================
SELECT 'PRE_banco_horas_perfis' AS etapa, count(*) AS registros_alvo 
FROM public."banco_horas_perfis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."banco_horas_perfis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_banco_horas_perfis' AS etapa, count(*) AS registros_remanescentes 
FROM public."banco_horas_perfis" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 82: public.work_schedules [DIRECT]
-- ============================================================================
SELECT 'PRE_work_schedules' AS etapa, count(*) AS registros_alvo 
FROM public."work_schedules" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."work_schedules" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_work_schedules' AS etapa, count(*) AS registros_remanescentes 
FROM public."work_schedules" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 83: public.ponto_configuracoes [DIRECT]
-- ============================================================================
SELECT 'PRE_ponto_configuracoes' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_configuracoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_configuracoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_configuracoes' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_configuracoes" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 84: public.ponto_tipos_abono [DIRECT]
-- ============================================================================
SELECT 'PRE_ponto_tipos_abono' AS etapa, count(*) AS registros_alvo 
FROM public."ponto_tipos_abono" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."ponto_tipos_abono" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_ponto_tipos_abono' AS etapa, count(*) AS registros_remanescentes 
FROM public."ponto_tipos_abono" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 85: public.module_visibility [DIRECT]
-- ============================================================================
SELECT 'PRE_module_visibility' AS etapa, count(*) AS registros_alvo 
FROM public."module_visibility" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."module_visibility" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_module_visibility' AS etapa, count(*) AS registros_remanescentes 
FROM public."module_visibility" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 86: public.niveis_maturidade [DIRECT]
-- ============================================================================
SELECT 'PRE_niveis_maturidade' AS etapa, count(*) AS registros_alvo 
FROM public."niveis_maturidade" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."niveis_maturidade" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_niveis_maturidade' AS etapa, count(*) AS registros_remanescentes 
FROM public."niveis_maturidade" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 87: public.feriados [HYBRID]
-- ============================================================================
SELECT 'PRE_feriados' AS etapa, count(*) AS registros_alvo 
FROM public."feriados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

DELETE FROM public."feriados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

SELECT 'POS_feriados' AS etapa, count(*) AS registros_remanescentes 
FROM public."feriados" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

-- ============================================================================
-- ETAPA 88: public.descricao_modelos [DIRECT]
-- ============================================================================
SELECT 'PRE_descricao_modelos' AS etapa, count(*) AS registros_alvo 
FROM public."descricao_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."descricao_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_descricao_modelos' AS etapa, count(*) AS registros_remanescentes 
FROM public."descricao_modelos" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 89: public.replication_logs [DIRECT_SPECIAL]
-- ============================================================================
SELECT 'PRE_replication_logs' AS etapa, count(*) AS registros_alvo 
FROM public."replication_logs" 
WHERE source_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') OR target_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."replication_logs" 
WHERE source_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') OR target_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_replication_logs' AS etapa, count(*) AS registros_remanescentes 
FROM public."replication_logs" 
WHERE source_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') OR target_company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 90: public.profiles [HYBRID]
-- ============================================================================
SELECT 'PRE_profiles' AS etapa, count(*) AS registros_alvo 
FROM public."profiles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

DELETE FROM public."profiles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

SELECT 'POS_profiles' AS etapa, count(*) AS registros_remanescentes 
FROM public."profiles" 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756') AND company_id IS NOT NULL;

-- ============================================================================
-- ETAPA 91: public.companies [ROOT]
-- ============================================================================
SELECT 'PRE_companies' AS etapa, count(*) AS registros_alvo 
FROM public."companies" 
WHERE id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

DELETE FROM public."companies" 
WHERE id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

SELECT 'POS_companies' AS etapa, count(*) AS registros_remanescentes 
FROM public."companies" 
WHERE id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- ============================================================================
-- ETAPA 92: REMOÇÃO DAS 25 CONTAS LEGADAS EM auth.users
-- Executado após remoção de todos os vínculos em public (profiles, roles, etc.)
-- ============================================================================
SELECT 'PRE_auth_users' AS etapa, count(*) AS contas_legadas 
FROM auth.users 
WHERE id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
);

DELETE FROM auth.users 
WHERE id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
);

SELECT 'POS_auth_users' AS etapa, count(*) AS contas_remanescentes 
FROM auth.users 
WHERE id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
);

-- ============================================================================
-- ETAPA 93: AUDITORIA E PROVA FINAL DE INTEGRIDADE PÓS-LIMPEZA
-- ============================================================================

-- 1. Provar que as empresas legadas foram completamente zeradas
SELECT 'CHECK_EMPRESAS_LEGADAS' AS auditoria, count(*) AS total 
FROM public.companies 
WHERE id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- 2. Provar que zero colaboradores legados restaram no sistema
SELECT 'CHECK_COLABORADORES_LEGADOS' AS auditoria, count(*) AS total 
FROM public.colaboradores 
WHERE company_id IN ('b496582a-fe27-4131-a6fc-bc540f470100', 'fcdfc7aa-f768-4547-82eb-a8bf583ff756');

-- 3. Provar que zero contas das 25 legadas restaram em auth.users
SELECT 'CHECK_AUTH_USERS_LEGADOS' AS auditoria, count(*) AS total 
FROM auth.users 
WHERE id IN (
    'b20eb9d6-15fa-4e02-ab86-1105b33971e4',
    '710d8f89-a6a5-41b4-aab8-401bb85c6f60',
    'aad9ac5b-4d70-4b30-bba9-69846646068f',
    '931784c9-9bd5-4ba5-bea3-c3726cc4159c',
    '085550ae-1f4c-4e2d-a70a-4b934bd77b5c',
    '690265aa-97e6-4d1b-8e7a-fa6e9c45a4df',
    '632081fe-0d4f-4716-a9ba-458582f6ba53',
    'bd84c72b-eba8-4f02-b1d5-f998d07b230f',
    '775f72a9-2a04-45ff-a5b2-51192abfca28',
    '3aaca331-cef1-45b5-b45e-9d8f163b37a3',
    '59956b0b-5619-4be6-b821-0a28ab2db8bc',
    '50bea0e3-3b73-4492-9dc8-35778799713f',
    'c521a038-635b-499b-9e45-4be244f04c49',
    'c152df56-afc9-4227-acc7-ba43e0ed836a',
    '13114674-c895-4af3-a3a0-db35f4cc28b7',
    '8cd431e4-76a4-486d-9b80-d7c4b1c32875',
    'aee7297e-7262-4d3f-9e80-dad22ce5f887',
    '6c0a2fc5-c49e-4c50-a89f-c088f61532d0',
    'e2a368a2-f29a-4655-a26e-4ab77360776c',
    '9122d5cc-38b8-4002-a80f-7e4ae3ce12a9',
    'f78d11a1-f96c-4b07-847e-42d547306f91',
    'f36d75ba-a2d9-4287-89d2-a80c7fb2502b',
    '52221b2d-43e1-4d96-b060-0370a5d6dc43',
    'b9822574-c1db-4754-83b7-40f8f777b202',
    '766863ae-9b46-427e-be96-76fb60ac0e9b'
);

-- 4. Provar que a empresa Horizonte Contabilidade (Piloto Ativo) permanece 100% INTACTA
SELECT 'CHECK_HORIZONTE_STATUS' AS auditoria, count(*) AS empresas_ativas 
FROM public.companies 
WHERE id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' AND status = 'active';

SELECT 'CHECK_HORIZONTE_COLABORADORES' AS auditoria, count(*) AS total_colaboradores 
FROM public.colaboradores 
WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

SELECT 'CHECK_HORIZONTE_PULSE' AS auditoria, count(*) AS campanhas_pulse 
FROM public.pulse_campaigns 
WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';

-- 5. Provar que os catálogos normativos e globais continuam com suas sementes intactas
SELECT 'CHECK_CATALOGO_NR1_RISCOS' AS auditoria, count(*) AS riscos_globais 
FROM public.nr1_riscos_catalogo;

SELECT 'CHECK_CATALOGO_PROART' AS auditoria, count(*) AS perguntas_proart 
FROM public.nr1_proart_perguntas;

SELECT 'CHECK_CHECKLIST_TEMPLATES_GLOBAIS' AS auditoria, count(*) AS templates_globais 
FROM public.checklist_templates 
WHERE company_id IS NULL;

-- 6. Provar que o módulo psicossocial permaneceu consistente (zero órfãos)
SELECT 'CHECK_PSICO_ATRIBUICOES' AS auditoria, count(*) AS total FROM public.psico_atribuicoes;
SELECT 'CHECK_PSICO_AVALIACAO_GHES' AS auditoria, count(*) AS total FROM public.psico_avaliacao_ghes;
SELECT 'CHECK_PSICO_RESPOSTAS' AS auditoria, count(*) AS total FROM public.psico_respostas;

-- Se todas as provas de integridade forem satisfatórias:
ROLLBACK;
