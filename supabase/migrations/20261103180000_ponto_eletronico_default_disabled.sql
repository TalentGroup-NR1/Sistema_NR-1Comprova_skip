-- ============================================================================
-- MIGRATION: 20261103180000_ponto_eletronico_default_disabled.sql
-- OBJETIVO:
--   1. Adicionar default_enabled em catalogo_modulos
--   2. Atualizar trigger handle_new_company_modules para usar c.default_enabled
--   3. Inserir /ponto-eletronico no catálogo com default_enabled = false
--   4. Inserir /ponto-eletronico em company_modules com enabled = false para todas as empresas
--   5. Asserções de integridade fail-safe
-- ============================================================================

-- 1. Adicionar default_enabled à tabela catalogo_modulos
ALTER TABLE public.catalogo_modulos
  ADD COLUMN IF NOT EXISTS default_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.catalogo_modulos.default_enabled IS
  'Se true, empresa nova nasce com o módulo habilitado. Se false, nasce desabilitado e admin ativa manualmente.';

-- 2. Trigger de novas empresas respeita default_enabled
CREATE OR REPLACE FUNCTION public.handle_new_company_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.company_modules (company_id, module_key, enabled)
  SELECT NEW.id, c.module_key, c.default_enabled
  FROM public.catalogo_modulos c
  WHERE c.ativo = true
  ON CONFLICT (company_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Inserir módulo ponto eletrônico no catálogo (default_enabled = false)
INSERT INTO public.catalogo_modulos
  (module_key, nome, pilar, rota_principal, sub_rotas, is_base, ordem, ativo, default_enabled)
VALUES
  ('/ponto-eletronico',
   'Ponto Eletrônico',
   'Departamento Pessoal',
   '/ponto-eletronico',
   '{}'::text[],
   false,
   5,
   true,
   false)
ON CONFLICT (module_key) DO UPDATE
  SET default_enabled = false,
      ativo = true,
      nome = EXCLUDED.nome,
      pilar = EXCLUDED.pilar,
      rota_principal = EXCLUDED.rota_principal,
      is_base = EXCLUDED.is_base;

-- 4. Empresas existentes: enabled = false explícito
INSERT INTO public.company_modules (company_id, module_key, enabled)
SELECT c.id, '/ponto-eletronico', false
FROM public.companies c
ON CONFLICT (company_id, module_key) DO NOTHING;

-- 5. Asserções (falha alto se algo estiver inconsistente)
DO $$
DECLARE
  v_empresas INT;
  v_com_ponto INT;
  v_habilitados INT;
  v_catalogo INT;
BEGIN
  SELECT count(*) INTO v_empresas FROM public.companies;
  SELECT count(*) INTO v_com_ponto FROM public.company_modules
    WHERE module_key = '/ponto-eletronico';
  SELECT count(*) INTO v_habilitados FROM public.company_modules
    WHERE module_key = '/ponto-eletronico' AND enabled = true;
  SELECT count(*) INTO v_catalogo FROM public.catalogo_modulos;

  IF v_com_ponto <> v_empresas THEN
    RAISE EXCEPTION 'Esperado % empresas, % com registro de ponto',
      v_empresas, v_com_ponto;
  END IF;
  IF v_habilitados <> 0 THEN
    RAISE EXCEPTION '% empresas com ponto ATIVO (esperado 0)',
      v_habilitados;
  END IF;
  IF v_catalogo < 16 THEN
    RAISE EXCEPTION 'Catálogo deveria ter 16, tem %', v_catalogo;
  END IF;

  RAISE NOTICE 'OK: % empresas, catálogo com % módulos, 0 habilitados',
    v_empresas, v_catalogo;
END $$;

