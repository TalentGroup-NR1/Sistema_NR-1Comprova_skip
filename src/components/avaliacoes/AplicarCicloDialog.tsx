import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Loader2 } from "lucide-react";
import { useColaboradoresParaAvaliacao, useColaboradoresComoGestores, useAvaliacaoMutations, ColaboradorParaAvaliacao } from "@/hooks/useAvaliacoesAplicadas";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

interface AplicarCicloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId: string;
  cicloNome: string;
}

interface ColaboradorSelection {
  colaboradorId: string;
  gestorId: string;
  selected: boolean;
}

export function AplicarCicloDialog({ open, onOpenChange, cicloId, cicloNome }: AplicarCicloDialogProps) {
  const companyId = useEffectiveCompanyId();
  const { data: colaboradores, isLoading: loadingColabs } = useColaboradoresParaAvaliacao(cicloId, companyId);
  const { data: gestores, isLoading: loadingGestores } = useColaboradoresComoGestores(companyId);
  const { aplicarCiclo } = useAvaliacaoMutations();

  const [selections, setSelections] = useState<ColaboradorSelection[]>([]);
  const [prazoAuto, setPrazoAuto] = useState("");
  const [prazoGestor, setPrazoGestor] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (colaboradores && gestores) {
      setSelections(colaboradores.map(c => {
        let gestorIdSugerido = "";
        
        // Prioridade 1: usar gestor_id se existir
        if (c.gestor_id) {
          const gestorExiste = gestores.find(g => g.id === c.gestor_id);
          if (gestorExiste) {
            gestorIdSugerido = c.gestor_id;
          }
        }
        
        // Prioridade 2: fallback para manager_name (correspondência por nome)
        if (!gestorIdSugerido && c.manager_name) {
          const gestorEncontrado = gestores.find(
            g => g.full_name.toLowerCase() === c.manager_name?.toLowerCase() && g.id !== c.id
          );
          if (gestorEncontrado) {
            gestorIdSugerido = gestorEncontrado.id;
          }
        }
        
        return {
          colaboradorId: c.id,
          gestorId: gestorIdSugerido,
          selected: false,
        };
      }));
    }
  }, [colaboradores, gestores]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelections(prev => prev.map(s => ({ ...s, selected: checked })));
  };

  const handleSelectOne = (colaboradorId: string, checked: boolean) => {
    setSelections(prev => prev.map(s => 
      s.colaboradorId === colaboradorId ? { ...s, selected: checked } : s
    ));
  };

  const handleGestorChange = (colaboradorId: string, gestorId: string) => {
    setSelections(prev => prev.map(s => 
      s.colaboradorId === colaboradorId ? { ...s, gestorId } : s
    ));
  };

  const selectedCount = selections.filter(s => s.selected).length;
  const selectedWithoutGestor = selections.filter(s => s.selected && !s.gestorId).length;
  const allHaveGestor = selectedWithoutGestor === 0;
  const canSubmit = selectedCount > 0 && allHaveGestor;
  
  // Obter gestores disponíveis para um colaborador (excluindo ele mesmo)
  const getGestoresDisponiveis = (colaboradorId: string) => {
    return gestores?.filter(g => g.id !== colaboradorId) || [];
  };

  const handleSubmit = () => {
    const selecionados = selections.filter(s => s.selected);
    
    aplicarCiclo.mutate({
      cicloId,
      colaboradores: selecionados.map(s => ({
        colaboradorId: s.colaboradorId,
        gestorId: s.gestorId,
      })),
      prazoAutoavaliacao: prazoAuto || null,
      prazoAvaliacaoGestor: prazoGestor || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const getColaboradorById = (id: string): ColaboradorParaAvaliacao | undefined => {
    return colaboradores?.find(c => c.id === id);
  };

  const isLoading = loadingColabs || loadingGestores;

  // Lista de colaboradores sem gestor definido
  const colaboradoresSemGestor = selections
    .filter(s => s.selected && !s.gestorId)
    .map(s => getColaboradorById(s.colaboradorId)?.full_name)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aplicar Ciclo: {cicloNome}
          </DialogTitle>
          <DialogDescription>
            Selecione os colaboradores para gerar as avaliações e defina os gestores responsáveis.
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !colaboradores || colaboradores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Todos os colaboradores ativos já foram incluídos neste ciclo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Prazos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo-auto">Prazo Autoavaliação (opcional)</Label>
                  <Input
                    id="prazo-auto"
                    type="date"
                    value={prazoAuto}
                    onChange={(e) => setPrazoAuto(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazo-gestor">Prazo Avaliação Gestor (opcional)</Label>
                  <Input
                    id="prazo-gestor"
                    type="date"
                    value={prazoGestor}
                    onChange={(e) => setPrazoGestor(e.target.value)}
                  />
                </div>
              </div>

              {/* Tabela de Colaboradores */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="w-64">Gestor Avaliador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selections.map((sel) => {
                      const colab = getColaboradorById(sel.colaboradorId);
                      if (!colab) return null;

                      return (
                        <TableRow key={sel.colaboradorId}>
                          <TableCell>
                            <Checkbox
                              checked={sel.selected}
                              onCheckedChange={(checked) => handleSelectOne(sel.colaboradorId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{colab.full_name}</TableCell>
                          <TableCell>{colab.department}</TableCell>
                          <TableCell>{colab.job_title}</TableCell>
                          <TableCell>
                            {getGestoresDisponiveis(sel.colaboradorId).length === 0 ? (
                              <span className="text-sm text-muted-foreground italic">
                                Nenhum gestor disponível
                              </span>
                            ) : (
                              <Select
                                value={sel.gestorId}
                                onValueChange={(value) => handleGestorChange(sel.colaboradorId, value)}
                                disabled={!sel.selected}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecionar gestor" />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  {getGestoresDisponiveis(sel.colaboradorId).map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.full_name} - {g.job_title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="border-t bg-background px-6 py-4 mt-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {selectedCount} colaborador(es) selecionado(s)
              </p>
              {selectedCount > 0 && colaboradoresSemGestor.length > 0 && (
                <p className="text-sm text-destructive">
                  Sem gestor: {colaboradoresSemGestor.join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!canSubmit || aplicarCiclo.isPending}
              >
                {aplicarCiclo.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>Gerar {selectedCount} Avaliação(ões)</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
