import { useState } from "react";
import { Plus, Trash2, GripVertical, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCategoriasTreinamento,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
  CategoriaTreinamento,
} from "@/hooks/useTreinamentos";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoriasManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriasManager({ open, onOpenChange }: CategoriasManagerProps) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: categorias, isLoading } = useCategoriasTreinamento();
  const createCategoria = useCreateCategoria();
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();

  const [editingCategoria, setEditingCategoria] = useState<CategoriaTreinamento | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#6366f1");

  const resetForm = () => {
    setEditingCategoria(null);
    setNome("");
    setDescricao("");
    setCor("#6366f1");
  };

  const handleEdit = (categoria: CategoriaTreinamento) => {
    setEditingCategoria(categoria);
    setNome(categoria.nome);
    setDescricao(categoria.descricao || "");
    setCor(categoria.cor);
  };

  const handleSave = async () => {
    if (!nome.trim() || !effectiveCompanyId) return;

    if (editingCategoria) {
      await updateCategoria.mutateAsync({
        id: editingCategoria.id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        cor,
      });
    } else {
      await createCategoria.mutateAsync({
        company_id: effectiveCompanyId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        cor,
        ordem: (categorias?.length || 0) + 1,
      });
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCategoria.mutateAsync(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Organize seus treinamentos em categorias para facilitar a navegação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>Nome da categoria</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Segurança do Trabalho"
                />
              </div>
              <div className="w-20">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="h-10 p-1"
                />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva a categoria..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              {editingCategoria && (
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                disabled={!nome.trim() || createCategoria.isPending || updateCategoria.isPending}
              >
                {editingCategoria ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : !categorias?.length ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma categoria criada ainda.
              </p>
            ) : (
              categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: categoria.cor }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{categoria.nome}</p>
                    {categoria.descricao && (
                      <p className="text-xs text-muted-foreground">{categoria.descricao}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(categoria)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(categoria.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
