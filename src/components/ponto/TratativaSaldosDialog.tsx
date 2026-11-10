import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useSaldosFechamento, useRegistrarTratativa, type TratativaAcao } from "@/hooks/useTratativasFechamento";
import { formatMinutes } from "@/hooks/usePontoResumo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string | null | undefined;
  periodoInicio: string;
  periodoFim: string;
  periodoLabel: string;
  onConfirmar: () => void;
  isClosing: boolean;
}

const ACAO_LABEL: Record<TratativaAcao, string> = {
  pagar: "Pagar em folha",
  descontar: "Descontar em folha",
  transferir: "Transferir para próximo ciclo",
  perdoar: "Perdoar (zerar)",
};

function opcoesPara(saldo: number): TratativaAcao[] {
  if (saldo > 0) return ["pagar", "transferir", "perdoar"];
  if (saldo < 0) return ["descontar", "transferir", "perdoar"];
  return [];
}

export function TratativaSaldosDialog({
  open, onOpenChange, companyId, periodoInicio, periodoFim, periodoLabel, onConfirmar, isClosing,
}: Props) {
  const { data: saldos = [], isLoading } = useSaldosFechamento(companyId, periodoInicio, periodoFim);
  const registrar = useRegistrarTratativa(companyId, periodoInicio, periodoFim);
  const [obsDraft, setObsDraft] = useState<Record<string, string>>({});

  const comSaldo = useMemo(() => saldos.filter((s) => s.saldo_minutos !== 0), [saldos]);
  const pendentes = useMemo(() => comSaldo.filter((s) => !s.tratativa_acao), [comSaldo]);
  const decididos = comSaldo.length - pendentes.length;

  const handleSelect = (colaboradorId: string, acao: TratativaAcao) => {
    registrar.mutate({
      colaborador_id: colaboradorId,
      acao,
      observacao: obsDraft[colaboradorId] || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Tratativa de saldos — {periodoLabel}
          </DialogTitle>
          <DialogDescription>
            Para cada colaborador com saldo diferente de zero, escolha o que fazer. O fechamento só é liberado depois que
            todos estiverem decididos. Saldo zero não exige tratativa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">Com saldo: {comSaldo.length}</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />Decididos: {decididos}
          </Badge>
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <AlertCircle className="h-3 w-3 mr-1" />Pendentes: {pendentes.length}
          </Badge>
        </div>

        <div className="flex-1 overflow-auto rounded-md border">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando saldos…</p>
          ) : comSaldo.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum colaborador tem saldo diferente de zero. Pode fechar diretamente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="w-[220px]">Tratativa</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comSaldo.map((s) => {
                  const opts = opcoesPara(s.saldo_minutos);
                  const positivo = s.saldo_minutos > 0;
                  return (
                    <TableRow key={s.colaborador_id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.department ?? "—"}</TableCell>
                      <TableCell className={`text-center font-mono ${positivo ? "text-emerald-700" : "text-red-700"}`}>
                        {positivo ? "+" : ""}{formatMinutes(s.saldo_minutos)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={s.tratativa_acao ?? ""}
                          onValueChange={(v) => handleSelect(s.colaborador_id, v as TratativaAcao)}
                          disabled={registrar.isPending}
                        >
                          <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
                          <SelectContent>
                            {opts.map((o) => (
                              <SelectItem key={o} value={o}>{ACAO_LABEL[o]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Opcional…"
                          defaultValue={s.tratativa_observacao ?? ""}
                          onChange={(e) => setObsDraft((p) => ({ ...p, [s.colaborador_id]: e.target.value }))}
                          onBlur={() => {
                            if (s.tratativa_acao && (obsDraft[s.colaborador_id] ?? "") !== (s.tratativa_observacao ?? "")) {
                              handleSelect(s.colaborador_id, s.tratativa_acao);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {s.tratativa_acao ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Decidido</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-700">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            onClick={onConfirmar}
            disabled={pendentes.length > 0 || isClosing}
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            {isClosing ? "Fechando..." : pendentes.length > 0
              ? `Faltam ${pendentes.length} tratativa(s)`
              : "Confirmar fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
