import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSecurityTests() {
  console.log("=================================================");
  console.log("SUÍTE DE VALIDAÇÃO DE SEGURANÇA — 5 TESTES");
  console.log("=================================================\n");

  const results: Record<string, any> = {};

  // -------------------------------------------------------------------------
  // TESTE 1: Rota /cadastro-empresa DESLOGADO
  // -------------------------------------------------------------------------
  console.log("--- TESTE 1: Configuração da Rota /cadastro-empresa no Frontend ---");
  const fs = await import("fs");
  const appTsx = fs.readFileSync("src/App.tsx", "utf-8");
  const publicRoutesTs = fs.readFileSync("src/lib/publicRoutes.ts", "utf-8");

  const hasProtectedRoute = appTsx.includes('ProtectedRoute requireSuperAdmin unauthenticatedRedirect="/login"') &&
    appTsx.includes('<CadastroEmpresa />');
  const isNotInPublicRoutes = !publicRoutesTs.includes("'/cadastro-empresa'") &&
    !publicRoutesTs.includes('"/cadastro-empresa"');

  const test1Passed = hasProtectedRoute && isNotInPublicRoutes;
  results.teste1 = {
    passou: test1Passed,
    hasProtectedRoute,
    isNotInPublicRoutes,
    detalhes: test1Passed 
      ? "Rota protegida com ProtectedRoute requireSuperAdmin unauthenticatedRedirect=\"/login\" e removida de publicRoutes.ts (visitante deslogado é redirecionado para /login)"
      : "Falha na configuração da rota",
  };
  console.log(`Resultado Teste 1: ${test1Passed ? "PASSO (BLOQUEIA DESLOGADO)" : "FALHOU"}\n`);

  // -------------------------------------------------------------------------
  // TESTE 2: Edge Function register-company SEM token (ou com anon key)
  // -------------------------------------------------------------------------
  console.log("--- TESTE 2: Chamar Edge Function register-company SEM token ---");
  const funcUrl = `${SUPABASE_URL}/functions/v1/register-company`;

  // 2a. Sem header Authorization
  const resNoAuth = await fetch(funcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ razao_social: "Invasora Ltda", cnpj: "11.111.111/0001-11" }),
  });
  const bodyNoAuth = await resNoAuth.json().catch(() => ({}));
  console.log(`Status sem Authorization: ${resNoAuth.status}`, bodyNoAuth);

  // 2b. Com anon key no Authorization
  const resAnonBearer = await fetch(funcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ razao_social: "Invasora Ltda", cnpj: "11.111.111/0001-11" }),
  });
  const bodyAnonBearer = await resAnonBearer.json().catch(() => ({}));
  console.log(`Status com Bearer anon_key: ${resAnonBearer.status}`, bodyAnonBearer);

  const test2Passed = resNoAuth.status === 401 && resAnonBearer.status === 401;
  results.teste2 = {
    passou: test2Passed,
    statusNoAuth: resNoAuth.status,
    bodyNoAuth,
    statusAnonBearer: resAnonBearer.status,
    bodyAnonBearer,
  };
  console.log(`Resultado Teste 2: ${test2Passed ? "PASSO (RETORNOU 401)" : "FALHOU"}\n`);

  // -------------------------------------------------------------------------
  // TESTE 3: Chamar Edge Function com token de admin_empresa (não super_admin)
  // -------------------------------------------------------------------------
  console.log("--- TESTE 3: Chamar Edge Function com token de admin_empresa ---");
  const tempEmail = `test_admin_empresa_${Date.now()}@security-test.local`;
  const tempPassword = `SecPass_${Date.now()}!Aa1`;
  let tempUserId: string | null = null;
  let test3Status = 0;
  let test3Body: any = {};

  try {
    // Cria usuário temporário
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role: "admin_empresa" },
      user_metadata: { full_name: "Admin Empresa Teste" },
    });
    if (createErr || !newUser.user) throw new Error(createErr?.message || "Falha ao criar usuário");
    tempUserId = newUser.user.id;

    // Vincula papel admin_empresa em user_roles
    await adminClient.from("user_roles").insert({
      user_id: tempUserId,
      role: "admin_empresa",
    });

    // Faz login para obter o access_token real de admin_empresa
    const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: tempEmail,
      password: tempPassword,
    });
    if (loginErr || !loginData.session) throw new Error(loginErr?.message || "Falha ao autenticar");

    const adminEmpresaToken = loginData.session.access_token;

    // Invoca register-company com o token de admin_empresa
    const resAdminEmpresa = await fetch(funcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminEmpresaToken}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        razao_social: "Filial Ilegal Ltda",
        cnpj: "22.222.222/0001-22",
        admin_nome: "Admin Empresa Teste",
        admin_email: tempEmail,
      }),
    });
    test3Status = resAdminEmpresa.status;
    test3Body = await resAdminEmpresa.json().catch(() => ({}));
    console.log(`Status com token admin_empresa: ${test3Status}`, test3Body);
  } finally {
    // Limpeza imediata do usuário temporário
    if (tempUserId) {
      await adminClient.from("user_roles").delete().eq("user_id", tempUserId);
      await adminClient.from("profiles").delete().eq("user_id", tempUserId);
      await adminClient.auth.admin.deleteUser(tempUserId);
      console.log("Limpeza de usuário temporário concluída.");
    }
  }

  const test3Passed = test3Status === 403;
  results.teste3 = {
    passou: test3Passed,
    status: test3Status,
    body: test3Body,
  };
  console.log(`Resultado Teste 3: ${test3Passed ? "PASSO (RETORNOU 403)" : "FALHOU"}\n`);

  // -------------------------------------------------------------------------
  // TESTE 4: Tentar INSERT direto em companies com a anon key
  // -------------------------------------------------------------------------
  console.log("--- TESTE 4: Tentar INSERT direto em companies com chave anon ---");
  const { data: insertData, error: insertError } = await anonClient
    .from("companies")
    .insert({
      name: "Empresa Invasora RLS",
      cnpj: "99.999.999/0001-99",
      email: "hacker@test.com",
    })
    .select();

  console.log("Resultado do INSERT anon:", { data: insertData, error: insertError });
  const test4Passed = !!insertError && (
    insertError.code === "42501" || 
    insertError.message.toLowerCase().includes("row-level security") ||
    insertError.message.toLowerCase().includes("violates")
  );

  results.teste4 = {
    passou: test4Passed,
    errorCode: insertError?.code,
    errorMessage: insertError?.message,
  };
  console.log(`Resultado Teste 4: ${test4Passed ? "PASSO (BLOQUEADO POR RLS)" : "FALHOU"}\n`);

  // -------------------------------------------------------------------------
  // TESTE 5: Acessar / Chamar LOGADO como Admin Master
  // -------------------------------------------------------------------------
  console.log("--- TESTE 5: Chamar Edge Function com token de Admin Master ---");
  const masterEmail = `test_master_${Date.now()}@security-test.local`;
  const masterPassword = `MasterPass_${Date.now()}!Aa1`;
  let masterUserId: string | null = null;
  let test5Status = 0;
  let test5Body: any = {};

  try {
    // Cria usuário temporário super_admin
    const { data: newMaster, error: createMasterErr } = await adminClient.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true,
      app_metadata: { role: "admin_master" },
      user_metadata: { full_name: "Admin Master Teste" },
    });
    if (createMasterErr || !newMaster.user) throw new Error(createMasterErr?.message || "Falha ao criar master");
    masterUserId = newMaster.user.id;

    // Vincula papel super_admin e admin_master em user_roles
    await adminClient.from("user_roles").insert([
      { user_id: masterUserId, role: "admin_master" },
      { user_id: masterUserId, role: "super_admin" },
    ]);

    // Faz login para obter o access_token real de Admin Master
    const { data: loginMaster, error: loginMasterErr } = await anonClient.auth.signInWithPassword({
      email: masterEmail,
      password: masterPassword,
    });
    if (loginMasterErr || !loginMaster.session) throw new Error(loginMasterErr?.message || "Falha ao autenticar master");

    const masterToken = loginMaster.session.access_token;

    // Invoca register-company enviando payload inválido de propósito (ex: body vazio)
    // Se a autenticação passar, ele retorna 400 (Dados inválidos) e NÃO 401 ou 403!
    const resMaster = await fetch(funcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterToken}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({}),
    });
    test5Status = resMaster.status;
    test5Body = await resMaster.json().catch(() => ({}));
    console.log(`Status com token Admin Master (payload vazio para testar auth): ${test5Status}`, test5Body);
  } finally {
    if (masterUserId) {
      await adminClient.from("user_roles").delete().eq("user_id", masterUserId);
      await adminClient.from("profiles").delete().eq("user_id", masterUserId);
      await adminClient.auth.admin.deleteUser(masterUserId);
      console.log("Limpeza de Admin Master temporário concluída.");
    }
  }

  // Passou se NÃO foi 401 nem 403 (ou seja, passou pela barreira de autorização do Admin Master)
  const test5Passed = test5Status === 400 && test5Body.error === "Dados inválidos";
  results.teste5 = {
    passou: test5Passed,
    status: test5Status,
    body: test5Body,
    detalhes: "Admin Master autenticado e autorizado com sucesso (ultrapassou verificação de autenticação e papel)",
  };
  console.log(`Resultado Teste 5: ${test5Passed ? "PASSO (AUTORIZADO PARA ADMIN MASTER)" : "FALHOU"}\n`);

  console.log("=================================================");
  console.log("RESUMO DOS 5 TESTES DE SEGURANÇA:");
  console.log(JSON.stringify(results, null, 2));
  console.log("=================================================");
}

runSecurityTests().catch((e) => {
  console.error("Erro nos testes de segurança:", e);
  process.exit(1);
});
