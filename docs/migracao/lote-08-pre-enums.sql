-- =====================================================================
-- LOTE 8 — PRÉ-REQUISITO: ENUMS
-- Rodar ANTES de lote-08a.sql
-- =====================================================================

-- Tipos de batida de ponto (08a)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'ponto_registro_tipo' AND n.nspname = 'public') THEN
    CREATE TYPE public.ponto_registro_tipo AS ENUM (
      'ENTRADA', 'SAIDA', 'INTERVALO_SAIDA', 'INTERVALO_RETORNO'
    );
  END IF;
END
$enum$;

-- Status do resumo diário (08b)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'ponto_resumo_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.ponto_resumo_status AS ENUM (
      'REGULAR', 'INCONSISTENTE', 'FALTA', 'FERIADO', 'ABONADO', 'AJUSTE'
    );
  END IF;
END
$enum$;

-- Ação de tratativa de saldo no fechamento de banco de horas (08c / 08d)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'tratativa_saldo_acao' AND n.nspname = 'public') THEN
    CREATE TYPE public.tratativa_saldo_acao AS ENUM (
      'pagar', 'descontar', 'transferir', 'perdoar'
    );
  END IF;
END
$enum$;

-- Status do período aquisitivo de férias (08e)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'periodo_aquisitivo_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.periodo_aquisitivo_status AS ENUM (
      'aberto', 'fechado', 'vencido'
    );
  END IF;
END
$enum$;

-- Status do gozo de férias (08e)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'ferias_gozo_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.ferias_gozo_status AS ENUM (
      'planejado', 'aprovado', 'gozado', 'cancelado'
    );
  END IF;
END
$enum$;

-- Status de conclusão de treinamento (08f)
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'conclusao_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.conclusao_status AS ENUM (
      'nao_iniciado', 'em_andamento', 'apto_concluir', 'concluido'
    );
  END IF;
END
$enum$;
