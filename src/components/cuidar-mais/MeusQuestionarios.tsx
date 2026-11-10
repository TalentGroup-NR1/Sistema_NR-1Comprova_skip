import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyQuestionariosPendentes } from "@/hooks/useCuidarMaisQuestionarios";

export function MeusQuestionarios() {
  const { data: questionarios, isLoading } = useMyQuestionariosPendentes();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!questionarios || questionarios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum questionário pendente
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Você será notificado quando houver novos questionários para responder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meus Questionários
          </CardTitle>
          <CardDescription>
            Questionários pendentes para você responder
          </CardDescription>
        </CardHeader>
      </Card>

      {questionarios.map((envio) => (
        <Card key={envio.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {envio.questionarios_cuidar_plus?.titulo}
              </h3>
              {envio.questionarios_cuidar_plus?.descricao && (
                <p className="text-sm text-muted-foreground mt-1">
                  {envio.questionarios_cuidar_plus.descricao}
                </p>
              )}
            </div>
            <Button asChild>
              <a 
                href={`/cuidar-mais-form/${envio.token}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Responder
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
