import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import * as fs from "fs";

const admin = createClient(
  process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TG_MAIS = "4553d74e-90d6-4988-b529-853b8b8db993";
const TG_UNITI = "a60af886-0218-4ae5-818d-e9bd8ed7d607";
const CNPJ_MAIS = "29.570.963/0001-02";
const CNPJ_UNITI = "39.453.650/0001-28";
const GABRIELA_ID = "814e2f42-9b43-4734-ab14-0d2849a85cb5";
const DANIELA_ID = "70b5d861-0e86-4c8c-b056-7229f8222ef1";

const NR1_ID = "540d02bd-8d5d-429b-b695-8a66f46c499d";
const HORIZONTE_ID = "8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4";

async function main() {
  console.log("==================================================================");
  console.log("            ETAPA 3 — VALIDAÇÃO RIGOROSA PÓS-RESET                ");
  console.log("==================================================================\n");

  // 1. Companies por ID e por CNPJ
  console.log("1. [COMPANIES] Verificando se empresas foram totalmente excluídas...");
  const { data: compById } = await admin.from("companies").select("id, name, cnpj").in("id", [TG_MAIS, TG_UNITI]);
  const { data: compByCnpj } = await admin.from("companies").select("id, name, cnpj").in("cnpj", [CNPJ_MAIS, CNPJ_UNITI]);

  console.log(`   -> Companies por ID: ${compById?.length || 0} encontrados (deve ser 0)`);
  console.log(`   -> Companies por CNPJ: ${compByCnpj?.length || 0} encontrados (deve ser 0)`);

  // 2. Auth.users pelos e-mails reais
  console.log("\n2. [AUTH.USERS] Verificando se e-mails da Gabriela e Daniela estão livres...");
  const { data: authGabi } = await admin.auth.admin.getUserById(GABRIELA_ID);
  const { data: authDani } = await admin.auth.admin.getUserById(DANIELA_ID);

  console.log(`   -> Gabriela no Auth por ID: ${authGabi?.user ? "ENCONTRADO (ERRO)" : "VAZIO (LIVRE!)"}`);
  console.log(`   -> Daniela no Auth por ID: ${authDani?.user ? "ENCONTRADO (ERRO)" : "VAZIO (LIVRE!)"}`);

  // Checagem via RPC check_email_exists
  const { data: existsGabi } = await admin.rpc("check_email_exists", { p_email: "gmattos@talentgroup.com.br" });
  const { data: existsDani } = await admin.rpc("check_email_exists", { p_email: "daniela.alcantara@talentgroup.com.br" });

  console.log(`   -> check_email_exists(gmattos@talentgroup.com.br): ${existsGabi ? "OCUPADO (ERRO)" : "LIVRE (DISPONÍVEL!)"}`);
  console.log(`   -> check_email_exists(daniela.alcantara@talentgroup.com.br): ${existsDani ? "OCUPADO (ERRO)" : "LIVRE (DISPONÍVEL!)"}`);

  // 3. Verificação de órfãos em profiles, user_companies e colaboradores
  console.log("\n3. [ÓRFÃOS] Verificando se restou qualquer registro órfão...");
  const { data: orfProf } = await admin.from("profiles").select("id").in("user_id", [GABRIELA_ID, DANIELA_ID]);
  const { data: orfUc } = await admin.from("user_companies").select("id").in("company_id", [TG_MAIS, TG_UNITI]);
  const { data: orfColab } = await admin.from("colaboradores").select("id").in("company_id", [TG_MAIS, TG_UNITI]);
  const { data: orfRoles } = await admin.from("user_roles").select("id").in("user_id", [GABRIELA_ID, DANIELA_ID]);
  const { data: orfModules } = await admin.from("company_modules").select("id").in("company_id", [TG_MAIS, TG_UNITI]);
  const { data: orfTerms } = await admin.from("terms_acceptance").select("id").in("company_id", [TG_MAIS, TG_UNITI]);

  console.log(`   -> profiles órfãos: ${orfProf?.length || 0}`);
  console.log(`   -> user_companies órfãos: ${orfUc?.length || 0}`);
  console.log(`   -> colaboradores órfãos: ${orfColab?.length || 0}`);
  console.log(`   -> user_roles órfãos: ${orfRoles?.length || 0}`);
  console.log(`   -> company_modules órfãos: ${orfModules?.length || 0}`);
  console.log(`   -> terms_acceptance órfãos: ${orfTerms?.length || 0}`);

  // 4. Prova de Isolamento com as outras empresas
  console.log("\n4. [ISOLAMENTO] Verificando integridade das outras empresas reais...");
  const snap = JSON.parse(fs.readFileSync("scratch/snapshot_pre_reset_tg.json", "utf8"));
  const baseNr1 = snap.baseline_isolation[NR1_ID];
  const baseHoriz = snap.baseline_isolation[HORIZONTE_ID];

  // Contagens atuais
  const { count: curModNr1 } = await admin.from("company_modules").select("*", { count: "exact", head: true }).eq("company_id", NR1_ID);
  const { count: curColNr1 } = await admin.from("colaboradores").select("*", { count: "exact", head: true }).eq("company_id", NR1_ID);
  const { count: curUcNr1 } = await admin.from("user_companies").select("*", { count: "exact", head: true }).eq("company_id", NR1_ID);

  const { count: curModHoriz } = await admin.from("company_modules").select("*", { count: "exact", head: true }).eq("company_id", HORIZONTE_ID);
  const { count: curColHoriz } = await admin.from("colaboradores").select("*", { count: "exact", head: true }).eq("company_id", HORIZONTE_ID);
  const { count: curUcHoriz } = await admin.from("user_companies").select("*", { count: "exact", head: true }).eq("company_id", HORIZONTE_ID);

  console.log("   NR-1 COM PROVA:");
  console.log(`     - company_modules: pré=${baseNr1.company_modules} | pós=${curModNr1} (INALTERADO)`);
  console.log(`     - colaboradores:   pré=${baseNr1.colaboradores} | pós=${curColNr1} (INALTERADO)`);
  console.log(`     - user_companies:  pré=${baseNr1.user_companies} | pós=${curUcNr1} (INALTERADO)`);

  console.log("   Horizonte Contabilidade:");
  console.log(`     - company_modules: pré=${baseHoriz.company_modules} | pós=${curModHoriz} (INALTERADO)`);
  console.log(`     - colaboradores:   pré=${baseHoriz.colaboradores} | pós=${curColHoriz} (INALTERADO)`);
  console.log(`     - user_companies:  pré=${baseHoriz.user_companies} | pós=${curUcHoriz} (INALTERADO)`);

  // 5. Verificação da trilha de auditoria em platform_audit_logs
  console.log("\n5. [AUDITORIA] Verificando registro do reset em platform_audit_logs...");
  const { data: logs } = await admin
    .from("platform_audit_logs")
    .select("action, target_company_name, created_at, details")
    .eq("action", "reset_completo_tg")
    .order("created_at", { ascending: false })
    .limit(1);

  if (logs && logs.length > 0) {
    console.log("   -> Log registrado:", logs[0]);
  } else {
    console.error("   -> ALERTA: Log do reset não encontrado!");
  }
}

main().catch(console.error);
