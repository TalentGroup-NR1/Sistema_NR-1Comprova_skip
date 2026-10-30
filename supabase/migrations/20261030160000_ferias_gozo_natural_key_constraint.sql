-- Migration: 20261030160000_ferias_gozo_natural_key_constraint.sql
-- Garante chave natural única em ferias_gozo para viabilizar importação idempotente

DO $$
BEGIN
  -- 1. Se houver duplicatas prévias, remove as cópias mais antigas mantendo a mais recente
  DELETE FROM public.ferias_gozo a
  USING public.ferias_gozo b
  WHERE a.created_at < b.created_at
    AND a.colaborador_id = b.colaborador_id
    AND a.periodo_aquisitivo_id = b.periodo_aquisitivo_id
    AND a.data_inicio_gozo = b.data_inicio_gozo
    AND a.data_fim_gozo = b.data_fim_gozo;

  -- Em caso de mesmo created_at, desempata por ID
  DELETE FROM public.ferias_gozo a
  USING public.ferias_gozo b
  WHERE a.id < b.id
    AND a.colaborador_id = b.colaborador_id
    AND a.periodo_aquisitivo_id = b.periodo_aquisitivo_id
    AND a.data_inicio_gozo = b.data_inicio_gozo
    AND a.data_fim_gozo = b.data_fim_gozo;

  -- 2. Adicionar constraint UNIQUE se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ferias_gozo_natural_key'
  ) THEN
    ALTER TABLE public.ferias_gozo
    ADD CONSTRAINT ferias_gozo_natural_key
    UNIQUE (colaborador_id, periodo_aquisitivo_id, data_inicio_gozo, data_fim_gozo);
  END IF;
END $$;

