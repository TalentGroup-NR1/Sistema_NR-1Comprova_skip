import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseServiceKey || !supabaseAnonKey) {
  console.error("FAIL: Chaves do Supabase não encontradas no ambiente.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== INICIANDO VERIFICAÇÃO MULTI-TENANT (RLS REAL) ===");
  try {
    // 1. Setup: Garantir que temos 2 companies e 2 users
    const { data: companies } = await adminClient.from('companies').select('id').limit(2);
    if (!companies || companies.length < 2) {
      throw new Error("São necessárias pelo menos 2 companies no banco para o teste.");
    }
    const companyA = companies[0].id;
    const companyB = companies[1].id;

    console.log(`-> Company A: ${companyA}`);
    console.log(`-> Company B: ${companyB}`);

    // Inserir dados dummy para garantir que existe algo a ser lido
    await adminClient.from('pgr_importacoes').insert([
      { company_id: companyA, criado_por: "00000000-0000-0000-0000-000000000000", arquivo_nome: "A.pdf", status: "processando" },
      { company_id: companyB, criado_por: "00000000-0000-0000-0000-000000000000", arquivo_nome: "B.pdf", status: "processando" }
    ]);
    await adminClient.from('pgr_documentos').insert([
      { company_id: companyA, titulo: "PGR A", status: "confirmado" },
      { company_id: companyB, titulo: "PGR B", status: "confirmado" }
    ]);

    // Criar usuarios de teste
    const emailA = `testA_${Date.now()}@example.com`;
    const emailB = `testB_${Date.now()}@example.com`;
    const password = "Password123!";

    const { data: userA_res, error: errA } = await adminClient.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    const { data: userB_res, error: errB } = await adminClient.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    
    if (errA || errB) throw new Error("Erro criando usuários: " + (errA?.message || errB?.message));
    const userA = userA_res.user.id;
    const userB = userB_res.user.id;

    // Vincular usuarios as companies via profiles (onde fica o company_id real)
    // Usamos upsert para evitar erro caso a trigger on_auth_user_created já tenha inserido
    const { error: profErrA } = await adminClient.from('profiles').upsert(
      { user_id: userA, company_id: companyA },
      { onConflict: 'user_id' }
    );
    const { error: profErrB } = await adminClient.from('profiles').upsert(
      { user_id: userB, company_id: companyB },
      { onConflict: 'user_id' }
    );

    // E definimos a role
    const { error: roleErrA } = await adminClient.from('user_roles').insert({ user_id: userA, role: 'admin_empresa' });
    const { error: roleErrB } = await adminClient.from('user_roles').insert({ user_id: userB, role: 'admin_empresa' });

    if (profErrA || profErrB || roleErrA || roleErrB) {
       console.error("Erro ao vincular perfil/role:", profErrA, profErrB, roleErrA, roleErrB);
    }

    // 2. Autenticar Cliente A
    console.log("-> Autenticando Usuário A (Empresa A)...");
    const clientA = createClient(supabaseUrl, supabaseAnonKey);
    const { error: loginErrA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (loginErrA) throw new Error("Falha no login A");

    // 3. Provar RLS
    console.log("-> Testando Acesso Cruzado (Usuário A tentando ler Empresa B)");
    const { data: crossDocs, error: crossErr } = await clientA.from('pgr_documentos').select('*').eq('company_id', companyB);
    const { data: crossImps } = await clientA.from('pgr_importacoes').select('*').eq('company_id', companyB);
    
    if (crossErr) console.error(crossErr);
    
    if (crossDocs && crossDocs.length > 0) {
      throw new Error(`FAIL: Vazamento de dados! Usuário A leu ${crossDocs.length} documentos da Empresa B.`);
    } else {
      console.log(`   pgr_documentos: 0 linhas lidas (RLS Bloqueou).`);
    }

    if (crossImps && crossImps.length > 0) {
      throw new Error(`FAIL: Vazamento de dados! Usuário A leu ${crossImps.length} importações da Empresa B.`);
    } else {
      console.log(`   pgr_importacoes: 0 linhas lidas (RLS Bloqueou).`);
    }

    console.log("-> Testando Acesso Legítimo (Usuário A tentando ler Empresa A)");
    const { data: legitDocs } = await clientA.from('pgr_documentos').select('*').eq('company_id', companyA);
    if (!legitDocs || legitDocs.length === 0) {
      throw new Error("FAIL: Usuário A não leu nada da Empresa A. A policy allows_admin_empresa ou o vínculo profiles.company_id está quebrado.");
    } else {
      console.log(`   pgr_documentos: ${legitDocs.length} linhas lidas (Acesso Permitido).`);
    }

    // Limpar
    await adminClient.auth.admin.deleteUser(userA);
    await adminClient.auth.admin.deleteUser(userB);

    console.log("=== PASS: RLS restrito de banco validado com JWT real! ===");
  } catch (e: any) {
    console.error("=== FAIL ===");
    console.error(e.message);
    process.exit(1);
  }
}

run();
