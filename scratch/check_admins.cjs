const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  const companyId = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';
  const { data: profs } = await supabase.from('profiles').select('*').eq('company_id', companyId);
  console.log('Profiles in company:', JSON.stringify(profs, null, 2));

  for (const p of profs || []) {
    const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', p.user_id);
    console.log(`Roles for ${p.full_name} (${p.user_id}):`, roles);
  }
}
run();
