import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Paperclip, X, FileCheck } from "lucide-react";
import { useAbonos } from "@/hooks/usePontoAbonos";
import { LancarAbonoDialog } from "./LancarAbonoDialog";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function AbonosList() {
  const { abonos, isLoading, cancel, downloadAnexo } = useAbonos();
  const [open, setOpen] = useState(false);

  const hoje = new Date();
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [verTodos, setVerTodos] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const atual = hoje.getFullYear();
    return [atual - 2, atual - 1, atual, atual + 1];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abonosFiltrados = useMemo(() => {
    if (verTodos) return abonos;
    // Intersecta o período [data_inicio, data_fim] com o mês/ano selecionado
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);
    return abonos.filter((a) => {
      const ini = parseISO(a.data_inicio);
      const fim = parseISO(a.data_fim);
      return ini <= fimMes && fim >= inicioMes;
    });
  }, [abonos, verTodos, mes, ano]);

  const totalGeral = abonos.length;
  const totalVisivel = abonosFiltrados.length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Abonos de Ausência
            {totalVisivel > 0 && <Badge variant="secondary">{totalVisivel}</Badge>}
            {!verTodos && totalGeral !== totalVisivel && (
              <span className="text-xs text-muted-foreground font-normal">
                de {totalGeral} no histórico
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={String(mes)}
              onValueChange={(v) => { setMes(Number(v)); setVerTodos(false); }}
              disabled={verTodos}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((nome, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(ano)}
              onValueChange={(v) => { setAno(Number(v)); setVerTodos(false); }}
              disabled={verTodos}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={verTodos ? "default" : "outline"}
              onClick={() => setVerTodos((v) => !v)}
            >
              {verTodos ? "Filtrar por mês" : "Ver todos"}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Lançar Abono
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : abonosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {verTodos
                ? "Nenhum abono lançado."
                : `Nenhum abono em ${MESES[mes - 1]}/${ano}. Clique em "Ver todos" para consultar o histórico.`}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Justificativa</TableHead>
                    <TableHead>Anexo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abonosFiltrados.map((a) => {
                    const ini = parseISO(a.data_inicio);
                    const fim = parseISO(a.data_fim);
                    const isHoras = a.modalidade === "horas";
                    const dias = differenceInCalendarDays(fim, ini) + 1;
                    const periodo = isHoras
                      ? `${format(ini, "dd/MM/yy", { locale: ptBR })} · ${(a.hora_inicio || "").slice(0,5)}–${(a.hora_fim || "").slice(0,5)}`
                      : `${format(ini, "dd/MM/yy", { locale: ptBR })} — ${format(fim, "dd/MM/yy", { locale: ptBR })}`;
                    const duracao = isHoras && a.minutos_abonados
                      ? `${Math.floor(a.minutos_abonados/60)}h ${String(a.minutos_abonados%60).padStart(2,"0")}min`
                      : `${dias} dia${dias>1?"s":""}`;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.colaborador?.full_name || "—"}</TableCell>
                        <TableCell>{a.tipo?.nome || "—"}</TableCell>
                        <TableCell className="text-sm">{periodo}</TableCell>
                        <TableCell>{duracao}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="text-sm text-muted-foreground line-clamp-2">{a.justificativa}</span>
                        </TableCell>
                        <TableCell>
                          {a.anexo_url ? (
                            <Button size="sm" variant="ghost" onClick={() => downloadAnexo(a.anexo_url!)}>
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === "ativo" ? "default" : "secondary"}>
                            {a.status === "ativo" ? "Ativo" : "Cancelado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.status === "ativo" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                const m = prompt("Motivo do cancelamento:");
                                if (m && m.trim()) cancel.mutate({ id: a.id, motivo: m.trim() });
                              }}
                            >
                              <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
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
      <LancarAbonoDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
