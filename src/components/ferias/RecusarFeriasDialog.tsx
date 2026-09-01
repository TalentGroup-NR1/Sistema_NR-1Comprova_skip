import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRecusarFeriasGozo } from "@/hooks/useFerias";

interface RecusarFeriasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gozoId: string | null;
}

export function RecusarFeriasDialog({ open, onOpenChange, gozoId }: RecusarFeriasDialogProps) {
  const [motivo, setMotivo] = useState("");
  const recusar = useRecusarFeriasGozo();

  const handleConfirm = async () => {
    if (!gozoId || !motivo.trim()) return;
    await recusar.mutateAsync({ gozoId, motivo: motivo.trim() });
    setMotivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setMotivo(""); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar Solicitação</DialogTitle>
          <DialogDescription>
            Informe o motivo da recusa. O colaborador poderá visualizar essa informação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo</Label>
          <Textarea id="motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: período conflita com fechamento de mês..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!motivo.trim() || recusar.isPending}>
            {recusar.isPending ? "Recusando..." : "Confirmar Recusa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
