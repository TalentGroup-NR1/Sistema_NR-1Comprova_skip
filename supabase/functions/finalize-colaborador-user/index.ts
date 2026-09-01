import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { maskEmail } from "../_shared/mask.ts";

// Allowed origins for CORS - restrict to your application domain
const allowedOrigins = [
  Deno.env.get('APP_ORIGIN') || '',
  'https://nr1pronto.com.br',
  'https://www.nr1pronto.com.br',
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

function generateRandomPassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  console.log('finalize-colaborador-user called:', req.method);
  
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

    console.log('Finalizing colaborador:', colaborador_id);

    // Validate required fields
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

    // Check if already linked
    if (colaborador.user_id) {
      return new Response(JSON.stringify({ error: 'Colaborador already has a user account linked' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if admin_empresa can only finalize their own company's colaboradores
    if (callerRole === 'admin_empresa' && colaborador.company_id !== callerCompanyId) {
      return new Response(JSON.stringify({ error: 'Cannot finalize colaboradores from other companies' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if personal email is provided
    if (!colaborador.email_pessoal) {
      return new Response(JSON.stringify({ error: 'Colaborador não possui e-mail pessoal cadastrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyName = (colaborador.companies as { name?: string; logo_url?: string } | null)?.name;
    const logoUrl = (colaborador.companies as { name?: string; logo_url?: string } | null)?.logo_url;

    let userId: string;
    let isExistingUser = false;
    const randomPassword = generateRandomPassword(64);

    // Check if a user with this email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .ilike('email', colaborador.email_pessoal.trim())
      .maybeSingle();

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
      isExistingUser = true;
      console.log('User already exists with email:', maskEmail(colaborador.email_pessoal), '-> ID:', userId);

      // Update the user's password to a random internal password
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: randomPassword }
      );

      if (updatePasswordError) {
        console.error('Error updating password for existing user:', updatePasswordError);
        return new Response(JSON.stringify({ error: 'Falha ao atualizar senha do usuário existente' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Create the auth user using the personal email with a random internal password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: colaborador.email_pessoal.trim(),
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: colaborador.full_name },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user!.id;
      console.log('User created:', userId);
    }

    // Generate recovery link for password definition
    const redirectTo = `${Deno.env.get('APP_ORIGIN') || 'https://nr1pronto.com.br'}/atualizar-senha`;
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

    // Update profile with company_id and full_name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: colaborador.company_id,
        full_name: colaborador.full_name,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Set role to 'colaborador' by default
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'colaborador' })
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error updating role:', roleError);
    }

    // Link the colaborador to the user
    const { error: vinculoError } = await supabaseAdmin
      .from('colaboradores')
      .update({ user_id: userId })
      .eq('id', colaborador_id);

    if (vinculoError) {
      console.error('Error linking colaborador:', vinculoError);
      return new Response(JSON.stringify({ error: 'Failed to link colaborador to user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send welcome email with recovery link
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
            siteUrl: Deno.env.get('APP_ORIGIN') || 'https://nr1pronto.com.br',
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
        user_id: userId,
        email_destino: colaborador.email_pessoal,
        disparado_por: callerUser.id,
        company_id: colaborador.company_id,
        email_enviado: emailSent,
        erro_envio: emailError,
      });
    } catch (auditErr) {
      console.error('Error writing audit log:', auditErr);
    }

    console.log('Colaborador linked successfully:', colaborador_id, '->', userId, isExistingUser ? '(existing user)' : '(new user)', 'email_sent:', emailSent);

    return new Response(JSON.stringify({ 
      success: true, 
      user: { 
        id: userId, 
        email: colaborador.email_pessoal 
      },
      colaborador_id: colaborador_id,
      was_existing_user: isExistingUser,
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
