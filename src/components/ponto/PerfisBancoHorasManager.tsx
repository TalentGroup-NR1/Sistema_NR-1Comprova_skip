import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import {
  useBancoHorasPerfis,
  type BancoHorasPerfil,
} from "@/hooks/useBancoHorasPerfis";
import { getPeriodoLabel } from "@/lib/bancoHorasCiclo";

const PERIODOS = [
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "quadrimestral", label: "Quadrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

interface FormState {
  id?: string;
  nome: string;
  periodo_fechamento_banco: string;
  banco_horas_inicio: string;
  ativo: boolean;
  is_padrao: boolean;
}

const empty: FormState = {
  nome: "",
  periodo_fechamento_banco: "mensal",
  banco_horas_inicio: "",
  ativo: true,
  is_padrao: false,
};

export function PerfisBancoHorasManager() {
  const { perfis, isLoading, upsert, remove, setPadrao } = useBancoHorasPerfis();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (p: BancoHorasPerfil) => {
    setForm({
      id: p.id,
      nome: p.nome,
      periodo_fechamento_banco: p.periodo_fechamento_banco,
      banco_horas_inicio: p.banco_horas_inicio ?? "",
      ativo: p.ativo,
      is_padrao: p.is_padrao,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    await upsert.mutateAsync({
      id: form.id,
      nome: form.nome.trim(),
      periodo_fechamento_banco: form.periodo_fechamento_banco as BancoHorasPerfil["periodo_fechamento_banco"],
      banco_horas_inicio: form.banco_horas_inicio || null,
      ativo: form.ativo,
      is_padrao: form.is_padrao,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Perfis de Banco de Horas</CardTitle>
          <CardDescription>
            Crie múltiplos ciclos (mensal, bimestral, quadrimestral, etc.) e vincule
            individualmente a cada colaborador na aba de contrato. O perfil marcado
            como "padrão" é aplicado a quem não tiver escolha específica.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew} className="gap-1">
              <Plus className="h-4 w-4" /> Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar Perfil" : "Novo Perfil"} de Banco de Horas</DialogTitle>
              <DialogDescription>
                Defina o período de fechamento e a data-âncora de início do ciclo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Perfil</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Cliente X — Quadrimestral"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Período</Label>
                  <Select
                    value={form.periodo_fechamento_banco}
                    onValueChange={(v) => setForm({ ...form, periodo_fechamento_banco: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODOS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Início (âncora)</Label>
                  <Input
                    type="date"
                    value={form.banco_horas_inicio}
                    onChange={(e) => setForm({ ...form, banco_horas_inicio: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_padrao}
                    onChange={(e) => setForm({ ...form, is_padrao: e.target.checked })}
                  />
                  Definir como padrão da empresa
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : perfis.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum perfil cadastrado. Crie o primeiro perfil para começar.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Âncora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nome}
                      {p.is_padrao && (
                        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 gap-1">
                          <Star className="h-3 w-3" /> Padrão
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getPeriodoLabel(p.periodo_fechamento_banco)}</TableCell>
                    <TableCell>{p.banco_horas_inicio ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "secondary" : "outline"}
                             className={p.ativo ? "bg-emerald-100 text-emerald-700" : ""}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!p.is_padrao && (
                        <Button size="sm" variant="ghost"
                                onClick={() => setPadrao.mutate(p.id)}
                                title="Definir como padrão">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir perfil "${p.nome}"? Colaboradores vinculados voltarão para o padrão.`)) {
                            remove.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
