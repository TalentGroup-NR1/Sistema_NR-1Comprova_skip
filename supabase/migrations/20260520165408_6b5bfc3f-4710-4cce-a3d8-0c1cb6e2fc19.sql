-- 1) Explicit index on company_id (idempotent; UNIQUE already exists but spec requires named index)
CREATE INDEX IF NOT EXISTS idx_ponto_configuracoes_company_id
  ON public.ponto_configuracoes (company_id);

-- 2) Backfill missing cycle start/end from periodo_fechamento_banco
UPDATE public.ponto_configuracoes
SET
  banco_horas_inicio = COALESCE(
    banco_horas_inicio,
    date_trunc('month', CURRENT_DATE)::date
  ),
  banco_horas_fim = COALESCE(
    banco_horas_fim,
    (
      date_trunc('month', CURRENT_DATE)::date
      + (CASE COALESCE(periodo_fechamento_banco, 'quadrimestral')
           WHEN 'mensal'        THEN INTERVAL '1 month'
           WHEN 'bimestral'     THEN INTERVAL '2 month'
           WHEN 'trimestral'    THEN INTERVAL '3 month'
           WHEN 'quadrimestral' THEN INTERVAL '4 month'
           WHEN 'semestral'     THEN INTERVAL '6 month'
           ELSE INTERVAL '4 month'
         END)
      - INTERVAL '1 day'
    )::date
  )
WHERE banco_horas_inicio IS NULL OR banco_horas_fim IS NULL;