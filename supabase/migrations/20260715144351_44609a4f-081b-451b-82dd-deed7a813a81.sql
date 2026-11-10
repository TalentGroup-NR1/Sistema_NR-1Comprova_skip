DO $$
BEGIN
  PERFORM set_config('app.allow_fechado_override','true', false);
  DELETE FROM public.ponto_registros
   WHERE id = '19e3f498-2eb1-4e08-96f9-89770cbc0e26'
     AND data_hora = '2026-07-16 22:45:00+00'
     AND tipo = 'SAIDA';
  PERFORM public.recalcular_resumo_diario(
    'f48688d6-4492-42e8-b2b5-274ec3c79683'::uuid,
    '2026-07-16'::date
  );
END $$;