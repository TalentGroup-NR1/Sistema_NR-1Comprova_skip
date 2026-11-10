import { useState } from "react";
import { sanitizeRichText } from "@/lib/sanitize";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  useComunicados, 
  useDeleteComunicado,
  type ComunicadoWithAnexos 
} from "@/hooks/useComunicados";
import { ComunicadoFormDialog } from "./ComunicadoFormDialog";
import { ComunicadoFlyerDetail } from "./ComunicadoFlyerDetail";
import { 
  Plus, 
  Search,
  Pin,
  Calendar,
  Eye,
  FileText,
  AlertCircle,
  PartyPopper,
  Briefcase,
  Users,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export function ComunicadosList() {
  const { data: comunicados, isLoading } = useComunicados();
  const deleteMutation = useDeleteComunicado();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<ComunicadoWithAnexos | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comunicadoToDelete, setComunicadoToDelete] = useState<string | null>(null);
  const [previewComunicado, setPreviewComunicado] = useState<ComunicadoWithAnexos | null>(null);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "publicado": return "bg-success/10 text-success border-success/20";
      case "agendado": return "bg-warning/10 text-warning border-warning/20";
      case "rascunho": return "bg-muted text-muted-foreground border-muted";
      default: return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "publicado": return "Publicado";
      case "agendado": return "Agendado";
      case "rascunho": return "Rascunho";
      default: return status;
    }
  };

  const filteredComunicados = comunicados?.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === "todos" || c.status === activeTab;
    return matchesSearch && matchesStatus;
  }) || [];

  const pinnedComunicados = filteredComunicados.filter(c => c.is_pinned);
  const regularComunicados = filteredComunicados.filter(c => !c.is_pinned);

  const handleEdit = (comunicado: ComunicadoWithAnexos) => {
    setSelectedComunicado(comunicado);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setComunicadoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (comunicadoToDelete) {
      await deleteMutation.mutateAsync(comunicadoToDelete);
      setDeleteDialogOpen(false);
      setComunicadoToDelete(null);
    }
  };

  const handleNewComunicado = () => {
    setSelectedComunicado(null);
    setFormOpen(true);
  };

  const getPublicoAlvoLabel = (tipo: string, valor: string | null) => {
    if (tipo === 'todos') return 'Todos os colaboradores';
    return `${tipo === 'departamento' ? 'Dept.' : 'Cargo'}: ${valor}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comunicados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleNewComunicado} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Novo Comunicado
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="publicado">Publicados</TabsTrigger>
          <TabsTrigger value="agendado">Agendados</TabsTrigger>
          <TabsTrigger value="rascunho">Rascunhos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Pinned Section */}
      {pinnedComunicados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Pin className="h-4 w-4" />
            FIXADOS
          </h2>
          <div className="grid gap-4">
            {pinnedComunicados.map((comunicado) => (
              <ComunicadoCard
                key={comunicado.id}
                comunicado={comunicado}
                onEdit={() => handleEdit(comunicado)}
                onDelete={() => handleDelete(comunicado.id)}
                onPreview={() => setPreviewComunicado(comunicado)}
                getStatusStyle={getStatusStyle}
                getStatusLabel={getStatusLabel}
                getPublicoAlvoLabel={getPublicoAlvoLabel}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Comunicados */}
      <div className="space-y-3">
        {pinnedComunicados.length > 0 && (
          <h2 className="text-sm font-semibold text-muted-foreground">RECENTES</h2>
        )}
        <div className="grid gap-4">
          {regularComunicados.map((comunicado) => (
            <ComunicadoCard
              key={comunicado.id}
              comunicado={comunicado}
              onEdit={() => handleEdit(comunicado)}
              onDelete={() => handleDelete(comunicado.id)}
              onPreview={() => setPreviewComunicado(comunicado)}
              getStatusStyle={getStatusStyle}
              getStatusLabel={getStatusLabel}
              getPublicoAlvoLabel={getPublicoAlvoLabel}
            />
          ))}
        </div>
        {filteredComunicados.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum comunicado encontrado</p>
              <Button onClick={handleNewComunicado} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro comunicado
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ComunicadoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        comunicado={selectedComunicado}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comunicado e todos os seus anexos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewComunicado} onOpenChange={(open) => !open && setPreviewComunicado(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {previewComunicado && (
            <ComunicadoFlyerDetail comunicado={previewComunicado} isAdmin />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ComunicadoCardProps {
  comunicado: ComunicadoWithAnexos;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  getStatusStyle: (status: string) => string;
  getStatusLabel: (status: string) => string;
  getPublicoAlvoLabel: (tipo: string, valor: string | null) => string;
}

function ComunicadoCard({ comunicado, onEdit, onDelete, onPreview, getStatusStyle, getStatusLabel, getPublicoAlvoLabel }: ComunicadoCardProps) {
  const formattedDate = comunicado.data_publicacao 
    ? format(new Date(comunicado.data_publicacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : 'Sem data';

  return (
    <Card className={`shadow-card hover:shadow-md transition-shadow ${comunicado.is_pinned ? 'border-l-4 border-l-warning' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className={getStatusStyle(comunicado.status)}>
                {getStatusLabel(comunicado.status)}
              </Badge>
              {comunicado.is_pinned && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <Pin className="h-3 w-3 mr-1" />
                  Fixado
                </Badge>
              )}
              {comunicado.comunicados_anexos && comunicado.comunicados_anexos.length > 0 && (
                <Badge variant="outline">
                  {comunicado.comunicados_anexos.length} anexo(s)
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-2">{comunicado.titulo}</h3>
            <div 
              className="text-sm text-muted-foreground mb-3 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(comunicado.conteudo) }}
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {comunicado.autor_nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {comunicado.autor_nome}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {getPublicoAlvoLabel(comunicado.publico_alvo_tipo, comunicado.publico_alvo_valor)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {comunicado.views_count} visualizações
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={onPreview} title="Visualizar">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
