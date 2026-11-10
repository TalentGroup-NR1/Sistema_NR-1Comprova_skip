-- Pré-requisito do Lote 4C: enum pulse_question_type
-- Rode este arquivo ANTES de executar docs/migracao/lote-04c.sql

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'pulse_question_type'
    ) THEN
        CREATE TYPE public.pulse_question_type AS ENUM (
            'escala_0_5',
            'sim_nao',
            'texto_livre'
        );
    END IF;
END
$$;
