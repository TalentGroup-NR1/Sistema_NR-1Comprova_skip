# Ciclo de Vida de Empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar máquina de estados transacional para empresas (`ativa`, `suspensa`, `encerrada`) no PostgreSQL com auditoria imutável (append-only), substituindo o toggle legado de suspensão por modal com motivo obrigatório e exibindo banner fixo de serviços suspensos no frontend.

**Architecture:** A máquina de estados e o controle de autorização residem no banco de dados via RPC PostgreSQL `transition_company_lifecycle` com `SECURITY DEFINER`, que valida permissões com as funções existentes (`is_super_admin(auth.uid())` e `is_admin_master(auth.uid())`), aplica locks pessimistas e atualiza `companies` gravando em `company_lifecycle_events` (tabela append-only protegida por trigger anti-mutação). No frontend, `MainLayout` renderiza `CompanySuspendedBanner` para empresas suspensas e `PlataformaEmpresasTable` utiliza `CompanyLifecycleModal` para coletar o motivo e invocar a RPC.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Radix UI, TanStack React Query, Supabase (PostgreSQL, PL/pgSQL, RLS, Triggers), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-ciclo-de-vida-empresa-design.md`

## Global Constraints
- `companies.status` normalizado com os valores em português: `'ativa'`, `'suspensa'`, `'encerrada'`.
- Ordem obrigatória na migração: primeiro `UPDATE companies SET status = 'ativa' WHERE status = 'active' OR status IS NULL`, depois criação da `CHECK constraint`.
- `company_lifecycle_events` não possui `ip_address` (conformidade LGPD).
- Assinaturas de autorização na RPC: `public.is_super_admin(auth.uid())` e `public.is_admin_master(auth.uid())` recebem 1 argumento (`uuid`).
- Auditoria append-only garantida por trigger rejeitando qualquer `UPDATE` ou `DELETE`.
- `admin_empresa` não pode executar transições nem suspender a própria empresa.
- Transições para `encerrada` são irreversíveis (estado terminal); idempotência retorna erro explícito.
- Nenhum bloqueio de rotas na suspensão v1; apenas banner fixo no topo: `"Serviços suspensos. Regularize o pagamento."`.

## Review Focus
1. Tentativa de transição partindo de `encerrada` → deve falhar com erro de estado terminal irreversível.
2. Tentativa de transição para o mesmo estado atual (`suspensa` → `suspensa`) → deve falhar com erro amigável de idempotência.
3. Submissão de alteração de estado sem motivo ou com motivo em branco (< 3 caracteres) → bloqueio no modal e rejeição com código `22023` na RPC.
4. Tentativa de execução por usuário com papel `admin_empresa` → rejeição com código de permissão negada `42501`.
5. Exibição de banner para colaborador de empresa suspensa versus Super Admin no Modo Plataforma → colaborador vê banner fixo no topo; Super Admin sem empresa selecionada não vê.

---

### Task 1: Migração SQL da Máquina de Estados e Auditoria

**Files:**
- Create: `supabase/migrations/20261029160000_company_lifecycle_state_machine.sql`

**Interfaces:**
- Produces:
  - Tabela `public.company_lifecycle_events`
  - Trigger `public.prevent_lifecycle_events_modification`
  - Constraint `check_companies_status` em `public.companies`
  - Coluna `suspension_reason` em `public.companies`
  - RPC `public.transition_company_lifecycle(_company_id uuid, _target_status text, _reason text)`

- [ ] **Step 1: Criar o arquivo de migração SQL**
Criar `supabase/migrations/20261029160000_company_lifecycle_state_machine.sql` com:
1. Normalização dos dados existentes:
```sql
UPDATE public.companies
SET status = 'ativa'
WHERE status = 'active' OR status IS NULL;
```
2. Adição da CHECK constraint e coluna `suspension_reason`:
```sql
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS check_companies_status;

ALTER TABLE public.companies
  ADD CONSTRAINT check_companies_status
  CHECK (status IN ('ativa', 'suspensa', 'encerrada'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS suspension_reason text;
```
3. Criação da tabela `company_lifecycle_events` e trigger anti-mutação:
```sql
CREATE TABLE IF NOT EXISTS public.company_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_lifecycle_events_company_id
  ON public.company_lifecycle_events (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_lifecycle_events_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'company_lifecycle_events é estritamente append-only: UPDATE e DELETE são proibidos'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_lifecycle_events_update_delete ON public.company_lifecycle_events;
CREATE TRIGGER trg_prevent_lifecycle_events_update_delete
BEFORE UPDATE OR DELETE ON public.company_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_events_modification();

ALTER TABLE public.company_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas super_admin e admin_master leem auditoria de ciclo de vida" ON public.company_lifecycle_events;
CREATE POLICY "Apenas super_admin e admin_master leem auditoria de ciclo de vida"
  ON public.company_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_admin_master(auth.uid())
  );
```
4. Criação da RPC `transition_company_lifecycle`:
```sql
CREATE OR REPLACE FUNCTION public.transition_company_lifecycle(
  _company_id uuid,
  _target_status text,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company record;
  v_caller_id uuid := auth.uid();
BEGIN
  -- 1. Verificação estrita de autorização
  IF NOT (
    public.is_super_admin(v_caller_id)
    OR public.is_admin_master(v_caller_id)
  ) THEN
    RAISE EXCEPTION 'Permissão negada: apenas super_admin ou admin_master'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do motivo
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'O motivo da alteração de estado é obrigatório (mínimo 3 caracteres)'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Lock pessimista e leitura da empresa
  SELECT id, name, is_internal, status INTO v_company
  FROM public.companies
  WHERE id = _company_id
  FOR UPDATE;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Salvaguarda para empresas internas da plataforma
  IF v_company.is_internal AND _target_status IN ('suspensa', 'encerrada') THEN
    RAISE EXCEPTION 'Empresas internas da plataforma não podem ser suspensas ou encerradas'
      USING ERRCODE = '22023';
  END IF;

  -- 5. Validação de idempotência
  IF v_company.status = _target_status THEN
    RAISE EXCEPTION 'A empresa já se encontra no estado %', _target_status
      USING ERRCODE = '22023';
  END IF;

  -- 6. Validação de estado terminal
  IF v_company.status = 'encerrada' THEN
    RAISE EXCEPTION 'Empresa com estado terminal (encerrada) não pode ter seu estado alterado'
      USING ERRCODE = '22023';
  END IF;

  -- 7. Validação de matriz de transição
  IF NOT (
    (v_company.status = 'ativa' AND _target_status IN ('suspensa', 'encerrada')) OR
    (v_company.status = 'suspensa' AND _target_status IN ('ativa', 'encerrada'))
  ) THEN
    RAISE EXCEPTION 'Transição de estado inválida: % -> %', v_company.status, _target_status
      USING ERRCODE = '22023';
  END IF;

  -- 8. Atualização atômica da empresa
  UPDATE public.companies
  SET
    status = _target_status,
    suspension_reason = CASE WHEN _target_status = 'suspensa' THEN trim(_reason) ELSE NULL END,
    updated_at = now()
  WHERE id = _company_id;

  -- 9. Registro obrigatório na auditoria append-only
  INSERT INTO public.company_lifecycle_events (
    company_id,
    changed_by,
    previous_status,
    new_status,
    reason
  ) VALUES (
    _company_id,
    v_caller_id,
    v_company.status,
    _target_status,
    trim(_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'company_id', _company_id,
    'previous_status', v_company.status,
    'new_status', _target_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transition_company_lifecycle(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_company_lifecycle(uuid, text, text) TO authenticated;
```

- [ ] **Step 2: Commit da migration**
```bash
git add supabase/migrations/20261029160000_company_lifecycle_state_machine.sql
git commit -m "feat(db): adicionar migracao da maquina de estados de empresa e auditoria"
```

---

### Task 2: Execução da Migração no Supabase e Validação da RPC no Banco

**Files:**
- Test / Verify script: `scripts/test_company_lifecycle_db.cjs` (temporário, limpo ao final)

**Interfaces:**
- Consumes: Migração SQL aplicada no banco `alneozvrsuwszlkisbyo`.
- Produces: Evidência de execução real das transições, auditoria gravada e rejeições.

- [ ] **Step 1: Aplicar a migração no Supabase via script de execução SQL com service_role**
Executar script Node para enviar o SQL via conexão direta com o Postgres do projeto Supabase ou via RPC administrativa.

- [ ] **Step 2: Criar e rodar suite de integração real no DB (`scripts/test_company_lifecycle_db.cjs`)**
Testar:
1. Verificação de que as empresas existentes agora possuem `status = 'ativa'`.
2. Criação de uma empresa de teste temporária `EMPRESA TESTE CICLO <timestamp>`.
3. Invocação como `admin_empresa` → verificar erro `42501` (Acesso negado).
4. Invocação como `admin_master` (`ativa` → `suspensa`, motivo `"Inadimplência fatura #123"`) → verificar sucesso, conferir linha em `company_lifecycle_events`.
5. Idempotência (`suspensa` → `suspensa`) → verificar erro `"A empresa já se encontra no estado suspensa"`.
6. Tentativa de `UPDATE` ou `DELETE` direto em `company_lifecycle_events` → verificar bloqueio pelo trigger com erro `42501`.
7. Transição `suspensa` → `encerrada` (motivo `"Rescisão definitiva"`) → verificar sucesso.
8. Tentativa de transição a partir de `encerrada` (`encerrada` → `ativa`) → verificar erro de estado terminal.
9. Exclusão ordenada da empresa de teste temporária (limpeza 100%).

- [ ] **Step 3: Limpeza de resíduos e commit do teste se mantido em `src/__integration__`**
Remover arquivos temporários.

---

### Task 3: Hook de Status da Empresa e Componente `CompanySuspendedBanner`

**Files:**
- Create: `src/components/layout/CompanySuspendedBanner.tsx`
- Modify: `src/components/layout/MainLayout.tsx:130-136`
- Test: `src/components/layout/__tests__/CompanySuspendedBanner.test.tsx`

**Interfaces:**
- Produces: `<CompanySuspendedBanner />`
- Consumes: `useEffectiveCompanyId` e status de `companies`.

- [ ] **Step 1: Escrever o teste unitário que falha**
Criar `src/components/layout/__tests__/CompanySuspendedBanner.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompanySuspendedBanner } from '../CompanySuspendedBanner';

// Mock de hooks para status 'suspensa', 'ativa' e Super Admin sem empresa
...
```
- [ ] **Step 2: Rodar o teste para confirmar que falha**
`npx vitest run src/components/layout/__tests__/CompanySuspendedBanner.test.tsx`
Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `CompanySuspendedBanner.tsx`**
Componente fixo com alerta amarelo âmbar estilizado (`AlertTriangle`), exibindo:
`⚠️ Serviços suspensos. Regularize o pagamento.`
Apenas se a empresa efetiva tiver `status === 'suspensa'`.
Se for Super Admin / Admin Master no Modo Plataforma (`effectiveCompanyId === null`), não renderiza nada.

- [ ] **Step 4: Montar em `src/components/layout/MainLayout.tsx`**
Adicionar `<CompanySuspendedBanner />` logo acima do `<main className="flex-1 ...">`.

- [ ] **Step 5: Rodar testes e verificar aprovação**
`npx vitest run src/components/layout/__tests__/CompanySuspendedBanner.test.tsx`
Esperado: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/components/layout/CompanySuspendedBanner.tsx src/components/layout/MainLayout.tsx src/components/layout/__tests__/CompanySuspendedBanner.test.tsx
git commit -m "feat(ui): adicionar CompanySuspendedBanner no MainLayout para empresas suspensas"
```

---

### Task 4: Componente `CompanyLifecycleModal`

**Files:**
- Create: `src/components/plataforma/CompanyLifecycleModal.tsx`
- Test: `src/components/plataforma/__tests__/CompanyLifecycleModal.test.tsx`

**Interfaces:**
- Produces: `CompanyLifecycleModal`
  - Props:
    - `isOpen: boolean`
    - `onClose: () => void`
    - `company: { id: string; name: string; brand_name?: string | null; status: 'ativa' | 'suspensa' | 'encerrada' } | null`
    - `targetStatus: 'ativa' | 'suspensa' | 'encerrada'`
    - `onSuccess: () => void`

- [ ] **Step 1: Escrever teste unitário para o modal**
Criar `src/components/plataforma/__tests__/CompanyLifecycleModal.test.tsx`:
- Testa exibição do título de acordo com `targetStatus` ("Suspender Empresa", "Reativar Empresa", "Encerrar Empresa").
- Testa validação: botão de confirmar desabilitado se o motivo tiver menos de 3 caracteres.
- Testa alerta destrutivo em vermelho quando `targetStatus === 'encerrada'`.
- Testa envio correto dos parâmetros `_company_id`, `_target_status`, `_reason` para `supabase.rpc('transition_company_lifecycle')`.

- [ ] **Step 2: Rodar o teste para confirmar que falha**
`npx vitest run src/components/plataforma/__tests__/CompanyLifecycleModal.test.tsx`
Esperado: FAIL.

- [ ] **Step 3: Implementar `CompanyLifecycleModal.tsx`**
Construir com `@/components/ui/dialog`, `Textarea`, `Label`, `Button`, exibindo aviso vermelho em encerramento e disparando toast informativo em sucesso ou erro retornado pela RPC.

- [ ] **Step 4: Rodar o teste para confirmar que passa**
`npx vitest run src/components/plataforma/__tests__/CompanyLifecycleModal.test.tsx`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/plataforma/CompanyLifecycleModal.tsx src/components/plataforma/__tests__/CompanyLifecycleModal.test.tsx
git commit -m "feat(ui): implementar CompanyLifecycleModal com motivo obrigatorio"
```

---

### Task 5: Integração em `PlataformaEmpresasTable.tsx` e `usePlataforma.ts`

**Files:**
- Modify: `src/hooks/usePlataforma.ts`
- Modify: `src/components/plataforma/PlataformaEmpresasTable.tsx`
- Test: `src/components/plataforma/__tests__/PlataformaEmpresasTableLifecycle.test.tsx`

**Interfaces:**
- Modifica:
  - `PlataformaEmpresasTable`: exibe badges de 3 estados (`Ativa`, `Suspensa`, `Encerrada`).
  - Botões na tabela:
    - Se `ativa`: exibe "Suspender" e "Encerrar" (acionando o modal).
    - Se `suspensa`: exibe "Reativar" e "Encerrar" (acionando o modal).
    - Se `encerrada`: ações desabilitadas com badge "Terminal".
    - Se `is_internal`: ações desabilitadas com tooltip.
  - `usePlataforma`: substitui a mutação legada `useToggleEmpresaStatus` por `useTransitionCompanyLifecycle`.

- [ ] **Step 1: Escrever teste de renderização da tabela com os 3 estados**
Criar `src/components/plataforma/__tests__/PlataformaEmpresasTableLifecycle.test.tsx`:
- Empresa com status `ativa` exibe badge "Ativa" e botão "Suspender".
- Empresa com status `suspensa` exibe badge "Suspensa" e botão "Reativar".
- Empresa com status `encerrada` exibe badge "Encerrada" e não exibe botões de transição.
- Empresa com `is_internal = true` mantém botões desabilitados.

- [ ] **Step 2: Rodar o teste para verificar falha/adaptação**
`npx vitest run src/components/plataforma/__tests__/PlataformaEmpresasTableLifecycle.test.tsx`

- [ ] **Step 3: Implementar as alterações em `usePlataforma.ts` e `PlataformaEmpresasTable.tsx`**
Atualizar a query de métricas para considerar os status atualizados e plugar `CompanyLifecycleModal`.

- [ ] **Step 4: Rodar o teste para verificar aprovação**
`npx vitest run src/components/plataforma/__tests__/PlataformaEmpresasTableLifecycle.test.tsx`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/hooks/usePlataforma.ts src/components/plataforma/PlataformaEmpresasTable.tsx src/components/plataforma/__tests__/PlataformaEmpresasTableLifecycle.test.tsx
git commit -m "feat(plataforma): integrar maquina de estados de empresa na tabela de administracao"
```

---

### Task 6: Validação de Regressão Completa e Build

**Files:**
- Nenhum arquivo modificado diretamente (etapa de verificação).

- [ ] **Step 1: Rodar a suíte completa de testes unitários**
Executar: `npx vitest run`
Garantir que todos os 556 testes anteriores + novos testes (total >= 565) passam com 100% de sucesso.

- [ ] **Step 2: Rodar o build de produção**
Executar: `npm run build`
Garantir exit code 0 sem avisos de tipos TypeScript.

- [ ] **Step 3: Commit final se houver ajustes**
Garantir working directory limpo.
