# NR-1Comprova — Backend Deployment & Secrets Status

**Data:** 01/09/2026  
**Supabase Project Ref:** `alneozvrsuwszlkisbyo`  
**Domínio Oficial de Produção:** `https://nr1pronto.com.br`

---

## 1. Status das Secrets no Supabase

| Secret | Status | Observação |
|---|---|---|
| `APP_ORIGIN` | ✅ Configurado | `https://nr1pronto.com.br` |
| `WEBHOOK_SECRET` | ✅ Configurado | Chave aleatória segura gerada para validação de webhooks |
| `CRON_SECRET` | ✅ Configurado | Chave aleatória segura para proteção dos crons |
| `RESEND_API_KEY` | ⚠️ **PENDENTE** | **Configuração adiada em ~2 semanas a pedido do cliente.** As funções de e-mail sobem normalmente e aguardam a chave antes de enviar mensagens reais. |
| `SUPABASE_URL` | ✅ Automático | Injetado pela infraestrutura Supabase |
| `SUPABASE_ANON_KEY` | ✅ Automático | Injetado pela infraestrutura Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Automático | Injetado pela infraestrutura Supabase |

> [!IMPORTANT]
> **Antes de liberar o envio de e-mails para clientes em produção:**
> Configurar a secret do Resend via CLI:
> ```bash
> npx supabase secrets set "RESEND_API_KEY=re_sua_chave_aqui" --project-ref alneozvrsuwszlkisbyo
> ```

---

## 2. Edge Functions Implantadas (21 Ativas)

Todas as funções foram compiladas e implantadas com sucesso no projeto `alneozvrsuwszlkisbyo`:

1. `analyze-profile` (OpenAI / extração nativa de perfil)
2. `assinar-fechamento` (Assinatura digital de espelhos/fechamento)
3. `create-user` (Criação de usuários com CORS restrito)
4. `cuidar-ativar-campanhas` (Cron diário Cuidar+ com queries em lote)
5. `cuidar-lembrete-streak` (Cron semanal de lembretes Cuidar+)
6. `espelho-mensal-pdf` (Geração e download de PDF de folha de ponto)
7. `exportar-fechamento` (Exportação de fechamento de ponto)
8. `fechar-periodo` (Fechamento consolidado de ciclo de ponto)
9. `finalize-colaborador-user` (Onboarding de colaborador com lookup indexado)
10. `handle-email-suppression` (Webhook seguro com validação de assinatura)
11. `handle-email-unsubscribe` (Opt-out público com rate limiting por IP)
12. `preview-transactional-email` (Visualização dos 6 templates transacionais)
13. `process-email-queue` (Processador de filas de e-mail com DLQ)
14. `reabrir-periodo` (Reabertura unitária de ponto)
15. `reabrir-periodo-massa` (Reabertura em lote de ponto)
16. `reenviar-acesso-colaborador` (Reenvio de credenciais com rate limiting)
17. `register-company` (Cadastro público com validação O(1) e rate limiting)
18. `registrar-ponto` (Registro de batidas de ponto geolocalizado)
19. `send-pulse-reminder` (Lembrete de pesquisa semanal de clima)
20. `send-transactional-email` (Disparo de e-mails transacionais)
21. `update-user` (Atualização segura de usuários)

*Função `reset-password` (backdoor) e diretório órfão `reenviar-acesso-em-massa`: DELETADOS permanentemente do código e do servidor remoto.*
