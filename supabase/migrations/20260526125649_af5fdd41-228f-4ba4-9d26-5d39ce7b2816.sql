
CREATE OR REPLACE FUNCTION public.replicate_cuidar_conteudo_to_all(p_id uuid)
RETURNS TABLE (
  id uuid,
  origem text,
  storage_path text,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admin master pode replicar globalmente
  IF NOT public.is_admin_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores master podem replicar para todas as empresas.';
  END IF;

  -- Marca o material como global
  UPDATE public.cuidar_conteudos
  SET company_id = NULL,
      updated_at = now()
  WHERE id = p_id;

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
