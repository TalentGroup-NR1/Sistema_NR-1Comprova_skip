import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DenunciaAdmin,
  DenunciaStatus,
  useAtualizarStatusDenuncia,
} from "@/hooks/useDenuncias";
import { TipoBadge } from "./TipoBadge";

const STATUS_LABEL: Record<DenunciaStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
};

interface Props {
  denuncia: DenunciaAdmin | null;
  onOpenChange: (open: boolean) => void;
  extraHeader?: React.ReactNode;
}

export function DenunciaDetailDialog({ denuncia, onOpenChange, extraHeader }: Props) {
  const atualizar = useAtualizarStatusDenuncia();

  const handleChangeStatus = async (status: DenunciaStatus) => {
    if (!denuncia) return;
    try {
      await atualizar.mutateAsync({ id: denuncia.id, status });
      toast.success("Status atualizado");
    } catch (err: any) {
      toast.error("Erro ao atualizar status", { description: err?.message });
    }
  };

  return (
    <Dialog open={!!denuncia} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {denuncia && (
          <>
            <DialogHeader>
              <DialogTitle>{denuncia.titulo}</DialogTitle>
              <DialogDescription>
                Recebida em{" "}
                {format(new Date(denuncia.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <TipoBadge tipo={denuncia.tipo} />
                <Badge variant={denuncia.anonimo ? "secondary" : "outline"}>
                  {denuncia.anonimo ? "Anônimo" : denuncia.autor_nome ?? "Identificado"}
                </Badge>
              </div>

              {extraHeader}

              <div>
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <div className="mt-1 rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {denuncia.mensagem}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={denuncia.status}
                  onValueChange={(v) => handleChangeStatus(v as DenunciaStatus)}
                  disabled={atualizar.isPending}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as DenunciaStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
