ALTER FUNCTION public.get_colaboradores_seguro(uuid, uuid) VOLATILE;

REVOKE EXECUTE ON FUNCTION public.get_colaboradores_seguro(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_colaboradores_seguro(uuid, uuid) TO authenticated;