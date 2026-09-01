REVOKE EXECUTE ON FUNCTION public.get_aniversariantes_globais_mes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aniversariantes_globais_mes() TO authenticated;