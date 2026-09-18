const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const joaoUserId = '6836d703-bad8-483d-bfe1-582090949977';
  
  const { error } = await supabase.from('user_roles').insert({
    user_id: joaoUserId,
    role: 'colaborador'
  });
  
  if (error) console.error("Erro ao inserir role:", error);
  else console.log("Role 'colaborador' inserida com sucesso para o João!");
}

run();
