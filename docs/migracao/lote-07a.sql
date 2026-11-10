-- ============================================================
-- LOTE 7A — Enums usados por colaboradores e dependentes
-- Rode ANTES do lote-07b.sql
-- (se algum tipo já existir, comente a linha correspondente)
-- ============================================================

CREATE TYPE public.marital_status AS ENUM ('Solteiro(a)','Casado(a)','Separado(a)','Divorciado(a)','Viúvo(a)','União Estável');

CREATE TYPE public.sex_type AS ENUM ('Feminino','Masculino','Outro','Não informar');

CREATE TYPE public.ethnicity_type AS ENUM ('Branca','Preta','Parda','Amarela','Indígena','Não informar');

CREATE TYPE public.education_level AS ENUM ('Fundamental Incompleto','Fundamental Completo','Médio Incompleto','Médio Completo','Superior Incompleto','Superior Completo','Pós-graduação','Mestrado','Doutorado');

CREATE TYPE public.contract_type AS ENUM ('CLT','Estágio','Aprendiz','PJ','Temporário','Voluntário','Outros');

CREATE TYPE public.payment_method AS ENUM ('Mensalista','Horista','Comissionista');

CREATE TYPE public.work_shift_type AS ENUM ('Integral','Parcial','Aprendiz','Estagiário','Flexível');

CREATE TYPE public.colaborador_status AS ENUM ('ATIVO','FERIAS','DESLIGADO','LICENCA');

CREATE TYPE public.relationship_type AS ENUM ('Filho(a)','Cônjuge','Pai/Mãe','Outro');
