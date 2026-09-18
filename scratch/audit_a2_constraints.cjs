const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://alneozvrsuwszlkisbyo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmVvenZyc3V3c3psa2lzYnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU3ODYxNywiZXhwIjoyMTAzMTU0NjE3fQ.2CPeRGjaioa89cy154rDnmWiyZtftroANjkcMcsf-xs');

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { sql_query: "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.beneficios_departamento'::regclass,'public.beneficios_tipo_contrato'::regclass);" });
  console.log(data || error);
}
run();
