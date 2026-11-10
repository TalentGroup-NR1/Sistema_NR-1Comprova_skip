import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Smile, ShieldAlert } from "lucide-react";

/**
 * Card visual de "Cuidar+" no dashboard do colaborador.
 * Atalhos para rotas já existentes — apenas apresentação.
 */
export function CuidarMaisQuickCard() {
  return (
    <Card className="h-full border-border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5 h-full flex flex-col">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-foreground leading-tight">
              Sua saúde em dia
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesse rapidamente o Cuidar+ e o questionário NR1.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 flex-1">
          <Link
            to="/cuidar-mais"
            className="flex items-center gap-2 rounded-md border border-border bg-background-alt/40 px-3 py-2.5 hover:border-primary/40 transition-colors"
          >
            <Smile className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">Responder Pulso da semana</span>
          </Link>
          <Link
            to="/mapa-riscos-nr1"
            className="flex items-center gap-2 rounded-md border border-border bg-background-alt/40 px-3 py-2.5 hover:border-primary/40 transition-colors"
          >
            <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">Questionário NR1</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
