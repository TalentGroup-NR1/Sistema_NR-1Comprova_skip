import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { BeneficiosBuilder } from "@/components/beneficios/BeneficiosBuilder";
import { BeneficiosDepartamentoManager } from "@/components/beneficios/BeneficiosDepartamentoManager";
import { BeneficiosTipoContratoManager } from "@/components/beneficios/BeneficiosTipoContratoManager";
import { ColaboradorBeneficiosTab } from "@/components/beneficios/ColaboradorBeneficiosTab";
import { BeneficiosCatalogo } from "@/components/beneficios/catalogo";
import { Gift, Building2, Users, CreditCard, FileText, Briefcase } from "lucide-react";

export default function Beneficios() {
  const { role } = useAuth();
  
  const isAdmin = ['admin_master', 'admin_empresa', 'analista_rh'].includes(role || '');
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {!isAdmin && (
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Gift className="h-8 w-8 text-primary" />
              Catálogo de Benefícios
            </h1>
            <p className="text-muted-foreground mt-1">
              Explore seus benefícios e materiais educativos
            </p>
          </div>
        )}

        {isAdmin ? (
          <Tabs defaultValue="gerenciar" className="space-y-6">
            <div className="w-full overflow-x-auto pb-1">
              <TabsList className="w-auto min-w-full sm:min-w-0">
                <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Gerenciar
                </TabsTrigger>
                <TabsTrigger value="departamentos" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Departamento
                </TabsTrigger>
                <TabsTrigger value="tipo-contrato" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tipo Contrato
                </TabsTrigger>

                <TabsTrigger value="individuais" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Individual
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="gerenciar">
              <BeneficiosBuilder />
            </TabsContent>

            <TabsContent value="departamentos">
              <BeneficiosDepartamentoManager />
            </TabsContent>

            <TabsContent value="tipo-contrato">
              <BeneficiosTipoContratoManager />
            </TabsContent>



            <TabsContent value="individuais">
              <ColaboradorBeneficiosTab />
            </TabsContent>
          </Tabs>

        ) : (
          <BeneficiosCatalogo />
        )}
      </div>
    </MainLayout>
  );
}
