import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PontoRegistroTipo } from "@/hooks/usePontoRegistros";
import { format } from "date-fns";

interface LancarPontoManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: {
    tipo: PontoRegistroTipo;
    data_hora: string;
    justificativa: string;
    observacao?: string;
  }) => void;
  isPending: boolean;
  defaultDate?: string;
}

export function LancarPontoManualDialog({ open, onOpenChange, onSubmit, isPending, defaultDate }: LancarPontoManualDialogProps) {
  const [tipo, setTipo] = useState<PontoRegistroTipo>("ENTRADA");
  const [data, setData] = useState(defaultDate || format(new Date(), "yyyy-MM-dd"));
  const [hora, setHora] = useState("08:00");
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (open && defaultDate) {
      setData(defaultDate);
    }
  }, [open, defaultDate]);

  const handleSubmit = () => {
    if (!justificativa.trim()) return;
    const localDate = new Date(`${data}T${hora}:00`);
    const offset = -localDate.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const mm = String(absOffset % 60).padStart(2, '0');
    const dataHora = `${data}T${hora}:00${sign}${hh}:${mm}`;
    onSubmit({
      tipo,
      data_hora: dataHora,
      justificativa: justificativa.trim(),
    });
    setJustificativa("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Ponto Manual</DialogTitle>
          <DialogDescription>
            Inclua uma marcação manual. Ela ficará pendente até a aprovação do administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Marcação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as PontoRegistroTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Justificativa *</Label>
            <Textarea
              placeholder="Informe o motivo da marcação manual (obrigatório)..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !justificativa.trim()}>
            {isPending ? "Enviando..." : "Enviar para Aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
