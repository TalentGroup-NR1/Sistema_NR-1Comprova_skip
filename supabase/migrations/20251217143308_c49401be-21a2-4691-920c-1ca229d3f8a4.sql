-- Remover constraints antigas
ALTER TABLE feedback_cycles 
DROP CONSTRAINT IF EXISTS feedback_cycles_questionnaire_template_id_fkey;

ALTER TABLE feedback_cycles 
DROP CONSTRAINT IF EXISTS feedback_cycles_collaborator_questionnaire_template_id_fkey;

ALTER TABLE feedback_cycles 
DROP CONSTRAINT IF EXISTS feedback_cycles_gestor_questionnaire_template_id_fkey;

-- Recriar com ON DELETE SET NULL
ALTER TABLE feedback_cycles 
ADD CONSTRAINT feedback_cycles_questionnaire_template_id_fkey 
FOREIGN KEY (questionnaire_template_id) 
REFERENCES questionnaire_templates(id) 
ON DELETE SET NULL;

ALTER TABLE feedback_cycles 
ADD CONSTRAINT feedback_cycles_collaborator_questionnaire_template_id_fkey 
FOREIGN KEY (collaborator_questionnaire_template_id) 
REFERENCES questionnaire_templates(id) 
ON DELETE SET NULL;

ALTER TABLE feedback_cycles 
ADD CONSTRAINT feedback_cycles_gestor_questionnaire_template_id_fkey 
FOREIGN KEY (gestor_questionnaire_template_id) 
REFERENCES questionnaire_templates(id) 
ON DELETE SET NULL;