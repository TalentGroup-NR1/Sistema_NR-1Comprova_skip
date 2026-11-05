import { useState, useMemo } from "react";
import {
  Globe,
  Plus,
  Search,
  Filter,
  Layers,
  Edit,
  Eye,
  Archive,
  CheckCircle,
  FileText,
  Link as LinkIcon,
  Video,
  FileCheck,
  Award,
  Users,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTreinamentosGlobais,
  useCategoriasPlataforma,
  useToggleStatusTreinamentoGlobal,
  TreinamentoGlobal,
} from "@/hooks/useCatalogoGlobal";
import { TreinamentoGlobalFormDialog } from "@/components/treinamentos/TreinamentoGlobalFormDialog";
import { CategoriasPlataformaManager } from "@/components/treinamentos/CategoriasPlataformaManager";
import { TreinamentoStatus, TreinamentoTipo } from "@/hooks/useTreinamentos";

export default function CatalogoGlobalTreinamentos() {
  const { data: treinamentos, isLoading, isError } = useTreinamentosGlobais();
  const { data: categorias } = useCategoriasPlataforma();
  const toggleStatus = useToggleStatusTreinamentoGlobal();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [categoriasManagerOpen, setCategoriasManagerOpen] = useState(false);
  const [editingTreinamento, setEditingTreinamento] = useState<TreinamentoGlobal | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTreinamentos = useMemo(() => {
    if (!treinamentos) return [];

    return treinamentos.filter((t) => {
      const matchSearch =
        search.trim() === "" ||
        t.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (t.descricao && t.descricao.toLowerCase().includes(search.toLowerCase()));

      const matchCategoria =
        categoriaFilter === "all" || t.categoria_id === categoriaFilter;

      const matchTipo = tipoFilter === "all" || t.tipo === tipoFilter;

      const matchStatus = statusFilter === "all" || t.status === statusFilter;

      return matchSearch && matchCategoria && matchTipo && matchStatus;
    });
  }, [treinamentos, search, categoriaFilter, tipoFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingTreinamento(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (treinamento: TreinamentoGlobal) => {
    setEditingTreinamento(treinamento);
    setFormDialogOpen(true);
  };

  const getTipoBadge = (tipo: TreinamentoTipo) => {
    switch (tipo) {
      case "link":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <LinkIcon className="h-3 w-3" /> Link Externo
          </Badge>
        );
      case "video":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Video className="h-3 w-3" /> Vídeo
          </Badge>
        );
      case "pdf":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <FileText className="h-3 w-3" /> PDF / Apostila
          </Badge>
        );
      case "ppt":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            <FileCheck className="h-3 w-3" /> Slides (PPT)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> Arquivo
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: TreinamentoStatus) => {
    switch (status) {
      case "publicado":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Publicado
          </Badge>
        );
      case "rascunho":
        return (
          <Badge variant="secondary" className="text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-200">
            Rascunho
          </Badge>
        );
      case "arquivado":
        return (
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            Arquivado
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Catálogo Global de Treinamentos
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Biblioteca oficial da plataforma disponível para os clientes habilitarem em suas empresas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCategoriasManagerOpen(true)}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Gerenciar Categorias
          </Button>

          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Treinamento da Plataforma
          </Button>
        </div>
      </div>

      {/* Métricas Agregadas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="text-xs">Total de Cursos Globais</CardDescription>
            <CardTitle className="text-2xl">{treinamentos?.length || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardDescription className="text-xs">Cursos Publicados</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {treinamentos?.filter((t) => t.status === "publicado").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardDescription className="text-xs">Em Rascunho</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {treinamentos?.filter((t) => t.status === "rascunho").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardDescription className="text-xs">Categorias da Plataforma</CardDescription>
            <CardTitle className="text-2xl text-indigo-600">{categorias?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="pdf">Documento PDF</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="ppt">Apresentação PPT</SelectItem>
                <SelectItem value="arquivo">Arquivo</SelectItem>
                <SelectItem value="link">Link Externo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Treinamentos Globais */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              <p>Erro ao carregar os treinamentos do catálogo global.</p>
            </div>
          ) : filteredTreinamentos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Globe className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-semibold text-lg text-foreground">
                Nenhum treinamento global encontrado
              </h3>
              <p className="text-sm max-w-md">
                {search || categoriaFilter !== "all" || tipoFilter !== "all" || statusFilter !== "all"
                  ? "Nenhum resultado corresponde aos filtros aplicados. Tente ajustar a busca."
                  : "Comece publicando os treinamentos oficiais da plataforma para que os clientes possam habilitá-los."}
              </p>
              {!search && categoriaFilter === "all" && (
                <Button onClick={handleOpenCreate} className="mt-2">
                  <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Treinamento
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">Título do Curso</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Certificado</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Clientes Habilitados</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreinamentos.map((curso) => (
                  <TableRow key={curso.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{curso.titulo}</div>
                      {curso.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                          {curso.descricao}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      {curso.categoria ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: curso.categoria.cor || "#6366f1" }}
                          />
                          <span className="text-sm">{curso.categoria.nome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem categoria</span>
                      )}
                    </TableCell>

                    <TableCell>{getTipoBadge(curso.tipo)}</TableCell>

                    <TableCell>
                      {curso.tipo === "link" ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Não emite
                        </Badge>
                      ) : curso.gera_certificado ? (
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
                          <Award className="h-3 w-3" /> Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Não
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {curso.validade_meses ? (
                        <span className="text-sm font-medium">
                          {curso.validade_meses} meses
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem expiração</span>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(curso.status)}</TableCell>

                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{curso.clientes_habilitados}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(curso)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações de Status</DropdownMenuLabel>
                            {curso.status !== "publicado" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatus.mutate({ id: curso.id, status: "publicado" })
                                }
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                Publicar no Catálogo
                              </DropdownMenuItem>
                            )}
                            {curso.status !== "rascunho" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatus.mutate({ id: curso.id, status: "rascunho" })
                                }
                              >
                                <FileText className="mr-2 h-4 w-4 text-amber-600" />
                                Mover para Rascunho
                              </DropdownMenuItem>
                            )}
                            {curso.status !== "arquivado" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatus.mutate({ id: curso.id, status: "arquivado" })
                                }
                              >
                                <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
                                Arquivar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                              Ver clientes habilitados (em breve)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <TreinamentoGlobalFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        treinamentoToEdit={editingTreinamento}
      />

      <CategoriasPlataformaManager
        open={categoriasManagerOpen}
        onOpenChange={setCategoriasManagerOpen}
      />
    </div>
  );
}
