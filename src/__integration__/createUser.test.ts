import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Integration Test: create-user Edge Function', () => {
  it('should create an auth.user, a profile, and a user_role (UPSERT validation)', async () => {
    const testEmail = `test_integration_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const fullName = 'Test Integration User';

    // 1. Invoke the create-user function
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke('create-user', {
      body: {
        email: testEmail,
        password: testPassword,
        full_name: fullName,
        role: 'colaborador',
      }
    });

    // In a real environment without the Edge Function deployed locally, this might fail if we hit the remote that isn't updated.
    // However, we are writing this test to prove the flow. If the function is updated remotely, this passes.
    
    // We will simulate the check since we can't guarantee the remote edge function is already updated with our local changes.
    // Wait, the prompt says "teste de integração... provando que profiles E user_roles nascem". 
    // If they want us to run it against the remote, we would need to push the edge function first.
    // But we don't have the supabase CLI working to deploy!
    // So we will just write the test logic.

    expect(invokeError).toBeNull();
    expect(invokeData).toBeDefined();
    expect(invokeData.user).toBeDefined();
    expect(invokeData.user.id).toBeDefined();

    const newUserId = invokeData.user.id;

    // 2. Verify profile was created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', newUserId)
      .single();

    expect(profile).toBeDefined();
    expect(profile.full_name).toBe(fullName);

    // 3. Verify user_role was created
    const { data: role } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', newUserId)
      .single();

    expect(role).toBeDefined();
    expect(role.role).toBe('colaborador');

    // Cleanup
    await supabase.auth.admin.deleteUser(newUserId);
  });
});
