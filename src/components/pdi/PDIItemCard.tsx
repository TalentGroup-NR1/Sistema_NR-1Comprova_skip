import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Award, Target, Calendar, User, Edit2, Trash2, MessageSquare,
  Clock, PlayCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Plus, GraduationCap, Users, BookOpen, HeartHandshake, MessageCircle, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PDIItem,
  PDIItemStatus,
  PDIItemTipoAcao,
  useUpdatePDIItem,
  useDeletePDIItem,
  usePDICheckins,
  useCreateCheckin,
} from "@/hooks/usePDI";
import { useColaboradores } from "@/hooks/useColaboradores";

const statusConfig: Record<PDIItemStatus, { label: string; icon: React.ElementType; className: string }> = {
  nao_iniciado: { label: "Não iniciado", icon: Clock, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: PlayCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  concluido: { label: "Concluído", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  bloqueado: { label: "Bloqueado", icon: AlertTriangle, className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

const tipoAcaoConfig: Record<PDIItemTipoAcao, { label: string; icon: React.ElementType }> = {
  treinamento: { label: "Treinamento", icon: GraduationCap },
  mentoria: { label: "Mentoria", icon: Users },
  projeto_pratico: { label: "Projeto Prático", icon: Target },
  leitura: { label: "Leitura", icon: BookOpen },
  coaching: { label: "Coaching", icon: HeartHandshake },
  feedbacks_periodicos: { label: "Feedbacks", icon: MessageCircle },
  outro: { label: "Outro", icon: MoreHorizontal },
};

const responsavelConfig = {
  colaborador: { label: "Colaborador", className: "text-blue-600" },
  gestor: { label: "Gestor", className: "text-purple-600" },
  rh: { label: "RH", className: "text-green-600" },
};

interface PDIItemCardProps {
  item: PDIItem;
  isReadOnly?: boolean;
  onEdit: () => void;
}

export function PDIItemCard({ item, isReadOnly = false, onEdit }: PDIItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newProgress, setNewProgress] = useState(item.progresso_percentual);
  const [checkinText, setCheckinText] = useState("");
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  
  const updateItem = useUpdatePDIItem();
  const deleteItem = useDeletePDIItem();
  const { data: checkins, isLoading: checkinsLoading } = usePDICheckins(isExpanded ? item.id : undefined);
  const createCheckin = useCreateCheckin();
  const { data: colaboradores } = useColaboradores();
  
  const statusInfo = statusConfig[item.status];
  const StatusIcon = statusInfo.icon;
  const tipoInfo = tipoAcaoConfig[item.tipo_acao];
  const TipoIcon = tipoInfo.icon;
  const respInfo = responsavelConfig[item.responsavel];

  // Find the first active colaborador to use as autor for checkins
  const activeColaborador = colaboradores?.find(c => c.status === 'ATIVO');

  const handleStatusChange = (newStatus: PDIItemStatus) => {
    updateItem.mutate({ id: item.id, status: newStatus });
  };

  const handleProgressSave = () => {
    updateItem.mutate({ id: item.id, progresso_percentual: newProgress });
  };

  const handleDelete = () => {
    deleteItem.mutate({ itemId: item.id, pdiId: item.pdi_id });
  };

  const handleSubmitCheckin = () => {
    if (!checkinText.trim() || !activeColaborador) return;
    
    createCheckin.mutate({
      pdi_item_id: item.id,
      autor_id: activeColaborador.id,
      comentario: checkinText,
      progresso_percentual: newProgress !== item.progresso_percentual ? newProgress : null,
    }, {
      onSuccess: () => {
        setCheckinText("");
        setShowCheckinForm(false);
      }
    });
  };

  const isPastDue = item.prazo && new Date(item.prazo) < new Date() && item.status !== 'concluido';

  return (
    <Card className={`border ${isPastDue ? 'border-destructive/50' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon and Title */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.tipo_alvo === 'competencia' && <Award className="h-4 w-4 text-amber-500" />}
                  {item.tipo_alvo === 'objetivo' && <Target className="h-4 w-4 text-blue-500" />}
                  <h4 className="font-medium">{item.titulo}</h4>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={statusInfo.className} variant="outline">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  
                  {!isReadOnly && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover ação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação será removida permanentemente do PDI.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <TipoIcon className="h-3 w-3" />
                  {tipoInfo.label}
                </span>
                <span className={`flex items-center gap-1 ${respInfo.className}`}>
                  <User className="h-3 w-3" />
                  {respInfo.label}
                </span>
                {item.prazo && (
                  <span className={`flex items-center gap-1 ${isPastDue ? 'text-destructive font-medium' : ''}`}>
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.prazo), "dd/MM/yyyy", { locale: ptBR })}
                    {isPastDue && " (Atrasado)"}
                  </span>
                )}
                {(item.competencia as { nome_competencia: string } | null)?.nome_competencia && (
                  <Badge variant="outline" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    {(item.competencia as { nome_competencia: string }).nome_competencia}
                  </Badge>
                )}
                {(item.objetivo as { nome_objetivo: string } | null)?.nome_objetivo && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {(item.objetivo as { nome_objetivo: string }).nome_objetivo}
                  </Badge>
                )}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <Progress value={item.progresso_percentual} className="flex-1 h-2" />
                <span className="text-sm font-medium w-12 text-right">{item.progresso_percentual}%</span>
              </div>

              {/* Expand/Collapse */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 w-full">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Menos detalhes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Mais detalhes e check-ins
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="mt-4 space-y-4">
            {/* Description */}
            {item.descricao && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">{item.descricao}</p>
              </div>
            )}

            {/* Evidences */}
            {item.evidencias && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Evidências</p>
                <p className="text-sm">{item.evidencias}</p>
              </div>
            )}

            {/* Actions (if not readonly) */}
            {!isReadOnly && (
              <div className="space-y-4 pt-4 border-t">
                {/* Status update */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Status:</label>
                  <Select value={item.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Progresso:</label>
                    <span className="text-sm font-medium">{newProgress}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[newProgress]}
                      onValueChange={([v]) => setNewProgress(v)}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    {newProgress !== item.progresso_percentual && (
                      <Button size="sm" onClick={handleProgressSave}>
                        Salvar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Add checkin */}
                {!showCheckinForm ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCheckinForm(true)}
                    disabled={!activeColaborador}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Check-in
                  </Button>
                ) : (
                  <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                    <Textarea
                      placeholder="Descreva o progresso, dificuldades ou conquistas..."
                      value={checkinText}
                      onChange={(e) => setCheckinText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setShowCheckinForm(false);
                          setCheckinText("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSubmitCheckin}
                        disabled={!checkinText.trim() || createCheckin.isPending}
                      >
                        Registrar Check-in
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Check-ins history */}
            <div className="pt-4 border-t">
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Histórico de Check-ins
              </h5>
              
              {checkinsLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : checkins && checkins.length > 0 ? (
                <div className="space-y-3">
                  {checkins.map(checkin => (
                    <div key={checkin.id} className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {(checkin.autor as { full_name: string } | null)?.full_name || 'Usuário'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(checkin.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{checkin.comentario}</p>
                      {checkin.progresso_percentual != null && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Progresso atualizado para {checkin.progresso_percentual}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum check-in registrado ainda.</p>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
