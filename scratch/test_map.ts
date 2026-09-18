import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const imp = {
    id: "3189113f-b552-45a7-8208-056c803df7ba",
    dados_empresa: {
      nome: "Empresa Teste",
      data_elaboracao: "2024-05-15",
      responsavel_tecnico: "Joao"
    } as any
  };

  const pgrInfo = {
    id: imp.id,
    data_elaboracao: imp.dados_empresa?.data_elaboracao || imp.data_elaboracao,
    responsavel_tecnico: imp.dados_empresa?.responsavel_tecnico || imp.responsavel_tecnico,
  };

  console.log("pgrInfo:", pgrInfo);
}

test();
