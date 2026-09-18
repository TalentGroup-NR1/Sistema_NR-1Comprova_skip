const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

const COMPANY_ID = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4';
const BENEFICIO_ID = 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7';

async function run() {
  console.log("=== 1. PROVA DO DADO NO BANCO ===");
  const { data: ben } = await supabase.from('beneficios').select('*').eq('id', BENEFICIO_ID);
  console.log("beneficios:");
  console.log(ben);

  const { data: bDept } = await supabase.from('beneficios_departamento').select('*').eq('beneficio_id', BENEFICIO_ID);
  console.log("\nbeneficios_departamento:");
  console.log(bDept);

  const { data: bContrato } = await supabase.from('beneficios_tipo_contrato').select('*').eq('beneficio_id', BENEFICIO_ID);
  console.log("\nbeneficios_tipo_contrato:");
  console.log(bContrato);

  console.log("\n=== 2. PROVA DA QUERY DO HOOK (João) ===");
  const joaoDept = "Recursos Humanos";
  const joaoContrato = "CLT";

  const { data: hookDept, error: hookDeptError } = await supabase
    .from('beneficios_departamento')
    .select(`*, beneficio:beneficios(*)`)
    .eq('departamento', joaoDept)
    .eq('company_id', COMPANY_ID);
    
  console.log(`\nQuery: select from beneficios_departamento where departamento='${joaoDept}'`);
  console.log("Count:", hookDept?.length, "Error:", hookDeptError);
  console.log(hookDept ? hookDept.map(d => `Beneficio ID: ${d.beneficio_id}, Ativo: ${d.beneficio.ativo}, Nome: ${d.beneficio.nome}`) : []);

  const { data: hookContrato, error: hookContratoError } = await supabase
    .from('beneficios_tipo_contrato')
    .select(`*, beneficio:beneficios(*)`)
    .eq('tipo_contrato', joaoContrato)
    .eq('company_id', COMPANY_ID);
    
  console.log(`\nQuery: select from beneficios_tipo_contrato where tipo_contrato='${joaoContrato}'`);
  console.log("Count:", hookContrato?.length, "Error:", hookContratoError);
  console.log(hookContrato ? hookContrato.map(c => `Beneficio ID: ${c.beneficio_id}, Ativo: ${c.beneficio.ativo}, Nome: ${c.beneficio.nome}`) : []);
}

run();
