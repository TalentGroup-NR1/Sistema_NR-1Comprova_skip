import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { useFeriados, useFeriadoMutations } from "@/hooks/useFeriados";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FeriadosManager() {
  const companyId = useEffectiveCompanyId();
  const { isAdminMaster } = useAuth();
  const { feriados } = useFeriados();
  const { create, remove } = useFeriadoMutations();

  const [data, setData] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"NACIONAL" | "ESTADUAL" | "MUNICIPAL" | "EMPRESA">("EMPRESA");
  const [uf, setUf] = useState("");

  const handleAdd = () => {
    if (!data || !nome) return;
    create.mutate({
      company_id: companyId || null,
      data,
      nome,
      tipo,
      uf: uf || null,
      recorrente: false,
    } as any, {
      onSuccess: () => {
        setData("");
        setNome("");
        setUf("");
        setTipo("EMPRESA");
      },
    });
  };

  const sorted = [...feriados].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feriados</CardTitle>
        <CardDescription>
          Cadastre feriados estaduais, municipais ou da empresa. Feriados nacionais já estão pré-cadastrados e não geram saldo negativo no ponto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aniversário da cidade" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {isAdminMaster && <SelectItem value="NACIONAL">Nacional</SelectItem>}
                <SelectItem value="ESTADUAL">Estadual</SelectItem>
                <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                <SelectItem value="EMPRESA">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF (opcional)</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={!data || !nome || create.isPending} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar Feriado
        </Button>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">Nenhum feriado cadastrado.</TableCell></TableRow>
              ) : sorted.map((f) => {
                const podeRemover = isAdminMaster || (!!companyId && f.company_id === companyId);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm">
                      {f.recorrente
                        ? format(parseISO(f.data), "dd/MM", { locale: ptBR }) + " (anual)"
                        : format(parseISO(f.data), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{f.nome}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{f.tipo}</Badge></TableCell>
                    <TableCell>{f.uf || "-"}</TableCell>
                    <TableCell>
                      {f.company_id === null ? (
                        <Badge variant="secondary" className="text-xs">Global</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Empresa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {podeRemover && (
                        <Button variant="ghost" size="icon" onClick={() => remove.mutate(f.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
