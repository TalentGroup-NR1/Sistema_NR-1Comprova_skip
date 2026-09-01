import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  company_id: string;
}

// Hard-coded allowlist of trusted origins for links embedded in emails.
// NEVER interpolate caller-supplied URLs into outbound emails (phishing risk).
const ALLOWED_APP_ORIGINS = [
  "https://nr-1pronto.com.br",
  "https://www.nr-1pronto.com.br",
  "https://app.talentred.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
];
const DEFAULT_APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") && ALLOWED_APP_ORIGINS.includes(Deno.env.get("APP_ORIGIN")!)
    ? Deno.env.get("APP_ORIGIN")!
    : ALLOWED_APP_ORIGINS[0];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // --- Authorization: check role ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["admin_master", "admin_empresa", "analista_rh"];
    if (!allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id }: RequestBody = await req.json();

    if (!company_id) {
      throw new Error("company_id is required");
    }

    // For non-admin_master, verify they belong to the requested company
    if (roleData.role !== "admin_master") {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", userId)
        .single();

      if (!profileData || profileData.company_id !== company_id) {
        return new Response(
          JSON.stringify({ error: "Access denied to this company" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Buscar colaboradores pendentes
    const { data: pendingRespondents, error: pendingError } = await supabase
      .rpc("get_pending_pulse_respondents", { p_company_id: company_id });

    if (pendingError) {
      throw new Error(`Error fetching pending respondents: ${pendingError.message}`);
    }

    if (!pendingRespondents || pendingRespondents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Todos os colaboradores já responderam esta semana",
          sent: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da empresa para personalizar o email
    const { data: company } = await supabase
      .from("companies")
      .select("name, logo_url")
      .eq("id", company_id)
      .single();

    const companyName = company?.name || "Sua Empresa";
    const pulsoUrl = `${DEFAULT_APP_ORIGIN}/cuidar-mais`;

    let emailsSent = 0;
    const errors: string[] = [];

    // Se RESEND_API_KEY não estiver configurado, apenas simular o envio
    if (!resendApiKey) {
      console.log(`[SIMULADO] Enviaria emails para ${pendingRespondents.length} colaboradores`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Lembrete simulado para ${pendingRespondents.length} colaboradores (RESEND_API_KEY não configurado)`,
          sent: pendingRespondents.length,
          simulated: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar emails via Resend
    for (const respondent of pendingRespondents) {
      try {
        const firstName = respondent.full_name.split(' ')[0];
        
        await sendEmail({
          from: `${companyName} <noreply@talentred.com.br>`,
          to: respondent.corporate_email,
          subject: `Como foi sua semana? - Pulso da Semana | ${companyName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h1 style="color: #18181b; margin-bottom: 8px; font-size: 24px;">
                    Olá, ${firstName}! 👋
                  </h1>
                  <p style="color: #52525b; font-size: 16px; margin-bottom: 24px;">
                    Queremos saber como foi sua semana de trabalho.
                  </p>
                  
                  <div style="background-color: #fef3f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #991b1b; font-weight: 500;">
                      💡 Sua resposta é anônima e leva menos de 1 minuto!
                    </p>
                  </div>
                  
                  <p style="color: #52525b; font-size: 14px; margin-bottom: 24px;">
                    Suas respostas nos ajudam a melhorar o ambiente de trabalho e cuidar melhor de você e de todos os colegas.
                  </p>
                  
                  <a href="${pulsoUrl}" 
                     style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Responder Pulso da Semana
                  </a>
                  
                  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                  
                  <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                    Este é um email automático enviado por ${companyName} através da plataforma TALENT RED.
                    <br>
                    Se você tiver dúvidas, entre em contato com o RH da sua empresa.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        emailsSent++;
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        errors.push(`${respondent.corporate_email}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Lembretes enviados com sucesso`,
        sent: emailsSent,
        total: pendingRespondents.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
