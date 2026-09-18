import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://alneozvrsuwszlkisbyo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs'
);

async function run() {
  const { data: bDep } = await supabase.from('beneficios_departamento').select('*').eq('beneficio_id', 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7');
  console.log('Dep:', bDep);
  
  const { data: bTC } = await supabase.from('beneficios_tipo_contrato').select('*').eq('beneficio_id', 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7');
  console.log('TC:', bTC);
  
  const { data: bInd } = await supabase.from('colaborador_beneficios').select('*').eq('beneficio_id', 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7').eq('colaborador_id', '14e3f03e-1a8f-4a94-be29-48ec04bbb6d9');
  console.log('Ind (Joao):', bInd);
  
  console.log('Checking all deps in DB to see what column stores the department...');
  const { data: depsInfo } = await supabase.from('beneficios_departamento').select('departamento').limit(5);
  console.log('Sample deps:', depsInfo);
}

run();
