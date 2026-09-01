import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCompanies } from "@/hooks/useCompanies";
import { useExecutiveReport, useGestaoTecnicaOptions, useEmpresasClienteOptions } from "@/hooks/useExecutiveReport";
import { useSavedExecutiveReport } from "@/hooks/useSavedExecutiveReport";
import { ExecutiveReportPreview } from "@/components/relatorios-executivos/ExecutiveReportPreview";
import { RichTextEditor } from "@/components/comunicados/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Printer, Loader2, Save, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [0, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4];

export default function RelatoriosExecutivos() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(String(CURRENT_YEAR));
  const [selectedGestao, setSelectedGestao] = useState<string>("");
  const [selectedEmpresaCliente, setSelectedEmpresaCliente] = useState<string>("");
  const [parecer, setParecer] = useState("");
  const [showReport, setShowReport] = useState(false);

  const { data: companies } = useCompanies();
  const { data: gestaoOptions } = useGestaoTecnicaOptions(selectedCompanyId || null);
  const { data: empresaClienteOptions } = useEmpresasClienteOptions(selectedCompanyId || null);
  const { data: reportData, isLoading, isError } = useExecutiveReport(
    showReport ? selectedCompanyId || null : null,
    showReport ? Number(selectedYear) : null,
    showReport && selectedGestao ? selectedGestao : null,
    showReport && selectedEmpresaCliente ? selectedEmpresaCliente : null
  );


  const { savedReport, isLoadingSaved, save, isSaving } = useSavedExecutiveReport(
    selectedCompanyId || null,
    selectedCompanyId ? Number(selectedYear) : null
  );

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);

  // Load saved parecer when switching company/year
  useEffect(() => {
    if (savedReport) {
      setParecer(savedReport.parecer_html || "");
    } else {
      setParecer("");
    }
  }, [savedReport]);

  const handleGenerate = () => {
    if (selectedCompanyId && selectedYear) {
      setShowReport(true);
    }
  };

  const handleSave = () => {
    if (selectedCompanyId && selectedYear) {
      save({ companyId: selectedCompanyId, ano: Number(selectedYear), parecerHtml: parecer });
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Auto-show report if there's a saved one
  useEffect(() => {
    if (savedReport && selectedCompanyId && !showReport) {
      setShowReport(true);
    }
  }, [savedReport, selectedCompanyId]);

  return (
    <MainLayout>
      <div className="p-6 space-y-6 print-root-container">
        {/* Controls - hidden on print */}
        <div className="no-print space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Relatórios Executivos</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração do Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                  <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setSelectedGestao(""); setSelectedEmpresaCliente(""); setShowReport(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 w-44">
                  <label className="text-sm font-medium text-muted-foreground">Ano</label>
                  <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setShowReport(false); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y === 0 ? "Todos os anos" : y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {gestaoOptions && gestaoOptions.length > 0 && (
                  <div className="space-y-2 min-w-[200px]">
                    <label className="text-sm font-medium text-muted-foreground">Gestão Técnica</label>
                    <Select value={selectedGestao} onValueChange={(v) => { setSelectedGestao(v === "__all__" ? "" : v); setShowReport(false); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as gestões" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas as gestões</SelectItem>
                        {gestaoOptions.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {empresaClienteOptions && empresaClienteOptions.length > 0 && (
                  <div className="space-y-2 min-w-[200px]">
                    <label className="text-sm font-medium text-muted-foreground">Empresa Cliente</label>
                    <Select value={selectedEmpresaCliente || "__all__"} onValueChange={(v) => { setSelectedEmpresaCliente(v === "__all__" ? "" : v); setShowReport(false); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os clientes</SelectItem>
                        {empresaClienteOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}


                <div className="flex items-end gap-2">
                  <Button onClick={handleGenerate} disabled={!selectedCompanyId}>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar
                  </Button>
                  <Button variant="outline" onClick={handleSave} disabled={isSaving || !selectedCompanyId}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={handleExportPDF} disabled={!showReport || !reportData}>
                    <Printer className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Saved indicator */}
              {savedReport && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  <span>Último salvo em {format(new Date(savedReport.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Salvo</Badge>
                </div>
              )}

              {/* Parecer editor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Parecer da Consultoria (será incluído na última página)
                </label>
                <RichTextEditor content={parecer} onChange={setParecer} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        {isLoading && (
          <div className="no-print flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Gerando relatório...</span>
          </div>
        )}

        {isError && (
          <div className="no-print text-center py-12 text-destructive">
            Erro ao carregar dados. Verifique a empresa selecionada.
          </div>
        )}

        {showReport && reportData && selectedCompany && (
          <div className="flex justify-center">
            <ExecutiveReportPreview
              data={reportData}
              companyName={selectedCompany.name}
              year={Number(selectedYear)}
              logoUrl={selectedCompany.logo_url}
              parecerHtml={parecer}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
