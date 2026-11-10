import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePontoRegistros, PontoRegistroTipo } from "@/hooks/usePontoRegistros";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  companyId: string;
}

export function AjustePontoDialog({ open, onOpenChange, colaboradorId, companyId }: Props) {
  const { ajustarPonto } = usePontoRegistros();
  const [tipo, setTipo] = useState<PontoRegistroTipo>("ENTRADA");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  // Zera os campos toda vez que o diálogo é aberto para evitar reutilizar
  // data/hora de uma tentativa anterior (que já foi salva ou deu erro).
  // Isso corrige o bug em que uma data errada persistia e disparava
  // "Já existe uma marcação..." em novas tentativas.
  useEffect(() => {
    if (open) {
      setTipo("ENTRADA");
      setData("");
      setHora("");
      setMotivo("");
      setObservacao("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!data || !hora || !motivo.trim()) return;

    // Inclui offset do fuso local para evitar conversão UTC equivocada
    const localDate = new Date(`${data}T${hora}:00`);
    const offset = -localDate.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const mm = String(absOffset % 60).padStart(2, '0');
    const dataHora = `${data}T${hora}:00${sign}${hh}:${mm}`;
    ajustarPonto.mutate({
      colaborador_id: colaboradorId,
      company_id: companyId,
      tipo,
      data_hora: dataHora,
      ajuste_motivo: motivo.trim(),
      observacao: observacao.trim() || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTipo("ENTRADA");
        setData("");
        setHora("");
        setMotivo("");
        setObservacao("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste Manual de Ponto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo de Registro</Label>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo do Ajuste *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Informe o motivo do ajuste manual..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!data || !hora || !motivo.trim() || ajustarPonto.isPending}
          >
            Salvar Ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
