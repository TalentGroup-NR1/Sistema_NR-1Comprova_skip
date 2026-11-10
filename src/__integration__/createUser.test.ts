import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Service-role client — mirrors what the Edge Function does internally
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const createdUserIds: string[] = [];

/**
 * Integration test: validates that the UPSERT logic introduced in the
 * fixed create-user / finalize-colaborador-user Edge Functions works
 * correctly against the real Supabase instance.
 *
 * Covers:
 *  - auth.user creation via Admin API
 *  - profiles UPSERT (onConflict: 'user_id') always creates a row
 *  - user_roles UPSERT (onConflict: 'user_id, role') always creates a row
 *  - idempotency: running the same UPSERT twice does not create duplicates
 */
describe('Integration: UPSERT profile + role (Edge Function logic)', () => {
  afterAll(async () => {
    for (const uid of createdUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
  });

  it('creates auth.user, profile, and user_role correctly (happy path)', async () => {
    const email = `test_integration_${Date.now()}@nr1test.com`;
    const fullName = 'Test Integration User';

    // 1. Create auth user (same as edge function)
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    expect(createErr).toBeNull();
    expect(newUser.user).toBeDefined();
    const uid = newUser.user!.id;
    createdUserIds.push(uid);

    // 2. UPSERT profile (onConflict: 'user_id')
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      user_id: uid,
      company_id: null,
      full_name: fullName,
    }, { onConflict: 'user_id' });
    expect(profileErr).toBeNull();

    // 3. UPSERT role (onConflict: 'user_id, role')
    const { error: roleErr } = await supabaseAdmin.from('user_roles').upsert({
      user_id: uid,
      role: 'colaborador',
    }, { onConflict: 'user_id, role' });
    expect(roleErr).toBeNull();

    // 4. Verify profile
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('user_id', uid).single();
    expect(profile).toBeDefined();
    expect(profile!.full_name).toBe(fullName);

    // 5. Verify role
    const { data: role } = await supabaseAdmin.from('user_roles').select('*').eq('user_id', uid).single();
    expect(role).toBeDefined();
    expect(role!.role).toBe('colaborador');
  });

  it('UPSERT is idempotent — second call does not duplicate profile or role', async () => {
    const email = `test_idempotent_${Date.now()}@nr1test.com`;
    const fullName = 'Idempotent Test User';

    const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
    });
    const uid = newUser!.user!.id;
    createdUserIds.push(uid);

    // First upsert
    await supabaseAdmin.from('profiles').upsert({ user_id: uid, full_name: fullName }, { onConflict: 'user_id' });
    await supabaseAdmin.from('user_roles').upsert({ user_id: uid, role: 'colaborador' }, { onConflict: 'user_id, role' });

    // Second upsert (should not fail or duplicate)
    const { error: profileErr2 } = await supabaseAdmin.from('profiles').upsert({ user_id: uid, full_name: fullName }, { onConflict: 'user_id' });
    const { error: roleErr2 } = await supabaseAdmin.from('user_roles').upsert({ user_id: uid, role: 'colaborador' }, { onConflict: 'user_id, role' });
    expect(profileErr2).toBeNull();
    expect(roleErr2).toBeNull();

    // Should still be exactly 1 profile and 1 role
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('user_id', uid);
    const { data: roles } = await supabaseAdmin.from('user_roles').select('*').eq('user_id', uid);
    expect(profiles).toHaveLength(1);
    expect(roles).toHaveLength(1);
  });
});
