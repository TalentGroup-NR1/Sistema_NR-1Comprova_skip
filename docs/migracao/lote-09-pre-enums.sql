-- ============================================================
-- LOTE 9 — PRE: ENUMs necessários
-- Rode ANTES do lote-09a.sql (idempotente)
-- ============================================================

DO $enum$ BEGIN
  CREATE TYPE public.avaliacao_status AS ENUM ('nao_iniciada','em_andamento','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.avaliacao_link_tipo AS ENUM ('autoavaliacao','gestor');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.respondente_avaliacao_tipo AS ENUM ('colaborador','gestor');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.pdi_status AS ENUM ('rascunho','em_andamento','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.pdi_item_tipo_alvo AS ENUM ('competencia','objetivo','geral');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.pdi_item_tipo_acao AS ENUM ('treinamento','mentoria','projeto_pratico','leitura','coaching','feedbacks_periodicos','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.pdi_item_responsavel AS ENUM ('colaborador','gestor','rh');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.pdi_item_status AS ENUM ('nao_iniciado','em_andamento','concluido','bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.feedback_cycle_status AS ENUM ('NAO_INICIADO','LINKS_GERADOS','COLAB_RESPONDIDO','GESTOR_RESPONDIDO','CONCLUIDO','ATRASADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.milestone_type AS ENUM ('30_DIAS','80_DIAS','120_DIAS','GERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.respondent_type AS ENUM ('COLABORADOR','GESTOR','AMBOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

DO $enum$ BEGIN
  CREATE TYPE public.questionario_atribuicao_status AS ENUM ('pendente','em_andamento','preenchido');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;
