import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, CreditCard, type LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBeneficios,
  useBeneficiosPorEscopo,
  useUpdateBeneficiosPorEscopo,
  type BeneficioEscopo,
} from "@/hooks/useBeneficios";

interface Props {
  escopo: BeneficioEscopo;
  title: string;
  description: string;
  icon: LucideIcon;
  selectLabel: string;
  selectPlaceholder: string;
  options: string[];
  loadingOptions?: boolean;
  emptyOptionsTitle: string;
  emptyOptionsHint: string;
}

interface Row {
  beneficio_id: string;
  nome: string;
  categoria: string | null;
  ativo: boolean;
  data_inicio: string;
  valor: number | null;
}

export function BeneficiosEscopoManager({
  escopo,
  title,
  description,
  icon: Icon,
  selectLabel,
  selectPlaceholder,
  options,
  loadingOptions,
  emptyOptionsTitle,
  emptyOptionsHint,
}: Props) {
  const { data: beneficios, isLoading: loadingBeneficios } = useBeneficios();
  const [selectedValor, setSelectedValor] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: atribuicoes, isLoading: loadingLinks } = useBeneficiosPorEscopo(
    escopo,
    selectedValor || null
  );
  const updateEscopo = useUpdateBeneficiosPorEscopo(escopo);

  const activeBeneficios = useMemo(
    () => (beneficios || []).filter(b => b.ativo),
    [beneficios]
  );

  useEffect(() => {
    if (!selectedValor || !activeBeneficios.length) {
      setRows([]);
      return;
    }
    const map = new Map((atribuicoes || []).map(a => [a.beneficio_id, a]));
    const hoje = new Date().toISOString().split('T')[0];
    setRows(
      activeBeneficios.map(b => {
        const existing = map.get(b.id);
        return {
          beneficio_id: b.id,
          nome: b.nome,
          categoria: b.categoria,
          ativo: !!existing,
          data_inicio: existing?.data_inicio || hoje,
          valor: existing?.valor ?? b.valor_mensal ?? null,
        };
      })
    );
    setHasChanges(false);
  }, [selectedValor, activeBeneficios, atribuicoes]);

  const handleToggle = (beneficioId: string) => {
    setHasChanges(true);
    setRows(prev =>
      prev.map(r => (r.beneficio_id === beneficioId ? { ...r, ativo: !r.ativo } : r))
    );
  };

  const handleDateChange = (beneficioId: string, date: string) => {
    setHasChanges(true);
    setRows(prev =>
      prev.map(r => (r.beneficio_id === beneficioId ? { ...r, data_inicio: date } : r))
    );
  };

  const handleValorChange = (beneficioId: string, valor: string) => {
    setHasChanges(true);
    const numVal = valor ? parseFloat(valor) : null;
    setRows(prev =>
      prev.map(r => (r.beneficio_id === beneficioId ? { ...r, valor: numVal } : r))
    );
  };

  const handleSave = async () => {
    if (!selectedValor) return;
    await updateEscopo.mutateAsync({
      valor: selectedValor,
      atribuicoes: rows
        .filter(r => r.ativo)
        .map(r => ({
          beneficio_id: r.beneficio_id,
          data_inicio: r.data_inicio || null,
          valor: r.valor,
        })),
    });
    setHasChanges(false);
  };


  if (loadingBeneficios || loadingOptions) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">{selectLabel}</label>
          <Select
            value={selectedValor}
            onValueChange={(val) => {
              setSelectedValor(val);
              setHasChanges(false);
            }}
          >
            <SelectTrigger className="w-full md:w-[480px]">
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {options.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{emptyOptionsTitle}</p>
            <p className="text-sm">{emptyOptionsHint}</p>
          </div>
        )}

        {selectedValor && (
          <>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedValor}</span>
              {" · "}
              {rows.filter(r => r.ativo).length} benefício(s) ativo(s)
            </div>

            {loadingLinks ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : rows.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ativo</TableHead>
                      <TableHead>Benefício</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="w-[170px]">Data Início</TableHead>
                      <TableHead className="w-[130px]">Valor (R$)</TableHead>
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
                          {row.categoria ? <Badge variant="secondary">{row.categoria}</Badge> : "-"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.data_inicio}
                            disabled={!row.ativo}
                            onChange={(e) => handleDateChange(row.beneficio_id, e.target.value)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={row.valor ?? ""}
                            disabled={!row.ativo}
                            onChange={(e) => handleValorChange(row.beneficio_id, e.target.value)}
                            className="h-9"
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
                <p className="text-sm">Cadastre benefícios na aba "Gerenciar" primeiro.</p>
              </div>
            )}

            {hasChanges && (
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={updateEscopo.isPending} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {updateEscopo.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </>
        )}

        {!selectedValor && options.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione uma opção acima</p>
            <p className="text-sm">Você poderá ativar ou inativar cada benefício.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
