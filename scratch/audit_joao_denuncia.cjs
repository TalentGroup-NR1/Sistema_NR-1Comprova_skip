const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  console.log('=== 1. DENUNCIAS RECENTES ===');
  const { data: denuncias, error: errD } = await supabase
    .from('denuncias')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(10);
  if (errD) console.error('Error fetching denuncias:', errD);
  else console.log('Denuncias:', JSON.stringify(denuncias, null, 2));

  console.log('\n=== 2. DENUNCIAS POR COMPANY_ID 8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4 ===');
  const { data: dComp, error: errDC } = await supabase
    .from('denuncias')
    .select('*')
    .eq('company_id', '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4');
  console.log('Denuncias company:', JSON.stringify(dComp, null, 2));

  console.log('\n=== 3. DENUNCIAS POR USER_ID 6836d703-bad8-483d-bfe1-582090949977 ===');
  const { data: dUser, error: errDU } = await supabase
    .from('denuncias')
    .select('*')
    .eq('user_id', '6836d703-bad8-483d-bfe1-582090949977');
  console.log('Denuncias user:', JSON.stringify(dUser, null, 2));

  console.log('\n=== 4. PROFILES JOAO ===');
  const { data: prof, error: errP } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', '6836d703-bad8-483d-bfe1-582090949977');
  console.log('Profiles Joao by user_id:', JSON.stringify(prof, null, 2));

  const { data: profId, error: errPI } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '6836d703-bad8-483d-bfe1-582090949977');
  console.log('Profiles Joao by id:', JSON.stringify(profId, null, 2));

  console.log('\n=== 5. COLABORADORES JOAO ===');
  const { data: colab, error: errC } = await supabase
    .from('colaboradores')
    .select('*')
    .or('user_id.eq.6836d703-bad8-483d-bfe1-582090949977,id.eq.6836d703-bad8-483d-bfe1-582090949977');
  console.log('Colaboradores Joao:', JSON.stringify(colab, null, 2));

  console.log('\n=== 6. NOTIFICATIONS RECENTES ===');
  const { data: notifs, error: errN } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Notifications recentes:', JSON.stringify(notifs, null, 2));
}

run();
