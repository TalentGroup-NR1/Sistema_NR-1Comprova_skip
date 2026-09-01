# Relatório de Segurança — Onda 2026-06-25

**Projeto:** Talent Group Gestão Ativa
**Stack:** SPA Vite/React + Lovable Cloud (Supabase)
**Data:** 25 de junho de 2026
**Escopo:** consolidação de todas as correções de segurança aplicadas na onda de hardening.

---

## Sumário executivo

| Itens auditados | 8 |
|---|---|
| Mitigados via código nesta onda | 5 (rate-limit, MFA, CSP, anti-fingerprint, XSS) |
| Já mitigados anteriormente (verificados) | 1 (RLS) |
| Mitigados por arquitetura | 1 (cookies / CSRF) |
| Não aplicáveis (infraestrutura gerenciada) | 1 (portas de rede) |

---

## 1. Proteção de rota + Rate Limiting (`/colaboradores`)

**Status:** Mitigado.

- `<ProtectedRoute>` em `src/App.tsx` confirmado bloqueando acesso anônimo.
- Criadas tabelas `public.rate_limits` e `public.security_rate_limit_logs` (RLS deny-all, acesso só via SECURITY DEFINER).
- Função `public.check_rate_limit` com logging de bloqueios.
- RPC `get_colaboradores_seguro` aplica **30 req/min** + validação redundante de escopo por role (admin_master vê tudo; demais restritos por `company_id`).
- `src/hooks/useColaboradores.ts` refatorado: consome a RPC, trata `rate_limit_exceeded` com toast, e fica gated por sessão estável (evita flash de conteúdo).

## 2. Row-Level Security (RLS) no banco

**Status:** já estava ativo — verificado.

- 4 policies em `public.colaboradores` cobrindo `admin_master`, `admin_empresa`, `analista_rh` e `gestor_departamento` (escopo via `gestor_id`).
- `rate_limits` e `security_rate_limit_logs` com RLS + policy deny-all.

## 3. MFA / Autenticação de dois fatores

**Status:** Mitigado (opt-in).

- `src/components/profile/MfaSection.tsx` integrado ao `PerfilDialog` — enroll TOTP com QR code, verificação inicial e desativação.
- `src/components/auth/MfaChallenge.tsx` intercepta o `AuthForm`: se o usuário tem fator enrolado, exige código TOTP antes de completar login (AAL1 → AAL2).
- Cancelar challenge no login dispara `signOut` (não deixa sessão pendurada).
- Infra pronta para forçar `aal2` em `admin_master` no futuro.

## 4. Content-Security-Policy (CSP)

**Status:** Mitigado (Opção B — hardening de produção).

- `cspPlugin` em `vite.config.ts` com perfil duplo:
  - **Produção:** `script-src` sem `unsafe-inline`; `img-src` restrito a Supabase/Lovable/data/blob; `frame-ancestors 'none'`; `upgrade-insecure-requests`.
  - **Dev/preview:** permissivo para HMR e editor Lovable.
- `cdnjs.cloudflare.com` removido (não usado).
- Exceções deliberadas documentadas: `unsafe-eval` (jsPDF, Recharts, editor `cdn.gpteng.co`), `unsafe-inline` em styles (Radix UI).

## 5. Anti-fingerprinting + Headers de segurança

**Status:** Mitigado.

- `securityHeadersPlugin` (`vite.config.ts`) injeta meta `http-equiv`:
  - `Permissions-Policy` — desativa camera, microphone, geolocation, sensores, payment, USB, autoplay, XR.
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
- Build ofuscado:
  - Chunks com nome hash-only (`assets/[hash].js`) — sem `vendor-react`, etc.
  - `sourcemap: false`, `esbuild.legalComments: "none"`.
- `index.html` validado: zero menções a Vite/React/versões.

## 6. Cookies SameSite/HttpOnly/Secure

**Status:** Mitigado por arquitetura (não aplicável a SPA estática).

- Sessão em `localStorage` + header `Authorization: Bearer` — **não há cookies de sessão**.
- CSRF clássico neutralizado por design (navegador não anexa credenciais cross-site).
- `HttpOnly=true` exigiria SSR (mudança de arquitetura — não recomendado).

## 7. XSS — Sanitização de HTML

**Status:** Mitigado.

- Helper centralizado `src/lib/sanitize.ts` (`sanitizeRichText`) — DOMPurify com **allowlist explícita**, bloqueia `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, handlers `on*` e URIs `javascript:`. Hook adiciona `rel="noopener noreferrer"` em `target="_blank"`.
- **7 call sites migrados**: `ComunicadosList`, `ComunicadoFlyerDetail`, `EnvioComunicados`, `PortalColaborador`, `GlobalBlockerModal`, `FeedbackTimeline`, `ReportConsultingPage`.
- Não-aplicáveis auditados: `analise_documental` do PROART (só PDF, passa por `htmlParaPlano`) e textareas de Planos de Ação (texto puro).
- Exceção controlada: `src/components/ui/chart.tsx` injeta CSS de tema shadcn (string do dev, sem input de usuário).

## 8. Portas de rede abertas

**Status:** Não aplicável (infraestrutura gerenciada).

- Sem `nginx.conf`/`iptables`/`docker-compose` no repositório.
- Portas detectadas (80, 443, 8080, 8443, 2052-2096) são padrão da Cloudflare/Lovable, todas terminam no mesmo HTTPS com mesmo certificado e WAF.

---

## Documentação e memória atualizadas

- **`docs/SECURITY_RULES.md`** — Bíblia de segurança completa: cada item acima detalhado + regras permanentes para novos devs (não usar `DOMPurify.sanitize` solto; não ler `colaboradores` direto; sempre GRANT + RLS + policy na mesma migration; toda rota sensível em `<ProtectedRoute>`).
- **`@security-memory`** — atualizada para orientar scanners futuros a não re-flagar itens já mitigados ou inerentes à infra gerenciada.

---

## Regras permanentes (resumo)

1. Nunca usar `DOMPurify.sanitize` direto em UI — sempre `sanitizeRichText`.
2. Nunca ler `public.colaboradores` direto no frontend — sempre via `get_colaboradores_seguro`.
3. Toda nova tabela pública precisa `GRANT` + RLS + policies **na mesma migration**.
4. Toda nova rota sensível deve estar dentro de `<ProtectedRoute>` em `src/App.tsx`.
5. Antes de adicionar lib que peça `unsafe-inline` em scripts, revisar `cspPlugin` em `vite.config.ts`.
6. Roles sempre via tabela separada `user_roles` + função `has_role` SECURITY DEFINER — nunca em `colaboradores` ou claims do cliente.

---

_Relatório gerado em 25/06/2026 ao final da onda de hardening._
