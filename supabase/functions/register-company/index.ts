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

const BodySchema = z.object({
  razao_social: z.string().trim().min(2).max(255),
  cnpj: z.string().trim().regex(cnpjRegex, "CNPJ inválido"),
  brand_name: z.string().trim().min(2).max(120),
  brand_primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#C8102E"),
  telefone: z.string().trim().min(8).max(30),
  segmento: z.enum([
    "Agronegócio",
    "Tecnologia",
    "Construção Civil",
    "Serviços Financeiros",
    "Energias",
    "Saúde",
    "Outros",
  ]),
  cep: z.string().trim().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
  logradouro: z.string().trim().min(2).max(255),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(120).optional().or(z.literal("")),
  bairro: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(120),
  estado: z.string().trim().regex(/^[A-Za-z]{2}$/, "UF inválida"),
  admin_nome: z.string().trim().min(2).max(200),
  admin_email: z.string().trim().email().max(255),
  admin_senha: z.string().min(8).max(200),
  aceite_termos: z.literal(true),
  terms_version: z.string().trim().min(1).max(20).default("1.0"),
  privacy_version: z.string().trim().min(1).max(20).default("1.0"),
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

  let companyId: string | null = null;
  let userId: string | null = null;

  try {
    // Rate limit: 5 cadastros por hora por IP
    const rlKey = await stableUuid(`register-company:${ip}`);
    const { error: rlError } = await admin.rpc("check_rate_limit", {
      p_user_id: rlKey,
      p_bucket: "register_company",
      p_max_req: 5,
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

    // E-mail duplicado (consulta direta indexada em profiles)
    const { count: emailCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .ilike("email", email);
    if (emailCount && emailCount > 0) {
      return json({ success: false, error: "E-mail já cadastrado" }, 409);
    }

    // 1. Empresa
    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name: data.razao_social,
        cnpj: data.cnpj,
        email,
        contact_person: data.admin_nome,
        status: "active",
        brand_name: data.brand_name,
        brand_primary_color: data.brand_primary_color,
        telefone: data.telefone,
        segmento: data.segmento,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento || null,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado.toUpperCase(),
        is_internal: false,
        terms_accepted_at: new Date().toISOString(),
        terms_accepted_ip: ip,
      })
      .select("id")
      .single();
    if (companyError || !company) throw new Error(companyError?.message ?? "Falha ao criar empresa");
    companyId = company.id;

    // 2. Usuário admin (e-mail já confirmado)
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password: data.admin_senha,
      email_confirm: true,
      user_metadata: { full_name: data.admin_nome },
    });
    if (userError || !created?.user) {
      const msg = (userError?.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("exists")) {
        return json({ success: false, error: "E-mail já cadastrado" }, 409);
      }
      throw new Error(userError?.message ?? "Falha ao criar usuário");
    }
    userId = created.user.id;

    // 3. Perfil
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        company_id: companyId,
        full_name: data.admin_nome,
        email,
        phone: data.telefone,
        is_active: true,
        must_change_password: false,
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw new Error(profileError.message);

    // 4. Papel admin_empresa
    await admin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin_empresa" });
    if (roleError) throw new Error(roleError.message);

    // 4.1 Registro formal do aceite (exigência legal — falha derruba o cadastro)
    const { error: termsError } = await admin.from("terms_acceptance").insert({
      company_id: companyId,
      user_id: userId,
      acceptor_name: data.admin_nome,
      acceptor_email: email,
      terms_version: data.terms_version,
      privacy_version: data.privacy_version,
      ip_address: ip,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
    if (termsError) throw new Error(`Falha ao registrar aceite: ${termsError.message}`);

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

    console.log("empresa registrada", { companyId, userId, ip, segmento: data.segmento });

    // 6. E-mail de boas-vindas (falha NÃO invalida o cadastro)
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
            templateName: "bem-vindo-empresa",
            recipientEmail: email,
            companyId,
            idempotencyKey: `bem-vindo-empresa-${companyId}`,
            templateData: {
              adminName: data.admin_nome,
              companyName: data.brand_name || data.razao_social,
              loginUrl: `${Deno.env.get('APP_ORIGIN') || 'https://nr-1pronto.com.br'}/auth`,
            },
          }),
        },
      );
      if (!resp.ok) {
        console.error("falha ao enviar boas-vindas", resp.status, await resp.text());
      }
    } catch (e) {
      console.error("boas-vindas ignorado", (e as Error).message);
    }

    return json({ success: true, company_id: companyId, user_id: userId, logo_url: logoUrl });

  } catch (error) {
    const message = (error as Error).message ?? "Erro inesperado";
    console.error("register-company falhou", message);

    // Rollback
    if (userId) {
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    if (companyId) {
      await admin.from("terms_acceptance").delete().eq("company_id", companyId);
      await admin.from("companies").delete().eq("id", companyId);
    }

    return json({ success: false, error: "Não foi possível concluir o cadastro. Tente novamente." }, 500);
  }
});
