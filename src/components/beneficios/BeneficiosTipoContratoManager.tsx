import { FileText } from "lucide-react";
import { TIPOS_CONTRATO } from "@/hooks/useBeneficios";
import { BeneficiosEscopoManager } from "./BeneficiosEscopoManager";

export function BeneficiosTipoContratoManager() {
  return (
    <BeneficiosEscopoManager
      escopo="tipo_contrato"
      title="Atribuição por Tipo de Contrato"
      description="Selecione um tipo de contrato e ative os benefícios que ele terá acesso."
      icon={FileText}
      selectLabel="Tipo de Contrato"
      selectPlaceholder="Selecione um tipo de contrato"
      options={TIPOS_CONTRATO}
      emptyOptionsTitle="Nenhum tipo de contrato disponível"
      emptyOptionsHint="Verifique a configuração de tipos de contrato."
    />
  );
}
