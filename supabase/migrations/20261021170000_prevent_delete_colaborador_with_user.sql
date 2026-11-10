-- Migration: Bloqueio de exclusão de colaborador com acesso ativo (Opção B1)
-- Colaboradores com conta vinculada (user_id IS NOT NULL) não podem ser excluídos diretamente.
-- Devem ser desligados através do módulo Demissões para preservar histórico e segurança.

CREATE OR REPLACE FUNCTION public.check_colaborador_delete_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este colaborador possui acesso ao sistema. Para encerrar o vínculo, realize o desligamento no módulo Demissões.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_colaborador_with_user ON public.colaboradores;
CREATE TRIGGER trg_prevent_delete_colaborador_with_user
  BEFORE DELETE ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.check_colaborador_delete_permission();
