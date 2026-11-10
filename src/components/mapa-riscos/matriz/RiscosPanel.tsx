import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Search, ClipboardPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORIAS,
  FAIXA_LABEL,
  FAIXA_SUAVE,
  FONTE_LABEL,
  categoriaClasse,
  categoriaLabel,
  faixaDoNivel,
  type MatrizConfig,
} from "@/lib/matrizRisco";
import { useExcluirRiscoGhe, type RiscoGhe } from "@/hooks/useRiscosGhe";

interface Props {
  riscos: RiscoGhe[];
  config: MatrizConfig;
  celula: { p: number; s: number } | null;
  onLimparCelula: () => void;
  onEditar: (r: RiscoGhe) => void;
  onCriarPlano: (r: RiscoGhe) => void;
}

export function RiscosPanel({
  riscos,
  config,
  celula,
  onLimparCelula,
  onEditar,
  onCriarPlano,
}: Props) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [excluindo, setExcluindo] = useState<RiscoGhe | null>(null);
  const excluir = useExcluirRiscoGhe();

  const lista = useMemo(() => {
    return riscos
      .filter((r) => (categoria === "todas" ? true : r.categoria === categoria))
      .filter((r) => (celula ? r.probabilidade === celula.p && r.severidade === celula.s : true))
      .filter((r) => r.nome_risco.toLowerCase().includes(busca.trim().toLowerCase()))
      .sort((a, b) => b.probabilidade * b.severidade - a.probabilidade * a.severidade);
  }, [riscos, categoria, celula, busca]);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast({ title: "Risco removido" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar risco..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {celula && (
          <Button variant="outline" size="sm" onClick={onLimparCelula}>
            Célula P{celula.p}×S{celula.s} — limpar filtro
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risco</TableHead>
              <TableHead className="w-36">Categoria</TableHead>
              <TableHead className="w-20 text-center">P</TableHead>
              <TableHead className="w-20 text-center">S</TableHead>
              <TableHead className="w-40">Nível</TableHead>
              <TableHead className="w-28">Fonte</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum risco cadastrado para os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((r) => {
                const nivel = r.probabilidade * r.severidade;
                const faixa = faixaDoNivel(nivel, config);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.nome_risco}</div>
                      {r.descricao && (
                        <div className="line-clamp-1 text-xs text-muted-foreground">{r.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={categoriaClasse(r.categoria)}>
                        {categoriaLabel(r.categoria)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{r.probabilidade}</TableCell>
                    <TableCell className="text-center">{r.severidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={FAIXA_SUAVE[faixa]}>
                        {nivel} — {FAIXA_LABEL[faixa]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {FONTE_LABEL[r.fonte] ?? r.fonte}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Criar plano de ação"
                        onClick={() => onCriarPlano(r)}
                      >
                        <ClipboardPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => setExcluindo(r)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir risco</AlertDialogTitle>
            <AlertDialogDescription>
              O risco "{excluindo?.nome_risco}" será removido deste GHE. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
