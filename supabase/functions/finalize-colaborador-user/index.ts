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

    // Get caller's active role via get_my_role() (which evaluates profiles.active_role)
    const { data: activeRoleRpc, error: roleRpcErr } = await supabaseUser.rpc('get_my_role');
    let callerRole: string | null = activeRoleRpc as string | null;

    if (roleRpcErr || !callerRole) {
      // Fallback seguro de leitura caso RPC falhe
      const { data: rolesData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id);
      callerRole = rolesData?.[0]?.role ?? null;
    }

    console.log('Caller active role:', callerRole);

    const allowedCallers = ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento'];
    if (!callerRole || !allowedCallers.includes(callerRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's company_id if not admin_master
    let callerCompanyId: string | null = null;
    if (callerRole !== 'admin_master') {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('user_id', callerUser.id)
        .single();
      callerCompanyId = profileData?.company_id;
    }

    // Parse request body
    const { colaborador_id, contract_type, role } = await req.json();

    console.log('Finalizing colaborador:', colaborador_id, 'with contract_type:', contract_type, 'and role:', role);

    // Validate required fields
    if (!colaborador_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: colaborador_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Role Validation
    const requestedRole = role || 'colaborador';
    const allowedRoles = ['colaborador', 'gestor_departamento', 'analista_rh', 'admin_empresa'];
    
    if (!allowedRoles.includes(requestedRole)) {
      return new Response(JSON.stringify({ error: 'Role inválida ou não permitida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Elevation Check: only admin_empresa or admin_master can assign admin_empresa
    if (requestedRole === 'admin_empresa' && callerRole !== 'admin_empresa' && callerRole !== 'admin_master') {
      return new Response(JSON.stringify({ error: 'Permissão insuficiente para atribuir perfil de administrador' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get colaborador data with company info
    const { data: colaborador, error: colabError } = await supabaseAdmin
      .from('colaboradores')
      .select('id, full_name, email_pessoal, company_id, user_id, contract_type, companies:company_id (name, logo_url)')
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
    const randomPassword = generateRandomPassword(64);
    const emailPessoal = colaborador.email_pessoal.trim();

    // Guard: verificar se o e-mail já pertence a uma conta ATIVA na plataforma
    const { data: emailExists, error: checkError } = await supabaseAdmin.rpc('check_email_exists', {
      p_email: emailPessoal,
    });

    if (checkError) {
      console.error('Error checking existing email via RPC:', checkError);
      // Fallback de segurança se RPC falhar: checar profiles diretamente
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id, is_active')
        .ilike('email', emailPessoal)
        .maybeSingle();

      if (existingProfile && existingProfile.is_active !== false) {
        return new Response(JSON.stringify({
          error: 'Este e-mail já possui acesso à plataforma. Use outro e-mail ou contate o suporte.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (emailExists) {
      console.log('Guard blocked invite: email already has active account:', maskEmail(emailPessoal));
      return new Response(JSON.stringify({
        error: 'Este e-mail já possui acesso à plataforma. Use outro e-mail ou contate o suporte.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Conta existente ativa é sempre bloqueada pelo guard acima. Portanto, novos fluxos são sempre de novo usuário.
    const isExistingUser = false;

    // Criar o usuário auth com e-mail e senha aleatória interna
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailPessoal,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: colaborador.full_name },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      const isDuplicate = createError.message?.toLowerCase().includes('already') ||
                          createError.message?.toLowerCase().includes('exists');
      return new Response(JSON.stringify({
        error: isDuplicate
          ? 'Este e-mail já possui acesso à plataforma. Use outro e-mail ou contate o suporte.'
          : createError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    userId = newUser.user!.id;
    console.log('User created:', userId);

    // Generate recovery link for password definition
    const reqOrigin = req.headers.get('origin');
    const appOrigin = Deno.env.get('APP_ORIGIN') || reqOrigin || 'https://www.nr-1comprova.com.br';
    const redirectTo = `${appOrigin}/atualizar-senha`;
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

    const hashedToken = linkData.properties.hashed_token;
    const emailParam = encodeURIComponent(colaborador.email_pessoal);
    const recoveryUrl = hashedToken
      ? `${appOrigin}/atualizar-senha?token_hash=${hashedToken}&type=recovery&email=${emailParam}`
      : linkData.properties.action_link;

    // 1. Papel do usuário (inserido ANTES de profiles para que o trigger trg_sync_profile_user_company leia o papel correto)
    // Preserva papéis existentes e garante tanto o papel solicitado quanto 'colaborador' caso seja papel de gestão
    const assignedRole = requestedRole;
    const rolesToEnsure = [assignedRole];
    if (assignedRole !== 'colaborador') {
      rolesToEnsure.push('colaborador');
    }

    for (const r of rolesToEnsure) {
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', r)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: r,
          });

        if (roleError) {
          console.error(`Error assigning user role ${r}:`, roleError);
        }
      }
    }

    // 2. Perfil do usuário (ativa o trigger trg_sync_profile_user_company, que já encontrará o role correto em user_roles)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        company_id: colaborador.company_id,
        full_name: colaborador.full_name,
        is_active: true,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to save user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Vínculo direto e explícito em user_companies (dupla garantia)
    const { error: userCompanyError } = await supabaseAdmin
      .from('user_companies')
      .upsert({
        user_id: userId,
        company_id: colaborador.company_id,
        role: assignedRole,
        is_default: true,
      }, { onConflict: 'user_id, company_id' });

    if (userCompanyError) {
      console.warn('Aviso: falha ao inserir vínculo explícito em user_companies:', userCompanyError.message);
    }

    // Link the colaborador to the user (and guarantee contract_type is defined)
    const updateColabData: Record<string, unknown> = { user_id: userId };
    if (contract_type) {
      updateColabData.contract_type = contract_type;
    } else if (!colaborador.contract_type) {
      updateColabData.contract_type = 'CLT';
    }

    const { error: vinculoError } = await supabaseAdmin
      .from('colaboradores')
      .update(updateColabData)
      .eq('id', colaborador_id);

    if (vinculoError) {
      console.error('Error linking colaborador:', vinculoError);
      return new Response(JSON.stringify({ error: 'Failed to link colaborador to user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Checagem de ambiente: produção vs fallback dev
    const appEnv = (Deno.env.get('APP_ENV') || '').toLowerCase();
    const isProduction = appEnv === 'production';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    let emailSent = false;
    let emailError: string | null = null;
    let isDevFallback = false;

    if (isProduction) {
      // Em produção: SEMPRE tenta envio de e-mail. Se RESEND_API_KEY ausente, erro 500 explícito (nunca expõe invite_url)
      if (!resendApiKey) {
        console.error('[finalize-colaborador-user] GA405: Resend não configurado em ambiente de produção.');
        return new Response(JSON.stringify({ 
          error: 'GA405: Resend não configurado (RESEND_API_KEY ausente)' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const idempotencyKey = `${colaborador_id}-${Date.now()}`;
        const { error: invokeError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'acesso-liberado',
            recipientEmail: colaborador.email_pessoal,
            idempotencyKey,
            templateData: {
              siteName: 'Talent Group',
              siteUrl: appOrigin,
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
        console.error('Error sending welcome email in production:', err);
        emailError = err instanceof Error ? err.message : String(err);
      }
    } else {
      // Fallback dev apenas quando !isProduction E (!resendApiKey OU env dev/local/development)
      const isDevEnv = !resendApiKey || ['dev', 'local', 'development'].includes(appEnv);
      if (isDevEnv) {
        isDevFallback = true;
        console.log('[finalize-colaborador-user] Modo dev ativo. Retornando invite_url.');
        emailSent = false;
      } else {
        // Ambiente não-produção com chave de e-mail configurada (ex.: staging)
        try {
          const idempotencyKey = `${colaborador_id}-${Date.now()}`;
          const { error: invokeError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'acesso-liberado',
              recipientEmail: colaborador.email_pessoal,
              idempotencyKey,
              templateData: {
                siteName: 'Talent Group',
                siteUrl: appOrigin,
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
          console.error('Error sending welcome email in non-production:', err);
          emailError = err instanceof Error ? err.message : String(err);
        }
      }
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

    console.log('Colaborador linked successfully:', colaborador_id, '->', userId, isExistingUser ? '(existing user)' : '(new user)', 'email_sent:', emailSent, 'isDevFallback:', isDevFallback);

    const responsePayload: Record<string, unknown> = {
      success: true,
      user: {
        id: userId,
        email: colaborador.email_pessoal,
      },
      colaborador_id: colaborador_id,
      was_existing_user: isExistingUser,
      email_sent: emailSent,
      email_error: emailError,
    };

    if (isDevFallback) {
      responsePayload.invite_url = recoveryUrl;
      responsePayload.dev_mode = true;
    }

    return new Response(JSON.stringify(responsePayload), {
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
