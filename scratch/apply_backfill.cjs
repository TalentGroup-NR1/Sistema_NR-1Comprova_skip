const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

const COMPANY_ID = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';
const BENEFICIO_ID = 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7';

async function backfill(executionNumber) {
  console.log(`\n--- Execução ${executionNumber} ---`);
  
  // 1. Fetch departments
  const { data: colabs } = await supabase
    .from('colaboradores')
    .select('department, contract_type')
    .eq('company_id', COMPANY_ID);
    
  const depts = Array.from(new Set(colabs.map(c => c.department).filter(Boolean)));
  const contracts = Array.from(new Set(colabs.map(c => c.contract_type).filter(Boolean)));
  
  let insertedDepts = 0;
  for (const dept of depts) {
    const { data: existing } = await supabase.from('beneficios_departamento')
      .select('id')
      .eq('beneficio_id', BENEFICIO_ID)
      .eq('departamento', dept)
      .eq('company_id', COMPANY_ID);
      
    if (existing && existing.length === 0) {
      await supabase.from('beneficios_departamento').insert({
        beneficio_id: BENEFICIO_ID,
        departamento: dept,
        company_id: COMPANY_ID
      });
      insertedDepts++;
    }
  }
  
  let insertedContracts = 0;
  for (const ct of contracts) {
    const { data: existing } = await supabase.from('beneficios_tipo_contrato')
      .select('id')
      .eq('beneficio_id', BENEFICIO_ID)
      .eq('tipo_contrato', ct)
      .eq('company_id', COMPANY_ID);
      
    if (existing && existing.length === 0) {
      await supabase.from('beneficios_tipo_contrato').insert({
        beneficio_id: BENEFICIO_ID,
        tipo_contrato: ct,
        company_id: COMPANY_ID
      });
      insertedContracts++;
    }
  }
  
  console.log(`Linhas inseridas em beneficios_departamento: ${insertedDepts}`);
  console.log(`Linhas inseridas em beneficios_tipo_contrato: ${insertedContracts}`);
}

async function run() {
  // Executar 1ª vez
  await backfill(1);
  // Executar 2ª vez
  await backfill(2);
  
  // Comprovar o João
  console.log(`\n--- Verificação do João ---`);
  const { data: joao } = await supabase.from('colaboradores')
    .select('id, department, contract_type')
    .eq('department', 'Recursos Humanos')
    .eq('contract_type', 'CLT')
    .eq('company_id', COMPANY_ID)
    .limit(1);
    
  if (joao && joao.length > 0) {
    console.log(`João (department: ${joao[0].department}, contract_type: ${joao[0].contract_type})`);
    const { data: deptMatch } = await supabase.from('beneficios_departamento')
      .select('*').eq('beneficio_id', BENEFICIO_ID).eq('departamento', joao[0].department);
    const { data: ctMatch } = await supabase.from('beneficios_tipo_contrato')
      .select('*').eq('beneficio_id', BENEFICIO_ID).eq('tipo_contrato', joao[0].contract_type);
      
    console.log(`Match de Departamento: ${deptMatch.length > 0 ? 'SIM' : 'NÃO'}`);
    console.log(`Match de Tipo de Contrato: ${ctMatch.length > 0 ? 'SIM' : 'NÃO'}`);
  }
}

run();
