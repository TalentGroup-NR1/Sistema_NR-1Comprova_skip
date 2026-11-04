# WORKFLOW DE GOVERNANÇA DE BANCO DE DADOS E MIGRATIONS
**Plataforma:** NR-1Comprova  
**Ambiente de Produção:** Supabase (`alneozvrsuwszlkisbyo`)  
**Data de Instituição:** 04/11/2026  

---

## 1. PRINCÍPIO DA FONTE ÚNICA DA VERDADE
1. **NUNCA** execute comandos DDL (`CREATE`, `ALTER`, `DROP`) ou altere procedures/triggers diretamente no Supabase SQL Editor ou Management API sem que o arquivo de migration correspondente esteja criado e versionado em `supabase/migrations/`.
2. O histórico do banco no repositório Git e a tabela `supabase_migrations.schema_migrations` no banco de dados devem estar **100% sincronizados**.

---

## 2. FLUXO PADRÃO PARA NOVAS MIGRATIONS

### Passo 1: Criar o arquivo de migration
Utilize o CLI oficial do Supabase para gerar o arquivo com timestamp padronizado:
```bash
npx supabase migration new <nome_da_migration>
```
Isso criará o arquivo em `supabase/migrations/<YYYYMMDDHHMMSS>_<nome_da_migration>.sql`.

### Passo 2: Escrever o script SQL idempotente
- Sempre utilize cláusulas defensivas:
  - `CREATE TABLE IF NOT EXISTS`
  - `CREATE OR REPLACE FUNCTION`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  - `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
- Configure `SECURITY DEFINER` e `SET search_path = public, pg_temp` em todas as funções de segurança.
- Ative `ROW LEVEL SECURITY` em qualquer nova tabela.

### Passo 3: Aplicação em Produção

#### Opção A (Recomendada via CLI com projeto vinculado):
```bash
npx supabase db push
```
O CLI aplica as migrações pendentes e insere automaticamente a linha na tabela `supabase_migrations.schema_migrations`.

#### Opção B (Aplicação via API de Query / SQL Editor):
Se uma migration precisar ser aplicada pontualmente via API ou Console Web, o registro de tracking **DEVE ser executado na mesma transação ou imediatamente após**:
```sql
-- Exemplo para o arquivo 20261104100000_nova_tabela.sql:
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20261104100000', 'nova_tabela', '{}'::text[])
ON CONFLICT (version) DO NOTHING;
```

---

## 3. AUDITORIA E RECONCILIAÇÃO PERIÓDICA

Antes de iniciar qualquer ciclo de desenvolvimento de banco de dados ou após grandes releases:
1. Verificar a contagem de migrations no repositório:
   ```bash
   ls supabase/migrations/*.sql | wc -l
   ```
2. Verificar a contagem no banco de produção:
   ```sql
   SELECT count(*) FROM supabase_migrations.schema_migrations;
   ```
3. Se houver divergência, listar e reconciliar imediatamente para não perder a rastreabilidade das alterações.

---

## 4. INTEGRAÇÃO CONTÍNUA (CI)

No pipeline `.github/workflows/ci.yml`:
- Todos os testes unitários (`npm run test`) e build (`npm run build`) validam a integridade dos schemas tipados em `src/integrations/supabase/types.ts`.
- **TODO**: Adicionar step `npx supabase db diff --linked` assim que a secret de banco de produção estiver configurada no GitHub Actions.
