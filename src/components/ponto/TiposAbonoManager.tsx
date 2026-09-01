import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTiposAbono, type TipoAbono } from "@/hooks/usePontoAbonos";

const CATEGORIAS: { value: NonNullable<TipoAbono["categoria"]>; label: string }[] = [
  { value: "falta_injustificada", label: "Falta injustificada" },
  { value: "atestado_medico", label: "Atestado médico" },
  { value: "atraso", label: "Atraso" },
  { value: "saida_antecipada", label: "Saída antecipada" },
  { value: "folga", label: "Folga" },
  { value: "ferias", label: "Férias" },
  { value: "outros", label: "Outros" },
];

export function TiposAbonoManager() {
  const { tipos, isLoading, upsert, remove } = useTiposAbono();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<TipoAbono> | null>(null);

  const openNew = () =>
    setEditing({ codigo: "", nome: "", dias_maximos_sugeridos: null, base_legal: "", exige_anexo: false, abona_horas: true, ativo: true, categoria: "outros" });

  const save = async () => {
    if (!editing?.nome || !editing?.codigo) return;
    await upsert.mutateAsync(editing as any);
    setEditing(null);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Tipos de Abono</CardTitle>
          <CardDescription>
            Catálogo de motivos de ausência justificada (atestado, licenças CLT, etc.) usados para abonar dias sem registro de ponto.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => { openNew(); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Tipo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tipos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dias Máx.</TableHead>
                  <TableHead>Base Legal</TableHead>
                  <TableHead>Anexo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.codigo}</TableCell>
                    <TableCell className="text-xs">
                      {CATEGORIAS.find(c => c.value === t.categoria)?.label || "Outros"}
                    </TableCell>
                    <TableCell>{t.dias_maximos_sugeridos ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{t.base_legal || "—"}</TableCell>
                    <TableCell>{t.exige_anexo ? "Obrigatório" : "Opcional"}</TableCell>
                    <TableCell>
                      <Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Remover este tipo? Abonos já lançados não serão afetados.")) remove.mutate(t.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Tipo" : "Novo Tipo de Abono"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Código *</Label>
                  <Input value={editing.codigo || ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase().replace(/\s/g, "_") })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dias Máx. Sugeridos</Label>
                  <Input
                    type="number"
                    value={editing.dias_maximos_sugeridos ?? ""}
                    onChange={(e) => setEditing({ ...editing, dias_maximos_sugeridos: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Base Legal</Label>
                  <Input value={editing.base_legal || ""} onChange={(e) => setEditing({ ...editing, base_legal: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria (para relatórios)</Label>
                <Select
                  value={editing.categoria || "outros"}
                  onValueChange={(v) => setEditing({ ...editing, categoria: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usada no relatório executivo para calcular o índice de absenteísmo. Só entram no IA: falta injustificada, atraso e saída antecipada. Atestado é acompanhado nos alertas NR1.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Exige anexo</Label>
                <Switch checked={!!editing.exige_anexo} onCheckedChange={(v) => setEditing({ ...editing, exige_anexo: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Abona horas (zera saldo do dia)</Label>
                <Switch checked={editing.abona_horas !== false} onCheckedChange={(v) => setEditing({ ...editing, abona_horas: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={editing.ativo !== false} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
