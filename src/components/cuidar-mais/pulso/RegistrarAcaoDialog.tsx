import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRegistrarAcaoAlerta } from "@/hooks/useRegistrarAcaoAlerta";
import type { AlertaRow } from "@/hooks/useAlertasCuidar";

interface Props {
  alerta: AlertaRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Status = AlertaRow["status"];

export function RegistrarAcaoDialog({ alerta, open, onOpenChange }: Props) {
  const [acao, setAcao] = useState("");
  const [status, setStatus] = useState<Status>("em_acao");
  const { mutate, isPending } = useRegistrarAcaoAlerta();

  useEffect(() => {
    if (open && alerta) {
      setAcao(alerta.acao_registrada || "");
      setStatus(alerta.status === "aberto" ? "em_acao" : alerta.status);
    }
  }, [open, alerta]);

  if (!alerta) return null;

  const submit = () => {
    if (!acao.trim()) return;
    mutate(
      { alertaId: alerta.id, acao: acao.trim(), novoStatus: status },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Ação</DialogTitle>
          <DialogDescription>{alerta.mensagem}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ação realizada</Label>
            <Textarea
              placeholder="Ex: Conversei com o colaborador, agendei check-in semanal..."
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Novo status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="em_acao">Em ação</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
                <SelectItem value="aberto">Reabrir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending || !acao.trim()}>
            {isPending ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
