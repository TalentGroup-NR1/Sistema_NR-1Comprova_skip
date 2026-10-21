# Fechamento e Homologação — Multi-Perfil Fase 1

**Projeto:** Sistema NR-1Comprova  
**Data:** 21 de Outubro de 2026  
**Status:** CONCLUÍDO E HOMOLOGADO (Etapa 4 de 4)  
**Ambiente:** Supabase (`alneozvrsuwszlkisbyo`) & Produção Vercel  

---

## 1. Resumo Executivo da Funcionalidade

### 1.1. O Que É
O recurso **Multi-Perfil** introduz a capacidade de alternância instantânea de contexto e visualização dentro da aplicação NR-1Comprova no modelo consagrado estilo *Flash*:
- **🏢 Perfil da Empresa:** Visualização voltada à gestão, departamentos, colaboradores, demissões, relatórios, parametrizações e acessos da empresa.
- **👤 Meu Perfil:** Visualização pessoal e de autoatendimento do colaborador (Minhas Férias, Minhas Tarefas / Atividades, Diário de Bordo, Meus Feedbacks).

### 1.2. Para Quem
Destina-se a usuários corporativos que desempenham múltiplos papéis simultâneos dentro da organização (ex.: um usuário que é **Administrador da Empresa** ou **Analista de RH** e, ao mesmo tempo, um **Colaborador** com tarefas, ciclo de feedbacks e férias a usufruir).
- **Usuários com múltiplos papéis (2+ papéis):** O seletor estilo Flash é exibido em destaque no topo da Sidebar, permitindo alternância em 1 clique.
- **Usuários de papel único (1 papel):** A interface renderiza o cabeçalho fixo tradicional, sem ruído visual e sem confusão operacional.

### 1.3. Como Funciona (Arquitetura Técnica Server-Side)
- **Persistência Server-Side:** O papel ativo é registrado na coluna `active_role` (`public.profiles`) através da RPC segura `set_active_role(p_role)`.
- **Anti-Escalação de Privilégio:** A RPC é executada com `SECURITY DEFINER` e valida rigorosamente se `auth.uid()` de fato possui a role solicitada em `public.user_roles`. Qualquer tentativa não autorizada é imediatamente barrada pelo PostgreSQL com erro `42501` (`Acesso negado: o usuário não possui o papel ...`).
- **Resolução Dinâmica em Camadas (`get_my_role()`):**
  1. Se `profiles.is_active` for `false`, retorna `NULL` (fail-closed imediato);
  2. Se `profiles.active_role` estiver definido e o usuário ainda possuir esse papel em `user_roles`, retorna `active_role`;
  3. Fallback 1: Retorna o papel da empresa ativa vinculada em `user_companies`;
  4. Fallback 2: Retorna o papel mais prioritário em `user_roles`.
- **Zero Reautenticação:** Nenhuma invalidação ou reemissão forçada de token JWT é necessária; a alternância é refletida instantaneamente no frontend e consumida pelas 9 Edge Functions via chamada à RPC `get_my_role()`.
- **Sincronização Multi-Aba:** Comunicação instantânea entre abas no mesmo navegador através de canal de sincronização no `localStorage` (`nr1_active_role_sync`).
- **Respeito ao Multi-Tenant:** Ao alternar de empresa (`set_active_company`), o `active_role` é automaticamente resetado para `NULL`, garantindo que a sessão assuma o papel padrão configurado para a empresa de destino.

### 1.4. Limitações Conhecidas (Fase 1)
- O isolamento fino de baixo nível no PostgreSQL permanece ancorado nas policies de RLS existentes e na função `has_role(role)` (que checa a existência na tabela `user_roles`).
- A Fase 1 foca no isolamento visual, de navegação, componentes condicionais e Edge Functions, sem alterar as mais de 400 policies de RLS do banco de produção antes do go-live de 03/11.

---

## 2. Registro de Backlog: Fase 2 (Pós Go-Live)

A **Fase 2 do Multi-Perfil** está planejada para o ciclo pós go-live e contempla o aprofundamento das camadas de autorização estruturais do banco de dados:

1. **Refatoração N:N em `user_companies`:**
   - Permitir múltiplos vínculos de papéis por empresa na tabela `user_companies` (eliminando a restrição `UNIQUE(user_id, company_id)` que limitava a 1 único papel por empresa).
2. **Reescrita Contextual da Função `has_role()`:**
   - Atualizar a assinatura e comportamento de `has_role(p_role app_role, p_company_id uuid DEFAULT NULL)` para considerar prioritariamente o `active_role` selecionado na sessão atual e a empresa ativa.
3. **Revisão das 400+ Policies de RLS:**
   - Refatorar as políticas de Row Level Security para substituir checagens puramente existenciais de `user_roles` por validações estritas do papel ativo contextualmente em execução.

---

## 3. Provas da Bateria de Segurança e Homologação E2E

A bateria automatizada executada via script [`scripts/test_bateria_seguranca_etapa4.ts`](file:///c:/Users/josenildo.santos/talentgroup/TALENTGROUP%20-%20DHO/Sistema_NR-1Comprova/scripts/test_bateria_seguranca_etapa4.ts) contra o Supabase de produção validou os seguintes cenários:

| Teste | Cenário Avaliado | Resultado Observado | Veredito |
|---|---|---|---|
| **Segurança 1** | Colaborador comum tentando `set_active_role('admin_empresa')` | Exceção Postgres 42501: *"Acesso negado: o usuário não possui o papel admin_empresa"* | **APROVADO** |
| **Segurança 1b** | Colaborador comum tentando `set_active_role('admin_master')` | Exceção Postgres 42501: *"Acesso negado: o usuário não possui o papel admin_master"* | **APROVADO** |
| **Segurança 2** | Multi-Tenant: Alternância de empresa com `set_active_company` | `active_role` é resetado para `NULL` e papel resolvido para o vínculo da empresa destino | **APROVADO** |
| **Segurança 3** | Desligamento de usuário com 2 papéis | `profiles.is_active = false`, `active_role = null`, ban no Auth aplicado (`2999-12-31`), `get_my_role() = null`, `set_active_role` bloqueado | **APROVADO** |
| **Segurança 3b** | Reativação de colaborador | `profiles.is_active = true`, ban no Auth revogado, acesso reestabelecido | **APROVADO** |
| **Segurança 4** | Varredura de RLS na Fase 1 | Nenhuma policy de RLS foi modificada; função `has_role()` permaneceu intocada | **APROVADO** |
| **Homologação E2E** | Modo "👤 Meu Perfil" (colaborador) | Acesso validado às tabelas `tasks`, `feedback_cycles`, `ferias_periodos_aquisitivos` | **APROVADO** |
| **Homologação E2E** | Modo "🏢 Perfil da Empresa" (gestão) | Acesso validado a `colaboradores`, desligamentos e `user_companies` | **APROVADO** |
| **Limpeza** | Cleanup de dados de teste | Todos os dados e credenciais criadas para o teste foram 100% expurgados | **APROVADO** |

---

## 4. Conclusão da Fase 1

Todas as etapas planejadas e aprovadas pela gestão foram executadas e validadas:
- **Etapa 1:** Modelagem server-side + RPCs anti-escalação.
- **Etapa 2:** UX do seletor estilo Flash na Sidebar com isolamento de visibilidade.
- **Etapa 3:** Propagação para o frontend (rotas, componentes, hooks) e 9 Edge Functions via `get_my_role()`.
- **Etapa 4:** Bateria final de segurança, homologação completa de superfícies e documentação de fechamento.
