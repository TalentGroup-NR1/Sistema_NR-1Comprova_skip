import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Mail, Phone, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseISODate } from "@/lib/validators/colaborador";

interface Colaborador {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  avatar_url?: string;
  status: string;
  admission_date: string;
}

interface RecentEmployeesProps {
  colaboradores: Colaborador[];
  isLoading?: boolean;
  delay?: number;
}

const statusStyles: Record<string, string> = {
  ATIVO: "bg-success/10 text-success border-success/20",
  FERIAS: "bg-info/10 text-info border-info/20",
  AFASTADO: "bg-warning/10 text-warning border-warning/20",
  DESLIGADO: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  FERIAS: "Férias",
  AFASTADO: "Afastado",
  DESLIGADO: "Desligado",
};

export function RecentEmployees({ colaboradores, isLoading, delay = 0 }: RecentEmployeesProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return format(parseISODate(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-card animate-fade-up" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">Colaboradores Recentes</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80"
          onClick={() => navigate('/colaboradores')}
        >
          Ver todos
        </Button>
      </CardHeader>
      <CardContent>
        {colaboradores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum colaborador cadastrado
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {colaboradores.map((colab) => (
              <div
                key={colab.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={colab.avatar_url} alt={colab.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(colab.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm text-foreground">{colab.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {colab.job_title} · {colab.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Admitido em</p>
                    <p className="text-xs font-medium">{formatDate(colab.admission_date)}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[colab.status] || statusStyles.ATIVO}>
                    {statusLabels[colab.status] || colab.status}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
