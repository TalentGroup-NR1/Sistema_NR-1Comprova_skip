const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function testAdmin() {
  const { data: userList, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  const ana = userList.users.find(u => u.id === 'c36b205d-a22f-4b1a-8ea9-50bfecb198b0');
  console.log('Ana user in auth.users:', ana ? { id: ana.id, email: ana.email } : 'Not found');
  
  // Can we generate a link or token?
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: ana.email
  });
  console.log('Generate link result:', { linkData: !!linkData, linkErr });
  if (linkData?.properties?.hashed_token) {
    // We can verify OTP or exchange token
    const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email'
    });
    console.log('Session data access token present?:', !!sessionData?.session?.access_token, sessionErr);
    if (sessionData?.session?.access_token) {
      const authedClient = createClient(
        'https://alneozvrsuwszlkisbyo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1Nzg2MTcsImV4cCI6MjEwMzE1NDYxN30.0gxHjDOm3HrLhHGEhry2zVpiL8HC1SES96D69BccWoM',
        {
          global: {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`
            }
          }
        }
      );
      const { data: rpcData, error: rpcErr } = await authedClient.rpc('listar_denuncias_admin');
      console.log('LISTAR_DENUNCIAS_ADMIN AS ANA RESULT:', { rpcData, rpcErr });
    }
  }
}

testAdmin();
