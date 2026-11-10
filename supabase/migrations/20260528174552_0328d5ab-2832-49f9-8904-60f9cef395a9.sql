UPDATE public.ferias_periodos_aquisitivos
SET data_limite_gozo = (data_fim_aquisitivo + INTERVAL '12 months' - INTERVAL '60 days')::date
WHERE data_limite_gozo IS DISTINCT FROM (data_fim_aquisitivo + INTERVAL '12 months' - INTERVAL '60 days')::date;