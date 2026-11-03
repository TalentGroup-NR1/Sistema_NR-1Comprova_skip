-- Migration: 20261103140000_pgr_riscos.sql
-- Ciclo 1: Fundação relacional de riscos do PGR (pgr_riscos), vínculo com plano de ação e backfill idempotente

-- 1. TABELA public.pgr_riscos
CREATE TABLE IF NOT EXISTS public.pgr_riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pgr_importacao_id uuid NOT NULL REFERENCES public.pgr_importacoes(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  categoria text NOT NULL,
  nome text NOT NULL,
  probabilidade integer CHECK (probabilidade BETWEEN 1 AND 5),
  severidade integer CHECK (severidade BETWEEN 1 AND 5),
  nivel_risco integer GENERATED ALWAYS AS (COALESCE(probabilidade, 0) * COALESCE(severidade, 0)) STORED,
  descricao text,
  medidas_existentes text,
  grupo_exposto text,
  fonte_origem text NOT NULL DEFAULT 'ia' CHECK (fonte_origem IN ('ia', 'manual', 'importacao')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pgr_riscos_importacao_ordem_key UNIQUE (pgr_importacao_id, ordem)
);

-- Índices
CREATE INDEX IF NOT EXISTS pgr_riscos_importacao_idx ON public.pgr_riscos(pgr_importacao_id, ordem);
CREATE INDEX IF NOT EXISTS pgr_riscos_company_idx ON public.pgr_riscos(company_id);

-- Trigger de updated_at (reutiliza função existente public.update_updated_at_column)
DROP TRIGGER IF EXISTS trg_pgr_riscos_updated_at ON public.pgr_riscos;
CREATE TRIGGER trg_pgr_riscos_updated_at
  BEFORE UPDATE ON public.pgr_riscos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_riscos TO authenticated;
GRANT ALL ON public.pgr_riscos TO service_role;

-- RLS
ALTER TABLE public.pgr_riscos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master acessa todos os riscos pgr" ON public.pgr_riscos;
CREATE POLICY "Admin master acessa todos os riscos pgr"
  ON public.pgr_riscos FOR ALL
  TO authenticated
  USING (
    public.get_my_role() = 'admin_master'::public.app_role 
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  )
  WITH CHECK (
    public.get_my_role() = 'admin_master'::public.app_role 
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  );

DROP POLICY IF EXISTS "Admin e RH gerenciam riscos da propria empresa" ON public.pgr_riscos;
CREATE POLICY "Admin e RH gerenciam riscos da propria empresa"
  ON public.pgr_riscos FOR ALL
  TO authenticated
  USING (
    (
      public.get_my_role() IN ('admin_empresa'::public.app_role, 'analista_rh'::public.app_role)
      OR public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
      OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
    )
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    (
      public.get_my_role() IN ('admin_empresa'::public.app_role, 'analista_rh'::public.app_role)
      OR public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
      OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
    )
    AND company_id = public.get_my_company_id()
  );

DROP POLICY IF EXISTS "Gestor departamento visualiza riscos" ON public.pgr_riscos;
CREATE POLICY "Gestor departamento visualiza riscos"
  ON public.pgr_riscos FOR SELECT
  TO authenticated
  USING (
    (
      public.get_my_role() = 'gestor_departamento'::public.app_role
      OR public.has_role(auth.uid(), 'gestor_departamento'::public.app_role)
    )
    AND company_id = public.get_my_company_id()
  );

-- 2. VÍNCULO PLANO DE AÇÃO -> RISCO
ALTER TABLE public.pgr_plano_acao
  ADD COLUMN IF NOT EXISTS risco_id uuid REFERENCES public.pgr_riscos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pgr_plano_acao_risco_idx
  ON public.pgr_plano_acao(risco_id);

-- 3. BACKFILL IDEMPOTENTE
-- 3.1. Migração de riscos JSONB para tabela relacional pgr_riscos
INSERT INTO public.pgr_riscos (
  company_id,
  pgr_importacao_id,
  ordem,
  categoria,
  nome,
  probabilidade,
  severidade,
  descricao,
  medidas_existentes,
  grupo_exposto,
  fonte_origem,
  criado_por
)
SELECT
  imp.company_id,
  imp.id AS pgr_importacao_id,
  (elem.ordem - 1)::integer AS ordem,
  COALESCE(elem.val->>'categoria', 'outros') AS categoria,
  COALESCE(elem.val->>'nome', 'Risco sem nome') AS nome,
  CASE 
    WHEN (elem.val->>'probabilidade') ~ '^[1-5]$' THEN (elem.val->>'probabilidade')::integer
    ELSE NULL
  END AS probabilidade,
  CASE 
    WHEN (elem.val->>'severidade') ~ '^[1-5]$' THEN (elem.val->>'severidade')::integer
    ELSE NULL
  END AS severidade,
  elem.val->>'descricao' AS descricao,
  elem.val->>'medidas_existentes' AS medidas_existentes,
  elem.val->>'grupo_exposto' AS grupo_exposto,
  'ia' AS fonte_origem,
  NULL::uuid AS criado_por
FROM public.pgr_importacoes imp,
LATERAL jsonb_array_elements(imp.riscos) WITH ORDINALITY AS elem(val, ordem)
WHERE imp.status = 'confirmado'
  AND jsonb_typeof(imp.riscos) = 'array'
  AND jsonb_array_length(imp.riscos) > 0
ON CONFLICT (pgr_importacao_id, ordem) DO NOTHING;

-- 3.2. Atualizar pgr_plano_acao.risco_id se houver campo risco_referenciado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pgr_plano_acao' 
      AND column_name = 'risco_referenciado'
  ) THEN
    UPDATE public.pgr_plano_acao pa
    SET risco_id = r.id
    FROM public.pgr_riscos r
    WHERE pa.pgr_importacao_id = r.pgr_importacao_id
      AND lower(trim(pa.risco_referenciado)) = lower(trim(r.nome))
      AND pa.risco_id IS NULL;
  END IF;
END $$;
