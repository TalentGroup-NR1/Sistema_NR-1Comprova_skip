-- ============================================================
-- Migration: Atualização da RPC atualizar_branding_empresa
--            para suportar atualização de CNPJ e remoção de logo
--
-- Contexto: A tela de Configurações da Empresa permite ao admin_empresa
-- atualizar em uma única chamada a Identidade Visual (nome, cor, logo)
-- e os Dados Cadastrais (CNPJ).
-- Mantém a segurança (SECURITY DEFINER) e isolamento multi-tenant (RLS),
-- garantindo que o admin altera exclusivamente a sua própria empresa
-- obtida via public.get_my_company_id().
-- ============================================================

-- Remove a assinatura antiga com 3 argumentos para evitar conflito/ambiguidade de overload
DROP FUNCTION IF EXISTS public.atualizar_branding_empresa(text, text, text);

CREATE OR REPLACE FUNCTION public.atualizar_branding_empresa(
  _brand_name text DEFAULT NULL,
  _brand_primary_color text DEFAULT NULL,
  _brand_logo_url text DEFAULT NULL,
  _cnpj text DEFAULT NULL,
  _remove_logo boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _company uuid;
  _clean_cnpj text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh')
          OR public.has_role(auth.uid(), 'admin_master')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  _company := public.get_my_company_id();
  IF _company IS NULL THEN
    RAISE EXCEPTION 'Empresa não identificada';
  END IF;

  IF _brand_primary_color IS NOT NULL AND _brand_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor inválida';
  END IF;

  -- Se CNPJ foi fornecido, valida unicidade em relação a outras empresas
  IF _cnpj IS NOT NULL AND btrim(_cnpj) <> '' THEN
    _clean_cnpj := btrim(_cnpj);
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE id <> _company
        AND (
          cnpj = _clean_cnpj
          OR regexp_replace(cnpj, '\D', '', 'g') = regexp_replace(_clean_cnpj, '\D', '', 'g')
        )
    ) THEN
      RAISE EXCEPTION 'CNPJ já cadastrado em outra empresa';
    END IF;
  END IF;

  UPDATE public.companies
  SET brand_name = CASE
        WHEN _brand_name IS NOT NULL THEN NULLIF(btrim(_brand_name), '')
        ELSE brand_name
      END,
      name = CASE
        WHEN _brand_name IS NOT NULL AND NULLIF(btrim(_brand_name), '') IS NOT NULL THEN btrim(_brand_name)
        ELSE name
      END,
      brand_primary_color = COALESCE(_brand_primary_color, brand_primary_color),
      brand_logo_url = CASE
        WHEN _remove_logo THEN NULL
        WHEN _brand_logo_url IS NOT NULL THEN NULLIF(btrim(_brand_logo_url), '')
        ELSE brand_logo_url
      END,
      logo_url = CASE
        WHEN _remove_logo THEN NULL
        WHEN _brand_logo_url IS NOT NULL THEN NULLIF(btrim(_brand_logo_url), '')
        ELSE logo_url
      END,
      cnpj = CASE
        WHEN _clean_cnpj IS NOT NULL THEN _clean_cnpj
        ELSE cnpj
      END,
      updated_at = now()
  WHERE id = _company;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean) TO authenticated;
