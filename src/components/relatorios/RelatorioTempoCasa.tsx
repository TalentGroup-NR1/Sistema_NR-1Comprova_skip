import { useState, useMemo } from "react";
import { useColaboradores } from "@/hooks/useColaboradores";
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
import { Search, FileSpreadsheet, Clock } from "lucide-react";
import { format, differenceInMonths, differenceInYears, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/exportUtils";

function calculateTenure(admissionDate: string): { years: number; months: number; label: string } {
  const admission = parseISO(admissionDate);
  const today = new Date();
  
  const totalMonths = differenceInMonths(today, admission);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  let label = "";
  if (years > 0) {
    label += `${years} ano${years > 1 ? "s" : ""}`;
    if (months > 0) {
      label += `, ${months} ${months === 1 ? "mês" : "meses"}`;
    }
  } else if (months > 0) {
    label = `${months} ${months === 1 ? "mês" : "meses"}`;
  } else {
    label = "Menos de 1 mês";
  }
  
  return { years, months, label };
}

export function RelatorioTempoCasa() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [minYears, setMinYears] = useState<string>("todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: colaboradores = [], isLoading } = useColaboradores();

  // Only active collaborators with admission date
  const activeColaboradores = useMemo(() => {
    return colaboradores.filter(c => c.status !== "DESLIGADO" && c.admission_date);
  }, [colaboradores]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(activeColaboradores.map(c => c.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [activeColaboradores]);

  // Calculate tenure and filter
  const colaboradoresComTempo = useMemo(() => {
    return activeColaboradores
      .map(colab => {
        const tenure = calculateTenure(colab.admission_date!);
        return { ...colab, tenure };
      })
      .filter(colab => {
        const matchesSearch =
          colab.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = departmentFilter === "todos" || colab.department === departmentFilter;
        
        let matchesMinYears = true;
        if (minYears !== "todos") {
          const minYearsNum = parseInt(minYears);
          matchesMinYears = colab.tenure.years >= minYearsNum;
        }
        
        return matchesSearch && matchesDepartment && matchesMinYears;
      })
      .sort((a, b) => {
        const aTotalMonths = a.tenure.years * 12 + a.tenure.months;
        const bTotalMonths = b.tenure.years * 12 + b.tenure.months;
        return sortOrder === "desc" ? bTotalMonths - aTotalMonths : aTotalMonths - bTotalMonths;
      });
  }, [activeColaboradores, searchTerm, departmentFilter, minYears, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(colaboradoresComTempo.length / itemsPerPage);
  const paginatedColaboradores = colaboradoresComTempo.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const data = colaboradoresComTempo.map(colab => ({
      Nome: colab.full_name,
      Cargo: colab.job_title || "Não informado",
      Departamento: colab.department || "Não informado",
      "Data de Admissão": format(parseISO(colab.admission_date!), "dd/MM/yyyy"),
      "Tempo de Casa": colab.tenure.label,
    }));
    
    exportToExcel(data, `relatorio_tempo_casa_${format(new Date(), "yyyy-MM-dd")}`);
  };

  // Stats
  const avgTenureMonths = useMemo(() => {
    if (colaboradoresComTempo.length === 0) return 0;
    const total = colaboradoresComTempo.reduce(
      (sum, c) => sum + (c.tenure.years * 12 + c.tenure.months), 
      0
    );
    return Math.round(total / colaboradoresComTempo.length);
  }, [colaboradoresComTempo]);

  const avgYears = Math.floor(avgTenureMonths / 12);
  const avgMonths = avgTenureMonths % 12;

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
              placeholder="Buscar por nome..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
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
          <Select value={minYears} onValueChange={(v) => { setMinYears(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tempo mínimo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer tempo</SelectItem>
              <SelectItem value="1">1+ ano</SelectItem>
              <SelectItem value="2">2+ anos</SelectItem>
              <SelectItem value="5">5+ anos</SelectItem>
              <SelectItem value="10">10+ anos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v: "asc" | "desc") => setSortOrder(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Maior tempo</SelectItem>
              <SelectItem value="asc">Menor tempo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <Badge variant="secondary">{colaboradoresComTempo.length} colaboradores</Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Média: {avgYears > 0 ? `${avgYears} ano${avgYears > 1 ? "s" : ""}` : ""} 
          {avgMonths > 0 ? `${avgYears > 0 ? ", " : ""}${avgMonths} ${avgMonths === 1 ? "mês" : "meses"}` : ""}
          {avgYears === 0 && avgMonths === 0 ? "N/A" : ""}
        </Badge>
      </div>

      {/* Table */}
      {colaboradoresComTempo.length === 0 ? (
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
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Data de Admissão</TableHead>
                  <TableHead>Tempo de Casa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedColaboradores.map((colab) => (
                  <TableRow key={colab.id}>
                    <TableCell className="font-medium">{colab.full_name}</TableCell>
                    <TableCell>{colab.job_title || "Não informado"}</TableCell>
                    <TableCell>{colab.department || "Não informado"}</TableCell>
                    <TableCell>{format(parseISO(colab.admission_date!), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {colab.tenure.label}
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
