import { DadosEmpresaPgr } from "@/hooks/usePgrImportacao";

export function validarMetadadosObrigatoriosPgr(dadosEmpresa: Partial<DadosEmpresaPgr>): { valido: boolean; erro?: string } {
  if (!dadosEmpresa.responsavel_tecnico?.trim()) {
    return { valido: false, erro: "Informe o Responsável Técnico para concluir a importação" };
  }
  if (!dadosEmpresa.registro_profissional?.trim()) {
    return { valido: false, erro: "Informe o Registro Profissional para concluir a importação" };
  }
  
  return { valido: true };
}
