import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alneozvrsuwszlkisbyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- 1. Benefício "Combo VR/VA" ---');
  const { data: beneficio, error: errB } = await supabase
    .from('beneficios')
    .select('*')
    .ilike('nome', '%Combo VR/VA%');
    
  if (errB) console.error(errB);
  else console.log(JSON.stringify(beneficio, null, 2));
  
  if (beneficio && beneficio.length > 0) {
    const bId = beneficio[0].id;
    console.log(`\n--- 2. Elegibilidade (Departamento) para ${bId} ---`);
    const { data: bDep, error: errDep } = await supabase
      .from('beneficios_departamento')
      .select('*')
      .eq('beneficio_id', bId);
    if (errDep) console.error(errDep);
    else console.log(JSON.stringify(bDep, null, 2));

    console.log(`\n--- 3. Elegibilidade (Tipo Contrato) para ${bId} ---`);
    const { data: bTC, error: errTC } = await supabase
      .from('beneficios_tipo_contrato')
      .select('*')
      .eq('beneficio_id', bId);
    if (errTC) console.error(errTC);
    else console.log(JSON.stringify(bTC, null, 2));
    
    console.log(`\n--- 4. Elegibilidade (Individual) para ${bId} ---`);
    const { data: bInd, error: errInd } = await supabase
      .from('colaborador_beneficios')
      .select('*')
      .eq('beneficio_id', bId);
    if (errInd) console.error(errInd);
    else console.log(JSON.stringify(bInd, null, 2));
  }

  console.log('\n--- 5. Colaborador "João Pedro Santos" ---');
  const { data: joao, error: errJ } = await supabase
    .from('colaboradores')
    .select('id, user_id, company_id, full_name, department, contract_type, status')
    .ilike('full_name', '%João Pedro Santos%');
    
  if (errJ) console.error(errJ);
  else console.log(JSON.stringify(joao, null, 2));
}

run();
