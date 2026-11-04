import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DenunciaStatus,
  FaleConoscoTipo,
  useDenunciasAdmin,
  useIsResponsavelDenuncia,
} from "@/hooks/useDenuncias";
import { DenunciaDetailDialog } from "@/components/denuncias/DenunciaDetailDialog";
import { TIPO_LABEL, TipoBadge } from "@/components/denuncias/TipoBadge";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STATUS_LABEL: Record<DenunciaStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
};

const STATUS_VARIANT: Record<DenunciaStatus, "default" | "secondary" | "outline"> = {
  novo: "default",
  em_analise: "secondary",
  concluido: "outline",
};

export default function Denuncias() {
  const { data: isResponsavel, isLoading: isLoadingResp } = useIsResponsavelDenuncia();
  const { data, isLoading } = useDenunciasAdmin(!!isResponsavel);
  const [statusFiltro, setStatusFiltro] = useState<DenunciaStatus | "todos">("todos");
  const [tipoFiltro, setTipoFiltro] = useState<FaleConoscoTipo | "todos">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lista = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => {
      if (d.tipo === "denuncia") return false; // denúncias vão para a aba "Comportamentos Ofensivos"
      if (statusFiltro !== "todos" && d.status !== statusFiltro) return false;
      if (tipoFiltro !== "todos" && d.tipo !== tipoFiltro) return false;
      return true;
    });
  }, [data, statusFiltro, tipoFiltro]);

  const selected = useMemo(
    () => data?.find((d) => d.id === selectedId) ?? null,
    [data, selectedId]
  );

  if (!isLoadingResp && !isResponsavel) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Acesso Restrito</AlertTitle>
            <AlertDescription className="mt-2 text-sm leading-relaxed">
              O acesso às mensagens do Canal de Denúncias e Fale Conosco é restrito aos responsáveis nominalmente designados pela empresa, garantindo apuração imparcial e sigilo conforme a Lei 14.457/2022 (Art. 23, II). Caso necessite de acesso, solicite a designação ao Administrador da Empresa.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fale Conosco — Sugestões e Dúvidas</h1>
          <p className="text-sm text-muted-foreground">
            Mensagens enviadas pelos colaboradores (sugestões e dúvidas). Denúncias são
            tratadas em aba isolada — "Relatório de Comportamentos Ofensivos" (CIPA+A).
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle>Lista de mensagens</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={tipoFiltro}
                onValueChange={(v) => setTipoFiltro(v as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="sugestao">{TIPO_LABEL.sugestao}</SelectItem>
                  <SelectItem value="duvida">{TIPO_LABEL.duvida}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFiltro}
                onValueChange={(v) => setStatusFiltro(v as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lista.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem encontrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Prévia</TableHead>
                    <TableHead>Anônimo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(d.id)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(d.criado_em), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <TipoBadge tipo={d.tipo} />
                      </TableCell>
                      <TableCell className="font-medium">{d.titulo}</TableCell>
                      <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                        {d.mensagem}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.anonimo ? "secondary" : "outline"}>
                          {d.anonimo ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.status]}>
                          {STATUS_LABEL[d.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DenunciaDetailDialog
          denuncia={selected}
          onOpenChange={(o) => !o && setSelectedId(null)}
        />
      </div>
    </MainLayout>
  );
}
