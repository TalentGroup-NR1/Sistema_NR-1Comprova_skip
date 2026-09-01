import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradoresComFerias, getStatusFerias } from "@/hooks/useFerias";
import { useAuth } from "@/hooks/useAuth";
import { ImportarUltimasFeriasDialog } from "./ImportarUltimasFeriasDialog";
import { calcularPeriodoAquisitivoAtual } from "@/lib/feriasEngine";

interface ColaboradoresFeriasListProps {
  onSelectColaborador: (id: string) => void;
}

export function ColaboradoresFeriasList({ onSelectColaborador }: ColaboradoresFeriasListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { data: colaboradores, isLoading } = useColaboradoresComFerias();
  const { role } = useAuth();
  const canImport = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';

  const filteredColaboradores = colaboradores?.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Período aquisitivo agora usa a engine (considera última férias / data de corte)


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vencido':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'adquirido':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'gozado':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
          {canImport && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar férias passadas (CSV)
            </Button>
          )}
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredColaboradores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum colaborador encontrado</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden md:table-cell">Cargo</TableHead>
                  <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                  <TableHead className="hidden xl:table-cell">Data Admissão</TableHead>
                  <TableHead className="hidden md:table-cell">Período Aquisitivo Atual</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => {
                  const periodo = calcularPeriodoAquisitivoAtual({
                    admission_date: colaborador.admission_date,
                    ultima_ferias_inicio: (colaborador as any).ultima_ferias_inicio,
                    ultima_ferias_fim: (colaborador as any).ultima_ferias_fim,
                    data_corte_ferias: (colaborador as any).data_corte_ferias,
                  });
                  const statusFerias = getStatusFerias(
                    {
                      admission_date: colaborador.admission_date,
                      ultima_ferias_inicio: (colaborador as any).ultima_ferias_inicio,
                      ultima_ferias_fim: (colaborador as any).ultima_ferias_fim,
                      data_corte_ferias: (colaborador as any).data_corte_ferias,
                    },
                    colaborador.periodos_aquisitivos,
                    colaborador.ferias_gozo
                  );

                  return (
                    <TableRow
                      key={colaborador.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelectColaborador(colaborador.id)}
                    >
                      <TableCell className="font-medium">{colaborador.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{colaborador.job_title}</TableCell>
                      <TableCell className="hidden lg:table-cell">{colaborador.department}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {format(parseISO(colaborador.admission_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {format(periodo.inicio, "dd/MM/yyyy", { locale: ptBR })} - {format(periodo.fim, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusFerias.color} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(statusFerias.status)}
                          {statusFerias.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <ImportarUltimasFeriasDialog open={importOpen} onOpenChange={setImportOpen} />
    </Card>
  );
}
