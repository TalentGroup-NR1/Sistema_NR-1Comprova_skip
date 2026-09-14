-- Atualiza a função get_user_company_id para considerar a tabela de colaboradores
-- caso o usuário não tenha um registro em profiles (útil para usuários convidados ou backfill pendente)

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    (SELECT company_id FROM public.colaboradores WHERE user_id = _user_id LIMIT 1)
  )
$$;
