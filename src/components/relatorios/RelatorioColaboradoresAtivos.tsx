import { useState, useMemo } from "react";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { parseISODate } from "@/lib/validators/colaborador";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/exportUtils";

const statusStyles: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  FERIAS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  LICENCA: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DESLIGADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  FERIAS: "Férias",
  LICENCA: "Licença",
  DESLIGADO: "Desligado",
};

export function RelatorioColaboradoresAtivos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ATIVO");
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: colaboradores = [], isLoading } = useColaboradores();

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(colaboradores.map(c => c.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [colaboradores]);

  // Filter colaboradores
  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((colab) => {
      const matchesSearch =
        colab.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colab.corporate_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || colab.status === statusFilter;
      const matchesDepartment = departmentFilter === "todos" || colab.department === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [colaboradores, searchTerm, statusFilter, departmentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredColaboradores.length / itemsPerPage);
  const paginatedColaboradores = filteredColaboradores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const data = filteredColaboradores.map(colab => ({
      Nome: colab.full_name,
      "E-mail": colab.corporate_email,
      Cargo: colab.job_title || "Não informado",
      Departamento: colab.department || "Não informado",
      "Data de Admissão": colab.admission_date 
        ? format(parseISODate(colab.admission_date), "dd/MM/yyyy") 
        : "Não informado",
      Status: statusLabels[colab.status] || colab.status,
    }));
    
    exportToExcel(data, `relatorio_colaboradores_${format(new Date(), "yyyy-MM-dd")}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativos</SelectItem>
              <SelectItem value="FERIAS">Férias</SelectItem>
              <SelectItem value="LICENCA">Licença</SelectItem>
              <SelectItem value="DESLIGADO">Desligados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{filteredColaboradores.length} registros encontrados</Badge>
      </div>

      {/* Table */}
      {filteredColaboradores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum colaborador encontrado para os filtros aplicados.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Data de Admissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedColaboradores.map((colab) => (
                  <TableRow key={colab.id}>
                    <TableCell className="font-medium">{colab.full_name}</TableCell>
                    <TableCell>{colab.corporate_email}</TableCell>
                    <TableCell>{colab.job_title || "Não informado"}</TableCell>
                    <TableCell>{colab.department || "Não informado"}</TableCell>
                    <TableCell>
                      {colab.admission_date 
                        ? format(parseISODate(colab.admission_date), "dd/MM/yyyy") 
                        : "Não informado"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[colab.status] || ""}>
                        {statusLabels[colab.status] || colab.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
