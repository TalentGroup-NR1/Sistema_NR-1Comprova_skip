-- =============================================
-- Migração: Remover campo "tipo" e usar apenas "categoria"
-- =============================================

-- 1. Migrar dados de tipo para categoria (quando categoria estiver vazia ou 'outros')
UPDATE public.beneficios
SET categoria = CASE 
    WHEN tipo IN ('vale_alimentacao', 'vale_refeicao', 'alimentacao') THEN 'alimentacao'
    WHEN tipo IN ('saude', 'plano_saude') THEN 'saude'
    WHEN tipo = 'odontologico' THEN 'odontologico'
    WHEN tipo IN ('seguro', 'seguro_vida') THEN 'seguros'
    WHEN tipo = 'lazer' THEN 'lazer'
    WHEN tipo IN ('transporte', 'vale_transporte') THEN 'transporte'
    WHEN tipo IN ('educacao', 'auxilio_educacao') THEN 'educacao'
    WHEN tipo = 'clube_descontos' THEN 'clube_descontos'
    ELSE 'outros'
END
WHERE categoria IS NULL OR categoria = 'outros';

-- 2. Remover a coluna tipo
ALTER TABLE public.beneficios DROP COLUMN IF EXISTS tipo;