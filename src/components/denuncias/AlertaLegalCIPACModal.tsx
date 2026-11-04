import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CIPA_ALERTA_LEGAL } from "@/lib/cipaCategorias";

interface Props {
  open: boolean;
  onCiente: () => void | Promise<void>;
  isPending?: boolean;
}

export function AlertaLegalCIPACModal({ open, onCiente, isPending = false }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg border-destructive/40 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            🚨 Atenção Legal — CIPA+A
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground">
          {CIPA_ALERTA_LEGAL}
        </div>
        <p className="text-xs text-muted-foreground">
          Lei nº 14.457/2022 — CIPA+A. Esta ciência é registrada de forma imutável no banco de dados antes da leitura do relato.
        </p>
        <DialogFooter>
          <Button onClick={onCiente} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando ciência...
              </>
            ) : (
              "Estou ciente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
