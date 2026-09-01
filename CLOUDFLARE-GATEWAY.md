# NR1-Pronto — Arquitetura de Gateway & Proteção Cloudflare (WAF/CDN)

**Domínio Oficial:** `https://nr1pronto.com.br`  
**Registrar:** Registro.br  
**Frontend Origin:** Vercel  
**Backend Origin:** Supabase (`alneozvrsuwszlkisbyo.supabase.co`)

---

## 1. Configuração de Nameservers (Registro.br)

1. Acesse o painel do [Registro.br](https://registro.br).
2. Selecione o domínio **`nr1pronto.com.br`**.
3. Na seção **DNS / Servidores de Nome**, altere para os nameservers atribuídos pela sua conta Cloudflare:
   - **Servidor 1:** `<ns1>.ns.cloudflare.com`
   - **Servidor 2:** `<ns2>.ns.cloudflare.com`
4. Salve as alterações e aguarde a confirmação de ativação no painel do Cloudflare.

---

## 2. Registros DNS no Cloudflare (Proxy Ativo 🟧)

Na aba **DNS -> Records** da zona `nr1pronto.com.br`, configure os apontamentos apontando para a Vercel com **Proxy status = Proxied**:

| Tipo | Nome | Conteúdo / Destino | Proxy Status | TTL |
|---|---|---|---|---|
| **A** | `@` (ou `nr1pronto.com.br`) | `216.198.79.1` (ou `76.76.21.21`) | 🟧 **Proxied** | Auto |
| **CNAME** | `www` | `cname.vercel-dns.com` | 🟧 **Proxied** | Auto |

---

## 3. Configuração de SSL/TLS e Criptografia

Na aba **SSL/TLS**:
1. **Encryption Mode**: Defina como **Full (strict)** para garantir criptografia de ponta a ponta com o certificado emitido pela Vercel.
2. Na aba **Edge Certificates**:
   - **Always Use HTTPS**: `ON` (Redirecionamento automático de HTTP para HTTPS).
   - **Minimum TLS Version**: `TLS 1.2` ou superior.
   - **Opportunistic Encryption**: `ON`.
   - **TLS 1.3**: `ON`.

---

## 4. Regras de Segurança e WAF (Proteção Completa)

### A. Rate Limiting em Endpoints Públicos (Security -> WAF -> Rate Limiting Rules)

#### Regra 1: Proteção contra Spam no Cadastro de Empresas (`register-company`)
- **Nome da Regra:** `Rate Limit - Register Company`
- **Condição (Expression):**
  ```text
  (http.request.uri.path contains "/functions/v1/register-company" and http.request.method eq "POST")
  ```
- **Taxa Limite:** **5 requisições** a cada **1 minuto** por IP.
- **Ação:** **Block** (ou Managed Challenge) com duração de 1 hora.
- **Response code:** `429 Too Many Requests`.

#### Regra 2: Proteção em Descadastro Público (`handle-email-unsubscribe`)
- **Nome da Regra:** `Rate Limit - Unsubscribe`
- **Condição (Expression):**
  ```text
  (http.request.uri.path contains "/functions/v1/handle-email-unsubscribe")
  ```
- **Taxa Limite:** **30 requisições** a cada **1 minuto** por IP.
- **Ação:** **Block** (com duração de 10 minutos).

---

### B. Proteção de Webhook do Resend (`handle-email-suppression`)

- **Nome da Regra:** `Webhook Resend Protection`
- **Condição:**
  ```text
  (http.request.uri.path contains "/functions/v1/handle-email-suppression" and not http.request.headers["x-webhook-secret"] eq "<WEBHOOK_SECRET>")
  ```
- **Ação:** **Block** (HTTP 403 Forbidden).

---

### C. Proteção Contra Bots e Tráfego Malicioso (Security -> Bots / WAF)

1. **Bot Fight Mode**: `ON` (Desafia automaticamente tráfego originado de bots não verificados).
2. **Security Level**: `Medium` (ou `High` em caso de ataque).
3. **WAF Managed Rulesets**: Ativar o **Cloudflare Managed Ruleset** e **Cloudflare OWASP Core Ruleset** com sensibilidade padrão para mitigação de SQLi, XSS e Remote Code Execution.

---

## 5. Roteiro de Teste e Validação (Smoke Test - 2 minutos)

1. **Validação de Proxy e Certificado**:
   ```bash
   curl -I https://nr1pronto.com.br
   ```
   *Resultado esperado:* Cabeçalhos contendo `server: cloudflare`, `cf-ray` e status `200 OK` ou `301/308` para HTTPS.

2. **Validação de Rate Limiting**:
   - Envie 6 requisições consecutivas para o endpoint `/functions/v1/register-company`.
   - *Resultado esperado:* As primeiras requisições passam e a 6ª retorna código `429 Too Many Requests` emitida pela borda do Cloudflare.

3. **Navegação e Autenticação no Frontend**:
   - Acesse `https://nr1pronto.com.br`, realize o fluxo de login e confirme na aba Network que as requisições fluem sem bloqueio de CORS.
