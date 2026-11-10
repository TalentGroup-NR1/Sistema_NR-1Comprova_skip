-- Migration: pgr_plano_acao (Fundação de Dados do Plano de Ação)
-- Permite que ações de PGRs importados se tornem registros "vivos" (com status, responsáveis e prazos).

-- 1. TABELA
CREATE TABLE IF NOT EXISTS public.pgr_plano_acao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pgr_importacao_id   uuid NOT NULL REFERENCES public.pgr_importacoes(id) ON DELETE CASCADE,
  
  acao                text NOT NULL,
  responsavel_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cargo_responsavel   text,
  prazo               date,
  
  prioridade          text NOT NULL DEFAULT 'media'
                      CHECK (prioridade IN ('alta', 'media', 'baixa')),
                      
  status              text NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'validada')),
                      
  evidencia_url       text,
  historico           jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_pgr_plano_acao_company ON public.pgr_plano_acao(company_id);
CREATE INDEX IF NOT EXISTS idx_pgr_plano_acao_pgr ON public.pgr_plano_acao(pgr_importacao_id);

-- 2. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_plano_acao TO authenticated;
GRANT ALL ON public.pgr_plano_acao TO service_role;

-- 3. RLS
ALTER TABLE public.pgr_plano_acao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master acessa todo o plano de acao" ON public.pgr_plano_acao;
CREATE POLICY "Admin master acessa todo o plano de acao"
  ON public.pgr_plano_acao FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Acesso as acoes da propria empresa" ON public.pgr_plano_acao;
CREATE POLICY "Acesso as acoes da propria empresa"
  ON public.pgr_plano_acao FOR ALL
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin_empresa'::app_role) 
    OR has_role(auth.uid(), 'analista_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_empresa'::app_role) 
    OR has_role(auth.uid(), 'analista_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND company_id = get_my_company_id()
  );

-- 4. TRIGGER updated_at
DROP TRIGGER IF EXISTS trg_pgr_plano_acao_updated_at ON public.pgr_plano_acao;
CREATE TRIGGER trg_pgr_plano_acao_updated_at
  BEFORE UPDATE ON public.pgr_plano_acao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
