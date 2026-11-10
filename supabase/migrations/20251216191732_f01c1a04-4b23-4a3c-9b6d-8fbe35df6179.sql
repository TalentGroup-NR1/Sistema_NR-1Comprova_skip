-- Tornar created_by_user_id nullable para permitir ciclos criados automaticamente
ALTER TABLE feedback_cycles ALTER COLUMN created_by_user_id DROP NOT NULL;

-- Recriar a função para criar ciclos de feedback automaticamente quando um colaborador é criado
CREATE OR REPLACE FUNCTION public.create_feedback_cycles_for_colaborador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_30 UUID;
  template_80 UUID;
  template_120 UUID;
BEGIN
  -- Buscar templates padrão por milestone_type (globais)
  SELECT id INTO template_30 FROM questionnaire_templates 
    WHERE milestone_type = '30_DIAS' AND is_active = true AND company_id IS NULL LIMIT 1;
  SELECT id INTO template_80 FROM questionnaire_templates 
    WHERE milestone_type = '80_DIAS' AND is_active = true AND company_id IS NULL LIMIT 1;
  SELECT id INTO template_120 FROM questionnaire_templates 
    WHERE milestone_type = '120_DIAS' AND is_active = true AND company_id IS NULL LIMIT 1;

  -- Criar ciclo 30 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    questionnaire_template_id, status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '30_DIAS', 
    NEW.admission_date + INTERVAL '30 days',
    template_30,
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 80 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    questionnaire_template_id, status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '80_DIAS', 
    NEW.admission_date + INTERVAL '80 days',
    template_80,
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 120 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    questionnaire_template_id, status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '120_DIAS', 
    NEW.admission_date + INTERVAL '120 days',
    template_120,
    'NAO_INICIADO',
    auth.uid()
  );

  RETURN NEW;
END;
$$;

-- Trigger após inserção de colaborador
DROP TRIGGER IF EXISTS on_colaborador_created ON colaboradores;
CREATE TRIGGER on_colaborador_created
  AFTER INSERT ON colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION create_feedback_cycles_for_colaborador();

-- Criar ciclos para colaboradores existentes que ainda não têm ciclos
INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
  questionnaire_template_id, status, created_by_user_id)
SELECT 
  c.company_id,
  c.id,
  m.milestone_type,
  c.admission_date + m.days_offset,
  (SELECT id FROM questionnaire_templates WHERE milestone_type = m.milestone_type 
   AND is_active = true AND company_id IS NULL LIMIT 1),
  'NAO_INICIADO',
  NULL
FROM colaboradores c
CROSS JOIN (
  VALUES 
    ('30_DIAS'::milestone_type, INTERVAL '30 days'),
    ('80_DIAS'::milestone_type, INTERVAL '80 days'),
    ('120_DIAS'::milestone_type, INTERVAL '120 days')
) AS m(milestone_type, days_offset)
WHERE c.status = 'ATIVO'
AND NOT EXISTS (
  SELECT 1 FROM feedback_cycles fc 
  WHERE fc.colaborador_id = c.id AND fc.milestone_type = m.milestone_type
);