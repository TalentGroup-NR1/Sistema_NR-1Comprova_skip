
UPDATE public.cuidar_templates_fixos
SET perguntas_json = '[
  {"pergunta": "O volume de trabalho e os prazos exigidos de você neste mês foram adequados?", "tipo": "escala_0_5", "ordem": 1, "obrigatoria": true},
  {"pergunta": "Você sentiu que teve o apoio e o suporte necessários da sua equipe e liderança neste mês?", "tipo": "escala_0_5", "ordem": 2, "obrigatoria": true},
  {"pergunta": "Você sentiu que o seu esforço e suas entregas foram valorizados/reconhecidos neste mês?", "tipo": "escala_0_5", "ordem": 3, "obrigatoria": true},
  {"pergunta": "Você teve clareza sobre o que esperavam de você e autonomia para realizar suas tarefas?", "tipo": "escala_0_5", "ordem": 4, "obrigatoria": true},
  {"pergunta": "De forma geral, o trabalho que você realizou este mês fez sentido e trouxe realização para você?", "tipo": "escala_0_5", "ordem": 5, "obrigatoria": true}
]'::jsonb,
    updated_at = now()
WHERE template_key = 'completo';

-- Re-seed pulse_questions de campanhas mensais ainda não respondidas (e inativas)
WITH alvo AS (
  SELECT pc.id
  FROM public.pulse_campaigns pc
  WHERE pc.origem = 'auto_mensal'
    AND pc.ativo = false
    AND NOT EXISTS (SELECT 1 FROM public.pulse_responses r WHERE r.campaign_id = pc.id)
)
DELETE FROM public.pulse_questions q USING alvo WHERE q.campaign_id = alvo.id;

INSERT INTO public.pulse_questions(campaign_id, pergunta, tipo, ordem, obrigatoria)
SELECT pc.id, x.pergunta, x.tipo::pulse_question_type, x.ordem, x.obrigatoria
FROM public.pulse_campaigns pc
CROSS JOIN LATERAL (
  VALUES
    ('O volume de trabalho e os prazos exigidos de você neste mês foram adequados?', 'escala_0_5', 1, true),
    ('Você sentiu que teve o apoio e o suporte necessários da sua equipe e liderança neste mês?', 'escala_0_5', 2, true),
    ('Você sentiu que o seu esforço e suas entregas foram valorizados/reconhecidos neste mês?', 'escala_0_5', 3, true),
    ('Você teve clareza sobre o que esperavam de você e autonomia para realizar suas tarefas?', 'escala_0_5', 4, true),
    ('De forma geral, o trabalho que você realizou este mês fez sentido e trouxe realização para você?', 'escala_0_5', 5, true)
) AS x(pergunta, tipo, ordem, obrigatoria)
WHERE pc.origem = 'auto_mensal'
  AND pc.ativo = false
  AND NOT EXISTS (SELECT 1 FROM public.pulse_responses r WHERE r.campaign_id = pc.id);
