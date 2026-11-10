# Especificação Técnica — Ciclo de Vida de Empresa (Máquina de Estados & Auditoria)

- **Data:** 2026-10-29
- **Status:** Proposto para Revisão
- **Autor:** Google Antigravity & Engenharia TalentGroup

---

## 1. Contexto e Motivação

Na plataforma multi-tenant de RH (NR-1Comprova), as empresas parceiras possuem contratos de 12 meses com faturamento mensal. Casos de inadimplência exigem a suspensão temporária dos serviços ou, em casos rescisórios, o encerramento definitivo do contrato.

Atualmente, o botão "Suspender" em `PlataformaEmpresasTable` utiliza um toggle legado (`suspender_empresa`) com parâmetro booleano, sem persistência de motivo, sem máquina de estados formal e sem auditoria imutável.

Esta especificação define a implementação de uma **máquina de estados finitos transacional** e auditável no PostgreSQL, com governança estrita de permissões e aviso visual imediato para todos os usuários da empresa suspensa.

---

## 2. Modelo de Estados e Regras de Transição

### 2.1 Estados Canônicos
Os estados permitidos em `companies.status` são:
1. `ativa`: Operação regular e contratada.
2. `suspensa`: Inadimplência ou suspensão administrativa com banner fixo de cobrança.
3. `encerrada`: Estado terminal de rescisão contratual, irreversível.

### 2.2 Matriz de Transições

| Estado Atual | Estado Alvo | Ação | Permitido? | Justificativa / Regra |
| :--- | :--- | :--- | :---: | :--- |
| `ativa` | `suspensa` | Suspender | **SIM** | Inadimplência ou ordem administrativa. Exige motivo. |
| `suspensa` | `ativa` | Reativar | **SIM** | Regularização financeira ou contratual. Exige motivo. |
| `ativa` | `encerrada` | Encerrar | **SIM** | Rescisão contratual direta. Estado terminal. Exige motivo. |
| `suspensa` | `encerrada` | Encerrar | **SIM** | Rescisão após período suspenso. Estado terminal. Exige motivo. |
| `encerrada` | *qualquer* | Reverter | **NÃO** | **Proibido.** Estado terminal imutável. Erro `42000`. |
| *X* | *X* | Repetir | **NÃO** | **Proibido.** Idempotência estrita: erro amigável se já estiver no estado. |

---

## 3. Segurança e Permissões (Backend First)

Apenas usuários com papel `super_admin` ou `admin_master` podem disparar transições de ciclo de vida. Usuários com papel `admin_empresa` **não podem** suspender, reativar ou encerrar a própria empresa (nem empresas terceiras).

A validação é feita diretamente no banco de dados na RPC com `SECURITY DEFINER`, utilizando as funções já existentes:
```sql
IF NOT (
  public.is_super_admin(auth.uid())
  OR public.is_admin_master(auth.uid())
) THEN
  RAISE EXCEPTION 'Permissão negada: apenas super_admin ou admin_master'
    USING ERRCODE = '42501';
END IF;
```

---

## 4. Banco de Dados e Migração

### 4.1 Normalização de `companies.status`
A coluna `status` já existe como `text` na tabela `companies`. O banco de dados atualmente possui 4 empresas com valor `'active'`.
A migração deve seguir rigorosamente esta ordem:

```sql
-- 1. Normalização dos dados existentes (active -> ativa)
UPDATE public.companies
SET status = 'ativa'
WHERE status = 'active' OR status IS NULL;

-- 2. Criação da CHECK constraint (após a normalização para não falhar)
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS check_companies_status;

ALTER TABLE public.companies
  ADD CONSTRAINT check_companies_status
  CHECK (status IN ('ativa', 'suspensa', 'encerrada'));

-- 3. Adição da coluna suspension_reason para evolução futura
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS suspension_reason text;
```

### 4.2 Tabela de Auditoria: `company_lifecycle_events`
Tabela append-only para registro histórico de cada alteração de estado.
*(Nota de conformidade LGPD: `ip_address` foi removido; a identificação do operador é feita unicamente via `changed_by`).*

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

-- Trigger de salvaguarda: bloqueia estritamente UPDATE e DELETE
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

-- RLS
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

### 4.3 RPC Transacional: `transition_company_lifecycle`
Função PostgreSQL que realiza a validação de permissões, verificação de máquina de estados, atualização da empresa e inserção na auditoria de forma atômica:

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

---

## 5. Frontend: UI, UX e Banner

### 5.1 Banner de Suspensão (`CompanySuspendedBanner`)
- **Localização:** Montado em `src/components/layout/MainLayout.tsx` (junto ao `Header` / `GestorAlertBanner`).
- **Comportamento:**
  - Consulta o status da empresa efetiva atual (`useEffectiveCompanyId` / hook `useCompanyStatus`).
  - Quando a empresa do usuário estiver com `status === 'suspensa'`, renderiza banner fixo no topo com estilo de alerta (amarelo âmbar / warning):
    > **⚠️ Serviços suspensos. Regularize o pagamento.**
  - Visível para todos os colaboradores e administradores vinculados à empresa.
  - Para `super_admin` e `admin_master` no Modo Plataforma (sem empresa ativa selecionada), o banner não é exibido.
  - Na versão 1 (v1), **não há bloqueio funcional** de telas ou rotas.

### 5.2 Modal de Transição (`CompanyLifecycleModal`)
- **Localização:** Invocado a partir de `PlataformaEmpresasTable.tsx`.
- **Campos e Ações:**
  - Identificação clara da empresa alvo e status atual.
  - Campo de texto obrigatório para `Motivo da transição` (validação com React Hook Form / Zod, mínimo 3 caracteres).
  - Em transições para `encerrada`:
    - Destaque em vermelho (`destructive`).
    - Alerta explícito: *"Atenção: o encerramento é um estado terminal e definitivo. A empresa não poderá ser reativada posteriormente."*
    - Botão de confirmação exige clique deliberado no botão destrutivo.
- **Chamada:**
  - Dispara a RPC `transition_company_lifecycle`.
  - Invalida a query do React Query `['plataforma']` e atualiza o estado local com toast de sucesso.

### 5.3 Tabela de Empresas (`PlataformaEmpresasTable.tsx`)
- **Badges de Status:**
  - `ativa` → Badge verde (`default`): "Ativa"
  - `suspensa` → Badge amarelo (`warning`): "Suspensa"
  - `encerrada` → Badge cinza/escuro (`secondary`): "Encerrada"
- **Ações disponíveis:**
  - Se `ativa`: Botões "Suspender" e "Encerrar".
  - Se `suspensa`: Botões "Reativar" e "Encerrar".
  - Se `encerrada`: Ações desabilitadas (exibe texto ou badge "Terminal").
  - Se `is_internal = true`: Botões de suspensão/encerramento desabilitados com tooltip explicativo.

---

## 6. Plano de Testes

### 6.1 Testes Unitários de Frontend (Vitest)
1. `CompanySuspendedBanner.test.tsx`:
   - Renderiza o banner fixo quando o status da empresa efetiva é `'suspensa'`.
   - Não renderiza o banner quando o status é `'ativa'`.
   - Não renderiza o banner quando o usuário é Super Admin sem empresa selecionada.
2. `CompanyLifecycleModal.test.tsx`:
   - Bloqueia o submit com mensagem de erro quando o motivo está vazio ou tem menos de 3 caracteres.
   - Renderiza aviso especial destrutivo quando a ação é encerrar empresa.
   - Dispara a RPC com os parâmetros corretos ao preencher o motivo e confirmar.
3. `PlataformaEmpresasTable.test.tsx`:
   - Renderiza badges correspondentes aos 3 estados (`Ativa`, `Suspensa`, `Encerrada`).
   - Desabilita ações de alteração de estado para empresas com status `encerrada`.

### 6.2 Testes de Integração / RPC
- Execução de script de teste contra o banco de dados de integração:
  - Validação de que `admin_empresa` recebe erro `42501`.
  - Validação de que `ativa` → `suspensa` sucede e grava em `company_lifecycle_events`.
  - Validação de que tentativa de UPDATE ou DELETE em `company_lifecycle_events` dispara exceção da trigger de imutabilidade.
  - Validação de que `encerrada` → `ativa` falha com erro de estado terminal.
  - Validação de que `suspensa` → `suspensa` falha com erro de idempotência.

---

## 7. Critérios de Conclusão (Definition of Done)
1. Migração executada no Supabase sem erros, preservando os dados das 4 empresas existentes.
2. Trigger anti-mutação ativa em `company_lifecycle_events`.
3. RPC `transition_company_lifecycle` validada com permissões de `is_super_admin` e `is_admin_master`.
4. Modal de transição com motivo obrigatório integrado a `PlataformaEmpresasTable`.
5. Banner de suspensão integrado a `MainLayout`.
6. Baseline de 556 testes preservado e novos testes unitários adicionados com 100% de aprovação.
7. `npm run build` compilando com exit code 0.
