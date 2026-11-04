import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, UserMinus } from "lucide-react";
import { UserProfile } from "@/hooks/useUsers";
import {
  ResponsavelDenunciaItem,
  useRemoverResponsavelDenuncia,
} from "@/hooks/useDenuncias";

interface RemoverResponsavelDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  outrosDesignados: ResponsavelDenunciaItem[];
}

export function RemoverResponsavelDialog({
  open,
  onClose,
  user,
  outrosDesignados,
}: RemoverResponsavelDialogProps) {
  const removerMutation = useRemoverResponsavelDenuncia();
  const [transferirPara, setTransferirPara] = useState<string>("");

  useEffect(() => {
    if (outrosDesignados.length > 0) {
      setTransferirPara(outrosDesignados[0].user_id);
    } else {
      setTransferirPara("");
    }
  }, [outrosDesignados, open]);

  if (!user) return null;

  const handleConfirm = async () => {
    try {
      await removerMutation.mutateAsync({
        userId: user.user_id,
        transferirPara: transferirPara || undefined,
      });
      onClose();
    } catch {
      // toast error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserMinus className="h-5 w-5" />
            Remover do Canal de Denúncias
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover <strong>{user.full_name || user.email}</strong> da gestão do Canal de Denúncias?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {outrosDesignados.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Transferir denúncias em andamento para:
              </label>
              <Select value={transferirPara} onValueChange={setTransferirPara}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o substituto" />
                </SelectTrigger>
                <SelectContent>
                  {outrosDesignados.map((d) => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      {d.nome} ({d.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As denúncias ativas sob responsabilidade deste colaborador serão transferidas automaticamente com registro na trilha de auditoria.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-md text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Este é o único responsável ativo. Se houver denúncias em aberto, a remoção será bloqueada até que outro responsável seja designado (Art. 23, II da Lei 14.457/2022).
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={removerMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={removerMutation.isPending}
          >
            {removerMutation.isPending ? "Removendo..." : "Confirmar Remoção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
