import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Tentar ler a importação mais recente
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
  const { data, error } = await supabase
    .from('pgr_importacoes')
    .select('id, extracao_raw, created_at')
    .eq('company_id', '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Result:", JSON.stringify(data?.extracao_raw?.dados_empresa, null, 2));
  }
}

run();
