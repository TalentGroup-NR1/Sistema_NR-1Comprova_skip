import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTiposAbono, useAbonos } from "@/hooks/usePontoAbonos";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useCompanies } from "@/hooks/useCompanies";
import { Paperclip, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Modalidade = "dia" | "horas";
type Modo = "individual" | "lote";
type Escopo = "empresa" | "empresa_cliente" | "departamento" | "manual";

export function LancarAbonoDialog({ open, onOpenChange }: Props) {
  const { tipos } = useTiposAbono();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: companies = [] } = useCompanies();
  const { create, createBatch } = useAbonos();

  const [modo, setModo] = useState<Modo>("individual");
  const [colaboradorId, setColaboradorId] = useState("");
  const [escopo, setEscopo] = useState<Escopo>("departamento");
  const [empresaFilter, setEmpresaFilter] = useState<string>("");
  const [empresaClienteFilter, setEmpresaClienteFilter] = useState<string>("");
  const [deptoFilter, setDeptoFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [tipoId, setTipoId] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("dia");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setModo("individual");
      setColaboradorId(""); setTipoId(""); setModalidade("dia");
      setDataInicio(""); setDataFim(""); setHoraInicio(""); setHoraFim("");
      setJustificativa(""); setAnexo(null);
      setEscopo("departamento"); setEmpresaFilter(""); setEmpresaClienteFilter(""); setDeptoFilter("");
      setSearch(""); setSelectedIds(new Set());
    }
  }, [open]);

  const tipoSel = tipos.find((t) => t.id === tipoId);
  const colaboradoresAtivos = useMemo(
    () => (colaboradores as any[]).filter((c) => c.status === "ATIVO"),
    [colaboradores]
  );

  const empresasDisponiveis = useMemo(() => {
    const ids = new Set(colaboradoresAtivos.map((c) => c.company_id).filter(Boolean));
    return (companies as any[]).filter((e) => ids.has(e.id));
  }, [colaboradoresAtivos, companies]);

  const departamentosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    colaboradoresAtivos.forEach((c) => { if (c.department) set.add(c.department); });
    return Array.from(set).sort();
  }, [colaboradoresAtivos]);

  const empresasClientesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    colaboradoresAtivos.forEach((c) => { if (c.empresa_cliente) set.add(c.empresa_cliente); });
    return Array.from(set).sort();
  }, [colaboradoresAtivos]);

  // Lista pré-filtrada pelo escopo
  const listaEscopo = useMemo(() => {
    let base = colaboradoresAtivos;
    if (escopo === "empresa" && empresaFilter) {
      base = base.filter((c) => c.company_id === empresaFilter);
    } else if (escopo === "empresa_cliente" && empresaClienteFilter) {
      base = base.filter((c) => c.empresa_cliente === empresaClienteFilter);
    } else if (escopo === "departamento" && deptoFilter) {
      base = base.filter((c) => c.department === deptoFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((c) => (c.full_name || "").toLowerCase().includes(q));
    }
    return base;
  }, [colaboradoresAtivos, escopo, empresaFilter, empresaClienteFilter, deptoFilter, search]);

  // Marcar todos ao mudar filtro
  useEffect(() => {
    if (modo !== "lote") return;
    setSelectedIds(new Set(listaEscopo.map((c: any) => c.id)));
  }, [modo, escopo, empresaFilter, empresaClienteFilter, deptoFilter, listaEscopo.length]); // eslint-disable-line

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const marcarTodos = () => setSelectedIds(new Set(listaEscopo.map((c: any) => c.id)));
  const limparTodos = () => setSelectedIds(new Set());

  const minutosAbono = useMemo(() => {
    if (modalidade !== "horas" || !horaInicio || !horaFim) return 0;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }, [modalidade, horaInicio, horaFim]);

  const duracaoLabel = useMemo(() => {
    if (minutosAbono <= 0) return "";
    const h = Math.floor(minutosAbono / 60);
    const m = minutosAbono % 60;
    return `${h}h ${m.toString().padStart(2, "0")}min`;
  }, [minutosAbono]);

  const validarComuns = () => {
    if (!tipoId || !justificativa.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }
    if (modalidade === "dia") {
      if (!dataInicio || !dataFim) { toast.error("Informe as datas"); return false; }
      if (dataFim < dataInicio) { toast.error("Data fim deve ser maior ou igual à data início"); return false; }
    } else {
      if (!dataInicio || !horaInicio || !horaFim) { toast.error("Informe data, hora início e hora fim"); return false; }
      if (minutosAbono <= 0) { toast.error("Hora fim deve ser maior que hora início"); return false; }
    }
    if (tipoSel?.exige_anexo && !anexo) { toast.error("Este tipo de abono exige anexo"); return false; }
    return true;
  };

  const submit = async () => {
    if (modo === "individual") {
      if (!colaboradorId) { toast.error("Selecione o colaborador"); return; }
      if (!validarComuns()) return;
      await create.mutateAsync({
        colaborador_id: colaboradorId,
        tipo_abono_id: tipoId,
        modalidade,
        data_inicio: dataInicio,
        data_fim: modalidade === "horas" ? dataInicio : dataFim,
        hora_inicio: modalidade === "horas" ? horaInicio : null,
        hora_fim: modalidade === "horas" ? horaFim : null,
        minutos_abonados: modalidade === "horas" ? minutosAbono : null,
        justificativa: justificativa.trim(),
        anexo_file: anexo,
      });
    } else {
      const ids = Array.from(selectedIds);
      if (!ids.length) { toast.error("Selecione ao menos um colaborador"); return; }
      if (!validarComuns()) return;
      await createBatch.mutateAsync({
        colaborador_ids: ids,
        tipo_abono_id: tipoId,
        modalidade,
        data_inicio: dataInicio,
        data_fim: modalidade === "horas" ? dataInicio : dataFim,
        hora_inicio: modalidade === "horas" ? horaInicio : null,
        hora_fim: modalidade === "horas" ? horaFim : null,
        minutos_abonados: modalidade === "horas" ? minutosAbono : null,
        justificativa: justificativa.trim(),
        anexo_file: anexo,
      });
    }
    onOpenChange(false);
  };

  const pending = create.isPending || createBatch.isPending;
  const mostrarEmpresa = empresasDisponiveis.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lançar Abono de Ausência</DialogTitle>
          <DialogDescription>
            Justifique a ausência (atestado, licença CLT etc.) para zerar o saldo do dia.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="lote">Em lote</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-1.5 mt-4">
            <Label>Colaborador *</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {colaboradoresAtivos.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} {c.department ? `— ${c.department}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="lote" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label>Escopo *</Label>
              <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as Escopo)} className="flex flex-wrap gap-4">
                {mostrarEmpresa && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="empresa" id="esc-emp" />
                    <Label htmlFor="esc-emp" className="font-normal cursor-pointer">Por empresa</Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="departamento" id="esc-dep" />
                  <Label htmlFor="esc-dep" className="font-normal cursor-pointer">Por departamento</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="empresa_cliente" id="esc-cli" />
                  <Label htmlFor="esc-cli" className="font-normal cursor-pointer">Por empresa cliente</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="manual" id="esc-man" />
                  <Label htmlFor="esc-man" className="font-normal cursor-pointer">Manual</Label>
                </div>
              </RadioGroup>
            </div>

            {escopo === "empresa" && (
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select
                  value={empresaFilter || "__all__"}
                  onValueChange={(v) => setEmpresaFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as empresas</SelectItem>
                    {empresasDisponiveis.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {escopo === "departamento" && (
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select
                  value={deptoFilter || "__all__"}
                  onValueChange={(v) => setDeptoFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os departamentos</SelectItem>
                    {departamentosDisponiveis.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {escopo === "empresa_cliente" && (
              <div className="space-y-1.5">
                <Label>Empresa Cliente</Label>
                {empresasClientesDisponiveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum colaborador ativo com empresa cliente definida.</p>
                ) : (
                  <Select
                    value={empresaClienteFilter || "__all__"}
                    onValueChange={(v) => setEmpresaClienteFilter(v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as empresas cliente</SelectItem>
                      {empresasClientesDisponiveis.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Colaboradores <Badge variant="secondary" className="ml-2">{selectedIds.size} de {listaEscopo.length}</Badge></Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={marcarTodos}>Selecionar todos</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={limparTodos}>Limpar</Button>
                </div>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por nome…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-56 rounded-md border p-2">
                {listaEscopo.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum colaborador no filtro atual.</p>
                ) : (
                  <div className="space-y-1">
                    {listaEscopo.map((c: any) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => toggleOne(c.id)}
                        />
                        <span className="text-sm flex-1">{c.full_name}</span>
                        {c.department && (
                          <span className="text-xs text-muted-foreground">{c.department}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label>Tipo de Abono *</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tipos.filter((t) => t.ativo).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tipoSel?.base_legal && (
              <p className="text-xs text-muted-foreground">{tipoSel.base_legal}{tipoSel.dias_maximos_sugeridos ? ` — até ${tipoSel.dias_maximos_sugeridos} dias` : ""}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Modalidade *</Label>
            <RadioGroup value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="dia" id="mod-dia" />
                <Label htmlFor="mod-dia" className="font-normal cursor-pointer">Dia(s) inteiro(s)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="horas" id="mod-horas" />
                <Label htmlFor="mod-horas" className="font-normal cursor-pointer">Horas parciais</Label>
              </div>
            </RadioGroup>
          </div>

          {modalidade === "dia" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Início *</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim *</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Hora Início *</Label>
                  <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Fim *</Label>
                  <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                </div>
              </div>
              {duracaoLabel && (
                <p className="text-xs text-muted-foreground">Total a abonar: <span className="font-medium">{duracaoLabel}</span></p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Justificativa *</Label>
            <Textarea rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex.: Consulta médica" />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexo {tipoSel?.exige_anexo ? "(obrigatório)" : "(opcional)"}
              {modo === "lote" && anexo && (
                <span className="text-xs text-muted-foreground font-normal">— será aplicado a todos</span>
              )}
            </Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAnexo(e.target.files?.[0] || null)}
            />
            {anexo && <p className="text-xs text-muted-foreground">{anexo.name}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending
              ? "Salvando..."
              : modo === "lote"
                ? `Lançar para ${selectedIds.size} colaborador${selectedIds.size !== 1 ? "es" : ""}`
                : "Lançar Abono"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
