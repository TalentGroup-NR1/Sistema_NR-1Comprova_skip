import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obterModuloPorRota } from "@/lib/modulosContrataveis";

interface ModuleNotContractedScreenProps {
  moduleKey?: string;
}

export function ModuleNotContractedScreen({ moduleKey }: ModuleNotContractedScreenProps) {
  const navigate = useNavigate();
  const modulo = moduleKey ? obterModuloPorRota(moduleKey) : undefined;
  const nomeModulo = modulo?.nome ?? "Recurso";

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/80 shadow-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Módulo não contratado
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            O módulo <strong>{nomeModulo}</strong> não faz parte do pacote contratado pela sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground flex items-center gap-3 text-left border border-border/60">
            <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p>
              Para solicitar a ativação deste recurso, entre em contato com o administrador da sua empresa ou com nosso suporte comercial.
            </p>
          </div>

          <Button
            onClick={() => navigate("/")}
            className="w-full gap-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
