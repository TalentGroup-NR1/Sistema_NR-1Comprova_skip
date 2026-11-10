DO $$
DECLARE d date;
BEGIN
  FOR d IN SELECT generate_series('2026-05-01'::date, '2026-05-31'::date, '1 day')::date LOOP
    PERFORM public.recalcular_resumo_diario('121649bd-978c-41ba-9870-3a961ebf2b60'::uuid, d);
  END LOOP;
EXCEPTION WHEN foreign_key_violation OR others THEN
  -- colaborador não existe neste ambiente, backfill ignorado
  NULL;
END $$;