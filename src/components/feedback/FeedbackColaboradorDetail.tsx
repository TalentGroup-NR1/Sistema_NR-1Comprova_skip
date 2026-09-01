import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, Building2, User, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  useColaboradorDetalhe,
  useFeedbacksColaborador,
  useCreateFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
  FeedbackColaborador,
} from '@/hooks/useFeedbacksColaboradores';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackTimeline } from './FeedbackTimeline';

interface FeedbackColaboradorDetailProps {
  colaboradorId: string;
  onBack: () => void;
}

export function FeedbackColaboradorDetail({ colaboradorId, onBack }: FeedbackColaboradorDetailProps) {
  const { user } = useAuth();
  const [editingFeedback, setEditingFeedback] = useState<FeedbackColaborador | null>(null);
  
  const { data: colaborador, isLoading: loadingColaborador } = useColaboradorDetalhe(colaboradorId);
  const { data: feedbacks, isLoading: loadingFeedbacks } = useFeedbacksColaborador(colaboradorId);
  
  const createFeedback = useCreateFeedback();
  const updateFeedback = useUpdateFeedback();
  const deleteFeedback = useDeleteFeedback();

  // Fetch user profile to get the name
  const handleSubmit = async (data: {
    data_feedback: string;
    assunto: string;
    detalhes_conversa: string;
    prazo_retorno: string | null;
    alerta: boolean;
  }) => {
    if (!colaborador || !user) return;

    if (editingFeedback) {
      await updateFeedback.mutateAsync({
        id: editingFeedback.id,
        colaborador_id: colaboradorId,
        ...data,
      });
      setEditingFeedback(null);
    } else {
      // Get user name from profiles or use email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();
      
      await createFeedback.mutateAsync({
        company_id: colaborador.company_id,
        colaborador_id: colaboradorId,
        registrado_por_user_id: user.id,
        registrado_por_nome: profile?.full_name || profile?.email || user.email || 'Usuário',
        ...data,
      });
    }
  };

  const handleEdit = (feedback: FeedbackColaborador) => {
    setEditingFeedback(feedback);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (feedback: FeedbackColaborador) => {
    await deleteFeedback.mutateAsync({
      id: feedback.id,
      colaborador_id: colaboradorId,
    });
  };

  if (loadingColaborador) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Colaborador não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Colaborador Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{colaborador.full_name}</h2>
                {colaborador.status === 'DESLIGADO' && (
                  <Badge variant="secondary">Desligado</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {colaborador.job_title}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {colaborador.department}
                </Badge>
                {colaborador.manager_name && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Gestor: {colaborador.manager_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <FeedbackForm
        onSubmit={handleSubmit}
        isSubmitting={createFeedback.isPending || updateFeedback.isPending}
        editingFeedback={editingFeedback}
        onCancelEdit={() => setEditingFeedback(null)}
      />

      {/* Feedback Timeline */}
      <FeedbackTimeline
        feedbacks={feedbacks || []}
        isLoading={loadingFeedbacks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteFeedback.isPending}
      />
    </div>
  );
}
