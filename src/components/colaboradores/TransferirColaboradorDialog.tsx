import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRightLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useTransferirColaborador } from "@/hooks/useTransferenciaColaborador";
import type { Colaborador } from "@/hooks/useColaboradores";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Pick<Colaborador, "id" | "full_name" | "company_id"> | null;
}

export function TransferirColaboradorDialog({ open, onOpenChange, colaborador }: Props) {
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const transferir = useTransferirColaborador();
  const [destinoId, setDestinoId] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");

  useEffect(() => {
    if (open) {
      setDestinoId("");
      setMotivo("");
    }
  }, [open]);

  const empresasDisponiveis = (companies || []).filter(
    (c) => c.status === "active" && c.id !== colaborador?.company_id,
  );

  const empresaAtual = companies?.find((c) => c.id === colaborador?.company_id);
  const nomeAtual = empresaAtual?.name ?? "—";

  const handleConfirm = async () => {
    if (!colaborador || !destinoId) return;
    try {
      await transferir.mutateAsync({
        colaboradorId: colaborador.id,
        empresaDestinoId: destinoId,
        motivo: motivo.trim(),
      });
      onOpenChange(false);
    } catch {
      /* toast já exibido no hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferir Colaborador
          </DialogTitle>
          <DialogDescription>
            {colaborador?.full_name} • Empresa atual: <strong>{nomeAtual}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa-destino">Empresa de destino *</Label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger id="empresa-destino">
                <SelectValue
                  placeholder={loadingCompanies ? "Carregando..." : "Selecione a empresa"}
                />
              </SelectTrigger>
              <SelectContent>
                {empresasDisponiveis.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                {empresasDisponiveis.length === 0 && !loadingCompanies && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma empresa disponível
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da transferência (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: realocação contratual, novo cliente..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>ATENÇÃO:</strong> O colaborador será transferido para a empresa selecionada.
              Todo o histórico (ponto, férias, avaliações, comunicados, etc.) será preservado.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transferir.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!destinoId || transferir.isPending}>
            {transferir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
