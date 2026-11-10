import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/comunicados/RichTextEditor';
import { FeedbackColaborador } from '@/hooks/useFeedbacksColaboradores';
import { Switch } from '@/components/ui/switch';

interface FeedbackFormProps {
  onSubmit: (data: {
    data_feedback: string;
    assunto: string;
    detalhes_conversa: string;
    prazo_retorno: string | null;
    alerta: boolean;
  }) => void;
  isSubmitting: boolean;
  editingFeedback?: FeedbackColaborador | null;
  onCancelEdit?: () => void;
}

export function FeedbackForm({ onSubmit, isSubmitting, editingFeedback, onCancelEdit }: FeedbackFormProps) {
  const [dataFeedback, setDataFeedback] = useState<Date>(new Date());
  const [assunto, setAssunto] = useState('');
  const [detalhesConversa, setDetalhesConversa] = useState('');
  const [prazoRetorno, setPrazoRetorno] = useState<Date | undefined>();
  const [alerta, setAlerta] = useState(false);

  useEffect(() => {
    if (editingFeedback) {
      setDataFeedback(new Date(editingFeedback.data_feedback));
      setAssunto(editingFeedback.assunto);
      setDetalhesConversa(editingFeedback.detalhes_conversa);
      setPrazoRetorno(editingFeedback.prazo_retorno ? new Date(editingFeedback.prazo_retorno) : undefined);
      setAlerta(editingFeedback.alerta ?? false);
    } else {
      resetForm();
    }
  }, [editingFeedback]);

  const resetForm = () => {
    setDataFeedback(new Date());
    setAssunto('');
    setDetalhesConversa('');
    setPrazoRetorno(undefined);
    setAlerta(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assunto.trim() || !detalhesConversa.trim()) {
      return;
    }

    onSubmit({
      data_feedback: format(dataFeedback, 'yyyy-MM-dd'),
      assunto: assunto.trim(),
      detalhes_conversa: detalhesConversa,
      prazo_retorno: prazoRetorno ? format(prazoRetorno, 'yyyy-MM-dd') : null,
      alerta,
    });

    if (!editingFeedback) {
      resetForm();
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{editingFeedback ? 'Editar Feedback' : 'Registrar Novo Feedback'}</span>
          {editingFeedback && (
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_feedback">Data do Feedback</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataFeedback && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFeedback ? format(dataFeedback, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFeedback}
                    onSelect={(date) => date && setDataFeedback(date)}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo_retorno">Prazo para Retorno (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !prazoRetorno && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {prazoRetorno ? format(prazoRetorno, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={prazoRetorno}
                    onSelect={setPrazoRetorno}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                placeholder="Ex: Alinhamento de Projeto, Feedback de Desempenho..."
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="alerta"
                checked={alerta}
                onCheckedChange={setAlerta}
              />
              <Label htmlFor="alerta" className={cn(
                "flex items-center gap-1 cursor-pointer whitespace-nowrap text-sm",
                alerta && "text-destructive font-medium"
              )}>
                <AlertTriangle className={cn("h-4 w-4", alerta ? "text-destructive" : "text-muted-foreground")} />
                Alerta
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Detalhes da Conversa</Label>
            <RichTextEditor
              content={detalhesConversa}
              onChange={setDetalhesConversa}
              placeholder="Descreva os detalhes da conversa, pontos discutidos, acordos..."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !assunto.trim() || !detalhesConversa.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {editingFeedback ? 'Salvar Alterações' : 'Salvar Feedback'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
