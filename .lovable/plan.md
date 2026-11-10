# Solicitações de demonstração — notificação in-app + painel Super Admin

Hoje o formulário da landing grava em `contact_requests` (id, name, company, email, phone, message, created_at) e ninguém é avisado. A tabela não tem campo de status e não existe painel para consultá-la.

## Como vai funcionar

1. Um visitante envia o formulário na landing page.
2. O sino de notificações do Super Admin passa a mostrar "Nova solicitação de demonstração — Nome (Empresa)", com contador de não lidas.
3. Clicando na notificação, o Super Admin cai em `/admin-plataforma`, aba **Solicitações**, com a lista completa.
4. Na lista ele vê nome, empresa, e-mail, telefone, mensagem e data, e pode mudar o status de cada solicitação: Nova, Em contato, Convertida, Descartada. Também pode copiar o e-mail e abrir o cliente de e-mail direto.

Filtros por status e busca por nome/empresa/e-mail; badge com a contagem de solicitações novas na aba.

## Detalhes técnicos

**Migration**

- `public.admin_notifications` (id, type default `'contact_request'`, title, message, data jsonb, is_read, created_at, read_at) + índices em `is_read` e `created_at desc`.
  - `GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated; GRANT ALL TO service_role;` (sem grant para `anon`; sem INSERT direto — só o trigger `SECURITY DEFINER` escreve).
  - RLS habilitado; policies `SELECT` e `UPDATE` com `public.is_super_admin()`.
- Coluna `status text not null default 'nova'` em `contact_requests` com `CHECK (status in ('nova','em_contato','convertida','descartada'))`, mais policy de `UPDATE` restrita a `is_super_admin()` e `GRANT UPDATE ... TO authenticated`.
- Função `public.notify_new_contact_request()` (`SECURITY DEFINER`, `SET search_path = public, pg_temp`) inserindo em `admin_notifications` com `title` = 'Nova solicitação de demonstração', `message` = texto com nome/empresa/e-mail (o SQL enviado passava o `jsonb` na posição de `message`; será corrigido para `message` textual e `data` jsonb) e `data` com id/nome/empresa/e-mail/telefone/mensagem. Trigger `AFTER INSERT ON contact_requests FOR EACH ROW`.
- RPCs `SECURITY DEFINER` com `require`/`is_super_admin()` no corpo e `REVOKE EXECUTE FROM PUBLIC, anon`:
  - `get_admin_notifications(p_limit int default 20)`
  - `mark_admin_notification_read(p_id uuid)` e `mark_all_admin_notifications_read()`

**Frontend**

- `src/hooks/useAdminNotifications.ts`: query das notificações admin (habilitada só quando o papel é `super_admin`) + mutations de marcar como lida.
- `src/components/notifications/NotificationsDrawer.tsx`: mescla as notificações admin com as do usuário (mesma ordenação por não lida/data), ícone próprio (`Inbox`) e `action_url` = `/admin-plataforma?tab=solicitacoes`. O contador do sino soma as não lidas admin.
- `src/hooks/useContactRequests.ts`: listagem e mutation de status.
- `src/components/plataforma/ContactRequestsTab.tsx`: tabela com filtros, busca, badges de status, `Select` de status e ações de copiar e-mail / `mailto:`.
- `src/pages/AdminPlataforma.tsx`: nova aba "Solicitações" (com badge de novas) e leitura do parâmetro `?tab=` da URL para o link da notificação abrir na aba certa.

Nada muda na landing page nem no fluxo de gravação do formulário.
