import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { format, parseISO, isWithinInterval } from "date-fns";

export function CompensacaoCard() {
  const companyId = useEffectiveCompanyId();
  const { compensacoes, createCompensacao, updateCompensacao, deleteCompensacao } = usePontoCompensacoes();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    totalHoras: 0,
    diasCompensacao: 0,
    dataInicio: "",
    dataFim: "",
  });

  const minutosExtraDia = form.diasCompensacao > 0
    ? Math.floor((form.totalHoras * 60) / form.diasCompensacao)
    : 0;

  const handleCreate = () => {
    if (!companyId || !form.descricao || !form.dataInicio || !form.dataFim) return;
    createCompensacao.mutate({
      company_id: companyId,
      descricao: form.descricao,
      total_horas_compensar: form.totalHoras * 60,
      dias_compensacao: form.diasCompensacao,
      data_inicio: form.dataInicio,
      data_fim: form.dataFim,
      ativo: true,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ descricao: "", totalHoras: 0, diasCompensacao: 0, dataInicio: "", dataFim: "" });
      },
    });
  };

  const toggleAtivo = (id: string, ativo: boolean) => {
    updateCompensacao.mutate({ id, ativo });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Compensação de Pontes/Feriados</CardTitle>
            <CardDescription>
              Distribua horas de pontes ao longo de um período, aumentando a jornada diária
            </CardDescription>
          </div>
          {!showForm && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nova Compensação
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Pontes 2026"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Total a compensar (horas)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.totalHoras}
                  onChange={(e) => setForm({ ...form, totalHoras: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">{form.totalHoras * 60} minutos</p>
              </div>
              <div className="space-y-1.5">
                <Label>Dias úteis de compensação</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.diasCompensacao}
                  onChange={(e) => setForm({ ...form, diasCompensacao: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Extras por dia</Label>
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                  {minutosExtraDia} min/dia
                </div>
                <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" className="gap-1" onClick={handleCreate} disabled={createCompensacao.isPending}>
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </div>
          </div>
        )}

        {compensacoes.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Extra/dia</TableHead>
                  <TableHead className="text-center">Período</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compensacoes.map((c) => {
                  const isVigente = c.ativo && isWithinInterval(new Date(), {
                    start: parseISO(c.data_inicio),
                    end: parseISO(c.data_fim),
                  });
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.descricao}</TableCell>
                      <TableCell className="text-center">{c.total_horas_compensar / 60}h</TableCell>
                      <TableCell className="text-center">{c.dias_compensacao}</TableCell>
                      <TableCell className="text-center font-mono">{c.minutos_extras_dia ?? 0} min</TableCell>
                      <TableCell className="text-center text-sm">
                        {format(parseISO(c.data_inicio), "dd/MM/yyyy")} — {format(parseISO(c.data_fim), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={c.ativo}
                            onCheckedChange={(v) => toggleAtivo(c.id, v)}
                          />
                          {isVigente && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              Vigente
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteCompensacao.mutate(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {compensacoes.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma compensação cadastrada
          </p>
        )}
      </CardContent>
    </Card>
  );
}
