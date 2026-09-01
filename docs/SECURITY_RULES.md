# Security Baseline — Regras Obrigatórias

Este documento é o **baseline de segurança não-negociável** do projeto. Toda nova feature, migration ou Edge Function DEVE seguir estas regras. Auditoria aplicada e validada em produção (Fase 2 AppSec).

---

## 1. RLS (Row Level Security)

- **Toda nova tabela em `public` DEVE ter RLS ativado na MESMA migration que a cria.**
  ```sql
  CREATE TABLE public.<nome> (...);
  GRANT ... ON public.<nome> TO authenticated;
  GRANT ALL ON public.<nome> TO service_role;
  ALTER TABLE public.<nome> ENABLE ROW LEVEL SECURITY;
  CREATE POLICY ... ;
  ```
- Políticas devem escopar por `auth.uid()` ou `company_id` via helpers `get_my_company_id()` / `get_my_role()`.
- **Proibido** policies com `USING (true)` em tabelas com dados sensíveis.
- `admin_master` bypass: via `company_id IS NULL` + helper `has_role()`.

## 2. RPCs Administrativas (SECURITY DEFINER)

Toda RPC que modifica dados sensíveis ou executa ações administrativas DEVE incluir no topo do corpo:

```sql
CREATE OR REPLACE FUNCTION public.<nome>(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp   -- OBRIGATÓRIO (M2)
AS $$
BEGIN
  PERFORM public.require_admin_role();   -- OBRIGATÓRIO (A1/A4)
  -- corpo original aqui
END;
$$;
```

- `require_admin_role()` valida `admin_master`, `admin_empresa` ou `analista_rh`.
- Para RPCs com guard customizado (ex: só `admin_master`), validar explicitamente via `has_role(auth.uid(), 'admin_master')`.
- **Sempre `SET search_path = public, pg_temp`** — previne hijack de função.

## 3. Permissões (GRANT EXECUTE)

- **Padrão:** após `CREATE FUNCTION`, sempre:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<nome>(...) FROM PUBLIC, anon;
  GRANT  EXECUTE ON FUNCTION public.<nome>(...) TO authenticated;
  ```
- **Nunca** `GRANT EXECUTE TO anon` — exceto em RPCs explicitamente públicas (formulários externos: denúncias anônimas, validação de certificado, tokens de questionário). Documente o motivo no comentário da função.
- Triggers internos: `GRANT EXECUTE TO service_role` apenas.

## 4. Edge Functions

### `supabase/config.toml`
- Funções administrativas (criação/edição de usuários, IA, finalização de cadastro): `verify_jwt = true`.
- Funções públicas (webhooks, links públicos via token): `verify_jwt = false` + validação interna do token.
- Funções de CRON: `verify_jwt = false` + header `x-cron-secret` obrigatório:
  ```ts
  const expected = Deno.env.get("CRON_SECRET");
  const received = req.headers.get("x-cron-secret");
  if (!expected || received !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }
  ```

### Autorização em código (defesa em profundidade)
Mesmo com `verify_jwt = true`, validar dentro da função:
- `supabase.auth.getUser()` para obter o caller.
- Checagem de role via tabela `user_roles` antes de qualquer ação privilegiada.
- `admin_empresa` jamais pode operar fora do próprio `company_id`.

## 5. Validação de Payload (A4 + M4)

Toda Edge Function DEVE:

1. **Limitar Content-Length** (rejeitar com `413` se exceder):
   - Padrão: **1 MB**
   - Exceções documentadas: `analyze-profile` = 20 MB (upload de docs).
   ```ts
   const MAX_BODY_BYTES = 1_048_576;
   const contentLength = Number(req.headers.get('content-length') ?? '0');
   if (contentLength > MAX_BODY_BYTES) return json({ error: 'Payload too large' }, 413);
   ```

2. **Validar body com Zod** (rejeitar com `400` se inválido):
   ```ts
   import { z } from "https://esm.sh/zod@3.23.8";
   const Schema = z.object({ id: z.string().uuid(), motivo: z.string().min(5).max(1000) });
   const parsed = Schema.safeParse(await req.json().catch(() => null));
   if (!parsed.success) {
     return json({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }, 400);
   }
   ```

3. **Nunca** confiar no client — todo enum, UUID, string, número precisa de schema.

---

## Storage

- Buckets privados (currículos, treinamentos, documentos HR): acesso via **signed URLs** apenas.
- `storage.buckets` NÃO concede `SELECT` para `anon` (apenas `authenticated`).
- Sanitizar nome de arquivo no upload.

## Segredos

- `SUPABASE_SERVICE_ROLE_KEY` **jamais** no frontend.
- `CRON_SECRET`, `OPENAI_API_KEY`: apenas em Edge Functions via `Deno.env.get()`.

---

## Checklist por PR

Antes de mergear qualquer PR que toca backend, confirmar:

- [ ] Toda nova tabela tem `GRANT` + `ENABLE RLS` + `POLICY` na mesma migration.
- [ ] Toda nova RPC admin tem `PERFORM require_admin_role()` + `SET search_path = public, pg_temp`.
- [ ] Toda nova RPC tem `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT` explícito.
- [ ] Toda nova Edge Function tem `verify_jwt = true` (ou justificativa documentada).
- [ ] Toda nova Edge Function tem Content-Length guard + Zod schema.
- [ ] Nenhum log de Edge Function imprime PII, tokens ou segredos.

## Content-Security-Policy (CSP)

A meta `Content-Security-Policy` é injetada por um plugin do Vite (`cspPlugin` em `vite.config.ts`) com dois perfis:

- **Produção** (`vite build`): estrito. `script-src` sem `'unsafe-inline'`, `img-src` restrito a Supabase/Lovable/data/blob, `frame-ancestors 'none'`, `upgrade-insecure-requests`.
- **Dev/preview** (`vite serve`): permissivo, necessário para HMR e editor visual da Lovable.

Exceções deliberadas em produção (não remover sem validar):
- `script-src 'unsafe-eval'` — necessário para `cdn.gpteng.co` (editor) e libs de PDF/charts (jsPDF, html2canvas, Recharts) que usam `new Function`.
- `style-src 'unsafe-inline'` — Radix UI, Recharts, react-day-picker e Tailwind animations dependem de estilos inline.
- `fonts.googleapis.com` / `fonts.gstatic.com` — Google Fonts em `ComunicadoFlyerDetail.tsx`.
- `youtube.com` / `player.vimeo.com` — embeds de vídeo em Cuidar+ e Benefícios.

Nonces reais exigem SSR/edge — não disponível neste SPA estático.

## Headers de segurança via meta tags

Headers HTTP reais (`Server`, `X-Deployment-Id`, etc.) são adicionados pela infraestrutura Lovable/Cloudflare e **não são editáveis pelo código**. Como mitigação, o `securityHeadersPlugin` em `vite.config.ts` injeta no `<head>` os equivalentes em meta `http-equiv`:

- `Permissions-Policy` — desativa camera, microphone, geolocation, sensores, payment, usb, autoplay e XR.
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (reforça o `frame-ancestors 'none'` do CSP).
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

Limitações conhecidas:
- Não é possível remover `Server: cloudflare` nem `X-Deployment-Id`.
- O fingerprint de React/Vite no bundle JS é inerente a SPAs client-side.

## Cookies de sessão (CSRF) — Mitigado por arquitetura

**Item de auditoria:** "Cookies de sessão sem `SameSite=Strict` / `HttpOnly` / `Secure`."

**Avaliação:** não aplicável a este projeto.

A sessão Supabase é persistida em `localStorage` (`src/integrations/supabase/client.ts`, `storage: localStorage`, `persistSession: true`, `autoRefreshToken: true`) e enviada como header `Authorization: Bearer ...` em cada requisição. Não existem cookies de sessão emitidos pela aplicação — portanto:

- **CSRF clássico está neutralizado por design**: o navegador não anexa credenciais automaticamente em requisições cross-site, pois não há cookie de auth.
- `HttpOnly=true` é impossível em SPA estática: só pode ser definido por header `Set-Cookie` do servidor, e esta arquitetura (Vite + React servida como estático) não tem servidor próprio. Migrar exigiria SSR (`@supabase/ssr` + edge middleware).
- `Secure` é garantido na prática porque o domínio só responde via HTTPS.

**Trade-off aceito:** o vetor relevante neste modelo é XSS (não CSRF). Mitigação ativa abaixo.

## XSS — Sanitização de HTML de usuário

Todo conteúdo de usuário renderizado com `dangerouslySetInnerHTML` passa pelo helper centralizado `sanitizeRichText` em `src/lib/sanitize.ts` (DOMPurify com allowlist explícita: bloqueia `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, handlers `on*` e URIs `javascript:`). Links com `target="_blank"` recebem `rel="noopener noreferrer"` automaticamente via hook.

**Pontos cobertos** (não usar `DOMPurify.sanitize` solto — sempre o helper):
- Comunicados internos: `ComunicadosList`, `ComunicadoFlyerDetail`, `EnvioComunicados`, `PortalColaborador`, `GlobalBlockerModal`.
- Feedback 1:1: `FeedbackTimeline` (campo `detalhes_conversa`).
- Parecer consultivo: `ReportConsultingPage`.

**Não requerem sanitização HTML** (texto puro ou só PDF):
- `analise_documental` do PROART: passa por `htmlParaPlano()` antes de entrar no PDF (`relatorioProartPDF.ts`); nunca volta como `innerHTML` no DOM.
- Descrições de Planos de Ação e demais textareas: renderizados como texto, não HTML.

**Exceção auditada:** `src/components/ui/chart.tsx` usa `dangerouslySetInnerHTML` para injetar CSS de tema do shadcn — string controlada pelo dev, sem input de usuário.

## Infraestrutura e Portas de Rede — Não aplicável ao código

**Item de auditoria:** "13 portas abertas no servidor para a internet."

**Avaliação:** não aplicável. Este projeto é uma SPA estática (Vite + React) hospedada pela infraestrutura gerenciada da Lovable, com backend Lovable Cloud (Supabase). Não há servidor próprio, `nginx.conf`, `iptables`, `docker-compose` ou config de borda no repositório.

As portas detectadas (tipicamente 80, 443, 8080, 8443, 2052, 2053, 2082, 2083, 2086, 2087, 2095, 2096) pertencem ao **edge layer da Cloudflare / Lovable** e são publicadas por padrão para qualquer site servido pela CDN. Todas terminam no mesmo serviço HTTPS, com o mesmo certificado TLS e as mesmas regras de WAF — não são serviços distintos com superfícies de ataque independentes.

**Ações de mitigação possíveis:** nenhuma a nível de código. Eventual restrição teria que ser solicitada ao suporte da plataforma de hospedagem.

---

## Resumo consolidado — Onda de hardening (2026-06)

Bíblia rápida para próximos devs. Detalhes em cada seção acima.

| # | Item de auditoria | Status | Onde está implementado |
|---|---|---|---|
| 1 | Proteção de rota `/colaboradores` + rate limit | ✅ Mitigado | `ProtectedRoute` (`src/App.tsx`), RPC `get_colaboradores_seguro`, tabelas `rate_limits` + `security_rate_limit_logs`, hook `useColaboradores` com toast 429 |
| 2 | RLS no banco | ✅ Já estava ativo | 4 policies em `public.colaboradores` (admin_master, admin_empresa, analista_rh, gestor_departamento via `gestor_id`); deny-all em `rate_limits` e `security_rate_limit_logs` |
| 3 | MFA / 2FA opcional | ✅ Mitigado | `MfaSection` no `PerfilDialog` (enroll TOTP), `MfaChallenge` no `AuthForm` (challenge AAL1→AAL2). Infra pronta para forçar `aal2` em `admin_master` no futuro |
| 4 | CSP com `unsafe-inline` / `unsafe-eval` | ✅ Mitigado (Opção B) | `cspPlugin` em `vite.config.ts`: prod estrito sem `unsafe-inline` em scripts; dev permissivo para HMR. Exceções documentadas na seção CSP |
| 5 | Fingerprinting de framework / headers | ✅ Mitigado por hardening | `securityHeadersPlugin` injeta Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, COOP, CORP via meta. Build com chunks hash-only (`assets/[hash].js`), sem sourcemap, `esbuild.legalComments: "none"` |
| 6 | Cookies SameSite/HttpOnly/Secure | ✅ Mitigado por arquitetura | Sessão em localStorage + Bearer token — CSRF neutralizado por design (sem cookies de sessão). HttpOnly exigiria SSR |
| 7 | XSS em rich text | ✅ Mitigado | Helper único `sanitizeRichText` em `src/lib/sanitize.ts` (DOMPurify + allowlist endurecida). Aplicado em comunicados, feedback e parecer consultivo |
| 8 | Portas de rede abertas | ⚪ Não aplicável | Infraestrutura gerenciada (CDN Cloudflare/Lovable) |

**Regras permanentes para novo código:**
- Nunca usar `DOMPurify.sanitize` direto em UI — sempre `sanitizeRichText`.
- Nunca ler `public.colaboradores` direto no frontend — sempre via `get_colaboradores_seguro` (rate-limited + scope re-validado).
- Toda nova tabela pública precisa `GRANT` + RLS + policies na mesma migration (ver topo deste doc).
- Toda nova rota sensível deve estar dentro de `<ProtectedRoute>` em `src/App.tsx`.
- Antes de adicionar lib que peça `unsafe-inline` em scripts, revisar `cspPlugin` em `vite.config.ts`.
