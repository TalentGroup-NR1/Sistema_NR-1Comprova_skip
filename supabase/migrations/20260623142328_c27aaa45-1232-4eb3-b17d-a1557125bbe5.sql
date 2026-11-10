
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS empresa_cliente TEXT;

UPDATE public.colaboradores col
SET empresa_cliente = NULLIF(TRIM(c.empresa_cliente), '')
FROM public.companies c
WHERE col.company_id = c.id
  AND c.empresa_cliente IS NOT NULL
  AND TRIM(c.empresa_cliente) <> '';

SET LOCAL session_replication_role = 'replica';

DO $$
DECLARE
  t RECORD;
BEGIN
  CREATE TEMP TABLE _company_remap ON COMMIT DROP AS
  WITH canonical AS (
    SELECT DISTINCT ON (cnpj) cnpj, id AS canonical_id
    FROM public.companies
    ORDER BY cnpj, created_at ASC, id ASC
  )
  SELECT c.id AS dup_id, can.canonical_id
  FROM public.companies c
  JOIN canonical can ON can.cnpj = c.cnpj
  WHERE c.id <> can.canonical_id;

  -- Resolver colisões de matrícula: para colaboradores das duplicatas cuja matrícula
  -- já existe em outro colaborador (após remap), sufixar com '-<empresa_cliente>'.
  WITH eff AS (
    SELECT col.id, col.matricula, col.empresa_cliente,
           COALESCE(m.canonical_id, col.company_id) AS new_cid
    FROM public.colaboradores col
    LEFT JOIN _company_remap m ON col.company_id = m.dup_id
  ),
  conflicts AS (
    SELECT new_cid, matricula
    FROM eff
    WHERE matricula IS NOT NULL
    GROUP BY new_cid, matricula
    HAVING COUNT(*) > 1
  ),
  to_fix AS (
    -- Para cada conflito, manter a matrícula da linha original (canonical-side ou primeira) e ajustar as demais
    SELECT e.id, e.matricula, e.empresa_cliente
    FROM eff e
    JOIN conflicts c ON c.new_cid = e.new_cid AND c.matricula = e.matricula
    JOIN public.colaboradores col ON col.id = e.id
    WHERE col.company_id IN (SELECT dup_id FROM _company_remap)
  )
  UPDATE public.colaboradores col
  SET matricula = col.matricula || '-' || COALESCE(NULLIF(REGEXP_REPLACE(col.empresa_cliente, '\s+', '', 'g'), ''), substr(col.id::text, 1, 4))
  FROM to_fix tf
  WHERE col.id = tf.id;

  -- Tabelas globais/auto-geradas: descartar duplicatas
  DELETE FROM public.ponto_configuracoes WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.ponto_tipos_abono WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.cuidar_insights WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.cuidar_alertas WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.pulse_campaigns WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.relatorios_executivos_salvos WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.feriados WHERE company_id IN (SELECT dup_id FROM _company_remap);
  DELETE FROM public.comunicado_leituras WHERE company_id IN (SELECT dup_id FROM _company_remap);

  -- Remap company_id em todas as tabelas
  FOR t IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'company_id'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I tgt SET company_id = m.canonical_id FROM _company_remap m WHERE tgt.company_id = m.dup_id',
      t.table_schema, t.table_name
    );
  END LOOP;

  DELETE FROM public.companies
  WHERE id IN (SELECT dup_id FROM _company_remap);
END $$;

SET LOCAL session_replication_role = 'origin';

ALTER TABLE public.companies DROP COLUMN IF EXISTS empresa_cliente;
