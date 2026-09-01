import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const MAX_BODY_BYTES = 1_048_576; // 1 MB

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  full_name: z.string().trim().min(1).max(200),
  role: z.enum(['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']),
  company_id: z.string().uuid().nullable().optional(),
});

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
    if (!authHeader) {
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

    // Validate payload size
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body with Zod
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = CreateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { email, password, full_name, role, company_id } = parsed.data;

    console.log('Creating user with:', { email, full_name, role, company_id });

    // Permission validation for admin_empresa
    if (callerRole === 'admin_empresa') {
      // Can only create users for their own company
      if (company_id && company_id !== callerCompanyId) {
        return new Response(JSON.stringify({ error: 'Cannot create users for other companies' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Can only assign limited roles
      const allowedRoles = ['analista_rh', 'gestor_departamento', 'colaborador'];
      if (!allowedRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'Cannot assign admin roles' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Determine company_id for new user
    const targetCompanyId = callerRole === 'admin_empresa' ? callerCompanyId : company_id;

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created:', newUser.user?.id);

    // Update profile with company_id and full_name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: targetCompanyId,
        full_name,
      })
      .eq('user_id', newUser.user!.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Update role (the trigger sets it to colaborador by default)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role })
      .eq('user_id', newUser.user!.id);

    if (roleError) {
      console.error('Error updating role:', roleError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { 
        id: newUser.user?.id, 
        email: newUser.user?.email 
      } 
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
