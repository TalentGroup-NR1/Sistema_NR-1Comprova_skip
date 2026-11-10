CREATE OR REPLACE FUNCTION public.atualizar_branding_empresa(
  _brand_name text DEFAULT NULL,
  _brand_primary_color text DEFAULT NULL,
  _brand_logo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _company uuid;
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

  UPDATE public.companies
  SET brand_name = COALESCE(NULLIF(btrim(_brand_name), ''), brand_name),
      brand_primary_color = COALESCE(_brand_primary_color, brand_primary_color),
      brand_logo_url = COALESCE(NULLIF(btrim(_brand_logo_url), ''), brand_logo_url),
      logo_url = COALESCE(NULLIF(btrim(_brand_logo_url), ''), logo_url),
      updated_at = now()
  WHERE id = _company;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text) TO authenticated;