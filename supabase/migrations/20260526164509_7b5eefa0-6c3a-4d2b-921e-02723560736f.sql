DROP FUNCTION IF EXISTS public.listar_campanhas_ativas();

CREATE OR REPLACE FUNCTION public.listar_campanhas_ativas()
RETURNS TABLE(
  id uuid, company_id uuid, titulo text, descricao text, imagem_url text,
  data_inicio date, data_fim date, status text, created_at timestamp with time zone,
  materiais jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.company_id, c.titulo, c.descricao, c.imagem_url,
    c.data_inicio, c.data_fim,
    public.calcular_status_campanha(c.data_inicio, c.data_fim) AS status,
    c.created_at,
    COALESCE(c.materiais, '[]'::jsonb) AS materiais
  FROM public.campanhas_comunicados c
  WHERE public.calcular_status_campanha(c.data_inicio, c.data_fim) = 'ativo'
    AND (
      public.has_role(auth.uid(), 'admin_master')
      OR c.company_id = public.get_my_company_id()
    )
  ORDER BY c.data_inicio DESC, c.created_at DESC;
$function$;