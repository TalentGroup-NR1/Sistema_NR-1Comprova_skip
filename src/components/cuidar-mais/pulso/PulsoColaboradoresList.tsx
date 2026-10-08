import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, BarChart3, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePulseColaboradoresList, EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { useColaboradores } from "@/hooks/useColaboradores";

export function checkColaboradorPulseAlert(mediaGeral: number | null | undefined) {
  if (mediaGeral === null || mediaGeral === undefined) {
    return { isAlert: false, emojiData: null };
  }
  const roundedScore = Math.round(mediaGeral);
  const emojiData = EMOJI_SCALE.find((e) => e.score === roundedScore) || null;
  const isAlert = Boolean(emojiData && roundedScore <= 2);
  return { isAlert, emojiData };
}

interface PulsoColaboradoresListProps {
  onSelectColaborador: (id: string) => void;
}

export function PulsoColaboradoresList({ onSelectColaborador }: PulsoColaboradoresListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  
  const { data: colaboradores, isLoading, isError, error } = usePulseColaboradoresList(
    departmentFilter !== "all" ? departmentFilter : undefined
  );
  const { data: allColaboradores } = useColaboradores();

  if (isError) {
    console.error("Erro na lista de colaboradores do Pulso:", error);
  }

  // Extrair departamentos únicos da lista de colaboradores
  const departments = Array.from(
    new Set(allColaboradores?.map((c) => c.department).filter(Boolean) as string[] || [])
  ).sort();

  // Filtrar por busca
  const filteredColaboradores = colaboradores?.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmojiForScore = (score: number | null) => {
    if (score === null) return null;
    const roundedScore = Math.round(score);
    const emoji = EMOJI_SCALE.find((e) => e.score === roundedScore);
    return emoji;
  };

  const getAlertStyle = (score: number) => {
    switch (score) {
      case 0:
        return {
          row: "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/30 shadow-[inset_4px_0_0_0_#ef4444] border-b-red-200/50",
          badge: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
        };
      case 1:
        return {
          row: "bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-950/20 dark:hover:bg-orange-950/30 shadow-[inset_4px_0_0_0_#f97316] border-b-orange-200/50",
          badge: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
        };
      case 2:
        return {
          row: "bg-yellow-50/70 hover:bg-yellow-100/70 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30 shadow-[inset_4px_0_0_0_#eab308] border-b-yellow-200/50",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800",
        };
      default:
        return { row: "", badge: "" };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Users className="h-5 w-5" />
                Erro ao carregar colaboradores
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-red-600">
            <p>Ocorreu um erro ao buscar a lista de colaboradores.</p>
            <p className="font-medium text-sm mt-2">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Colaboradores
            </CardTitle>
            <CardDescription>
              Selecione um colaborador para ver o histórico completo de respostas do Pulso
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredColaboradores?.length || 0} colaboradores
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept || ""}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredColaboradores && filteredColaboradores.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden md:table-cell">Departamento</TableHead>
                  <TableHead className="text-center">Esfera</TableHead>
                  <TableHead className="text-center">Respostas</TableHead>
                  <TableHead className="text-center">Média</TableHead>
                  <TableHead className="hidden sm:table-cell">Última Resposta</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => {
                  const emojiData = getEmojiForScore(colaborador.media_geral);
                  const isAlert = Boolean(emojiData && colaborador.media_geral !== null && Math.round(colaborador.media_geral) <= 2);
                  const alertStyle = isAlert && emojiData ? getAlertStyle(emojiData.score) : null;
                  
                  return (
                    <TableRow
                      key={colaborador.employee_id}
                      className={
                        isAlert && alertStyle
                          ? `cursor-pointer pulse-alert-row transition-colors ${alertStyle.row}`
                          : "cursor-pointer hover:bg-muted/50"
                      }
                      onClick={() => onSelectColaborador(colaborador.employee_id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={colaborador.foto_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {colaborador.nome?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{colaborador.nome}</p>
                            <p className="text-xs text-muted-foreground">{colaborador.cargo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-normal">
                          {colaborador.departamento || "Sem departamento"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const esferas = colaborador.esferas_identificadas || [];
                          if (esferas.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
                          return (
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {esferas.map((esfera, idx) => (
                                <Badge 
                                  key={idx}
                                  variant="outline" 
                                  className={
                                    esfera === "pessoal" 
                                      ? "bg-violet-50 text-violet-700 border-violet-200" 
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }
                                >
                                  {esfera === "pessoal" ? "Pessoal" : "Trabalho"}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{colaborador.total_respostas}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {emojiData ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-lg">{emojiData.emoji}</span>
                            <span className={`text-sm font-medium ${emojiData.textColor}`}>
                              {colaborador.media_geral?.toFixed(1)}
                            </span>
                            {isAlert && alertStyle && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider ${alertStyle.badge}`}
                              >
                                Alerta: {emojiData.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {colaborador.ultima_resposta ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(colaborador.ultima_resposta), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum colaborador encontrado.</p>
            {searchTerm && (
              <p className="text-sm mt-1">Tente buscar com outros termos.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
