import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight } from "lucide-react";
import { useMeusBeneficios } from "@/hooks/useBeneficios";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function MeusBeneficiosCard() {
  const { data, isLoading } = useMeusBeneficios();
  const navigate = useNavigate();
  
  const totalBeneficios = (data?.individual?.length || 0) + (data?.departamento?.length || 0);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Meus Benefícios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{totalBeneficios}</div>
            <p className="text-xs text-muted-foreground">
              {totalBeneficios === 1 ? "benefício ativo" : "benefícios ativos"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/beneficios")}
            className="text-primary"
          >
            Ver todos
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
