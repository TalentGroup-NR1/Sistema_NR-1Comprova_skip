import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye
} from 'lucide-react';
import { 
  useQuestionnaireTemplates, 
  useDeleteQuestionnaireTemplate,
  useUpdateQuestionnaireTemplate 
} from '@/hooks/useQuestionnaireTemplates';
import { useAuth } from '@/hooks/useAuth';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import { DeleteTemplateDialog } from './DeleteTemplateDialog';
import type { Database } from '@/integrations/supabase/types';

type QuestionnaireTemplate = Database['public']['Tables']['questionnaire_templates']['Row'];

export function QuestionnaireBuilder() {
  const { isAdminMaster, isAdminEmpresa } = useAuth();
  const { data: templates, isLoading } = useQuestionnaireTemplates();
  const deleteTemplate = useDeleteQuestionnaireTemplate();
  const updateTemplate = useUpdateQuestionnaireTemplate();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<QuestionnaireTemplate | null>(null);

  const canManageTemplates = isAdminMaster || isAdminEmpresa;

  const filteredTemplates = templates?.filter(t =>
    t.template_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMilestoneLabel = (type: string | null) => {
    switch (type) {
      case '30_DIAS': return '30 Dias';
      case '80_DIAS': return '80 Dias';
      case '120_DIAS': return '120 Dias';
      case 'GERAL': return 'Geral';
      default: return '-';
    }
  };

  const getTargetAudienceLabel = (type: string | null) => {
    switch (type) {
      case 'COLABORADOR': return 'Colaborador';
      case 'GESTOR': return 'Gestor';
      case 'AMBOS': return 'Ambos';
      case 'NAO_ESPECIFICADO': return '-';
      default: return '-';
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!templateToDelete) return;
    try {
      await updateTemplate.mutateAsync({ id: templateToDelete.id, is_active: false });
      toast.success('Template desativado com sucesso');
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deactivating template:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManageTemplates && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        )}
      </div>

      {/* Templates Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Template</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Marco</TableHead>
                <TableHead>Público Alvo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum template encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{template.template_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.company_id ? (
                        <Badge variant="secondary">
                          {(template as any).companies?.name || 'Empresa'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMilestoneLabel(template.milestone_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.target_audience === 'NAO_ESPECIFICADO' ? 'outline' : 'secondary'}>
                        {getTargetAudienceLabel(template.target_audience)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTemplateId(template.id)}>
                            {canManageTemplates ? (
                              <>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </>
                            )}
                          </DropdownMenuItem>
                          {canManageTemplates && (
                            <DropdownMenuItem 
                              onClick={() => setTemplateToDelete(template)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <TemplateEditorDialog
        templateId={editingTemplateId}
        open={!!editingTemplateId || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplateId(null);
            setIsCreating(false);
          }
        }}
      />

      {/* Delete Dialog */}
      <DeleteTemplateDialog
        template={templateToDelete}
        open={!!templateToDelete}
        onOpenChange={(open) => {
          if (!open) setTemplateToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        onConfirmDeactivate={handleConfirmDeactivate}
      />
    </div>
  );
}
