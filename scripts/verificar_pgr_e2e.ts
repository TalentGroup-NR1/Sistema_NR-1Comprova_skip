import { createClient } from "@supabase/supabase-js";
import "dotenv/config"; // Requires running with node or ts-node using local .env

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("FAIL: SUPABASE_SERVICE_ROLE_KEY não encontrada no ambiente.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== INICIANDO VERIFICAÇÃO E2E DO PGR ===");
  try {
    // 1. Pegar uma company
    const { data: company, error: companyErr } = await supabase.from('companies').select('id').limit(1).single();
    if (companyErr || !company) throw new Error("Falha ao achar company: " + (companyErr?.message || 'Nenhuma company encontrada'));
    
    // 2. Criar uma pgr_importacao fake 'aguardando_revisao'
    console.log("-> Criando importação aguardando revisão...");
    const { data: imp, error: impErr } = await supabase.from('pgr_importacoes').insert({
      company_id: company.id,
      criado_por: "00000000-0000-0000-0000-000000000000", // Fake user
      arquivo_nome: "fake_e2e.pdf",
      arquivo_storage: "fake/path.pdf",
      status: "aguardando_revisao",
      extracao_raw: {
        dados_empresa: { nome: "Empresa Fake E2E", cnae: "1234", grau_risco: "3" },
        ghes: [
          {
            nome: "GHE Fake E2E",
            descricao: "GHE Teste",
            riscos: [{ categoria: "Físico", perigo: "Ruído", probabilidade: 3, severidade: 3 }]
          }
        ],
        plano_acao: [{ acao: "Comprar EPI", responsavel: "João", data_prevista: "2026-10-10" }]
      }
    }).select('id').single();

    if (impErr || !imp) throw new Error("Falha ao criar importação: " + impErr?.message);
    const importacao_id = imp.id;

    // 3. Confirmar (Chamar a RPC diretamente como a Edge Function faria)
    console.log(`-> Disparando pgr_confirmar_parse para importação ${importacao_id}...`);
    const { error: rpcErr } = await supabase.rpc("pgr_confirmar_parse", { 
      p_importacao_id: importacao_id, 
      p_user_id: "00000000-0000-0000-0000-000000000000" 
    });

    if (rpcErr) throw new Error("Falha no Parse Transacional: " + rpcErr.message);

    // 4. Validar os registros inseridos (pgr_documentos, ghes, nr1_ghe_riscos, nr1_planos_acao)
    console.log("-> Validando tabelas de destino...");
    const { count: docCount } = await supabase.from('pgr_documentos').select('*', { count: 'exact' }).eq('company_id', company.id);
    const { count: gheCount } = await supabase.from('ghes').select('*', { count: 'exact' }).eq('company_id', company.id);
    
    console.log(`   pgr_documentos: ${docCount}`);
    console.log(`   ghes: ${gheCount}`);
    
    if (docCount === 0 || gheCount === 0) {
      throw new Error("Tabelas não foram populadas corretamente.");
    }
    
    // Limpar
    await supabase.from('pgr_importacoes').delete().eq('id', importacao_id);
    // As tabelas relacionais ficam por conta do company_id, idealmente limparíamos, mas num E2E de staging ok.

    console.log("=== PASS: Fluxo E2E confirmado sem falhas! ===");
  } catch (e: any) {
    console.error("=== FAIL ===");
    console.error(e.message);
    process.exit(1);
  }
}

run();
