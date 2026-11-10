import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, Trash2, Power } from 'lucide-react';
import { useCheckTemplateUsage } from '@/hooks/useQuestionnaireTemplates';
import type { Database } from '@/integrations/supabase/types';

type QuestionnaireTemplate = Database['public']['Tables']['questionnaire_templates']['Row'];

interface DeleteTemplateDialogProps {
  template: QuestionnaireTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  onConfirmDeactivate: () => void;
}

export function DeleteTemplateDialog({
  template,
  open,
  onOpenChange,
  onConfirmDelete,
  onConfirmDeactivate,
}: DeleteTemplateDialogProps) {
  const { data: usage, isLoading } = useCheckTemplateUsage(open ? template?.id || null : null);

  if (!template) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verificando...
              </>
            ) : usage?.hasResponses ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Template em Uso
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 text-destructive" />
                Confirmar Exclusão
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {isLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando uso do template...</span>
                </div>
              ) : usage?.hasResponses ? (
                <>
                  <p>
                    Este template possui <strong>{usage.totalCycles} ciclo(s)</strong> de feedback 
                    vinculados, alguns com respostas já submetidas.
                  </p>
                  <p className="text-amber-600 font-medium">
                    Não é possível excluir templates com feedbacks respondidos.
                  </p>
                  <p>
                    Você pode <strong>desativar</strong> este template para que não apareça mais 
                    em novos ciclos. Os dados históricos serão preservados.
                  </p>
                </>
              ) : usage && usage.totalCycles > 0 ? (
                <>
                  <p>
                    Este template está vinculado a <strong>{usage.totalCycles} ciclo(s)</strong> de 
                    feedback (sem respostas ainda).
                  </p>
                  <p>
                    Ao excluir, estes ciclos ficarão sem template associado e precisarão ter um 
                    novo template atribuído.
                  </p>
                  <p className="font-medium">Deseja continuar com a exclusão?</p>
                </>
              ) : (
                <p>
                  Tem certeza que deseja excluir o template <strong>"{template.template_name}"</strong>?
                  Esta ação não pode ser desfeita.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          {!isLoading && (
            usage?.hasResponses ? (
              <AlertDialogAction 
                onClick={onConfirmDeactivate} 
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Power className="h-4 w-4 mr-2" />
                Desativar Template
              </AlertDialogAction>
            ) : (
              <AlertDialogAction 
                onClick={onConfirmDelete} 
                className="bg-destructive hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Template
              </AlertDialogAction>
            )
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
