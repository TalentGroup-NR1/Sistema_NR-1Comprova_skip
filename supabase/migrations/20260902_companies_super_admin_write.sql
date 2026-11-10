-- ============================================================
-- Migration: Adicionar policies de INSERT, UPDATE e DELETE
--            para super_admin na tabela companies.
--
-- Contexto: o super_admin já tinha SELECT via:
--   "Super admin pode ver empresas" (migration 20260813183809)
--   "Authenticated users can view active companies" (migration 20251216135330)
--
-- Faltavam as policies de escrita. A Edge Function register-company
-- roda com service_role (bypass de RLS), mas o wizard /cadastro-empresa
-- pode chamar INSERT diretamente pelo cliente autenticado.
-- Esta migration garante que o super_admin pode gerenciar empresas
-- de forma completa sem ter de se tornar admin_master.
--
-- Isolamento mantido:
--   - admin_empresa: NENHUMA policy de INSERT/UPDATE/DELETE concedida aqui.
--   - O admin_master continua com sua policy "Admin master can manage companies".
-- ============================================================

-- INSERT: super_admin pode criar novas empresas
DROP POLICY IF EXISTS "Super admin pode inserir empresas" ON public.companies;
CREATE POLICY "Super admin pode inserir empresas"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

-- UPDATE: super_admin pode editar dados de qualquer empresa
--         (ex: suspender, alterar status, branding)
DROP POLICY IF EXISTS "Super admin pode atualizar empresas" ON public.companies;
CREATE POLICY "Super admin pode atualizar empresas"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- DELETE: super_admin pode remover empresas (ex: testes, demos)
--         Mantido separado do UPDATE para poder ser revogado individualmente.
DROP POLICY IF EXISTS "Super admin pode remover empresas" ON public.companies;
CREATE POLICY "Super admin pode remover empresas"
ON public.companies
FOR DELETE
TO authenticated
USING (public.is_super_admin());
