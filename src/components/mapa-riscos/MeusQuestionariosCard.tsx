import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileText, CheckCircle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyQuestionariosPendentes } from "@/hooks/useCuidarMaisQuestionarios";
import { Link } from "react-router-dom";

export function MeusQuestionariosCard() {
  const { data: questionarios, isLoading } = useMyQuestionariosPendentes();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = questionarios?.length || 0;

  return (
    <Card className="border-orange-200 dark:border-orange-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500" />
          Questionários NR1
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <FileText className="h-8 w-8 text-orange-500" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {pendingCount} questionário{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avaliação de riscos psicossociais
                </p>
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link to="/mapa-riscos-nr1" className="flex items-center gap-2">
                Responder agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">
                Nenhum questionário pendente
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
