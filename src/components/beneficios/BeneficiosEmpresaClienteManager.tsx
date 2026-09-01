import { Briefcase } from "lucide-react";
import { useEmpresasCliente } from "@/hooks/useBeneficios";
import { BeneficiosEscopoManager } from "./BeneficiosEscopoManager";

export function BeneficiosEmpresaClienteManager() {
  const { data: empresas, isLoading } = useEmpresasCliente();

  return (
    <BeneficiosEscopoManager
      escopo="empresa_cliente"
      title="Atribuição por Empresa Cliente"
      description="Selecione uma empresa cliente e ative os benefícios que ela terá acesso."
      icon={Briefcase}
      selectLabel="Empresa Cliente"
      selectPlaceholder="Selecione uma empresa cliente"
      options={empresas || []}
      loadingOptions={isLoading}
      emptyOptionsTitle="Nenhuma empresa cliente encontrada"
      emptyOptionsHint="Cadastre colaboradores com empresa cliente para ver as opções aqui."
    />
  );
}
