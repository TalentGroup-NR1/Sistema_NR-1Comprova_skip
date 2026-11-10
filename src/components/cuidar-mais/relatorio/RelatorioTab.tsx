import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Calendar,
  User,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  CheckCircle2,
  HelpCircle,
  Building2,
  Briefcase,
  Layers,
  ChevronRight,
  FileDown,
  Loader2,
} from "lucide-react";
import { usePulseColaboradoresList, EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { useEmployeeReportData } from "@/hooks/useEmployeeReportData";
import { useCompanies } from "@/hooks/useCompanies";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { resolverEmitente } from "@/lib/relatorioEmitente";
import {
  gerarRelatorioColaboradorPDF,
  isAcompanhamentoForaDoPeriodo,
} from "@/lib/relatorioColaboradorPDF";
import { toast } from "sonner";
import {
  formatReportDate,
  formatReportDateTime,
  getStatusBadgeConfig,
  getAcompanhamentoBadgeConfig,
} from "./normalizeReportData";
import { RelatorioEvolutionChart } from "./RelatorioEvolutionChart";

export function RelatorioTab() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [colaboradorSearch, setColaboradorSearch] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const { data: companies = [] } = useCompanies();

  // Lista de colaboradores para o seletor (via RPC get_pulse_colaboradores_list)
  const {
    data: colaboradoresList,
    isLoading: loadingColaboradores,
  } = usePulseColaboradoresList();

  // Filtragem local na lista de colaboradores pelo termo digitado
  const filteredColaboradores = useMemo(() => {
    if (!colaboradoresList) return [];
    if (!colaboradorSearch.trim()) return colaboradoresList;
    const term = colaboradorSearch.toLowerCase();
    return colaboradoresList.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        (c.departamento && c.departamento.toLowerCase().includes(term)) ||
        (c.cargo && c.cargo.toLowerCase().includes(term))
    );
  }, [colaboradoresList, colaboradorSearch]);

  // Consulta do dossiê consolidado via RPC get_employee_report_data
  const {
    data: reportData,
    isLoading: loadingReport,
    isError: hasReportError,
    error: reportError,
    refetch: refetchReport,
  } = useEmployeeReportData({
    employeeId: selectedEmployeeId || null,
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
  });

  const handleClearFilters = () => {
    setDataInicio("");
    setDataFim("");
  };

  const handleExportPDF = async () => {
    if (!reportData || !reportData.colaborador) {
      toast.error("Selecione um colaborador com dados carregados antes de exportar o PDF.");
      return;
    }
    setGeneratingPdf(true);
    try {
      const empresaAtiva = companies.find((c) => c.id === companyId);
      const emitenteInfo = user
        ? await resolverEmitente(user.id, user.email || "")
        : {
            nome: "Administrador do Sistema",
            cargo: "Recursos Humanos / SST",
          };

      await gerarRelatorioColaboradorPDF({
        data: reportData,
        empresa: {
          name: empresaAtiva?.name,
          cnpj: empresaAtiva?.cnpj,
          logo_url: empresaAtiva?.logo_url,
        },
        emitente: {
          nome: emitenteInfo.nome,
          cargo: emitenteInfo.cargo,
        },
      });

      toast.success("Dossiê probatório em PDF gerado com sucesso!");
    } catch (err: any) {
      // NUNCA logar payload ou PII sensível em console
      toast.error(
        "Falha ao gerar dossiê em PDF: " + (err?.message || "erro desconhecido")
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Média de score e emoji correspondente dos pulsos do relatório
  const pulseMetrics = useMemo(() => {
    if (!reportData?.pulsos || reportData.pulsos.length === 0) {
      return { total: 0, media: null, emojiObj: null };
    }
    const scores = reportData.pulsos
      .filter((p) => p.score_numeric !== null && !isNaN(p.score_numeric))
      .map((p) => p.score_numeric as number);

    if (scores.length === 0) {
      return { total: reportData.pulsos.length, media: null, emojiObj: null };
    }

    const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const rounded = Math.round(avg);
    const emojiObj = EMOJI_SCALE.find((e) => e.score === rounded) || null;

    return {
      total: reportData.pulsos.length,
      media: avg,
      emojiObj,
    };
  }, [reportData?.pulsos]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Dossiê Probatório do Colaborador
              </h2>
              <p className="text-sm text-muted-foreground">
                Histórico consolidado de pulsos e ações registradas para fiscalização do trabalho (NR-1) e instrução jurídica.
              </p>
            </div>
          </div>
        </div>

        {selectedEmployeeId && reportData && (
          <Button
            onClick={handleExportPDF}
            disabled={loadingReport || generatingPdf}
            className="flex items-center gap-2 shadow-sm"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando Dossiê PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Exportar PDF Probatório</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Barra de Filtros e Seleção de Colaborador */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Seletor com Busca de Colaborador */}
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                Colaborador Foco *
              </Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Filtrar por nome ou departamento..."
                    value={colaboradorSearch}
                    onChange={(e) => setColaboradorSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={loadingColaboradores}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Selecione um colaborador da lista..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {filteredColaboradores.length === 0 ? (
                      <div className="py-3 px-2 text-xs text-muted-foreground text-center">
                        Nenhum colaborador encontrado com o filtro.
                      </div>
                    ) : (
                      filteredColaboradores.map((c) => (
                        <SelectItem key={c.employee_id} value={c.employee_id}>
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium text-foreground">{c.nome}</span>
                            {c.departamento && (
                              <span className="text-xs text-muted-foreground">
                                • {c.departamento}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros de Período (Data Início e Data Fim) */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data Início
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data Fim
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Ação Limpar Filtros */}
            <div className="lg:col-span-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearFilters}
                disabled={!dataInicio && !dataFim}
                title="Limpar período"
                className="w-full h-10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Botão Exportar PDF ao lado do filtro de período */}
            <div className="lg:col-span-3">
              <Button
                onClick={handleExportPDF}
                disabled={!selectedEmployeeId || loadingReport || generatingPdf || !reportData}
                className="w-full h-10 flex items-center justify-center gap-2 font-medium"
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs sm:text-sm">Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Exportar PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESTADO 1: Nenhum colaborador selecionado */}
      {!selectedEmployeeId && (
        <Card className="border-dashed border-border bg-muted/20">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <User className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Nenhum colaborador selecionado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Selecione um colaborador no campo acima para carregar o histórico completo de pulsos, evolução de sentimento e acompanhamentos registrados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ESTADO 2: Carregando relatório */}
      {selectedEmployeeId && loadingReport && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* ESTADO 3: Erro ao carregar */}
      {selectedEmployeeId && !loadingReport && hasReportError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold text-destructive">
              Não foi possível carregar o dossiê probatório
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {reportError?.message || "Ocorreu um erro ao consultar os dados do colaborador. Certifique-se de que a sua sessão possui as permissões necessárias."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchReport()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ESTADO 4: Dossiê Carregado com Sucesso */}
      {selectedEmployeeId && !loadingReport && !hasReportError && reportData && (
        <div className="space-y-6">
          {/* Card de Identificação Cadastral e Funcional */}
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="bg-muted/40 p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background shadow">
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                      {reportData.colaborador?.full_name
                        ? reportData.colaborador.full_name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "CO"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-foreground">
                        {reportData.colaborador?.full_name || "Colaborador sem nome"}
                      </h3>
                      {(() => {
                        const statusConfig = getStatusBadgeConfig(reportData.colaborador?.status);
                        return (
                          <Badge variant="outline" className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {reportData.colaborador?.cargo || "Cargo não informado"}
                      <span>•</span>
                      <Building2 className="h-3.5 w-3.5" />
                      {reportData.colaborador?.departamento || "Departamento não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end text-xs text-muted-foreground">
                  <span className="font-mono bg-background px-2.5 py-1 rounded border shadow-2xs">
                    CPF: {reportData.colaborador?.cpf || "Não informado"}
                  </span>
                  <span className="mt-1">
                    Admissão: {formatReportDate(reportData.colaborador?.admissao)}
                  </span>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card p-4 rounded-lg border">
                  <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    Total de Pulsos
                  </span>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {pulseMetrics.total}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Respostas no período selecionado
                  </p>
                </div>

                <div className="bg-card p-4 rounded-lg border">
                  <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    Média de Humor
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {pulseMetrics.media !== null ? pulseMetrics.media.toFixed(1) : "—"}
                    </span>
                    {pulseMetrics.emojiObj && (
                      <span className="text-2xl" title={pulseMetrics.emojiObj.label}>
                        {pulseMetrics.emojiObj.emoji}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pulseMetrics.emojiObj ? pulseMetrics.emojiObj.label : "Sem notas registradas"}
                  </p>
                </div>

                <div className="bg-card p-4 rounded-lg border">
                  <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    Acompanhamentos
                  </span>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {reportData.acompanhamentos.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ações institucionais de RH/SST
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Evolução Cronológica do Sentimento */}
          <RelatorioEvolutionChart pulsos={reportData.pulsos} />

          {/* Tabela Cronológica de Pulsos */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Histórico Cronológico de Pulsos
                  </CardTitle>
                  <CardDescription>
                    Todos os pulsos respondidos nominalmente pelo colaborador (anônimos excluídos).
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-normal">
                  {reportData.pulsos.length} {reportData.pulsos.length === 1 ? "registro" : "registros"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.pulsos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto opacity-40 mb-2" />
                  <p className="text-sm font-medium">Nenhum pulso registrado no período.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tente ajustar o intervalo de datas acima para visualizar outros registros.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[150px]">Data e Hora</TableHead>
                        <TableHead className="w-[120px]">Origem</TableHead>
                        <TableHead className="w-[160px]">Campanha</TableHead>
                        <TableHead className="w-[100px]">Esfera</TableHead>
                        <TableHead>Pergunta</TableHead>
                        <TableHead className="w-[140px]">Resposta / Nota</TableHead>
                        <TableHead>Comentário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.pulsos.map((pulso) => {
                        const emojiObj = pulso.score_numeric !== null
                          ? EMOJI_SCALE.find((e) => e.score === Math.round(pulso.score_numeric as number))
                          : null;

                        return (
                          <TableRow key={pulso.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {formatReportDateTime(pulso.data_hora)}
                            </TableCell>
                            <TableCell>
                              {pulso.origem === "campanha" ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[11px]">
                                  Campanha
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 text-[11px]">
                                  Pulso Direto
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {pulso.campanha || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground capitalize">
                              {pulso.esfera || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-foreground max-w-xs">
                              {pulso.pergunta || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1.5">
                                {emojiObj && (
                                  <span className="text-base" title={emojiObj.label}>
                                    {emojiObj.emoji}
                                  </span>
                                )}
                                <span className="font-semibold text-foreground">
                                  {pulso.score_numeric !== null
                                    ? `${pulso.score_numeric}/5`
                                    : pulso.resposta || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-sm">
                              {pulso.comentario ? (
                                <div className="flex items-start gap-1.5 bg-muted/40 p-2 rounded border text-foreground/90 italic">
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <span>"{pulso.comentario}"</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção de Acompanhamentos Institucionais */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Acompanhamentos e Tratativas Institucionais
                  </CardTitle>
                  <CardDescription>
                    Registros formais de suporte, reuniões 1:1 e intervenções preventivas conduzidas pela empresa.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-normal">
                  {reportData.acompanhamentos.length}{" "}
                  {reportData.acompanhamentos.length === 1 ? "registro" : "registros"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.acompanhamentos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto opacity-40 mb-2" />
                  <p className="text-sm font-medium">Nenhum acompanhamento registrado.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Não há tratativas formais cadastradas no prontuário deste colaborador.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.acompanhamentos.map((acomp) => {
                    const statusConfig = getAcompanhamentoBadgeConfig(acomp.status);
                    const isFora = isAcompanhamentoForaDoPeriodo(acomp.criado_em, dataInicio, dataFim);

                    return (
                      <Card key={acomp.id} className="border bg-card/60">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                              {isFora && (
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700 text-[11px]">
                                  Fora do período filtrado
                                </Badge>
                              )}
                              <span className="text-xs font-medium text-foreground">
                                Responsável: <span className="font-semibold">{acomp.responsavel_nome || "RH"}</span>
                              </span>
                              {acomp.updated_by_nome && (
                                <span className="text-xs text-muted-foreground">
                                  (Atualizado por: {acomp.updated_by_nome})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Criado em: {formatReportDateTime(acomp.criado_em)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3 text-sm">
                          {/* Objetivo */}
                          {acomp.objetivo && (
                            <div>
                              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                Objetivo da Ação
                              </span>
                              <p className="text-sm font-medium text-foreground mt-0.5">
                                {acomp.objetivo}
                              </p>
                            </div>
                          )}

                          {/* Lista de Ações */}
                          {Array.isArray(acomp.acoes) && acomp.acoes.length > 0 && (
                            <div>
                              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                Ações Definidas
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {acomp.acoes.map((acao, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-muted px-2.5 py-1 rounded-md border text-foreground"
                                  >
                                    • {typeof acao === "string" ? acao : JSON.stringify(acao)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Anotações e Resultado em colunas */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {acomp.anotacoes && (
                              <div className="bg-muted/30 p-3 rounded-md border">
                                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                  Anotações Confidenciais
                                </span>
                                <p className="text-xs text-foreground mt-1 whitespace-pre-line">
                                  {acomp.anotacoes}
                                </p>
                              </div>
                            )}

                            {acomp.resultado && (
                              <div className="bg-muted/30 p-3 rounded-md border">
                                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                  Resultado Observado
                                </span>
                                <p className="text-xs text-foreground mt-1 whitespace-pre-line">
                                  {acomp.resultado}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Rodapé do Card: Prazos e Status */}
                          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground border-t">
                            {acomp.concluido_em && (
                              <span>Concluído em: {formatReportDateTime(acomp.concluido_em)}</span>
                            )}
                            {acomp.proximo_contato_em && (
                              <span>Próximo contato agendado: {formatReportDateTime(acomp.proximo_contato_em)}</span>
                            )}
                            {acomp.atualizado_em && (
                              <span>Última atualização: {formatReportDateTime(acomp.atualizado_em)}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rodapé Probatório e Termo de Conformidade NR-1 */}
          {reportData.regras_aplicadas && (
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">
                    Certificação de Integridade e Regras Aplicadas (NR-1 / LGPD)
                  </p>
                  <p className="leading-relaxed">
                    {reportData.regras_aplicadas}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
