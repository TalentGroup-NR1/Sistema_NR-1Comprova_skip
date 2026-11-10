-- Add question text fields to competencias_ciclo
ALTER TABLE public.competencias_ciclo
ADD COLUMN texto_pergunta_autoavaliacao TEXT,
ADD COLUMN texto_pergunta_gestor TEXT;

-- Add question text fields to objetivos_ciclo
ALTER TABLE public.objetivos_ciclo
ADD COLUMN texto_pergunta_autoavaliacao TEXT,
ADD COLUMN texto_pergunta_gestor TEXT;

-- Populate existing records with default values based on name
UPDATE public.competencias_ciclo
SET 
  texto_pergunta_autoavaliacao = 'Como você avalia seu desempenho em ' || nome_competencia || '?',
  texto_pergunta_gestor = 'Avalie o desempenho do colaborador em ' || nome_competencia
WHERE texto_pergunta_autoavaliacao IS NULL;

UPDATE public.objetivos_ciclo
SET 
  texto_pergunta_autoavaliacao = 'Como você avalia seu desempenho no objetivo ' || nome_objetivo || '?',
  texto_pergunta_gestor = 'Avalie o desempenho do colaborador no objetivo ' || nome_objetivo
WHERE texto_pergunta_autoavaliacao IS NULL;

-- Now make them NOT NULL after populating
ALTER TABLE public.competencias_ciclo
ALTER COLUMN texto_pergunta_autoavaliacao SET NOT NULL,
ALTER COLUMN texto_pergunta_gestor SET NOT NULL;

ALTER TABLE public.objetivos_ciclo
ALTER COLUMN texto_pergunta_autoavaliacao SET NOT NULL,
ALTER COLUMN texto_pergunta_gestor SET NOT NULL;