import { gerarRelatorioPgrPDF } from "../src/lib/relatorioPgrPDF";

async function traceRuntime() {
  const pgrInfo = {
    id: "0a4b8317-b552-45a7-8208-056c803df7ba",
    data_elaboracao: "2024-05-15",
    validade: "2025-05-15",
    responsavel_tecnico: "Joao Teste",
    cargo_responsavel: "Engenheiro",
    registro_profissional: "CREA-123",
    status: "confirmado"
  };

  console.log("=== TRACE: INÍCIO DA GERAÇÃO DO PDF ===");
  console.log("ID da Importação repassado:", pgrInfo.id);
  console.log("Objeto pgrInfo final:", JSON.stringify(pgrInfo, null, 2));

  // Simulando o que o template lê
  console.log("--- DENTRO DO TEMPLATE (Leitura) ---");
  console.log("Lendo data_elaboracao:", pgrInfo.data_elaboracao);
  console.log("Lendo responsavel_tecnico:", pgrInfo.responsavel_tecnico);
  console.log("=======================================");
}

traceRuntime();
