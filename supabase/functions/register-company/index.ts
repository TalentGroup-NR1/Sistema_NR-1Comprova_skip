import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const MAX_BODY_BYTES = 3_145_728; // 3 MB (permite logo em base64)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

// Schema com campos essenciais obrigatórios e complementares opcionais
const BodySchema = z.object({
  razao_social: z.string().trim().min(2).max(255),
  cnpj: z.string().trim().regex(cnpjRegex, "CNPJ inválido"),
  admin_nome: z.string().trim().min(2).max(200),
  admin_email: z.string().trim().email().max(255),
  aceite_termos: z.boolean().optional(),
  terms_version: z.string().trim().min(1).max(20).optional().default("1.0"),
  privacy_version: z.string().trim().min(1).max(20).optional().default("1.0"),
  brand_name: z.string().trim().min(1).max(120).optional().nullable(),
  brand_primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable()
    .default("#C8102E"),
  telefone: z.string().trim().max(30).optional().nullable(),
  segmento: z.enum([
    "Agronegócio",
    "Tecnologia",
    "Construção Civil",
    "Serviços Financeiros",
    "Energias",
    "Saúde",
    "Outros",
  ]).optional().nullable(),
  cep: z.string().trim().regex(/^\d{5}-\d{3}$/).optional().nullable(),
  logradouro: z.string().trim().max(255).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  bairro: z.string().trim().max(120).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  estado: z.string().trim().regex(/^[A-Za-z]{2}$/).optional().nullable(),
  logo: z
    .object({
      filename: z.string().min(1).max(200),
      content_type: z.enum([
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ]),
      base64: z.string().min(1).max(2_800_000),
    })
    .nullable()
    .optional(),
});

/** Gera senha aleatória interna (jamais exposta ao cliente). */
function generateRandomPassword(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/** UUID determinístico a partir de uma string (para rate limit por IP). */
async function stableUuid(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${
    hex.slice(17, 20)
  }-${hex.slice(20, 32)}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Método não permitido" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return json({ success: false, error: "Payload muito grande" }, 413);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  // Capturar caller e seu papel para autorização e audit log
  let callerUserId: string | null = null;
  let callerEmail: string | null = null;
  let callerRole: string | null = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        callerUserId = user.id;
        callerEmail = user.email?.toLowerCase() ?? null;
        const { data: rolesRows, error: rolesError } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (rolesError) {
          console.warn("falha ao consultar user_roles", rolesError.message);
        }
        const callerRoles = (rolesRows ?? []).map((r) => r.role);
        callerRole = callerRoles.includes("admin_master")
          ? "admin_master"
          : callerRoles.includes("super_admin")
          ? "super_admin"
          : callerRoles[0] ?? (user.app_metadata?.role as string) ?? null;
      }
    } catch {
      // Ignorar — audit log com caller null é aceitável
    }
  }

  let companyId: string | null = null;
  let userId: string | null = null;
  let isBranchCreation = false;

  try {
    // Rate limit: 15 por hora por IP para cadastro inicial; 30 por hora para admin autenticado
    const rlIdentifier = callerUserId ? `user:${callerUserId}` : `ip:${ip}`;
    const rlKey = await stableUuid(`register-company:${rlIdentifier}`);
    const { error: rlError } = await admin.rpc("check_rate_limit", {
      p_user_id: rlKey,
      p_bucket: "register_company",
      p_max_req: callerUserId ? 30 : 15,
      p_window_seconds: 3600,
    });
    if (rlError) {
      console.warn("rate limit atingido", { ip, error: rlError.message });
      return json(
        {
          success: false,
          error: "Muitas tentativas de cadastro. Tente novamente em 1 hora.",
        },
        429,
      );
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json(
        { success: false, error: "Dados inválidos", fields: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const data = parsed.data;
    const email = data.admin_email.toLowerCase();

    // CNPJ duplicado
    const { data: existingCompany } = await admin
      .from("companies")
      .select("id")
      .eq("cnpj", data.cnpj)
      .maybeSingle();
    if (existingCompany) {
      return json({ success: false, error: "CNPJ já cadastrado" }, 409);
    }

    // Verificar se e-mail já existe na base
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id, email, full_name")
      .ilike("email", email)
      .maybeSingle();

    isBranchCreation = !!existingProfile;

    if (isBranchCreation) {
      // Regra de segurança: apenas usuário autenticado admin_empresa/admin_master pode adicionar filial
      if (!callerUserId) {
        return json(
          {
            success: false,
            error: "E-mail já cadastrado na plataforma. Faça login com esta conta para adicionar uma filial vinculada.",
          },
          409,
        );
      }

      const isMaster = callerRole === "admin_master" || callerRole === "super_admin";
      const isOwner =
        callerUserId === existingProfile.user_id ||
        (callerEmail && callerEmail === email);

      if (!isMaster && !isOwner) {
        return json(
          {
            success: false,
            error: "Apenas administradores podem cadastrar uma filial vinculada à sua conta.",
          },
          403,
        );
      }

      userId = existingProfile.user_id;
    }

    // 1. Empresa
    const resolvedBrandName = data.brand_name?.trim() || data.razao_social;
    const resolvedBrandPrimaryColor = data.brand_primary_color || "#C8102E";

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name: data.razao_social,
        cnpj: data.cnpj,
        email,
        contact_person: data.admin_nome,
        status: "active",
        brand_name: resolvedBrandName,
        brand_primary_color: resolvedBrandPrimaryColor,
        telefone: data.telefone || null,
        segmento: data.segmento || null,
        cep: data.cep || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado ? data.estado.toUpperCase() : null,
        is_internal: false,
        terms_accepted_at: isBranchCreation ? new Date().toISOString() : null,
        terms_accepted_ip: isBranchCreation ? ip : null,
      })
      .select("id")
      .single();
    if (companyError || !company) throw new Error(companyError?.message ?? "Falha ao criar empresa");
    companyId = company.id;

    if (!isBranchCreation) {
      // 2. Novo Usuário admin com SENHA ALEATÓRIA INTERNA (ninguém vê)
      const randomPassword = generateRandomPassword(64);
      const { data: created, error: userError } = await admin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: data.admin_nome, company_id: companyId },
        app_metadata: { company_id: companyId, role: "admin_empresa" },
      });
      if (userError || !created?.user) {
        const msg = (userError?.message || "").toLowerCase();
        if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("exists")) {
          return json({ success: false, error: "E-mail já cadastrado" }, 409);
        }
        throw new Error(userError?.message ?? "Falha ao criar usuário");
      }
      userId = created.user.id;

      // Garante que o claim company_id e role estejam fixados no app_metadata do auth.users
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: { company_id: companyId, role: "admin_empresa" },
        user_metadata: { company_id: companyId, full_name: data.admin_nome },
      });

      // 3. Papel admin_empresa (inserido ANTES de profiles para que o trigger trg_sync_profile_user_company leia o papel correto)
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin_empresa" });
      if (roleError) throw new Error(roleError.message);

      // 4. Perfil
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          user_id: userId,
          company_id: companyId,
          full_name: data.admin_nome,
          email,
          phone: data.telefone,
          is_active: true,
          must_change_password: true, // Força troca de senha no primeiro login
        },
        { onConflict: "user_id" },
      );
      if (profileError) throw new Error(profileError.message);

      // 4.1 Vínculo direto e explícito em user_companies (empresa padrão: is_default = true)
      const { error: userCompanyError } = await admin.from("user_companies").upsert(
        {
          user_id: userId,
          company_id: companyId,
          role: "admin_empresa",
          is_default: true,
        },
        { onConflict: "user_id,company_id" }
      );
      if (userCompanyError) {
        console.warn("aviso: falha ao inserir vínculo explícito em user_companies", userCompanyError.message);
      }
    } else {
      // 2. Filial: Reutiliza o userId existente sem recriar no Auth
      // Garante que tenha o papel admin_empresa em user_roles
      const { data: existingRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const hasAdminRole = existingRoles?.some((r) => r.role === "admin_empresa" || r.role === "admin_master");
      if (!hasAdminRole) {
        await admin.from("user_roles").insert({ user_id: userId, role: "admin_empresa" });
      }

      // 3. Vínculo da 2ª empresa (filial) em user_companies: role='admin_empresa', is_default=false
      const { error: branchLinkError } = await admin.from("user_companies").upsert(
        {
          user_id: userId,
          company_id: companyId,
          role: "admin_empresa",
          is_default: false,
        },
        { onConflict: "user_id,company_id" }
      );
      if (branchLinkError) {
        console.warn("aviso: falha ao vincular filial em user_companies", branchLinkError.message);
      }
    }

    // 4.2 Aceite de termos: no cadastro de nova empresa cliente (is_branch=false), o aceite NÃO é gravado aqui
    // (deve ser dado pelo próprio administrador da empresa cliente no primeiro acesso em /atualizar-senha).
    // Apenas no fluxo de filial (is_branch=true), grava o aceite do próprio administrador/caller com seus dados reais.
    if (isBranchCreation) {
      const { error: termsError } = await admin.from("terms_acceptance").insert({
        company_id: companyId,
        user_id: userId,
        acceptor_name: existingProfile?.full_name || data.admin_nome,
        acceptor_email: callerEmail || email,
        terms_version: data.terms_version,
        privacy_version: data.privacy_version,
        ip_address: ip,
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      });
      if (termsError) throw new Error(`Falha ao registrar aceite da filial: ${termsError.message}`);
    }

    // 5. Logo (opcional — falha não invalida o cadastro)
    let logoUrl: string | null = null;
    if (data.logo) {
      try {
        const bytes = Uint8Array.from(atob(data.logo.base64), (c) => c.charCodeAt(0));
        const ext = data.logo.filename.split(".").pop()?.toLowerCase() || "png";
        const path = `${companyId}/logo.${ext}`;
        const { error: uploadError } = await admin.storage
          .from("logos")
          .upload(path, bytes, { upsert: true, contentType: data.logo.content_type });
        if (!uploadError) {
          logoUrl = admin.storage.from("logos").getPublicUrl(path).data.publicUrl;
          await admin
            .from("companies")
            .update({ logo_url: logoUrl, brand_logo_url: logoUrl, logo_upload_date: new Date().toISOString() })
            .eq("id", companyId);
        } else {
          console.error("falha no upload do logo", uploadError.message);
        }
      } catch (e) {
        console.error("logo ignorado", (e as Error).message);
      }
    }

    // 6. Link de acesso / definição de senha
    let recoveryUrl: string | null = null;
    const siteUrl = Deno.env.get("APP_ORIGIN") || "https://nr1pronto.com.br";

    if (!isBranchCreation) {
      // Novo usuário: link de recovery para definição de senha no primeiro acesso
      const redirectTo = `${siteUrl}/atualizar-senha`;
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (linkError || !linkData) {
        console.error("falha ao gerar link de convite", linkError?.message);
      } else {
        recoveryUrl = linkData.properties.action_link;
      }
    } else {
      // Usuário existente (filial): direciona direto para o login / plataforma já com senha definida
      recoveryUrl = `${siteUrl}/auth`;
    }

    console.log("empresa registrada", {
      companyId,
      userId,
      ip,
      isBranch: isBranchCreation,
      segmento: data.segmento,
    });

    // 7. Email transacional (falha NÃO invalida o cadastro)
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: "convite-admin-empresa",
            recipientEmail: email,
            companyId,
            idempotencyKey: `convite-empresa-${companyId}`,
            templateData: {
              siteName: "NR-1Comprova",
              siteUrl,
              adminName: data.admin_nome,
              companyName: data.brand_name || data.razao_social,
              logoUrl: logoUrl || undefined,
              confirmationUrl: recoveryUrl ?? `${siteUrl}/auth`,
              expirationHours: 24,
            },
          }),
        },
      );
      emailSent = resp.ok;
      if (!resp.ok) {
        emailError = await resp.text();
        console.error("falha ao enviar convite/notificação", resp.status, emailError);
      }
    } catch (e) {
      emailError = (e as Error).message;
      console.error("notificação ignorada", emailError);
    }

    // 8. Audit log em platform_audit_logs
    try {
      await admin.from("platform_audit_logs").insert({
        user_id: callerUserId ?? userId,
        user_email: callerUserId ? undefined : email,
        action: isBranchCreation ? "filial_criada_vinculada" : "empresa_criada_convite_enviado",
        target_company_id: companyId,
        target_company_name: data.brand_name || data.razao_social,
        ip_address: ip,
        details: {
          admin_email: email,
          admin_nome: data.admin_nome,
          is_branch: isBranchCreation,
          email_convite_enviado: emailSent,
          email_convite_erro: emailError,
          recovery_link_gerado: !!recoveryUrl,
        },
      });
    } catch (auditErr) {
      console.error("audit log ignorado", (auditErr as Error).message);
    }

    return json({
      success: true,
      company_id: companyId,
      user_id: userId,
      logo_url: logoUrl,
      invite_sent: emailSent,
      is_branch: isBranchCreation,
    });

  } catch (error) {
    const message = (error as Error).message ?? "Erro inesperado";
    console.error("register-company falhou", message);

    // Rollback seguro
    if (companyId) {
      if (!isBranchCreation && userId) {
        await admin.from("user_companies").delete().eq("user_id", userId);
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("user_id", userId);
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      } else if (isBranchCreation && userId) {
        await admin.from("user_companies").delete().eq("company_id", companyId);
      }
      await admin.from("terms_acceptance").delete().eq("company_id", companyId);
      await admin.from("companies").delete().eq("id", companyId);
    }

    return json({ success: false, error: "Não foi possível concluir o cadastro. Tente novamente." }, 500);
  }
});
