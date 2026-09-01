import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useDimensoesQuestionario,
  useCreateDimensao,
  useUpdateDimensao,
  useDeleteDimensao,
  useReorderDimensoes,
  DimensaoQuestionario,
} from "@/hooks/useDimensoesCuidarPlus";

interface DimensoesManagerProps {
  questionarioId: string;
  perguntasPorDimensao?: Map<string, number>;
}

interface EditingDimensao {
  id: string | null;
  codigo: string;
  titulo: string;
  descricao: string;
}

export function DimensoesManager({ questionarioId, perguntasPorDimensao }: DimensoesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<EditingDimensao | null>(null);
  const [newDimensao, setNewDimensao] = useState<Omit<EditingDimensao, 'id'>>({
    codigo: "",
    titulo: "",
    descricao: "",
  });

  const { data: dimensoes = [], isLoading } = useDimensoesQuestionario(questionarioId);
  const createDimensao = useCreateDimensao();
  const updateDimensao = useUpdateDimensao();
  const deleteDimensao = useDeleteDimensao();
  const reorderDimensoes = useReorderDimensoes();

  const getNextCode = () => {
    if (dimensoes.length === 0) return "A";
    const lastCode = dimensoes[dimensoes.length - 1]?.codigo || "";
    if (/^[A-Z]$/.test(lastCode)) {
      return String.fromCharCode(lastCode.charCodeAt(0) + 1);
    }
    return String(dimensoes.length + 1);
  };

  const handleAddDimensao = async () => {
    if (!newDimensao.codigo.trim() || !newDimensao.titulo.trim()) {
      toast.error("Código e título são obrigatórios");
      return;
    }

    try {
      await createDimensao.mutateAsync({
        questionario_id: questionarioId,
        codigo: newDimensao.codigo.trim().toUpperCase(),
        titulo: newDimensao.titulo.trim(),
        descricao: newDimensao.descricao.trim() || null,
        order_index: dimensoes.length,
      });
      setNewDimensao({ codigo: "", titulo: "", descricao: "" });
      setIsAdding(false);
      toast.success("Dimensão adicionada");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateDimensao = async () => {
    if (!editing?.id) return;
    if (!editing.codigo.trim() || !editing.titulo.trim()) {
      toast.error("Código e título são obrigatórios");
      return;
    }

    try {
      await updateDimensao.mutateAsync({
        id: editing.id,
        questionario_id: questionarioId,
        codigo: editing.codigo.trim().toUpperCase(),
        titulo: editing.titulo.trim(),
        descricao: editing.descricao.trim() || null,
      });
      setEditing(null);
      toast.success("Dimensão atualizada");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteDimensao = async (id: string) => {
    const count = perguntasPorDimensao?.get(id) || 0;
    if (count > 0) {
      toast.error(`Esta dimensão possui ${count} pergunta(s) associada(s). Remova-as primeiro.`);
      return;
    }

    try {
      await deleteDimensao.mutateAsync({ id, questionario_id: questionarioId });
      toast.success("Dimensão removida");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === dimensoes.length - 1)
    ) {
      return;
    }

    const newDimensoes = [...dimensoes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newDimensoes[index], newDimensoes[targetIndex]] = [newDimensoes[targetIndex], newDimensoes[index]];

    const updates = newDimensoes.map((d, i) => ({ id: d.id, order_index: i }));

    try {
      await reorderDimensoes.mutateAsync({ questionario_id: questionarioId, dimensoes: updates });
    } catch (error) {
      // Error handled in hook
    }
  };

  const startEditing = (dimensao: DimensaoQuestionario) => {
    setEditing({
      id: dimensao.id,
      codigo: dimensao.codigo,
      titulo: dimensao.titulo,
      descricao: dimensao.descricao || "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Dimensões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Dimensões ({dimensoes.length})
          </CardTitle>
          {!isAdding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewDimensao({ codigo: getNextCode(), titulo: "", descricao: "" });
                setIsAdding(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dimensoes.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma dimensão definida. Adicione dimensões para classificar as perguntas.
          </p>
        )}

        {dimensoes.map((dimensao, index) => {
          const isEditing = editing?.id === dimensao.id;
          const count = perguntasPorDimensao?.get(dimensao.id) || 0;

          return (
            <div
              key={dimensao.id}
              className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex flex-col gap-1 pt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === dimensoes.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {isEditing ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editing.codigo}
                      onChange={(e) => setEditing({ ...editing, codigo: e.target.value })}
                      placeholder="Código"
                      className="w-20"
                      maxLength={10}
                    />
                    <Input
                      value={editing.titulo}
                      onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                      placeholder="Título da dimensão"
                      className="flex-1"
                    />
                  </div>
                  <Textarea
                    value={editing.descricao}
                    onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                    placeholder="Descrição (opcional)"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateDimensao}>
                      <Check className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {dimensao.codigo}
                    </Badge>
                    <span className="font-medium">{dimensao.titulo}</span>
                    {count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {count} pergunta{count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {dimensao.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{dimensao.descricao}</p>
                  )}
                </div>
              )}

              {!isEditing && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEditing(dimensao)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDimensao(dimensao.id)}
                    disabled={count > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Form para adicionar nova dimensão */}
        {isAdding && (
          <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg space-y-2">
            <div className="flex gap-2">
              <Input
                value={newDimensao.codigo}
                onChange={(e) => setNewDimensao({ ...newDimensao, codigo: e.target.value })}
                placeholder="Código"
                className="w-20"
                maxLength={10}
              />
              <Input
                value={newDimensao.titulo}
                onChange={(e) => setNewDimensao({ ...newDimensao, titulo: e.target.value })}
                placeholder="Título da dimensão"
                className="flex-1"
              />
            </div>
            <Textarea
              value={newDimensao.descricao}
              onChange={(e) => setNewDimensao({ ...newDimensao, descricao: e.target.value })}
              placeholder="Descrição (opcional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddDimensao}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
