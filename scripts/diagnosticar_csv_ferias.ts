import * as fs from "fs";
import { diagnosticarCSV } from "../src/lib/feriasCsvParser";

function main() {
  const filePath = process.argv[2];
  let content = "";

  if (filePath && fs.existsSync(filePath)) {
    console.log(`Lendo arquivo: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    try {
      content = new TextDecoder("utf-8").decode(buffer);
      if (content.includes("\uFFFD")) {
        content = new TextDecoder("windows-1252").decode(buffer);
      }
    } catch {
      content = buffer.toString("utf8");
    }
  } else {
    console.log("Nenhum arquivo fornecido. Usando CSV de exemplo para diagnóstico:\n");
    content = `CPF;Colaborador;Início Aquisitivo;Fim Aquisitivo;Início Gozo;Fim Gozo;Dias Gozados;Abono Pecuniário (dias);Data Pagto;Observações Internas
123.456.789-00;Maria Silva;01/01/2023;31/12/2023;05/02/2024;24/02/2024;20;10;02/02/2024;Migração Folha Legada
`;
  }

  const diag = diagnosticarCSV(content);

  console.log("=== RELATÓRIO DE DIAGNÓSTICO DO CSV DE FÉRIAS ===");
  console.log(`Separador detectado: "${diag.separador === "\t" ? "\\t (TAB)" : diag.separador}"`);
  console.log("\nCabeçalhos Brutos:");
  diag.rawHeaders.forEach((h, i) => console.log(`  [${i}] "${h}"`));

  console.log("\nCabeçalhos Normalizados:");
  diag.headers.forEach((h, i) => console.log(`  [${i}] "${h}"`));

  console.log("\nColunas Reconhecidas:");
  Object.entries(diag.reconhecidas).forEach(([campo, info]) => {
    if (!info) return;
    const fallbackStr = "isFallback" in info && info.isFallback ? " [APROXIMAÇÃO/FALLBACK]" : " [MATCH EXATO]";
    console.log(`  - ${campo.padEnd(16)}: índice ${info.index} -> "${info.header}"${fallbackStr}`);
  });

  console.log("\nColunas Ignoradas (não mapeadas para inserção):");
  if (diag.colunasIgnoradas.length === 0) {
    console.log("  (Nenhuma coluna foi ignorada)");
  } else {
    diag.colunasIgnoradas.forEach((col) => {
      console.log(`  - índice ${col.index}: "${col.rawHeader}" (normalizado: "${col.header}")`);
    });
  }

  console.log(`\nStatus de Validade do Arquivo: ${diag.valido ? "VÁLIDO PARA IMPORTAÇÃO" : "INVÁLIDO"}`);
  if (!diag.valido) {
    console.log(`Motivo: ${diag.motivoInvalido}`);
  }
}

main();
