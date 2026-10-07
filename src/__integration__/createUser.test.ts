import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);

describe('Integration Test: create-user Edge Function', () => {
  let adminUserId = '';
  let adminToken = '';

  beforeAll(async () => {
    // Create a temporary admin user to get a valid JWT
    const { data: adminUser, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: `test_admin_${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      email_confirm: true,
    });
    
    if (adminErr) throw adminErr;
    adminUserId = adminUser.user.id;

    // Set role to admin_master so the edge function allows it
    await supabaseAdmin.from('user_roles').upsert({
      user_id: adminUserId,
      role: 'admin_master'
    }, { onConflict: 'user_id, role' });

    // Sign in to get the JWT
    const { data: signInData, error: signInErr } = await supabaseUser.auth.signInWithPassword({
      email: adminUser.user.email,
      password: 'AdminPassword123!',
    });
    
    if (signInErr) throw signInErr;
    adminToken = signInData.session.access_token;
  });

  afterAll(async () => {
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  it('should create an auth.user, a profile, and a user_role (UPSERT validation)', async () => {
    const testEmail = `test_integration_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const fullName = 'Test Integration User';

    // 1. Invoke the create-user function using the admin token
    const { data: invokeData, error: invokeError } = await supabaseUser.functions.invoke('create-user', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: {
        email: testEmail,
        password: testPassword,
        full_name: fullName,
        role: 'colaborador',
      }
    });

    if (invokeError) {
      console.error(invokeError);
    }

    expect(invokeError).toBeNull();
    expect(invokeData).toBeDefined();
    expect(invokeData.user).toBeDefined();
    expect(invokeData.user.id).toBeDefined();

    const newUserId = invokeData.user.id;

    // 2. Verify profile was created
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', newUserId)
      .single();

    expect(profile).toBeDefined();
    expect(profile.full_name).toBe(fullName);

    // 3. Verify user_role was created
    const { data: role } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', newUserId)
      .single();

    expect(role).toBeDefined();
    expect(role.role).toBe('colaborador');

    // Cleanup the created target user
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
  });
});
