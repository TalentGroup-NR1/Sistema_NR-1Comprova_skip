-- ==============================================================================
-- Migration: 20260909160000_ponto_normalizar_regime_e_backfill.sql
-- Descrição:
--   1. Atualiza public.pode_acessar_modulo_ponto() com normalização tolerante
--      (TRIM, UPPER e remoção de acentos) para regimes elegíveis ao ponto:
--      CLT, Estágio, Aprendiz e Temporário.
--   2. Backfill de contract_type = 'CLT' para Ana Souza (empresa 8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4).
--   3. Backfill defensivo de qualquer colaborador com contract_type NULL para 'CLT'.
-- ==============================================================================

-- 1. Redefinir pode_acessar_modulo_ponto() com normalização robusta
CREATE OR REPLACE FUNCTION public.pode_acessar_modulo_ponto()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins e gestores sempre têm acesso ao módulo de ponto
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento')
    )
    -- Colaboradores ativos com vínculo elegível (CLT, Estágio, Aprendiz, Temporário)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.user_id = auth.uid()
        AND c.status = 'ATIVO'
        AND c.contract_type IS NOT NULL
        AND translate(UPPER(TRIM(c.contract_type::text)), 'ÁÉÍÓÚÀÈÌÒÙÃÕÂÊÎÔÛÇ', 'AEIOUAEIOUAOAEIOUC')
            IN ('CLT', 'ESTAGIO', 'APRENDIZ', 'TEMPORARIO')
    );
$$;

REVOKE ALL ON FUNCTION public.pode_acessar_modulo_ponto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_acessar_modulo_ponto() TO authenticated;

-- 2. Backfill Ana Souza na empresa 8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4
UPDATE public.colaboradores
SET contract_type = 'CLT'
WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'
  AND (
    LOWER(TRIM(email_pessoal)) = 'ana.souza@empresaficticia.com.br'
    OR full_name ILIKE '%Ana Souza%'
  );

-- 3. Backfill defensivo geral: qualquer colaborador com contract_type NULL passa a ter 'CLT'
UPDATE public.colaboradores
SET contract_type = 'CLT'
WHERE contract_type IS NULL;
