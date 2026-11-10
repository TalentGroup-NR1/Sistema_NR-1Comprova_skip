-- NOTA: Envolto em exceção — passa silenciosamente em banco novo (IDs de registros que não existem)
DO $$
BEGIN
  UPDATE public.ponto_registros SET tipo='SAIDA' WHERE id IN ('5ec7143b-5bdf-4cef-856a-1fd2a2287caa','5ba06588-80e4-40af-860a-59fe584224a4');
  PERFORM public.recalcular_resumo_diario('1678277a-8c1e-41d2-93ed-8e594d1852df'::uuid, '2026-07-17'::date);
EXCEPTION WHEN foreign_key_violation OR others THEN
  NULL;
END $$;