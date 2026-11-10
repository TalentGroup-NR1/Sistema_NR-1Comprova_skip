import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building2, Gift, Wallet } from "lucide-react";
import { useMeusBeneficios } from "@/hooks/useBeneficios";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_LABELS: Record<string, string> = {
  vale_alimentacao: "Vale Alimentação",
  vale_refeicao: "Vale Refeição",
  outro: "Outro",
};

export function MeusBeneficios() {
  const { data, isLoading } = useMeusBeneficios();
  
  const formatCurrency = (value: number | null) => {
    if (value === null) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  
  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  
  const allBeneficios = [
    ...(data?.individual || []),
    ...(data?.departamento || []),
  ];
  
  if (allBeneficios.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum benefício disponível</p>
          <p className="text-sm">Você não possui benefícios atribuídos no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBeneficios.map((item: any) => {
          const beneficio = item.beneficio;
          const isIndividual = item.tipo_atribuicao === 'individual';
          
          return (
            <Card key={item.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{beneficio?.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {TIPO_LABELS[beneficio?.tipo] || beneficio?.tipo}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isIndividual ? "default" : "secondary"}>
                    {isIndividual ? (
                      <><CreditCard className="h-3 w-3 mr-1" /> Individual</>
                    ) : (
                      <><Building2 className="h-3 w-3 mr-1" /> Departamento</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {beneficio?.operadora_fornecedor && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{beneficio.operadora_fornecedor}</span>
                  </div>
                )}
                
                {beneficio?.valor_mensal && (
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(beneficio.valor_mensal)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                )}
                
                {isIndividual && item.numero_cartao && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Número do Cartão</p>
                    <p className="font-mono font-medium">{item.numero_cartao}</p>
                  </div>
                )}
                
                {isIndividual && item.data_inicio && (
                  <p className="text-xs text-muted-foreground">
                    Desde {formatDate(item.data_inicio)}
                  </p>
                )}
                
                {beneficio?.descricao && (
                  <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
                    {beneficio.descricao}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
