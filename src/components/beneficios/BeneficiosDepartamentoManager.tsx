import { Building2 } from "lucide-react";
import { useDepartamentos } from "@/hooks/useBeneficios";
import { BeneficiosEscopoManager } from "./BeneficiosEscopoManager";

export function BeneficiosDepartamentoManager() {
  const { data: departamentos, isLoading } = useDepartamentos();

  return (
    <BeneficiosEscopoManager
      escopo="departamento"
      title="Atribuição por Departamento"
      description="Selecione um departamento e ative os benefícios que ele terá acesso."
      icon={Building2}
      selectLabel="Departamento"
      selectPlaceholder="Selecione um departamento"
      options={(departamentos || []).map((d: any) =>
        typeof d === "string" ? d : d?.nome
      ).filter(Boolean)}
      loadingOptions={isLoading}
      emptyOptionsTitle="Nenhum departamento encontrado"
      emptyOptionsHint="Cadastre colaboradores com departamento para ver as opções aqui."
    />
  );
}
