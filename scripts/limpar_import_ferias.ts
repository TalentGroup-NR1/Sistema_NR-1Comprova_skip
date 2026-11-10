import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

interface CliArgs {
  companyId?: string;
  dataCorte?: string;
  onlyCsvImported: boolean;
  confirm: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    onlyCsvImported: true,
    confirm: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--confirm") {
      result.confirm = true;
    } else if (arg === "--all-gozos") {
      result.onlyCsvImported = false;
    } else if (arg === "--company-id" || arg === "-c") {
      result.companyId = args[++i];
    } else if (arg.startsWith("--company-id=")) {
      result.companyId = arg.split("=")[1];
    } else if (arg === "--corte") {
      result.dataCorte = args[++i];
    } else if (arg.startsWith("--corte=")) {
      result.dataCorte = arg.split("=")[1];
    } else if (!result.companyId && !arg.startsWith("-")) {
      result.companyId = arg;
    }
  }

  return result;
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const args = parseArgs();

  console.log("=== SCRIPT DE LIMPEZA COM BACKUP OBRIGATÓRIO (ferias_gozo) ===");

  if (!args.companyId) {
    console.error(`
Uso:
  npx tsx scripts/limpar_import_ferias.ts --company-id <UUID> [--corte AAAA-MM-DD] [--confirm]

Opções:
  --company-id <UUID>  ID da empresa (obrigatório)
  --corte <DATA>       Filtro opcional por created_at <= DATA (AAAA-MM-DD)
  --all-gozos          Excluir todos os gozos da empresa (por padrão afeta apenas observacoes 'Importado (CSV)%')
  --confirm            Executa a deleção real após o backup (sem esta flag, roda em MODO SIMULAÇÃO)
`);
    process.exit(1);
  }

  // 1. Validar empresa
  const { data: company, error: errComp } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", args.companyId)
    .maybeSingle();

  if (errComp || !company) {
    console.error(`Empresa não encontrada para o id: ${args.companyId}`);
    process.exit(1);
  }

  console.log(`Empresa selecionada: ${company.name} (${company.id})`);

  // 2. Montar consulta
  let query = admin
    .from("ferias_gozo")
    .select(
      "id, colaborador_id, periodo_aquisitivo_id, company_id, data_inicio_gozo, data_fim_gozo, dias_gozados, data_pagamento, abono_pecuniario_dias, status, observacoes, created_at, updated_at"
    )
    .eq("company_id", args.companyId);

  if (args.onlyCsvImported) {
    query = query.like("observacoes", "Importado (CSV)%");
  }

  if (args.dataCorte) {
    query = query.lte("created_at", `${args.dataCorte}T23:59:59.999Z`);
  }

  const { data: rows, error: errQuery } = await query;

  if (errQuery) {
    console.error("Erro ao consultar ferias_gozo:", errQuery);
    process.exit(1);
  }

  const totalEncontrados = rows?.length || 0;
  console.log(`Total de lançamentos encontrados para os critérios: ${totalEncontrados}`);

  if (totalEncontrados === 0) {
    console.log("Nenhum lançamento encontrado. Nenhuma alteração necessária.");
    return;
  }

  // 3. Exportar para CSV de Backup ANTES de qualquer ação
  const backupDir = path.resolve(process.cwd(), "scratch", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `backup_ferias_gozo_${args.companyId}_${timestamp}.csv`;
  const backupFilePath = path.join(backupDir, backupFileName);

  const headers = [
    "id",
    "colaborador_id",
    "periodo_aquisitivo_id",
    "company_id",
    "data_inicio_gozo",
    "data_fim_gozo",
    "dias_gozados",
    "data_pagamento",
    "abono_pecuniario_dias",
    "status",
    "observacoes",
    "created_at",
    "updated_at",
  ];

  const csvRows = [headers.join(";")];
  for (const r of rows) {
    const line = headers.map((h) => escapeCsvField((r as any)[h])).join(";");
    csvRows.push(line);
  }

  // Gravar backup com UTF-8 BOM
  fs.writeFileSync(backupFilePath, "\uFEFF" + csvRows.join("\n"), { encoding: "utf8" });

  const totalExportados = rows.length;
  console.log(`[BACKUP REALIZADO] ${totalExportados} registros exportados com sucesso para:`);
  console.log(`  -> ${backupFilePath}`);

  // 4. Verificar confirmação
  if (!args.confirm) {
    console.log("\n=======================================================");
    console.log("AVISO: MODO SIMULAÇÃO (DRY RUN). NENHUM REGISTRO FOI DELETADO.");
    console.log(`Para deletar efetivamente os ${totalEncontrados} registros, repita o comando com --confirm:`);
    console.log(`  npx tsx scripts/limpar_import_ferias.ts --company-id "${args.companyId}" --confirm`);
    console.log("=======================================================");
    return;
  }

  // 5. Deletar registros selecionados
  console.log(`\nIniciando deleção controlada de ${totalEncontrados} registros...`);
  const idsToDelete = rows.map((r) => r.id);

  // Executar em lotes para segurança
  const BATCH_SIZE = 50;
  let totalDeletados = 0;

  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE);
    const { error: errDel } = await admin.from("ferias_gozo").delete().in("id", batch);
    if (errDel) {
      console.error(`Erro ao deletar lote ${i} - ${i + batch.length}:`, errDel);
      process.exit(1);
    }
    totalDeletados += batch.length;
  }

  console.log("\n=== RELATÓRIO DE EXECUÇÃO ===");
  console.log(`- Lançamentos encontrados: ${totalEncontrados}`);
  console.log(`- Exportados para backup  : ${totalExportados}`);
  console.log(`- Deletados do banco      : ${totalDeletados}`);
  console.log("Limpeza concluída com segurança!");
}

main().catch((err) => {
  console.error("Erro fatal na execução do script:", err);
  process.exit(1);
});

