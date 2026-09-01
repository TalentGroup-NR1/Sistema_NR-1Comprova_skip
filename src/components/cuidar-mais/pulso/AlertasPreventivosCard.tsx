import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { useAlertasCuidar, type AlertaRow } from "@/hooks/useAlertasCuidar";
import { RegistrarAcaoDialog } from "./RegistrarAcaoDialog";

const GATILHO_LABEL: Record<string, string> = {
  score_critico: "Score crítico",
  queda_individual: "Queda individual",
  padrao_recorrente: "Padrão recorrente",
  silencio: "Silêncio",
  humor_baixo_time: "Humor baixo (time)",
  queda_coletiva: "Queda coletiva",
  alta_carga_time: "Alta carga (time)",
};

const STATUS_LABEL: Record<AlertaRow["status"], string> = {
  aberto: "Aberto",
  em_acao: "Em ação",
  resolvido: "Resolvido",
  descartado: "Descartado",
};

function severidadeBadge(s: AlertaRow["severidade"]) {
  switch (s) {
    case "alto":
      return <Badge variant="destructive">Alto</Badge>;
    case "moderado":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Moderado</Badge>;
    default:
      return <Badge variant="secondary">Baixo</Badge>;
  }
}

function statusBadge(s: AlertaRow["status"]) {
  const map: Record<AlertaRow["status"], string> = {
    aberto: "bg-rose-100 text-rose-700 border-rose-200",
    em_acao: "bg-sky-100 text-sky-700 border-sky-200",
    resolvido: "bg-emerald-100 text-emerald-700 border-emerald-200",
    descartado: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[s]}>{STATUS_LABEL[s]}</Badge>;
}

export function AlertasPreventivosCard() {
  const [severidade, setSeveridade] = useState<string>("todas");
  const [status, setStatus] = useState<string>("aberto");
  const [selected, setSelected] = useState<AlertaRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtros = useMemo(() => ({
    severidade: severidade === "todas" ? undefined : (severidade as AlertaRow["severidade"]),
    status: status === "todos" ? undefined : (status as AlertaRow["status"]),
  }), [severidade, status]);

  const { data, isLoading } = useAlertasCuidar(filtros);

  const totais = useMemo(() => {
    const t = { alto: 0, moderado: 0, baixo: 0 };
    (data || []).forEach((a) => { t[a.severidade]++; });
    return t;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Alertas Preventivos
            </CardTitle>
            <CardDescription>
              Padrões de risco detectados — ações sugeridas para RH e gestores.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3" /> {totais.alto} alto</Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1">
              <AlertTriangle className="h-3 w-3" /> {totais.moderado} moderado
            </Badge>
            <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> {totais.baixo} baixo</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Select value={severidade} onValueChange={setSeveridade}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas severidades</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_acao">Em ação</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum alerta nos filtros selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador / Time</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Gatilho</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.tipo === "individual"
                        ? (a.colaborador_nome || "Colaborador")
                        : (a.departamento || "Time")}
                      <div className="text-xs text-muted-foreground">
                        {a.tipo === "individual" ? "Individual" : "Coletivo"}
                      </div>
                    </TableCell>
                    <TableCell>{severidadeBadge(a.severidade)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{GATILHO_LABEL[a.gatilho] ?? a.gatilho}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] text-sm">{a.mensagem}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {a.semana_iso && a.ano ? `s${a.semana_iso}/${a.ano}` : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelected(a); setDialogOpen(true); }}
                      >
                        Registrar ação
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <RegistrarAcaoDialog alerta={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
