import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

export interface EmpresaComFuncionarios {
  id: string;
  name: string;
  count: number;
}

interface FuncionariosPorEmpresaCardProps {
  empresas: EmpresaComFuncionarios[];
  isLoading: boolean;
  delay?: number;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function FuncionariosPorEmpresaCard({ 
  empresas, 
  isLoading, 
  delay = 0,
  title = "Funcionários por Empresa",
  emptyMessage = "Nenhuma empresa com colaboradores ativos",
  className,
}: FuncionariosPorEmpresaCardProps) {
  const maxCount = Math.max(...empresas.map(e => e.count), 1);
  
  return (
    <Card 
      className={`animate-fade-in ${className ?? "mb-6"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Building2 className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : empresas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-4">
            {empresas.map((empresa) => (
              <div key={empresa.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {empresa.name}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap ml-2">
                    {empresa.count} {empresa.count === 1 ? 'ativo' : 'ativos'}
                  </span>
                </div>
                <Progress 
                  value={(empresa.count / maxCount) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
