ALTER TABLE ponto_configuracoes 
  ADD COLUMN IF NOT EXISTS banco_horas_inicio DATE,
  ADD COLUMN IF NOT EXISTS banco_horas_fim DATE;