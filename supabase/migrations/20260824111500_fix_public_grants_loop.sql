-- Migração para corrigir permissões (GRANTs) ausentes no schema public

-- a) Conceder permissões para authenticated e service_role em todas as tabelas base
-- apenas se ainda não tiverem, preservando revokes intencionais.
DO $$
DECLARE
    r RECORD;
    auth_has_privs BOOLEAN;
    service_has_privs BOOLEAN;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Verifica se 'authenticated' possui privilégios básicos
        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_schema = 'public' 
              AND table_name = r.table_name
              AND grantee = 'authenticated'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) INTO auth_has_privs;

        IF NOT auth_has_privs THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', r.table_name);
        END IF;

        -- Verifica se 'service_role' possui privilégios
        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_schema = 'public' 
              AND table_name = r.table_name
              AND grantee = 'service_role'
        ) INTO service_has_privs;

        IF NOT service_has_privs THEN
            EXECUTE format('GRANT ALL ON public.%I TO service_role;', r.table_name);
        END IF;
    END LOOP;
END
$$;

-- b) Conceder SELECT para anon APENAS em tabelas que possuem policies públicas (não escopadas por auth.uid())
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT DISTINCT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual IS NULL OR qual NOT ILIKE '%auth.uid()%')
    LOOP
        RAISE NOTICE 'Concedendo GRANT SELECT para anon na tabela pública: %', r.tablename;
        EXECUTE format('GRANT SELECT ON public.%I TO anon;', r.tablename);
    END LOOP;
END
$$;

-- c) Conceder USAGE e SELECT nas sequences para authenticated
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- d) Garantir EXECUTE nas funções para authenticated
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Segurança: revogar EXECUTE de anon em todas as funções SECURITY DEFINER
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure as proc_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon;', r.proc_signature);
    END LOOP;
END
$$;

-- NOTA: Caso existam funções RPC SECURITY DEFINER que sejam de fato usadas 
-- por rotas públicas (anon), você precisará reconceder o GRANT EXECUTE 
-- explicitamente para a role 'anon' nestas funções específicas abaixo.
-- Exemplo: GRANT EXECUTE ON FUNCTION public.my_public_rpc() TO anon;
