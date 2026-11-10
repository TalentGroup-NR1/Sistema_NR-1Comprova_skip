import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Save, CreditCard } from "lucide-react";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useBeneficios, useColaboradorBeneficios, useBulkUpdateColaboradorBeneficios } from "@/hooks/useBeneficios";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BeneficioRow {
  beneficio_id: string;
  nome: string;
  categoria: string | null;
  ativo: boolean;
  data_inicio: string;
  valor: number | null;
  existing_id?: string;
}

export function ColaboradorBeneficiosTab() {
  const { data: colaboradores, isLoading: loadingColabs } = useColaboradores();
  const { data: beneficios, isLoading: loadingBeneficios } = useBeneficios();
  const { data: atribuicoes, isLoading: loadingAtribuicoes } = useColaboradorBeneficios();
  const bulkUpdate = useBulkUpdateColaboradorBeneficios();
  
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>("");
  const [rows, setRows] = useState<BeneficioRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const activeColaboradores = useMemo(
    () => colaboradores?.filter(c => c.status === 'ATIVO')?.sort((a, b) => a.full_name.localeCompare(b.full_name)) || [],
    [colaboradores]
  );

  const activeBeneficios = useMemo(
    () => beneficios?.filter(b => b.ativo) || [],
    [beneficios]
  );

  // Build rows when colaborador or data changes
  useEffect(() => {
    if (!selectedColaboradorId || !activeBeneficios.length) {
      setRows([]);
      return;
    }

    const colabAtribuicoes = (atribuicoes || []).filter(
      a => a.colaborador_id === selectedColaboradorId && a.status === 'ativo'
    );

    const atribuicaoMap = new Map(colabAtribuicoes.map(a => [a.beneficio_id, a]));

    const newRows: BeneficioRow[] = activeBeneficios.map(b => {
      const existing = atribuicaoMap.get(b.id);
      return {
        beneficio_id: b.id,
        nome: b.nome,
        categoria: b.categoria,
        ativo: !!existing,
        data_inicio: existing?.data_inicio || new Date().toISOString().split('T')[0],
        valor: existing?.valor ?? b.valor_mensal ?? null,
        existing_id: existing?.id,
      };
    });

    setRows(newRows);
    setHasChanges(false);
  }, [selectedColaboradorId, activeBeneficios, atribuicoes]);

  const handleToggle = (beneficioId: string) => {
    setHasChanges(true);
    setRows(prev => prev.map(r =>
      r.beneficio_id === beneficioId ? { ...r, ativo: !r.ativo } : r
    ));
  };

  const handleDateChange = (beneficioId: string, date: string) => {
    setHasChanges(true);
    setRows(prev => prev.map(r =>
      r.beneficio_id === beneficioId ? { ...r, data_inicio: date } : r
    ));
  };

  const handleValorChange = (beneficioId: string, valor: string) => {
    setHasChanges(true);
    const numVal = valor ? parseFloat(valor) : null;
    setRows(prev => prev.map(r =>
      r.beneficio_id === beneficioId ? { ...r, valor: numVal } : r
    ));
  };

  const handleSave = async () => {
    if (!selectedColaboradorId) return;

    await bulkUpdate.mutateAsync({
      colaboradorId: selectedColaboradorId,
      beneficios: rows.map(r => ({
        beneficio_id: r.beneficio_id,
        ativo: r.ativo,
        data_inicio: r.data_inicio,
        valor: r.valor,
        existing_id: r.existing_id,
      })),
    });
    setHasChanges(false);
  };

  const isLoading = loadingColabs || loadingBeneficios || loadingAtribuicoes;

  const selectedColab = activeColaboradores.find(c => c.id === selectedColaboradorId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Atribuições Individuais
        </CardTitle>
        <CardDescription>
          Selecione um colaborador para gerenciar todos os seus benefícios de uma vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Colaborador</label>
          <Select
            value={selectedColaboradorId}
            onValueChange={(val) => {
              setSelectedColaboradorId(val);
              setHasChanges(false);
            }}
          >
            <SelectTrigger className="w-full md:w-[480px]">
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {activeColaboradores.map(colab => (
                <SelectItem key={colab.id} value={colab.id}>
                  {colab.full_name} — {colab.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedColaboradorId && selectedColab && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedColab.full_name}</span>
                {" · "}
                {selectedColab.department}
                {" · "}
                {rows.filter(r => r.ativo).length} benefício(s) ativo(s)
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : rows.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ativo</TableHead>
                      <TableHead>Benefício</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="w-40">Data Início</TableHead>
                      <TableHead className="w-36">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.beneficio_id} className={row.ativo ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Switch
                            checked={row.ativo}
                            onCheckedChange={() => handleToggle(row.beneficio_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{row.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.categoria ? (
                            <Badge variant="secondary">{row.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.data_inicio}
                            onChange={(e) => handleDateChange(row.beneficio_id, e.target.value)}
                            disabled={!row.ativo}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={row.valor ?? ""}
                            onChange={(e) => handleValorChange(row.beneficio_id, e.target.value)}
                            disabled={!row.ativo}
                            className="h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum benefício cadastrado</p>
                <p className="text-sm">Cadastre benefícios na aba "Gerenciar Benefícios" primeiro.</p>
              </div>
            )}

            {hasChanges && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={bulkUpdate.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {bulkUpdate.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </>
        )}

        {!selectedColaboradorId && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um colaborador acima</p>
            <p className="text-sm">Você poderá ativar/desativar benefícios, definir datas e valores individualmente.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
