-- Correção pontual: batida de Josenildo Almeida em 22/05/2026 18:00 BRT (21:00 UTC)
-- foi aprovada manualmente como INTERVALO_SAIDA, mas deveria ser SAIDA (final do dia).
-- Isso deixava o último registro do colaborador como "em intervalo", quebrando a
-- sequência ao tentar bater ENTRADA em 25/05.
UPDATE public.ponto_registros
SET tipo = 'SAIDA'
WHERE colaborador_id = (
  SELECT id FROM public.colaboradores WHERE full_name ILIKE 'Josenildo%Almeida%' LIMIT 1
)
  AND data_hora = '2026-05-22 21:00:02.764+00'
  AND tipo = 'INTERVALO_SAIDA';