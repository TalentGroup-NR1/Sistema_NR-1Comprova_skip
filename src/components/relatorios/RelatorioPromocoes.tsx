import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Download,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { usePromocoesEmpresa } from "@/hooks/usePromocoes";
import { exportToExcel } from "@/lib/exportUtils";

export function RelatorioPromocoes() {
  const { data: promocoes, isLoading } = usePromocoesEmpresa();
  const [searchTerm, setSearchTerm] = useState("");
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("todos");
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>();
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>();

  // Lista de departamentos únicos
  const departamentos = useMemo(() => {
    if (!promocoes) return [];
    const deps = new Set(promocoes.map((p) => p.departamento_novo).filter(Boolean));
    return Array.from(deps).sort();
  }, [promocoes]);

  // Filtrar promoções
  const promocoesFiltradas = useMemo(() => {
    if (!promocoes) return [];
    
    return promocoes.filter((promocao) => {
      // Filtro por texto
      const matchesSearch =
        !searchTerm ||
        promocao.colaborador?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promocao.cargo_novo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promocao.cargo_anterior.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por departamento
      const matchesDepartamento =
        departamentoFilter === "todos" || promocao.departamento_novo === departamentoFilter;

      // Filtro por período
      const dataPromocao = new Date(promocao.data_promocao);
      const matchesPeriodoInicio = !periodoInicio || dataPromocao >= periodoInicio;
      const matchesPeriodoFim = !periodoFim || dataPromocao <= periodoFim;

      return matchesSearch && matchesDepartamento && matchesPeriodoInicio && matchesPeriodoFim;
    });
  }, [promocoes, searchTerm, departamentoFilter, periodoInicio, periodoFim]);

  // Métricas
  const metricas = useMemo(() => {
    if (!promocoesFiltradas.length) {
      return { total: 0, esteMes: 0, aumentoMedio: 0 };
    }

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const esteMes = promocoesFiltradas.filter(
      (p) => new Date(p.data_promocao) >= inicioMes
    ).length;

    const aumentos = promocoesFiltradas.map((p) =>
      ((p.salario_novo - p.salario_anterior) / p.salario_anterior) * 100
    );
    const aumentoMedio = aumentos.reduce((a, b) => a + b, 0) / aumentos.length;

    return {
      total: promocoesFiltradas.length,
      esteMes,
      aumentoMedio,
    };
  }, [promocoesFiltradas]);

  // Exportar para Excel
  const handleExport = () => {
    const dataExport = promocoesFiltradas.map((p) => ({
      "Nome do Colaborador": p.colaborador?.full_name || "—",
      "Data da Promoção": format(new Date(p.data_promocao), "dd/MM/yyyy"),
      "Cargo Anterior": p.cargo_anterior,
      "Novo Cargo": p.cargo_novo,
      "Salário Anterior": p.salario_anterior,
      "Novo Salário": p.salario_novo,
      "Variação (%)": (((p.salario_novo - p.salario_anterior) / p.salario_anterior) * 100).toFixed(1),
      "Nível Anterior": p.nivel_anterior || "—",
      "Novo Nível": p.nivel_novo || "—",
      "Departamento": p.departamento_novo || "—",
      "Motivo": p.motivo || "—",
      "Aprovado Por": p.aprovado_por,
    }));

    exportToExcel(dataExport, `Relatorio_Promocoes_${format(new Date(), "yyyy-MM-dd")}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Promoções</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.total}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.esteMes}</div>
            <p className="text-xs text-muted-foreground">Promoções registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aumento Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{metricas.aumentoMedio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Variação salarial</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {departamentos.map((dep) => (
              <SelectItem key={dep} value={dep!}>
                {dep}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              {periodoInicio ? format(periodoInicio, "dd/MM/yy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={periodoInicio}
              onSelect={setPeriodoInicio}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              {periodoFim ? format(periodoFim, "dd/MM/yy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={periodoFim}
              onSelect={setPeriodoFim}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Tabela de promoções */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cargo Anterior → Novo</TableHead>
                <TableHead>Variação Salarial</TableHead>
                <TableHead>Aprovador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promocoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma promoção encontrada
                  </TableCell>
                </TableRow>
              ) : (
                promocoesFiltradas.map((promocao) => {
                  const variacao =
                    ((promocao.salario_novo - promocao.salario_anterior) /
                      promocao.salario_anterior) *
                    100;
                  return (
                    <TableRow key={promocao.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={promocao.colaborador?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {getInitials(promocao.colaborador?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {promocao.colaborador?.full_name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {promocao.departamento_novo}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(promocao.data_promocao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {promocao.cargo_anterior}{" "}
                          <span className="text-primary mx-1">→</span>{" "}
                          {promocao.cargo_novo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatCurrency(promocao.salario_anterior)} →{" "}
                            {formatCurrency(promocao.salario_novo)}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              variacao >= 0
                                ? "text-green-600 border-green-600"
                                : "text-red-600 border-red-600"
                            }
                          >
                            {variacao >= 0 ? "+" : ""}
                            {variacao.toFixed(1)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{promocao.aprovado_por}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
