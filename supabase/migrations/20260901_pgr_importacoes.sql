-- Migration: pgr_importacoes (importação de PGR existente via PDF/OCR)
-- Multi-tenant com RLS, zero breaking changes nas tabelas existentes.

-- 1. TABELA DE CONTROLE DE IMPORTAÇÕES
CREATE TABLE IF NOT EXISTS public.pgr_importacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  criado_por      uuid NOT NULL,

  -- Arquivo original
  arquivo_nome    text NOT NULL,
  arquivo_storage text NOT NULL,  -- path no bucket documentos_analise
  arquivo_tamanho bigint,

  -- Status do pipeline
  status          text NOT NULL DEFAULT 'processando'
                  CHECK (status IN ('processando', 'aguardando_revisao', 'confirmado', 'erro')),
  erro_mensagem   text,

  -- Dados extraídos pelo OCR (revisão antes do commit)
  extracao_raw    jsonb,          -- resultado bruto do GPT-4o / fallback local
  modo_extracao   text,           -- 'ia_openai' | 'fallback_local'

  -- Dados confirmados pelo usuário após revisão
  dados_empresa   jsonb,          -- { nome, cnpj, responsavel_tecnico, data_elaboracao }
  riscos          jsonb,          -- [{ categoria, nome, descricao, probabilidade, severidade, medidas }]
  plano_acao      jsonb,          -- [{ medida, prazo, responsavel, prioridade, risco_ref }]

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pgr_importacoes_company
  ON public.pgr_importacoes(company_id);
CREATE INDEX idx_pgr_importacoes_status
  ON public.pgr_importacoes(company_id, status);

-- 2. GRANTS
GRANT SELECT, INSERT, UPDATE ON public.pgr_importacoes TO authenticated;
GRANT ALL ON public.pgr_importacoes TO service_role;

-- 3. RLS
ALTER TABLE public.pgr_importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master acessa todas as importacoes pgr"
  ON public.pgr_importacoes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin e RH gerenciam importacoes da propria empresa"
  ON public.pgr_importacoes FOR ALL
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND company_id = get_my_company_id()
  );

-- 4. TRIGGER updated_at
CREATE TRIGGER trg_pgr_importacoes_updated_at
  BEFORE UPDATE ON public.pgr_importacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
