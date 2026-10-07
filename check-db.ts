import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: policies, error } = await supabase.rpc('query', { 
    sql_string: "SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'pulse_campaigns';"
  });
  console.log("policies:", policies, error ? error.message : "");
}

check().catch(console.error);
