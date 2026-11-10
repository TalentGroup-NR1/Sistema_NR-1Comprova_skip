import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComunicados } from "@/hooks/useComunicados";
import { useRelatorioLeituras } from "@/hooks/useComunicadosObrigatorios";
import { exportToExcel } from "@/lib/exportUtils";
import { useCompanies } from "@/hooks/useCompanies";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { gerarRelatorioEvidenciaPDF } from "@/lib/relatorioEvidenciaPDF";
import { resolverEmitente, resolverAutorNome } from "@/lib/relatorioEmitente";
import { getSignedUrl } from "@/hooks/useComunicados";
import { toast } from "sonner";

export function RelatorioLeituras() {
  const { data: comunicados = [], isLoading: loadingCom } = useComunicados();
  const { data: companies = [] } = useCompanies();
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const publicados = useMemo(
    () => comunicados.filter((c) => c.status === "publicado"),
    [comunicados]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: rows = [], isLoading } = useRelatorioLeituras(selectedId);
  const selected = publicados.find((c) => c.id === selectedId);

  const stats = useMemo(() => {
    const total = rows.length;
    const lidos = rows.filter((r) => r.lido).length;
    return {
      total,
      lidos,
      pendentes: total - lidos,
      pct: total ? Math.round((lidos / total) * 100) : 0,
    };
  }, [rows]);

  const handleExport = () => {
    if (!rows.length || !selected) return;
    const data = rows.map((r) => ({
      Colaborador: r.nome,
      CPF: r.cpf ?? "",
      Matricula: r.matricula ?? "",
      "Login (e-mail pessoal)": r.email_pessoal ?? "",
      Departamento: r.departamento,
      Cargo: r.cargo,
      Status: r.lido ? "Lido" : "Pendente",
      "Data/Hora da Leitura": r.lido_em
        ? format(new Date(r.lido_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
        : "",
    }));
    const fileName = `leituras_${selected.titulo.replace(/\s+/g, "_")}_${format(
      new Date(),
      "yyyy-MM-dd"
    )}`;
    exportToExcel(data, fileName);
  };

  const handleGerarPDF = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const empresa = companies.find((c) => c.id === companyId) ?? companies[0];
      const emitente = user?.id
        ? await resolverEmitente(user.id, user.email || "—")
        : { nome: user?.email || "—", cargo: null, email: user?.email || "—" };

      const autorNomeResolved = await resolverAutorNome(
        (selected as any).autor_id,
        selected.autor_nome
      );

      // Anexos com URL assinada para hash
      const anexosRaw = ((selected as any).comunicados_anexos || []) as Array<{
        nome_arquivo: string;
        url_arquivo: string;
        tipo_arquivo: string | null;
        tamanho_bytes: number | null;
      }>;
      const anexos = await Promise.all(
        anexosRaw.map(async (a) => ({
          nome: a.nome_arquivo,
          url: (await getSignedUrl(a.url_arquivo)) || undefined,
          tipo: a.tipo_arquivo || undefined,
          tamanho: a.tamanho_bytes || undefined,
        }))
      );

      await gerarRelatorioEvidenciaPDF({
        tipo: "comunicado",
        item: {
          id: selected.id,
          titulo: selected.titulo,
          conteudo_html: selected.conteudo,
          data_publicacao: selected.data_publicacao,
          autor_nome: autorNomeResolved,
          is_pinned: (selected as any).is_pinned,
          publico_alvo_tipo: (selected as any).publico_alvo_tipo,
          publico_alvo_valor: (selected as any).publico_alvo_valor,
          anexos,
        },
        rows: rows.map((r) => ({
          nome: r.nome,
          cpf: r.cpf,
          matricula: r.matricula,
          email_pessoal: r.email_pessoal,
          departamento: r.departamento,
          cargo: r.cargo,
          lido: r.lido,
          lido_em: r.lido_em,
        })),
        empresa: {
          name: empresa?.name,
          cnpj: empresa?.cnpj,
          logo_url: empresa?.logo_url,
        },
        emitente,
      });
      toast.success("Relatório de evidência gerado.");
    } catch (e: any) {
      toast.error("Falha ao gerar PDF: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Selecione um comunicado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingCom ? "Carregando..." : "Selecione um comunicado publicado"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {publicados.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.titulo}
                </SelectItem>
              ))}
              {!publicados.length && !loadingCom && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhum comunicado publicado.
                </div>
              )}
            </SelectContent>
          </Select>

          {selected && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Lidos</p>
                  <p className="text-2xl font-bold text-success">{stats.lidos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-warning">{stats.pendentes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Adesão</p>
                  <p className="text-2xl font-bold">{stats.pct}%</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Status por colaborador</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!rows.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                size="sm"
                onClick={handleGerarPDF}
                disabled={!rows.length || generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Relatório de Evidência (PDF)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !rows.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum colaborador no público-alvo deste comunicado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora da leitura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.departamento}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>
                        {r.lido ? (
                          <Badge className="bg-success/15 text-success hover:bg-success/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Lido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-warning border-warning/40">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {r.lido_em
                          ? format(new Date(r.lido_em), "dd/MM/yyyy HH:mm:ss", {
                              locale: ptBR,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
