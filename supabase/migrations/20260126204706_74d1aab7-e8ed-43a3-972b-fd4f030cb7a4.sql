-- Remover a função duplicada que está com bug (versão sem p_limit)
-- Isso deixará apenas a versão correta (p_employee_id uuid, p_limit integer DEFAULT 100)
DROP FUNCTION IF EXISTS get_employee_pulse_history(uuid);