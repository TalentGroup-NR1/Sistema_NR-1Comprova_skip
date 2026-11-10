import { useState } from "react";
import { Plus, Trash2, Edit2, Palette } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategoriasPlataforma,
  useCreateCategoriaPlataforma,
  useUpdateCategoriaPlataforma,
  useDeleteCategoriaPlataforma,
  CategoriaPlataforma,
} from "@/hooks/useCatalogoGlobal";

interface CategoriasPlataformaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#10b981", // verde (saúde/bem-estar)
  "#f59e0b", // âmbar (assédio/atenção)
  "#ef4444", // vermelho (segurança/urgente)
  "#6366f1", // azul/índigo (liderança/geral)
  "#8b5cf6", // roxo (cultura)
  "#06b6d4", // ciano (inovação)
];

export function CategoriasPlataformaManager({ open, onOpenChange }: CategoriasPlataformaManagerProps) {
  const { data: categorias, isLoading } = useCategoriasPlataforma();
  const createCategoria = useCreateCategoriaPlataforma();
  const updateCategoria = useUpdateCategoriaPlataforma();
  const deleteCategoria = useDeleteCategoriaPlataforma();

  const [editingCategoria, setEditingCategoria] = useState<CategoriaPlataforma | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#6366f1");

  const resetForm = () => {
    setEditingCategoria(null);
    setNome("");
    setDescricao("");
    setCor("#6366f1");
  };

  const handleEdit = (cat: CategoriaPlataforma) => {
    setEditingCategoria(cat);
    setNome(cat.nome);
    setDescricao(cat.descricao || "");
    setCor(cat.cor || "#6366f1");
  };

  const handleSave = async () => {
    if (!nome.trim()) return;

    if (editingCategoria) {
      await updateCategoria.mutateAsync({
        id: editingCategoria.id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        cor,
      });
    } else {
      await createCategoria.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        cor,
        ordem: (categorias?.length || 0) + 1,
      });
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover esta categoria da plataforma?")) {
      await deleteCategoria.mutateAsync(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Categorias da Plataforma (Catálogo Global)</DialogTitle>
          <DialogDescription>
            Defina as categorias oficiais da Talent Group / NR-1 Comprova para organizar os treinamentos globais.
          </DialogDescription>
        </DialogHeader>

        {/* Formulário de Adicionar / Editar */}
        <div className="space-y-4 border rounded-lg p-4 bg-muted/40">
          <h4 className="font-medium text-sm">
            {editingCategoria ? "Editar Categoria da Plataforma" : "Nova Categoria da Plataforma"}
          </h4>

          <div className="space-y-2">
            <Label htmlFor="cat-nome">Nome da Categoria *</Label>
            <Input
              id="cat-nome"
              placeholder="Ex: Saúde Mental, Assédio, Liderança"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-desc">Descrição</Label>
            <Textarea
              id="cat-desc"
              placeholder="Finalidade pedagógica desta categoria na plataforma..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de Destaque</Label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full transition-transform ${
                    cor === c ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setCor(c)}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-8 h-8 p-0 border-none cursor-pointer rounded"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingCategoria && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!nome.trim() || createCategoria.isPending || updateCategoria.isPending}
            >
              {editingCategoria ? "Salvar Alterações" : "Adicionar Categoria"}
            </Button>
          </div>
        </div>

        {/* Lista de Categorias Existentes */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <h4 className="font-medium text-sm text-muted-foreground">
            Categorias Ativas ({categorias?.length || 0})
          </h4>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : categorias && categorias.length > 0 ? (
            categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.cor || "#6366f1" }}
                  />
                  <div>
                    <p className="font-medium text-sm">{cat.nome}</p>
                    {cat.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{cat.descricao}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(cat)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma categoria global cadastrada ainda.
            </p>
          )}
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

