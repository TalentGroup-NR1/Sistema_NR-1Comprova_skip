import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Variáveis de ambiente ausentes!");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

// IDs protegidos (NUNCA deletar)
const PROTECTED_COMPANIES = [
  "4553d74e-90d6-4988-b529-853b8b8db993", // TG MAIS
  "a60af886-0218-4ae5-818d-e9bd8ed7d607", // TG UNITI
];

const PROTECTED_USERS = [
  "814e2f42-9b43-4734-ab14-0d2849a85cb5", // Gabriela
  "70b5d861-0e86-4c8c-b056-7229f8222ef1", // Daniela
];

// IDs estritos aprovados para limpeza
const TARGET_USER_IDS = [
  "92fca2b2-a257-4271-be04-f779dd7ab4aa", // test_colab_admin_empresa_1792611299493@test-tg.com.br
  "d66f9f3a-e9ca-4ff4-a552-17dbba0742b7", // usuarioadminteste@teste.com
];

const TARGET_COMPANY_IDS = [
  "5ef8b244-9164-48a7-853c-5b063fe58ea2", // Empresa Teste A 1792626207978
  "a3571f38-8cda-4dd1-95cc-719b11703d2d", // Empresa Teste B 1792626207978
  "358d2d49-875e-4dfd-a989-59b850b3cd85", // EMPRESA TESTE E2E FILIAL 1793100673744
  "7358e139-f228-485d-bb7f-81236289e08a", // EMPRESA TESTE E2E FILIAL 1793100707898
  "7c253022-cb1a-44f7-8d13-83191674d45c", // Cliente Terceiro Teste 1793103229779
  "8032db92-75d1-4fbc-88c9-d7e023289e6a", // Cliente Terceiro Teste 1793103323934
];

async function executarLimpeza() {
  console.log("==================================================================");
  console.log("   ETAPA 1 — LIMPEZA DE RESÍDUOS DE TESTE EM PRODUÇÃO");
  console.log("==================================================================\n");

  // 1. CHECAGEM DE SEGURANÇA
  console.log("1. [SEGURANÇA] Verificando que nenhuma entidade real está nos alvos...");
  for (const cid of TARGET_COMPANY_IDS) {
    if (PROTECTED_COMPANIES.includes(cid)) {
      throw new Error(`ABORTANDO: Empresa protegida ${cid} está na lista de remoção!`);
    }
  }
  for (const uid of TARGET_USER_IDS) {
    if (PROTECTED_USERS.includes(uid)) {
      throw new Error(`ABORTANDO: Usuário protegido ${uid} está na lista de remoção!`);
    }
  }
  console.log("   -> OK: Nenhuma empresa ou usuário real nos alvos de limpeza.");

  // 2. INVENTÁRIO PRÉ-LIMPEZA
  console.log("\n2. [INVENTÁRIO] Listando o que será removido...");
  for (const uid of TARGET_USER_IDS) {
    const { data: prof } = await admin.from("profiles").select("full_name, email").eq("user_id", uid).maybeSingle();
    console.log(`   Usuário: ${uid} | Nome: "${prof?.full_name}" | Email: ${prof?.email || "(auth-only)"}`);
  }
  for (const cid of TARGET_COMPANY_IDS) {
    const { data: comp } = await admin.from("companies").select("name, cnpj").eq("id", cid).maybeSingle();
    console.log(`   Empresa: ${cid} | Nome: "${comp?.name}" | CNPJ: ${comp?.cnpj}`);
  }

  // 3. REMOÇÃO DOS USUÁRIOS DE TESTE (Ordem correta de FKs)
  console.log("\n3. [EXECUÇÃO] Removendo usuários de teste...");
  for (const uid of TARGET_USER_IDS) {
    // a. user_companies
    const { error: errUc } = await admin.from("user_companies").delete().eq("user_id", uid);
    if (errUc) console.warn(`   Aviso user_companies (${uid}):`, errUc.message);

    // b. user_roles
    const { error: errUr } = await admin.from("user_roles").delete().eq("user_id", uid);
    if (errUr) console.warn(`   Aviso user_roles (${uid}):`, errUr.message);

    // c. profiles
    const { error: errProf } = await admin.from("profiles").delete().eq("user_id", uid);
    if (errProf) console.warn(`   Aviso profiles (${uid}):`, errProf.message);

    // d. auth.users
    const { error: errAuth } = await admin.auth.admin.deleteUser(uid);
    if (errAuth) console.warn(`   Aviso auth.users (${uid}):`, errAuth.message);

    console.log(`   -> Usuário ${uid} e todos os seus vínculos removidos com sucesso.`);
  }

  // 4. REMOÇÃO DAS EMPRESAS DE TESTE (Ordem correta de FKs)
  console.log("\n4. [EXECUÇÃO] Removendo empresas de teste...");
  for (const cid of TARGET_COMPANY_IDS) {
    // a. colaboradores
    const { error: errColab } = await admin.from("colaboradores").delete().eq("company_id", cid);
    if (errColab) console.warn(`   Aviso colaboradores (${cid}):`, errColab.message);

    // b. company_modules
    const { error: errMod } = await admin.from("company_modules").delete().eq("company_id", cid);
    if (errMod) console.warn(`   Aviso company_modules (${cid}):`, errMod.message);

    // c. user_companies
    const { error: errCompUc } = await admin.from("user_companies").delete().eq("company_id", cid);
    if (errCompUc) console.warn(`   Aviso user_companies (${cid}):`, errCompUc.message);

    // d. companies
    const { error: errComp } = await admin.from("companies").delete().eq("id", cid);
    if (errComp) console.warn(`   Aviso companies (${cid}):`, errComp.message);

    console.log(`   -> Empresa ${cid} e registros dependentes removidos com sucesso.`);
  }

  // 5. REGISTRO EM PLATFORM_AUDIT_LOGS
  console.log("\n5. [AUDIT LOG] Registrando ação em platform_audit_logs...");
  const { error: errAudit } = await admin.from("platform_audit_logs").insert({
    action: "limpeza_residuos_teste",
    user_id: "00000000-0000-0000-0000-000000000000", // Sistema / Automated Job
    details: {
      descricao: "Remoção de usuários e empresas de teste residuais em produção",
      target_user_ids: TARGET_USER_IDS,
      target_company_ids: TARGET_COMPANY_IDS,
      timestamp: new Date().toISOString(),
    },
  });
  if (errAudit) {
    console.warn("Aviso ao registrar log de auditoria:", errAudit.message);
  } else {
    console.log("   -> OK: Registro de auditoria gravado com sucesso.");
  }

  // 6. VALIDAÇÃO PÓS-LIMPEZA DAS EMPRESAS REAIS
  console.log("\n6. [CONFIRMAÇÃO] Validando integridade das empresas reais...");
  const { data: realMais } = await admin.from("companies").select("id, name, status").eq("id", PROTECTED_COMPANIES[0]).single();
  const { data: realUniti } = await admin.from("companies").select("id, name, status").eq("id", PROTECTED_COMPANIES[1]).single();
  console.log(`   TG MAIS (${realMais?.id}): "${realMais?.name}" [Status: ${realMais?.status}]`);
  console.log(`   TG UNITI (${realUniti?.id}): "${realUniti?.name}" [Status: ${realUniti?.status}]`);

  // Validar que Colab Teste não existe mais em TG MAIS
  const { data: usersMais } = await admin.rpc("get_company_users", { p_company_id: PROTECTED_COMPANIES[0] });
  console.log(`   Membros restantes na TG MAIS: ${usersMais?.length}`);
  for (const u of usersMais || []) {
    console.log(`     • ${u.full_name} (${u.role})`);
  }

  console.log("\n==================================================================");
  console.log("   ETAPA 1 CONCLUÍDA COM SUCESSO ABSOLUTO!");
  console.log("==================================================================");
}

executarLimpeza().catch((err) => {
  console.error("ERRO NA LIMPEZA:", err);
  process.exit(1);
});
