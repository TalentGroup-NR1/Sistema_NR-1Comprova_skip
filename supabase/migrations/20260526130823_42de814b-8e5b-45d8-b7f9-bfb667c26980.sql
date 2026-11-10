
DROP FUNCTION IF EXISTS public.replicate_cuidar_conteudo_to_all(uuid);

CREATE OR REPLACE FUNCTION public.replicate_cuidar_conteudo_to_all(p_id uuid)
RETURNS TABLE (
  out_id uuid,
  out_origem text,
  out_storage_path text,
  out_company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores master podem replicar para todas as empresas.';
  END IF;

  UPDATE public.cuidar_conteudos AS c
  SET company_id = NULL,
      updated_at = now()
  WHERE c.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material não encontrado.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.origem, c.storage_path, c.company_id
  FROM public.cuidar_conteudos c
  WHERE c.id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replicate_cuidar_conteudo_to_all(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replicate_cuidar_conteudo_to_all(uuid) TO authenticated;
