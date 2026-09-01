import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen, FileText, Play, ExternalLink, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useListarConteudosAdmin,
  useGerenciarConteudos,
  formatarTamanho,
  type CuidarConteudo,
} from "@/hooks/useCuidarConteudos";
import { ConteudoFormDialog } from "./ConteudoFormDialog";

const TIPO_ICON = { video: Play, artigo: BookOpen, cartilha: FileText } as const;

export function MateriaisApoioAdmin() {
  const { data, isLoading } = useListarConteudosAdmin();
  const { alternarStatus, excluir, replicarGlobal } = useGerenciarConteudos();
  const { isAdminMaster } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<CuidarConteudo | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<CuidarConteudo | null>(null);
  const [replicarAlvo, setReplicarAlvo] = useState<CuidarConteudo | null>(null);

  const categorias = useMemo(
    () => Array.from(new Set((data ?? []).map((c) => c.categoria))).sort(),
    [data],
  );

  const filtrados = useMemo(() => {
    return (data ?? []).filter((c) => {
      if (busca && !c.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroTipo !== "all" && c.tipo !== filtroTipo) return false;
      if (filtroCategoria !== "all" && c.categoria !== filtroCategoria) return false;
      if (filtroStatus !== "all" && c.status !== filtroStatus) return false;
      return true;
    });
  }, [data, busca, filtroTipo, filtroCategoria, filtroStatus]);

  const handleEditar = (c: CuidarConteudo) => {
    setEditando(c);
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditando(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Materiais de Apoio</h2>
          <p className="text-sm text-muted-foreground">
            Vídeos, cartilhas e artigos sobre saúde mental disponibilizados aos colaboradores.
          </p>
        </div>
        <Button onClick={handleNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Material
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="artigo">Artigo</SelectItem>
            <SelectItem value="cartilha">Cartilha</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum material encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((c) => {
                const Icon = TIPO_ICON[c.tipo];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.titulo}</span>
                        {c.origem === "url" && c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Abrir URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="capitalize">{c.tipo}</span>
                        {c.origem === "upload" && (
                          <Badge
                            variant="outline"
                            className="ml-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            {formatarTamanho(c.tamanho_bytes)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">{c.categoria}</Badge>
                        {c.company_id === null && (
                          <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                            <Globe className="mr-1 h-2.5 w-2.5" />
                            Global
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={c.status === "ativo"}
                          onCheckedChange={(v) =>
                            alternarStatus.mutate({ id: c.id, status: v ? "ativo" : "inativo" })
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {c.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdminMaster && c.company_id !== null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setReplicarAlvo(c)}
                                className="text-primary hover:text-primary"
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Replicar para todas as empresas</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEditar(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExcluirAlvo(c)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConteudoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        conteudo={editando}
      />

      <AlertDialog open={!!excluirAlvo} onOpenChange={(o) => !o && setExcluirAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O material será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluirAlvo)
                  excluir.mutate({
                    id: excluirAlvo.id,
                    storage_path: excluirAlvo.storage_path,
                    capa_path: excluirAlvo.capa_path,
                  });
                setExcluirAlvo(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!replicarAlvo} onOpenChange={(o) => !o && setReplicarAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replicar para todas as empresas?</AlertDialogTitle>
            <AlertDialogDescription>
              Este material será marcado como <strong>global</strong> e ficará visível
              para os colaboradores de todas as empresas do sistema. Esta ação não
              pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (replicarAlvo)
                  replicarGlobal.mutate({
                    id: replicarAlvo.id,
                    origem: replicarAlvo.origem,
                    storage_path: replicarAlvo.storage_path,
                    capa_path: replicarAlvo.capa_path,
                  });
                setReplicarAlvo(null);
              }}
            >
              Replicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
