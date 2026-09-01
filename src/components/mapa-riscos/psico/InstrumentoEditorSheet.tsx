import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  useInstrumentoCompleto,
  useInstrumentoMutations,
  type PsicoDimensao,
  type PsicoPergunta,
  type TipoDimensao,
} from '@/hooks/usePsicoAvaliacoes';

interface Props {
  instrumentoId: string | null;
  onClose: () => void;
}

interface PerguntaForm {
  id?: string | null;
  dimensao_id: string;
  texto: string;
  tipo_escala: string;
  inverter: boolean;
}

function PerguntaRow({
  pergunta,
  bloqueado,
  onEdit,
  onDelete,
}: {
  pergunta: PsicoPergunta;
  bloqueado: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pergunta.id,
    disabled: bloqueado,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-2 rounded-lg border bg-card p-3 ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      {!bloqueado && (
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label="Reordenar pergunta"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm">{pergunta.texto_pergunta}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{pergunta.tipo_escala}</span>
          {pergunta.inverter_pontuacao && <Badge variant="outline">Pontuação invertida</Badge>}
        </div>
      </div>
      {!bloqueado && (
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function InstrumentoEditorSheet({ instrumentoId, onClose }: Props) {
  const { data: instrumento, isLoading } = useInstrumentoCompleto(instrumentoId);
  const {
    salvarDimensao,
    excluirDimensao,
    salvarPergunta,
    excluirPergunta,
    reordenarPerguntas,
  } = useInstrumentoMutations();

  const bloqueado = !instrumento?.editavel || !!instrumento?.em_uso;

  const [dimensaoForm, setDimensaoForm] = useState<{
    open: boolean;
    id?: string | null;
    nome: string;
    tipo: TipoDimensao;
    descricao: string;
  }>({ open: false, id: null, nome: '', tipo: 'negativa', descricao: '' });

  const [perguntaForm, setPerguntaForm] = useState<(PerguntaForm & { open: boolean }) | null>(null);
  const [ordens, setOrdens] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!instrumento) return;
    const mapa: Record<string, string[]> = {};
    instrumento.dimensoes.forEach((d) => {
      mapa[d.id] = d.perguntas.map((p) => p.id);
    });
    setOrdens(mapa);
  }, [instrumento]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const perguntasOrdenadas = (d: PsicoDimensao): PsicoPergunta[] => {
    const ordem = ordens[d.id];
    if (!ordem) return d.perguntas;
    const porId = new Map(d.perguntas.map((p) => [p.id, p]));
    return ordem.map((id) => porId.get(id)).filter(Boolean) as PsicoPergunta[];
  };

  const handleDragEnd = (dimensaoId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !instrumentoId) return;
    const atual = ordens[dimensaoId] ?? [];
    const oldIndex = atual.indexOf(String(active.id));
    const newIndex = atual.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nova = arrayMove(atual, oldIndex, newIndex);
    setOrdens((prev) => ({ ...prev, [dimensaoId]: nova }));
    reordenarPerguntas.mutate({ instrumento_id: instrumentoId, ids: nova });
  };

  const submitDimensao = () => {
    if (!instrumentoId || !dimensaoForm.nome.trim()) return;
    salvarDimensao.mutate({
      id: dimensaoForm.id ?? null,
      instrumento_id: instrumentoId,
      nome: dimensaoForm.nome.trim(),
      tipo_dimensao: dimensaoForm.tipo,
      descricao: dimensaoForm.descricao.trim() || null,
    });
    setDimensaoForm({ open: false, id: null, nome: '', tipo: 'negativa', descricao: '' });
  };

  const submitPergunta = () => {
    if (!instrumentoId || !perguntaForm?.texto.trim()) return;
    salvarPergunta.mutate({
      id: perguntaForm.id ?? null,
      instrumento_id: instrumentoId,
      dimensao_id: perguntaForm.dimensao_id,
      texto: perguntaForm.texto.trim(),
      tipo_escala: perguntaForm.tipo_escala,
      inverter: perguntaForm.inverter,
    });
    setPerguntaForm(null);
  };

  return (
    <Sheet open={!!instrumentoId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-2">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {instrumento?.nome ?? 'Instrumento'}
            {bloqueado && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" /> Somente leitura
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {bloqueado
              ? 'Modelo padrão ou instrumento em uso: duplique-o para poder editar.'
              : 'Organize as dimensões e arraste as perguntas para reordenar.'}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        )}

        {instrumento && (
          <div className="mt-6 space-y-4">
            {!bloqueado && (
              <Button
                variant="outline"
                onClick={() =>
                  setDimensaoForm({
                    open: true,
                    id: null,
                    nome: '',
                    tipo: 'negativa',
                    descricao: '',
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Nova dimensão
              </Button>
            )}

            <Accordion type="multiple" className="space-y-2">
              {instrumento.dimensoes.map((d) => (
                <AccordionItem key={d.id} value={d.id} className="rounded-xl border px-3">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                      <span className="font-medium">{d.nome}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.tipo_dimensao === 'positiva' ? 'secondary' : 'outline'}>
                          {d.tipo_dimensao === 'positiva' ? 'Positiva' : 'Negativa'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {d.perguntas.length} perguntas
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    {d.descricao && (
                      <p className="text-sm text-muted-foreground">{d.descricao}</p>
                    )}

                    {!bloqueado && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPerguntaForm({
                              open: true,
                              dimensao_id: d.id,
                              texto: '',
                              tipo_escala: 'likert_5',
                              inverter: false,
                            })
                          }
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" /> Pergunta
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDimensaoForm({
                              open: true,
                              id: d.id,
                              nome: d.nome,
                              tipo: d.tipo_dimensao,
                              descricao: d.descricao ?? '',
                            })
                          }
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Editar dimensão
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            instrumentoId &&
                            excluirDimensao.mutate({ id: d.id, instrumento_id: instrumentoId })
                          }
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir dimensão
                        </Button>
                      </div>
                    )}

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(d.id)}
                    >
                      <SortableContext
                        items={perguntasOrdenadas(d).map((p) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {perguntasOrdenadas(d).map((p) => (
                            <PerguntaRow
                              key={p.id}
                              pergunta={p}
                              bloqueado={bloqueado}
                              onEdit={() =>
                                setPerguntaForm({
                                  open: true,
                                  id: p.id,
                                  dimensao_id: d.id,
                                  texto: p.texto_pergunta,
                                  tipo_escala: p.tipo_escala,
                                  inverter: p.inverter_pontuacao,
                                })
                              }
                              onDelete={() =>
                                instrumentoId &&
                                excluirPergunta.mutate({
                                  id: p.id,
                                  instrumento_id: instrumentoId,
                                })
                              }
                            />
                          ))}
                          {d.perguntas.length === 0 && (
                            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                              Nenhuma pergunta nesta dimensão.
                            </p>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {instrumento.dimensoes.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este instrumento ainda não possui dimensões.
              </p>
            )}
          </div>
        )}

        <Dialog
          open={dimensaoForm.open}
          onOpenChange={(o) => setDimensaoForm((f) => ({ ...f, open: o }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dimensaoForm.id ? 'Editar dimensão' : 'Nova dimensão'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={dimensaoForm.nome}
                  onChange={(e) => setDimensaoForm({ ...dimensaoForm, nome: e.target.value })}
                  placeholder="Ex.: Carga e ritmo de trabalho"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={dimensaoForm.tipo}
                  onValueChange={(v) =>
                    setDimensaoForm({ ...dimensaoForm, tipo: v as TipoDimensao })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negativa">Negativa (quanto maior, pior)</SelectItem>
                    <SelectItem value="positiva">Positiva (quanto maior, melhor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={dimensaoForm.descricao}
                  onChange={(e) => setDimensaoForm({ ...dimensaoForm, descricao: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDimensaoForm((f) => ({ ...f, open: false }))}
              >
                Cancelar
              </Button>
              <Button onClick={submitDimensao} disabled={!dimensaoForm.nome.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!perguntaForm?.open} onOpenChange={(o) => !o && setPerguntaForm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{perguntaForm?.id ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
            </DialogHeader>
            {perguntaForm && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enunciado</Label>
                  <Textarea
                    rows={3}
                    value={perguntaForm.texto}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, texto: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Escala</Label>
                  <Select
                    value={perguntaForm.tipo_escala}
                    onValueChange={(v) => setPerguntaForm({ ...perguntaForm, tipo_escala: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="likert_5">Likert 1 a 5</SelectItem>
                      <SelectItem value="likert_4">Likert 1 a 4</SelectItem>
                      <SelectItem value="frequencia_5">Frequência (Nunca a Sempre)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Inverter pontuação</p>
                    <p className="text-xs text-muted-foreground">
                      Use quando a resposta alta indicar situação favorável em dimensão negativa.
                    </p>
                  </div>
                  <Switch
                    checked={perguntaForm.inverter}
                    onCheckedChange={(v) => setPerguntaForm({ ...perguntaForm, inverter: v })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPerguntaForm(null)}>
                Cancelar
              </Button>
              <Button onClick={submitPergunta} disabled={!perguntaForm?.texto.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
