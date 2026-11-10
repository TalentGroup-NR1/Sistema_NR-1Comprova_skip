import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import type { PgrAlteracao } from "@/hooks/usePgrSecoes";

interface Linha extends Partial<PgrAlteracao> {
  _key: string;
}

interface Props {
  alteracoes: PgrAlteracao[];
  onSave: (linhas: Array<Partial<PgrAlteracao>>) => void;
  saving?: boolean;
}

export function PgrAlteracoesTable({ alteracoes, onSave, saving }: Props) {
  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => {
    setLinhas(alteracoes.map((a) => ({ ...a, _key: a.id })));
  }, [alteracoes]);

  function update(k: string, patch: Partial<PgrAlteracao>) {
    setLinhas((ls) => ls.map((l) => (l._key === k ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Nº</TableHead>
            <TableHead className="w-40">Data</TableHead>
            <TableHead>Histórico</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Nenhuma alteração registrada.
              </TableCell>
            </TableRow>
          )}
          {linhas.map((l) => (
            <TableRow key={l._key}>
              <TableCell>
                <Input value={l.numero ?? ""} onChange={(e) => update(l._key, { numero: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input type="date" value={l.data ?? ""} onChange={(e) => update(l._key, { data: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input value={l.historico ?? ""} onChange={(e) => update(l._key, { historico: e.target.value })} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLinhas((ls) => ls.filter((x) => x._key !== l._key))}
                  aria-label="Remover linha"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setLinhas((ls) => [
              ...ls,
              {
                _key: `novo-${Date.now()}`,
                numero: String(ls.length + 1),
                data: new Date().toISOString().slice(0, 10),
                historico: "",
              },
            ])
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar linha
        </Button>
        <Button size="sm" disabled={saving} onClick={() => onSave(linhas.map(({ _key, ...rest }) => rest))}>
          <Save className="h-4 w-4 mr-1" /> Salvar quadro
        </Button>
      </div>
    </div>
  );
}
