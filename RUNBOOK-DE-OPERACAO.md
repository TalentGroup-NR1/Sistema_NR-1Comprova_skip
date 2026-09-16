# NR1-Pronto — Runbook de Operação e Sustentação

**Plataforma:** NR1-Pronto (SaaS Multi-tenant de Gestão de RH, SST e Comunicação)  
**Empresa Mantenedora:** Talent Group  
**Domínio Oficial de Produção:** `https://www.nr-1pronto.com.br` (Canônico; o apex `https://nr-1pronto.com.br` responde com redirect permanente HTTP 308)  
**Supabase Project Ref:** `alneozvrsuwszlkisbyo`

---

## 1. Arquitetura Geral da Plataforma

```
[ Usuário Final / Browser ]
           │
           ▼ (HTTPS / TLS 1.3)
[ Cloudflare Gateway & WAF ] ──> Proteção DDoS, CDN, Rate Limiting & Bot Fight
           │
           ├───> [ Frontend / Vercel ] ──> SPA React 18 + Vite + Tailwind (SSG/Client)
           │
           └───> [ Backend / Supabase ]
                     ├── PostgreSQL 15 + Row Level Security (RLS Multi-Tenant)
                     ├── 21 Edge Functions (Deno Runtime)
                     ├── Storage Buckets (fechamentos-ponto, documentos_analise)
                     └── PGMQ (Filas de e-mails assíncronos)
```

---

## 2. Matriz de Secrets e Variáveis de Ambiente

### A. Backend (Supabase Secrets — `project-ref: alneozvrsuwszlkisbyo`)

| Secret | Finalidade | Escopo / Acesso |
|---|---|---|
| `APP_ORIGIN` | Domínio canônico oficial (`https://www.nr-1pronto.com.br`) usado em links transacionais de e-mail e validação estrita de CORS nas Edge Functions (atenção: o apex `https://nr-1pronto.com.br` sofre redirect 308 na borda Vercel, logo as requisições SPA e callbacks originam de `https://www.nr-1pronto.com.br`) | Obrigatório |
| `CRON_SECRET` | Chave de autenticação passada no header `x-cron-secret` para disparo dos crons (ex.: `cuidar-ativar-campanhas`) | Obrigatório |
| `WEBHOOK_SECRET` | Validação de assinatura em webhooks externos (`handle-email-suppression`) | Obrigatório |
| `RESEND_API_KEY` | Chave de envio transacional via Resend (`process-email-queue`, `send-pulse-reminder`) | *Pendente (ativação comercial)* |
| `OPENAI_API_KEY` | Chave da OpenAI GPT-4o para OCR de currículos (`analyze-profile`) | *Opcional (possui fallback local)* |

### B. Frontend (Vercel Environment Variables)

| Variável | Valor de Produção |
|---|---|
| `VITE_SUPABASE_URL` | `https://alneozvrsuwszlkisbyo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (chave anônima pública) |

---

## 3. Checklist de Deploy e Publicação

### Deploy de Edge Functions (Backend)
```bash
# 1. Deploy individual de uma função
npx supabase functions deploy <nome-da-funcao> --project-ref alneozvrsuwszlkisbyo

# 2. Deploy em lote de todas as 21 funções
Get-ChildItem supabase\functions -Directory | Where-Object { $_.Name -ne '_shared' } | ForEach-Object {
    npx supabase functions deploy $_.Name --project-ref alneozvrsuwszlkisbyo
}
```

### Deploy do Frontend (Vercel)
O deploy é acionado automaticamente a cada `git push origin main` via integração com o GitHub (`TalentGroup-NR1/NR-1Pronto`).

---

## 4. Monitoramento e Logs das Edge Functions

### Via CLI
```bash
# Acompanhar logs em tempo real de uma função específica
npx supabase functions logs analyze-profile --project-ref alneozvrsuwszlkisbyo

# Filtrar logs de erro do processador de filas
npx supabase functions logs process-email-queue --project-ref alneozvrsuwszlkisbyo
```

### Via Dashboard
Acesse: `https://supabase.com/dashboard/project/alneozvrsuwszlkisbyo/functions` -> Selecione a função -> **Logs / Metrics**.

---

## 5. Rotina de Backup e Restauração do Banco de Dados

### Backup Lógico via CLI
```bash
# Exportar schema e dados completos
npx supabase db dump --project-ref alneozvrsuwszlkisbyo -f backup_nr1pronto_$(date +%Y%m%d).sql

# Exportar apenas dados de tabelas específicas
npx supabase db dump --project-ref alneozvrsuwszlkisbyo --data-only -f backup_data.sql
```

### Backups Automáticos
O Supabase realiza backups diários automatizados (Point-in-Time Recovery habilitável no painel Database -> Backups).

---

## 6. Procedimento de Rollback de Emergência

### Rollback do Frontend (Vercel)
1. Acesse o painel do projeto na Vercel -> Aba **Deployments**.
2. Localize a versão anterior estável.
3. Clique nos três pontos (`...`) -> **Instant Rollback**. O tráfego é redirecionado instantaneamente (sub-segundo).

### Rollback de Edge Functions (Backend)
1. Reverta o commit no Git local (`git revert <commit-hash>`).
2. Reimplante a função desejada:
   ```bash
   npx supabase functions deploy <nome-da-funcao> --project-ref alneozvrsuwszlkisbyo
   ```

---

## 7. Tabela de Pendências Conhecidas e Ativação

| Item | Status | Responsável | Ação Necessária |
|---|---|---|---|
| **RESEND_API_KEY** | ⚠️ Pendente | Gestão / TI | Obter chave do Resend e definir via `npx supabase secrets set` |
| **OPENAI_API_KEY** | ℹ️ Opcional | TI | Inserir chave da OpenAI para habilitar OCR avançado de imagem (fallback local ativo) |
| **DNS Cloudflare** | 🔄 Em propagação | DevOps / Registro.br | Confirmar troca dos nameservers no Registro.br |
