const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('department, contract_type')
    .eq('company_id', '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4');
    
  if (error) {
    console.error("Query failed:", error);
    return;
  }
  
  const depts = new Set();
  const contracts = new Set();
  
  for (const row of data) {
    if (row.department) depts.add(row.department);
    if (row.contract_type) contracts.add(row.contract_type);
  }
  
  console.log("Distinct Departments:");
  console.log(Array.from(depts));
  
  console.log("\nDistinct Contract Types:");
  console.log(Array.from(contracts));
}
run();
