-- Migration: catalogo_global_treinamentos_categorias
-- Etapa 8.4 — Schema do Catálogo Global de Treinamentos e Categorias da Plataforma

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABELA public.treinamentos
-- ------------------------------------------------------------------------------
ALTER TABLE public.treinamentos
  ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'empresa'
  CONSTRAINT chk_treinamento_origem CHECK (origem IN ('plataforma', 'empresa'));

ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS gera_certificado boolean NOT NULL DEFAULT true;

-- Ajuste de consistência para cursos legados com tipo 'link'
UPDATE public.treinamentos
  SET gera_certificado = false
  WHERE tipo = 'link';

ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS validade_meses integer DEFAULT NULL
  CONSTRAINT chk_treinamento_validade CHECK (validade_meses IS NULL OR validade_meses > 0);

-- Regra de consistência estrutural:
-- 1) plataforma => company_id NULL | empresa => company_id NOT NULL
-- 2) link externo NUNCA emite certificado
ALTER TABLE public.treinamentos
  DROP CONSTRAINT IF EXISTS chk_treinamento_consistencia;

ALTER TABLE public.treinamentos
  ADD CONSTRAINT chk_treinamento_consistencia CHECK (
    ((origem = 'plataforma' AND company_id IS NULL)
     OR (origem = 'empresa' AND company_id IS NOT NULL))
    AND (tipo <> 'link' OR gera_certificado = false)
  );

-- Trigger de segurança de origem (apenas admin_master cria/altera cursos da plataforma)
CREATE OR REPLACE FUNCTION public.check_treinamento_origem_security()
RETURNS trigger AS $$
BEGIN
  IF NEW.origem = 'plataforma'
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas o Administrador Master pode criar ou alterar treinamentos da plataforma.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_treinamento_origem_security ON public.treinamentos;
CREATE TRIGGER trg_treinamento_origem_security
  BEFORE INSERT OR UPDATE ON public.treinamentos
  FOR EACH ROW EXECUTE FUNCTION public.check_treinamento_origem_security();


-- ------------------------------------------------------------------------------
-- 2. CATEGORIAS DA PLATAFORMA (public.categorias_treinamento)
-- ------------------------------------------------------------------------------
ALTER TABLE public.categorias_treinamento
  ALTER COLUMN company_id DROP NOT NULL;


-- ------------------------------------------------------------------------------
-- 3. NOVA TABELA public.empresa_treinamentos_habilitados
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresa_treinamentos_habilitados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  habilitado boolean NOT NULL DEFAULT true,
  obrigatorio boolean NOT NULL DEFAULT false,
  habilitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  habilitado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_empresa_treinamento UNIQUE (company_id, treinamento_id)
);

CREATE INDEX IF NOT EXISTS idx_eth_company ON public.empresa_treinamentos_habilitados (company_id, habilitado);
CREATE INDEX IF NOT EXISTS idx_eth_treinamento ON public.empresa_treinamentos_habilitados (treinamento_id);

ALTER TABLE public.empresa_treinamentos_habilitados ENABLE ROW LEVEL SECURITY;

-- Trigger de integridade: só permite habilitar treinamento global ou da própria empresa
CREATE OR REPLACE FUNCTION public.check_habilita_treinamento()
RETURNS trigger AS $$
DECLARE
  v_origem text;
  v_company_id uuid;
BEGIN
  SELECT origem, company_id INTO v_origem, v_company_id
  FROM public.treinamentos WHERE id = NEW.treinamento_id;

  IF v_origem = 'empresa' AND v_company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Não é permitido habilitar treinamento privado de outra empresa.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_habilita_treinamento ON public.empresa_treinamentos_habilitados;
CREATE TRIGGER trg_check_habilita_treinamento
  BEFORE INSERT OR UPDATE ON public.empresa_treinamentos_habilitados
  FOR EACH ROW EXECUTE FUNCTION public.check_habilita_treinamento();


-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS DE public.empresa_treinamentos_habilitados
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "eth_admin_master_policy" ON public.empresa_treinamentos_habilitados;
CREATE POLICY "eth_admin_master_policy" ON public.empresa_treinamentos_habilitados
  FOR ALL TO authenticated
  USING (public.admin_master_scope(company_id))
  WITH CHECK (public.admin_master_scope(company_id));

DROP POLICY IF EXISTS "eth_company_admin_policy" ON public.empresa_treinamentos_habilitados;
CREATE POLICY "eth_company_admin_policy" ON public.empresa_treinamentos_habilitados
  FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
     OR public.has_role(auth.uid(), 'analista_rh'::public.app_role))
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
     OR public.has_role(auth.uid(), 'analista_rh'::public.app_role))
    AND company_id = public.get_my_company_id()
  );

DROP POLICY IF EXISTS "eth_colaborador_select_policy" ON public.empresa_treinamentos_habilitados;
CREATE POLICY "eth_colaborador_select_policy" ON public.empresa_treinamentos_habilitados
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND habilitado = true);


-- ------------------------------------------------------------------------------
-- 5. TABELA public.certificates (VALIDADE E RECICLAGEM)
-- ------------------------------------------------------------------------------
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS validade_meses integer DEFAULT NULL
  CONSTRAINT chk_cert_validade CHECK (validade_meses IS NULL OR validade_meses > 0);

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS data_expiracao date DEFAULT NULL;

-- Trigger que herda validade do treinamento na emissão
CREATE OR REPLACE FUNCTION public.calcular_expiracao_certificado()
RETURNS trigger AS $$
DECLARE
  v_validade integer;
BEGIN
  SELECT validade_meses INTO v_validade
  FROM public.treinamentos WHERE id = NEW.treinamento_id;

  IF NEW.validade_meses IS NULL THEN
    NEW.validade_meses := v_validade;
  END IF;

  IF NEW.validade_meses IS NOT NULL THEN
    NEW.data_expiracao := (NEW.data_conclusao::date + (NEW.validade_meses || ' months')::interval)::date;
  ELSE
    NEW.data_expiracao := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_expiracao_certificado ON public.certificates;
CREATE TRIGGER trg_calcular_expiracao_certificado
  BEFORE INSERT OR UPDATE OF validade_meses, data_conclusao ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.calcular_expiracao_certificado();


-- ------------------------------------------------------------------------------
-- 6. BACKFILL IDEMPOTENTE
-- ------------------------------------------------------------------------------
UPDATE public.treinamentos
  SET origem = 'empresa'
  WHERE origem IS NULL;

COMMIT;
