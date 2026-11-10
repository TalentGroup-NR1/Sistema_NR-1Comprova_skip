import { useState } from "react";
import { Plus, Search, MoreVertical, Pencil, Trash2, ToggleLeft, ToggleRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useQuestionariosCuidarPlus, 
  useDeleteQuestionarioCuidarPlus,
  useUpdateQuestionarioCuidarPlus,
  QuestionarioCuidarPlus 
} from "@/hooks/useCuidarMaisQuestionarios";
import { QuestionarioFormDialog } from "./QuestionarioFormDialog";
import { QuestionarioConfig } from "./QuestionarioConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function QuestionariosBuilder() {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedQuestionario, setSelectedQuestionario] = useState<QuestionarioCuidarPlus | null>(null);
  
  const { data: questionarios, isLoading } = useQuestionariosCuidarPlus();
  const deleteQuestionario = useDeleteQuestionarioCuidarPlus();
  const updateQuestionario = useUpdateQuestionarioCuidarPlus();

  const filteredQuestionarios = questionarios?.filter(q => 
    q.titulo.toLowerCase().includes(search.toLowerCase()) ||
    q.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteQuestionario.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = (questionario: QuestionarioCuidarPlus) => {
    updateQuestionario.mutate({
      id: questionario.id,
      is_active: !questionario.is_active,
    });
  };

  const handleCreated = (questionario: QuestionarioCuidarPlus) => {
    setIsCreating(false);
    setSelectedQuestionario(questionario);
  };

  // Se um questionário está selecionado, mostrar a tela de configuração
  if (selectedQuestionario) {
    return (
      <QuestionarioConfig 
        questionario={selectedQuestionario} 
        onBack={() => setSelectedQuestionario(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Questionários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Questionários de Saúde Mental</CardTitle>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Questionário
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar questionários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!filteredQuestionarios?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum questionário encontrado</p>
              <p className="text-sm">Clique em "Novo Questionário" para criar o primeiro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestionarios.map((questionario) => (
                  <TableRow 
                    key={questionario.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedQuestionario(questionario)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{questionario.titulo}</p>
                        {questionario.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {questionario.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {questionario.modelo_analise === 'MATRIZ_RISCOS' ? 'Matriz de Riscos' : 'Padrão'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={questionario.is_active ? "default" : "secondary"}>
                        {questionario.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(questionario.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedQuestionario(questionario)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configurar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(questionario)}>
                            {questionario.is_active ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteId(questionario.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuestionarioFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={handleCreated}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as perguntas, envios e respostas 
              associadas a este questionário serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
