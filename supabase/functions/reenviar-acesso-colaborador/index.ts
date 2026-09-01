import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { maskEmail } from "../_shared/mask.ts";

// Allowed origins for CORS - restrict to your application domain
const allowedOrigins = [
  Deno.env.get('APP_ORIGIN') || '',
  'https://nr-1pronto.com.br',
  'https://www.nr-1pronto.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
].filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.some(allowed => 
    origin === allowed || (allowed && origin.startsWith(allowed))
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  console.log('reenviar-acesso-colaborador called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate origin for non-OPTIONS requests
  const origin = req.headers.get('origin');
  if (origin && !corsHeaders['Access-Control-Allow-Origin']) {
    console.error('CORS rejected for origin:', origin);
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the calling user's info
    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callerUser) {
      console.error('Error getting caller user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's role
    const { data: callerRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    const callerRole = callerRoleData?.role;
    console.log('Caller role:', callerRole);

    if (callerRole !== 'admin_master' && callerRole !== 'admin_empresa') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's company_id if admin_empresa
    let callerCompanyId: string | null = null;
    if (callerRole === 'admin_empresa') {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('user_id', callerUser.id)
        .single();
      callerCompanyId = profileData?.company_id;
    }

    // Parse request body
    const { colaborador_id } = await req.json();

    console.log('Resending access email for colaborador:', colaborador_id);

    if (!colaborador_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: colaborador_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get colaborador data with company info
    const { data: colaborador, error: colabError } = await supabaseAdmin
      .from('colaboradores')
      .select('id, full_name, email_pessoal, company_id, user_id, companies:company_id (name, logo_url)')
      .eq('id', colaborador_id)
      .single();

    if (colabError || !colaborador) {
      console.error('Error fetching colaborador:', colabError);
      return new Response(JSON.stringify({ error: 'Colaborador not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!colaborador.user_id) {
      return new Response(JSON.stringify({ error: 'Colaborador ainda não possui usuário vinculado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if admin_empresa can only resend for their own company's colaboradores
    if (callerRole === 'admin_empresa' && colaborador.company_id !== callerCompanyId) {
      return new Response(JSON.stringify({ error: 'Cannot resend for colaboradores from other companies' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: max 5 resends per hour per colaborador
    try {
      await supabaseAdmin.rpc('check_rate_limit', {
        p_user_id: callerUser.id,
        p_bucket: `reenvio_acesso:${colaborador_id}`,
        p_max_req: 5,
        p_window_seconds: 3600,
      });
    } catch (rateLimitError) {
      console.error('Rate limit exceeded:', rateLimitError);
      return new Response(JSON.stringify({ error: 'Limite de reenvios atingido. Tente novamente em 1 hora.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyName = (colaborador.companies as { name?: string; logo_url?: string } | null)?.name;
    const logoUrl = (colaborador.companies as { name?: string; logo_url?: string } | null)?.logo_url;

    // Generate new recovery link (invalidates previous ones for this user)
    const redirectTo = `${Deno.env.get('APP_ORIGIN') || 'https://nr-1pronto.com.br'}/atualizar-senha`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: colaborador.email_pessoal,
      options: { redirectTo },
    });

    if (linkError || !linkData) {
      console.error('Error generating recovery link:', linkError);
      return new Response(JSON.stringify({ error: 'Falha ao gerar link de definição de senha' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recoveryUrl = linkData.properties.action_link;

    // Send welcome email with new recovery link
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const idempotencyKey = `${colaborador_id}-${Date.now()}`;
      const { error: invokeError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'acesso-liberado',
          recipientEmail: colaborador.email_pessoal,
          idempotencyKey,
          templateData: {
            siteName: 'Talent Group',
            siteUrl: Deno.env.get('APP_ORIGIN') || 'https://nr-1pronto.com.br',
            recipientName: colaborador.full_name,
            companyName: companyName || 'sua empresa',
            logoUrl: logoUrl || undefined,
            confirmationUrl: recoveryUrl,
            expirationHours: 24,
          },
        },
      });

      if (invokeError) {
        throw invokeError;
      }
      emailSent = true;
    } catch (err) {
      console.error('Error sending welcome email:', err);
      emailError = err instanceof Error ? err.message : String(err);
    }

    // Audit log
    try {
      await supabaseAdmin.from('acesso_colaborador_audit').insert({
        colaborador_id: colaborador.id,
        user_id: colaborador.user_id,
        email_destino: colaborador.email_pessoal,
        disparado_por: callerUser.id,
        company_id: colaborador.company_id,
        email_enviado: emailSent,
        erro_envio: emailError,
        reenvio: true,
      });
    } catch (auditErr) {
      console.error('Error writing audit log:', auditErr);
    }

    return new Response(JSON.stringify({ 
      success: true,
      email_sent: emailSent,
      email_error: emailError,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
