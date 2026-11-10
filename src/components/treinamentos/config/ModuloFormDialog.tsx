import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ModuloTreinamento } from "@/hooks/useProgressoAula";
import { useCreateModulo, useUpdateModulo } from "@/hooks/useTreinamentoCurriculo";
import { Loader2 } from "lucide-react";

interface ModuloFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamentoId: string;
  moduloToEdit?: ModuloTreinamento | null;
  proximaOrdem: number;
}

export function ModuloFormDialog({
  open,
  onOpenChange,
  treinamentoId,
  moduloToEdit,
  proximaOrdem,
}: ModuloFormDialogProps) {
  const createModulo = useCreateModulo();
  const updateModulo = useUpdateModulo();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erroTitulo, setErroTitulo] = useState<string | null>(null);
  const [erroDescricao, setErroDescricao] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitulo(moduloToEdit?.titulo || "");
      setDescricao(moduloToEdit?.descricao || "");
      setErroTitulo(null);
      setErroDescricao(null);
    }
  }, [open, moduloToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    const trimmedTitulo = titulo.trim();
    if (trimmedTitulo.length < 3 || trimmedTitulo.length > 120) {
      setErroTitulo("O título deve ter entre 3 e 120 caracteres.");
      valid = false;
    } else {
      setErroTitulo(null);
    }

    if (descricao && descricao.length > 2000) {
      setErroDescricao("A descrição não pode exceder 2000 caracteres.");
      valid = false;
    } else {
      setErroDescricao(null);
    }

    if (!valid) return;

    if (moduloToEdit) {
      await updateModulo.mutateAsync({
        id: moduloToEdit.id,
        treinamento_id: treinamentoId,
        titulo: trimmedTitulo,
        descricao: descricao.trim() || null,
      });
    } else {
      await createModulo.mutateAsync({
        treinamento_id: treinamentoId,
        titulo: trimmedTitulo,
        descricao: descricao.trim() || null,
        ordem: proximaOrdem,
      });
    }

    onOpenChange(false);
  };

  const isPending = createModulo.isPending || updateModulo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{moduloToEdit ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
            <DialogDescription>
              {moduloToEdit
                ? "Altere o título e a descrição deste módulo."
                : "Crie um novo módulo para agrupar as aulas do treinamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modulo-titulo">
                Título do Módulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modulo-titulo"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  if (erroTitulo) setErroTitulo(null);
                }}
                placeholder="Ex.: Módulo 1 — Fundamentos e Legislação"
                maxLength={120}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {erroTitulo ? (
                  <span className="text-destructive font-medium">{erroTitulo}</span>
                ) : (
                  <span>Mínimo 3 caracteres</span>
                )}
                <span>{titulo.length}/120</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modulo-descricao">Descrição (opcional)</Label>
              <Textarea
                id="modulo-descricao"
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (erroDescricao) setErroDescricao(null);
                }}
                placeholder="Breve descrição dos objetivos deste módulo..."
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {erroDescricao ? (
                  <span className="text-destructive font-medium">{erroDescricao}</span>
                ) : (
                  <span />
                )}
                <span>{descricao.length}/2000</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {moduloToEdit ? "Salvar alterações" : "Criar módulo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
