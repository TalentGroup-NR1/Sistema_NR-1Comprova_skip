-- ============================================================
-- Migration: 20261014170000_expand_atualizar_branding_empresa.sql
-- Expande a RPC atualizar_branding_empresa para permitir que o cliente
-- (admin_empresa) complete contato (telefone, segmento) e endereço
-- (cep, logradouro, numero, complemento, bairro, cidade, estado)
-- com validação estrita de segurança multi-tenant (fail-closed).
-- ============================================================

-- 1. Remove a versão antiga de 5 parâmetros para evitar ambiguidade de overload
DROP FUNCTION IF EXISTS public.atualizar_branding_empresa(text, text, text, text, boolean);

-- 2. Cria a versão expandida com 15 parâmetros (todos opcionais com default)
CREATE OR REPLACE FUNCTION public.atualizar_branding_empresa(
  _brand_name text DEFAULT NULL::text,
  _brand_primary_color text DEFAULT NULL::text,
  _brand_logo_url text DEFAULT NULL::text,
  _cnpj text DEFAULT NULL::text,
  _remove_logo boolean DEFAULT false,
  _telefone text DEFAULT NULL::text,
  _segmento text DEFAULT NULL::text,
  _cep text DEFAULT NULL::text,
  _logradouro text DEFAULT NULL::text,
  _numero text DEFAULT NULL::text,
  _complemento text DEFAULT NULL::text,
  _bairro text DEFAULT NULL::text,
  _cidade text DEFAULT NULL::text,
  _estado text DEFAULT NULL::text,
  _target_company_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  _caller_company uuid;
  _company uuid;
  _clean_cnpj text;
  _rows_updated int;
BEGIN
  -- Permissão básica de papel
  IF NOT (
    public.has_role(auth.uid(), 'admin_empresa') 
    OR public.has_role(auth.uid(), 'analista_rh')
    OR public.has_role(auth.uid(), 'admin_master')
    OR public.is_super_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Permissão negada' USING ERRCODE = '42501';
  END IF;

  _caller_company := public.get_my_company_id();

  -- Validação de isolamento multi-tenant estrita (fail-closed)
  IF _target_company_id IS NOT NULL THEN
    IF _caller_company IS NULL OR _target_company_id <> _caller_company THEN
      IF NOT (
        public.has_role(auth.uid(), 'admin_master')
        OR public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = _target_company_id
            AND uc.role = 'admin_empresa'
        )
      ) THEN
        RAISE EXCEPTION 'GA403: Acesso negado. Você só pode atualizar as configurações da sua própria empresa' USING ERRCODE = '42501';
      END IF;
      _company := _target_company_id;
    ELSE
      _company := _target_company_id;
    END IF;
  ELSE
    _company := _caller_company;
  END IF;

  IF _company IS NULL THEN
    RAISE EXCEPTION 'GA402: Empresa não identificada (claim company_id ausente no token do usuário)' USING ERRCODE = '42501';
  END IF;

  -- Validação de formato de cor primária
  IF _brand_primary_color IS NOT NULL AND _brand_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor inválida' USING ERRCODE = '22023';
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
      RAISE EXCEPTION 'CNPJ já cadastrado em outra empresa' USING ERRCODE = '23505';
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
      telefone = CASE
        WHEN _telefone IS NOT NULL THEN NULLIF(btrim(_telefone), '')
        ELSE telefone
      END,
      segmento = CASE
        WHEN _segmento IS NOT NULL THEN NULLIF(btrim(_segmento), '')
        ELSE segmento
      END,
      cep = CASE
        WHEN _cep IS NOT NULL THEN NULLIF(btrim(_cep), '')
        ELSE cep
      END,
      logradouro = CASE
        WHEN _logradouro IS NOT NULL THEN NULLIF(btrim(_logradouro), '')
        ELSE logradouro
      END,
      numero = CASE
        WHEN _numero IS NOT NULL THEN NULLIF(btrim(_numero), '')
        ELSE numero
      END,
      complemento = CASE
        WHEN _complemento IS NOT NULL THEN NULLIF(btrim(_complemento), '')
        ELSE complemento
      END,
      bairro = CASE
        WHEN _bairro IS NOT NULL THEN NULLIF(btrim(_bairro), '')
        ELSE bairro
      END,
      cidade = CASE
        WHEN _cidade IS NOT NULL THEN NULLIF(btrim(_cidade), '')
        ELSE cidade
      END,
      estado = CASE
        WHEN _estado IS NOT NULL THEN upper(NULLIF(btrim(_estado), ''))
        ELSE estado
      END,
      updated_at = now()
  WHERE id = _company;

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;
  IF _rows_updated = 0 THEN
    RAISE EXCEPTION 'GA404: Nenhuma empresa encontrada com id % para atualização', _company USING ERRCODE = 'P0002';
  END IF;

  -- Grava/conclui progresso de onboarding
  INSERT INTO public.onboarding_progress (company_id, current_step, completed_steps, completed_at, dismissed)
  VALUES (_company, 0, ARRAY['branding'], now(), true)
  ON CONFLICT (company_id) DO UPDATE
  SET current_step = 0,
      completed_steps = ARRAY['branding'],
      completed_at = COALESCE(public.onboarding_progress.completed_at, now()),
      dismissed = true;

  RETURN _company;
END;
$$;

-- 3. Grants de execução seguros
REVOKE ALL ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean, text, text, text, text, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean, text, text, text, text, text, text, text, text, text, uuid) TO authenticated;
