import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { TreinamentoViewer } from "@/components/treinamentos/visualizar/TreinamentoViewer";
import { CursoViewer } from "@/components/treinamentos/visualizar/CursoViewer";
import { useTreinamento } from "@/hooks/useTreinamentos";
import { useCurriculo } from "@/hooks/useTreinamentoCurriculo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TreinamentoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: treinamento, isLoading, error } = useTreinamento(id);
  const { data: modulos = [], isLoading: loadingCurriculo } = useCurriculo(id);

  if (isLoading || loadingCurriculo) {

    return (
      <MainLayout>
        <div className="container mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !treinamento) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Treinamento não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar os dados deste treinamento.
              </p>
              <Button onClick={() => navigate("/treinamentos")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Treinamentos
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const temCurriculo = modulos.some((m) => m.aulas.length > 0);

  return (
    <MainLayout>
      {temCurriculo ? (
        <CursoViewer treinamento={treinamento} modulos={modulos} />
      ) : (
        <TreinamentoViewer treinamento={treinamento} />
      )}
    </MainLayout>
  );

}
