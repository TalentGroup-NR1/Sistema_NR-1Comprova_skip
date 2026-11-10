import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { buildCorsHeaders } from "../_shared/cors.ts";

const MAX_BODY_BYTES = 1_048_576; // 1 MB

const LinkUserSchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido"),
  company_id: z.string().uuid("ID de empresa inválido"),
  role: z.enum([
    "admin_empresa",
    "analista_rh",
    "gestor_departamento",
    "colaborador",
  ]),
  is_default: z.boolean().optional().default(false),
});

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = callerUser.id;

    // Body parsing & validation
    const rawBody = await req.json();
    const parsed = LinkUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Dados inválidos",
          details: parsed.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { user_id, company_id, role, is_default } = parsed.data;

    // 1. Autorização do chamador:
    // Deve ser admin_master/super_admin OU admin_empresa DA EMPRESA ALVO
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId);

    const rolesList = (callerRoles ?? []).map((r) => r.role);
    const isMaster =
      rolesList.includes("super_admin") || rolesList.includes("admin_master");

    if (!isMaster) {
      const { data: callerLink } = await supabaseAdmin
        .from("user_companies")
        .select("role")
        .eq("user_id", callerUserId)
        .eq("company_id", company_id)
        .eq("role", "admin_empresa")
        .maybeSingle();

      if (!callerLink) {
        return new Response(
          JSON.stringify({
            error:
              "Acesso negado: você não tem permissão para vincular usuários a esta empresa.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 2. Validação do usuário alvo
    const { data: targetProfileData } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("user_id", user_id)
      .maybeSingle();

    let targetProfile = targetProfileData;
    if (!targetProfile) {
      const { data: authTarget } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (authTarget?.user) {
        targetProfile = {
          user_id: authTarget.user.id,
          full_name: authTarget.user.user_metadata?.full_name || "Sem Nome",
          email: authTarget.user.email || null,
        };
      }
    }

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuário alvo não encontrado na plataforma." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Validação da empresa alvo
    const { data: targetCompany } = await supabaseAdmin
      .from("companies")
      .select("id, name, status")
      .eq("id", company_id)
      .maybeSingle();

    if (!targetCompany || targetCompany.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Empresa alvo não encontrada ou inativa." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Verificação de vínculo existente (evita duplicidade com retorno claro)
    const { data: existingLink } = await supabaseAdmin
      .from("user_companies")
      .select("id")
      .eq("user_id", user_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (existingLink) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Usuário já possui vínculo ativo com a empresa ${targetCompany.name}.`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Se is_default for true, desmarca outros vínculos do usuário
    if (is_default) {
      await supabaseAdmin
        .from("user_companies")
        .update({ is_default: false })
        .eq("user_id", user_id);
    }

    // 6. Inserção do vínculo
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from("user_companies")
      .insert({
        user_id,
        company_id,
        role,
        is_default: !!is_default,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Registro em platform_audit_logs
    await supabaseAdmin.from("platform_audit_logs").insert({
      action: "vinculo_multiempresa_adicionado",
      user_id: callerUserId,
      target_company_id: company_id,
      details: {
        target_user_id: user_id,
        target_user_email: targetProfile.email,
        company_name: targetCompany.name,
        role,
        is_default: !!is_default,
        operador_id: callerUserId,
        created_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuário vinculado a ${targetCompany.name} com sucesso!`,
        company_name: targetCompany.name,
        link: newLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Erro na função link-user-company:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
