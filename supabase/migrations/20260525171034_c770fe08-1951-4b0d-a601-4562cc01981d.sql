REVOKE ALL ON FUNCTION public.listar_denuncias_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_status_denuncia(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.listar_denuncias_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_denuncia(uuid, text) TO authenticated;