import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import * as fs from "fs";

const admin = createClient(
  process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TG_MAIS = "4553d74e-90d6-4988-b529-853b8b8db993";
const TG_UNITI = "a60af886-0218-4ae5-818d-e9bd8ed7d607";
const GABRIELA_ID = "814e2f42-9b43-4734-ab14-0d2849a85cb5";
const DANIELA_ID = "70b5d861-0e86-4c8c-b056-7229f8222ef1";

async function main() {
  console.log("=== EXECUTANDO ETAPA 2 (PARTE B: DELEÇÃO DE USUÁRIOS NO AUTH + AUDITORIA) ===");

  // 1. Deletar usuárias no auth.users
  console.log("\n1. Deletando conta Auth da Daniela...");
  const { error: errDelDani } = await admin.auth.admin.deleteUser(DANIELA_ID);
  if (errDelDani) {
    console.error("Erro ao deletar Daniela no Auth:", errDelDani);
  } else {
    console.log("-> Daniela deletada do Auth com sucesso!");
  }

  console.log("\n2. Deletando conta Auth da Gabriela...");
  const { error: errDelGabi } = await admin.auth.admin.deleteUser(GABRIELA_ID);
  if (errDelGabi) {
    console.error("Erro ao deletar Gabriela no Auth:", errDelGabi);
  } else {
    console.log("-> Gabriela deletada do Auth com sucesso!");
  }

  // 2. Registrar em platform_audit_logs
  console.log("\n3. Registrando auditoria em platform_audit_logs...");
  const JOSENILDO_ID = "83d39c65-c847-41a7-afca-0a93750539b9";
  const { error: errAudit } = await admin.from("platform_audit_logs").insert({
    user_id: JOSENILDO_ID,
    user_email: "josenildo.santos@talentgroup.com.br",
    action: "reset_completo_tg",
    target_company_name: "TG MAIS & TG UNITI",
    details: {
      deleted_companies: [
        { id: TG_MAIS, name: "TG MAIS SERVIÇOS DE TECNOLOGIA E RH LTDA" },
        { id: TG_UNITI, name: "TG UNITI SERVIÇOS LTDA" },
      ],
      deleted_users: [
        { id: GABRIELA_ID, email_masked: "gm***s@talentgroup.com.br" },
        { id: DANIELA_ID, email_masked: "da***a@talentgroup.com.br" },
      ],
      timestamp: new Date().toISOString(),
      snapshot_file: "scratch/snapshot_pre_reset_tg.json",
      reason: "Reset total para recadastro do zero e gravação da implantação",
    },
  });

  if (errAudit) {
    console.error("Erro ao registrar auditoria:", errAudit);
  } else {
    console.log("-> Auditoria registrada com sucesso em platform_audit_logs!");
  }
}

main().catch(console.error);
