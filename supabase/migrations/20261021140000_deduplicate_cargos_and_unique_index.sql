-- Migration: Deduplicação de cargos e criação de índice único parcial
-- 1. Deduplicação em public.cargos preservando o registro mais antigo (menor created_at)
DO $$
DECLARE
  v_dup RECORD;
  v_survivor_id UUID;
  v_dup_ids UUID[];
  v_ghe_id UUID;
  v_count_merged INT := 0;
BEGIN
  FOR v_dup IN
    SELECT 
      company_id, 
      lower(trim(nome)) AS norm_nome,
      array_agg(id ORDER BY created_at ASC) AS id_list,
      count(*) AS cnt
    FROM public.cargos
    GROUP BY company_id, lower(trim(nome))
    HAVING count(*) > 1
  LOOP
    v_survivor_id := v_dup.id_list[1];
    v_dup_ids := v_dup.id_list[2:array_length(v_dup.id_list, 1)];

    -- Se o sobrevivente não tiver ghe_id, herdar de algum duplicado que tenha
    SELECT ghe_id INTO v_ghe_id
    FROM public.cargos
    WHERE id = ANY(v_dup_ids) AND ghe_id IS NOT NULL
    LIMIT 1;

    IF v_ghe_id IS NOT NULL THEN
      UPDATE public.cargos 
      SET ghe_id = v_ghe_id 
      WHERE id = v_survivor_id AND ghe_id IS NULL;
    END IF;

    -- Repontar colaboradores que porventura apontem para os IDs duplicados
    UPDATE public.colaboradores
    SET cargo_id = v_survivor_id
    WHERE cargo_id = ANY(v_dup_ids);

    -- Repontar descricoes_cargo
    UPDATE public.descricoes_cargo
    SET cargo_id = v_survivor_id
    WHERE cargo_id = ANY(v_dup_ids);

    -- Deletar os registros duplicados
    DELETE FROM public.cargos
    WHERE id = ANY(v_dup_ids);

    v_count_merged := v_count_merged + (v_dup.cnt - 1);
    RAISE NOTICE 'Deduplicado cargo "%" na empresa %: % registros mesclados no survivor %', 
      v_dup.norm_nome, v_dup.company_id, v_dup.cnt - 1, v_survivor_id;
  END LOOP;
  
  RAISE NOTICE 'Total de cargos duplicados removidos: %', v_count_merged;
END;
$$;

-- 2. Criar índice único parcial: UNIQUE(company_id, lower(trim(nome))) para cargos ativos
CREATE UNIQUE INDEX IF NOT EXISTS idx_cargos_company_lower_nome 
ON public.cargos (company_id, lower(trim(nome))) 
WHERE ativo = true;
