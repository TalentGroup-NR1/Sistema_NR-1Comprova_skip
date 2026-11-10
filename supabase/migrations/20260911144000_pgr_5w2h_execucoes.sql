-- Migration: Adicionar campos 5W2H à pgr_plano_acao e criar pgr_acao_execucoes

-- 1. Adicionar campos 5W2H na tabela pgr_plano_acao
ALTER TABLE public.pgr_plano_acao
ADD COLUMN IF NOT EXISTS por_que text,
ADD COLUMN IF NOT EXISTS onde text,
ADD COLUMN IF NOT EXISTS como text,
ADD COLUMN IF NOT EXISTS custo_estimado numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS custo_real numeric DEFAULT 0;

COMMENT ON COLUMN public.pgr_plano_acao.custo_real IS 'Custo real da ação, derivado da soma do custo das execuções. Não deve ser editado manualmente na UI.';

-- 2. Criar tabela pgr_acao_execucoes
CREATE TABLE IF NOT EXISTS public.pgr_acao_execucoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    acao_id uuid NOT NULL REFERENCES public.pgr_plano_acao(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    data timestamptz NOT NULL DEFAULT now(),
    o_que_foi_feito text NOT NULL,
    como text,
    custo numeric DEFAULT 0,
    quem_executou uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    onde text,
    evidencia_url text,
    criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pgr_acao_execucoes_acao_id ON public.pgr_acao_execucoes(acao_id);
CREATE INDEX IF NOT EXISTS idx_pgr_acao_execucoes_company_id ON public.pgr_acao_execucoes(company_id);

-- Trigger de updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

DROP TRIGGER IF EXISTS trg_pgr_acao_execucoes_updated_at ON public.pgr_acao_execucoes;
CREATE TRIGGER trg_pgr_acao_execucoes_updated_at
BEFORE UPDATE ON public.pgr_acao_execucoes
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_acao_execucoes TO authenticated;
GRANT ALL ON public.pgr_acao_execucoes TO service_role;

-- 3. RLS para pgr_acao_execucoes
ALTER TABLE public.pgr_acao_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master acessa todas execucoes" ON public.pgr_acao_execucoes;
CREATE POLICY "Admin master acessa todas execucoes"
  ON public.pgr_acao_execucoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin_master'
    )
  );

DROP POLICY IF EXISTS "Acesso as execucoes da propria empresa" ON public.pgr_acao_execucoes;
CREATE POLICY "Acesso as execucoes da propria empresa"
  ON public.pgr_acao_execucoes FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
