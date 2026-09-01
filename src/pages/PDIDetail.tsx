import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Calendar, User, UserCheck, Clock, CheckCircle, 
  AlertTriangle, Pause, PlayCircle, Target, Award, Plus, 
  Edit2, Trash2, MessageSquare, TrendingUp, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  usePDI, 
  useUpdatePDI, 
  PDIStatus,
  PDIItem,
} from "@/hooks/usePDI";
import { PDIItemFormDialog } from "@/components/pdi/PDIItemFormDialog";
import { PDIItemCard } from "@/components/pdi/PDIItemCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const statusConfig: Record<PDIStatus, { label: string; icon: React.ElementType; className: string }> = {
  rascunho: { label: "Rascunho", icon: FileText, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em Andamento", icon: PlayCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  concluido: { label: "Concluído", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelado: { label: "Cancelado", icon: Pause, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default function PDIDetail() {
  const { pdiId } = useParams<{ pdiId: string }>();
  const navigate = useNavigate();
  const { data: pdi, isLoading, error } = usePDI(pdiId);
  const updatePDI = useUpdatePDI();
  
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PDIItem | null>(null);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PDIStatus | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !pdi) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-5xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">PDI não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar os dados deste PDI.
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const statusInfo = statusConfig[pdi.status];
  const StatusIcon = statusInfo.icon;
  
  const colaboradorData = pdi.colaborador as { full_name: string; job_title: string; department: string } | null;
  const gestorData = pdi.gestor as { full_name: string } | null;
  const cicloData = pdi.ciclo as { nome_ciclo: string } | null;
  
  const itens = pdi.itens || [];
  const progressoGeral = itens.length > 0
    ? Math.round(itens.reduce((sum, item) => sum + item.progresso_percentual, 0) / itens.length)
    : 0;
  
  const itensPorStatus = {
    nao_iniciado: itens.filter(i => i.status === 'nao_iniciado').length,
    em_andamento: itens.filter(i => i.status === 'em_andamento').length,
    concluido: itens.filter(i => i.status === 'concluido').length,
    bloqueado: itens.filter(i => i.status === 'bloqueado').length,
  };
  
  const isReadOnly = pdi.status === 'concluido' || pdi.status === 'cancelado';

  const handleStatusChange = (newStatus: PDIStatus) => {
    if (newStatus === 'concluido' || newStatus === 'cancelado') {
      setPendingStatus(newStatus);
      setConfirmStatusOpen(true);
    } else {
      updatePDI.mutate({ id: pdi.id, status: newStatus });
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      updatePDI.mutate({ id: pdi.id, status: pendingStatus });
      setConfirmStatusOpen(false);
      setPendingStatus(null);
    }
  };

  const handleSaveNotes = () => {
    updatePDI.mutate({ id: pdi.id, observacoes_gerais: notes });
    setIsEditingNotes(false);
  };

  const handleEditItem = (item: PDIItem) => {
    setEditingItem(item);
    setItemFormOpen(true);
  };

  const handleCloseItemForm = () => {
    setItemFormOpen(false);
    setEditingItem(null);
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{colaboradorData?.full_name}</h1>
                <Badge className={statusInfo.className} variant="outline">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {colaboradorData?.job_title} • {colaboradorData?.department}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <UserCheck className="h-3 w-3 inline mr-1" />
                Gestor: {gestorData?.full_name}
              </p>
              {cicloData && (
                <p className="text-sm text-muted-foreground">
                  Ciclo: {cicloData.nome_ciclo}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <Select 
              value={pdi.status} 
              onValueChange={(value) => handleStatusChange(value as PDIStatus)}
              disabled={updatePDI.isPending}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Início: {format(new Date(pdi.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
              {pdi.data_fim_prevista && (
                <> • Previsão: {format(new Date(pdi.data_fim_prevista), "dd/MM/yyyy", { locale: ptBR })}</>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Progress value={progressoGeral} className="flex-1 h-3" />
                <span className="text-2xl font-bold w-16 text-right">{progressoGeral}%</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Não Iniciadas</p>
                  <p className="text-xl font-bold">{itensPorStatus.nao_iniciado}</p>
                </div>
                <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{itensPorStatus.em_andamento}</p>
                </div>
                <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Concluídas</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{itensPorStatus.concluido}</p>
                </div>
                <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Bloqueadas</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{itensPorStatus.bloqueado}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Observações Gerais
              </CardTitle>
              {!isReadOnly && !isEditingNotes && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setNotes(pdi.observacoes_gerais || "");
                  setIsEditingNotes(true);
                }}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-3">
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações gerais sobre o PDI..."
                  rows={4}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={updatePDI.isPending}>
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {pdi.observacoes_gerais || "Nenhuma observação adicionada."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Ações do PDI ({itens.length})
                </CardTitle>
                <CardDescription>
                  Gerencie as ações de desenvolvimento do colaborador
                </CardDescription>
              </div>
              {!isReadOnly && (
                <Button onClick={() => setItemFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ação
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ação adicionada ainda.</p>
                {!isReadOnly && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setItemFormOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar primeira ação
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {itens.map(item => (
                  <PDIItemCard 
                    key={item.id} 
                    item={item}
                    isReadOnly={isReadOnly}
                    onEdit={() => handleEditItem(item)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item Form Dialog */}
        <PDIItemFormDialog
          open={itemFormOpen}
          onOpenChange={handleCloseItemForm}
          pdiId={pdi.id}
          cicloId={pdi.ciclo_id}
          editingItem={editingItem}
        />

        {/* Confirm Status Change Dialog */}
        <AlertDialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingStatus === 'concluido' 
                  ? "Ao marcar o PDI como concluído, as edições serão bloqueadas. Deseja continuar?"
                  : "Ao cancelar o PDI, as edições serão bloqueadas. Deseja continuar?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStatusChange}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
