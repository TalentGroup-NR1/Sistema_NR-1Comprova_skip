import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, Briefcase, DollarSign, Award, User, MessageSquare, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Promocao } from "@/hooks/usePromocoes";

interface PromocaoCardProps {
  promocao: Promocao;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function PromocaoCard({ promocao, onDelete, canDelete = false }: PromocaoCardProps) {
  const [py, pm, pd] = promocao.data_promocao.slice(0, 10).split("-").map(Number);
  const dataFormatada = format(new Date(py, (pm || 1) - 1, pd || 1), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const variacaoSalarial = ((promocao.salario_novo - promocao.salario_anterior) / promocao.salario_anterior) * 100;
  const variacaoFormatada = variacaoSalarial >= 0 
    ? `+${variacaoSalarial.toFixed(1)}%` 
    : `${variacaoSalarial.toFixed(1)}%`;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="relative border-l-4 border-l-primary">
      <CardContent className="pt-4 pb-4">
        {/* Header com data e badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{dataFormatada}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
              {promocao.motivo?.trim() || "Promoção"}
            </Badge>
            {canDelete && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O registro da promoção será removido permanentemente.
                      Nota: Os dados atuais do colaborador não serão alterados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(promocao.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="space-y-3">
          {/* Cargo */}
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">Cargo:</span>
              <div className="text-sm font-medium">
                {promocao.cargo_anterior} <span className="text-primary">→</span> {promocao.cargo_novo}
              </div>
            </div>
          </div>

          {/* Salário */}
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">Salário:</span>
              <div className="text-sm font-medium">
                {formatCurrency(promocao.salario_anterior)} <span className="text-primary">→</span>{" "}
                {formatCurrency(promocao.salario_novo)}{" "}
                <Badge 
                  variant="outline" 
                  className={variacaoSalarial >= 0 ? "text-green-600 border-green-600" : "text-red-600 border-red-600"}
                >
                  {variacaoFormatada}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nível */}
          {(promocao.nivel_anterior || promocao.nivel_novo) && (
            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Nível:</span>
                <div className="text-sm font-medium">
                  {promocao.nivel_anterior || "—"} <span className="text-primary">→</span>{" "}
                  {promocao.nivel_novo || "—"}
                </div>
              </div>
            </div>
          )}

          {/* Departamento (se mudou) */}
          {promocao.departamento_anterior !== promocao.departamento_novo && (
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Departamento:</span>
                <div className="text-sm font-medium">
                  {promocao.departamento_anterior || "—"} <span className="text-primary">→</span>{" "}
                  {promocao.departamento_novo || "—"}
                </div>
              </div>
            </div>
          )}

          {/* Motivo */}
          {promocao.motivo && (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Motivo:</span>
                <div className="text-sm">{promocao.motivo}</div>
              </div>
            </div>
          )}

          {/* Aprovado por */}
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">Aprovado por:</span>
              <div className="text-sm font-medium">{promocao.aprovado_por}</div>
            </div>
          </div>

          {/* Observações */}
          {promocao.observacoes && (
            <div className="mt-3 p-2 bg-muted/50 rounded-md">
              <span className="text-xs text-muted-foreground">Observações:</span>
              <div className="text-sm">{promocao.observacoes}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
