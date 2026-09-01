-- ============================================================
-- MIGRATION: 00_init_extensions
-- DESCRIÇÃO: Habilita extensões necessárias antes de todas as
--            outras migrations. Deve ser a PRIMEIRA a rodar.
-- ============================================================

-- Necessário para: gen_random_bytes(), encode(), digest(), crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Necessário para: uuid_generate_v4() e variantes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Necessário para: funções de texto avançado (opcional, mas útil)
CREATE EXTENSION IF NOT EXISTS citext;
