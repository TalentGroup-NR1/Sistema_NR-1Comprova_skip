import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const MAX_BODY_BYTES = 1_048_576; // 1 MB

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(8).max(200).optional(),
  full_name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']).optional(),
  is_active: z.boolean().optional(),
});

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = UpdateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { user_id, email, password, full_name, role, is_active } = parsed.data;

    console.log('Updating user:', { user_id, email, full_name, role, is_active });

    // Get target user's profile and role
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('user_id', user_id)
      .single();

    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single();

    const targetRole = targetRoleData?.role;

    // Permission validation for admin_empresa
    if (callerRole === 'admin_empresa') {
      // Cannot edit users from other companies
      if (targetProfile?.company_id !== callerCompanyId) {
        return new Response(JSON.stringify({ error: 'Cannot edit users from other companies' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Cannot edit admin users
      if (targetRole === 'admin_master' || targetRole === 'admin_empresa') {
        return new Response(JSON.stringify({ error: 'Cannot edit admin users' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Can only assign limited roles
      if (role) {
        const allowedRoles = ['analista_rh', 'gestor_departamento', 'colaborador'];
        if (!allowedRoles.includes(role)) {
          return new Response(JSON.stringify({ error: 'Cannot assign admin roles' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Update auth user if email or password changed
    if (email || password) {
      const updateData: { email?: string; password?: string } = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      );

      if (authError) {
        console.error('Error updating auth user:', authError);
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update profile
    if (full_name !== undefined || is_active !== undefined || email !== undefined) {
      const profileUpdate: { full_name?: string; is_active?: boolean; email?: string } = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (is_active !== undefined) profileUpdate.is_active = is_active;
      if (email !== undefined) profileUpdate.email = email;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // Update role
    if (role) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id);

      if (roleError) {
        console.error('Error updating role:', roleError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
