-- Tabela para registro de evidências de execução do PGR Vivo

CREATE TABLE IF NOT EXISTS public.pgr_relatorio_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pgr_importacao_id uuid NOT NULL REFERENCES public.pgr_importacoes(id) ON DELETE CASCADE,
  hash text NOT NULL,
  emitido_em timestamptz NOT NULL DEFAULT now(),
  emitido_por uuid NOT NULL REFERENCES auth.users(id)
);

-- Adiciona a coluna doc_id caso não exista (idempotente)
ALTER TABLE public.pgr_relatorio_evidencias ADD COLUMN IF NOT EXISTS doc_id text;

-- RLS
ALTER TABLE public.pgr_relatorio_evidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Colaboradores podem visualizar relatorios da mesma empresa" ON public.pgr_relatorio_evidencias;
CREATE POLICY "Colaboradores podem visualizar relatorios da mesma empresa"
  ON public.pgr_relatorio_evidencias
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Colaboradores podem inserir relatorios na mesma empresa" ON public.pgr_relatorio_evidencias;
CREATE POLICY "Colaboradores podem inserir relatorios na mesma empresa"
  ON public.pgr_relatorio_evidencias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Revoke all by default to public, explicit grants
REVOKE ALL ON public.pgr_relatorio_evidencias FROM anon, public;
GRANT SELECT, INSERT ON public.pgr_relatorio_evidencias TO authenticated;
GRANT ALL ON public.pgr_relatorio_evidencias TO service_role;
