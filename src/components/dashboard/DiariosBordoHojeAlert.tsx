import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CalendarClock } from 'lucide-react';
import { useDiariosBordoHoje } from '@/hooks/useDiariosBordoHoje';
import { useAuth } from '@/hooks/useAuth';

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30 dias',
  '80_DIAS': '80 dias',
  '120_DIAS': '120 dias',
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export function DiariosBordoHojeAlert() {
  const { user } = useAuth();
  const { data = [], isLoading } = useDiariosBordoHoje();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const storageKey = user?.id ? `diario-bordo-aviso-${user.id}-${today}` : null;

  useEffect(() => {
    if (isLoading || !storageKey) return;
    if (data.length === 0) return;
    if (localStorage.getItem(storageKey)) return;
    setOpen(true);
  }, [isLoading, data.length, storageKey]);

  if (data.length === 0) return null;

  const visible = data.slice(0, 10);
  const extras = data.length - visible.length;

  const handleVerAgora = () => {
    setOpen(false);
    if (data.length === 1 && data[0].colaborador?.id) {
      navigate(`/diario-bordo?colaborador=${data[0].colaborador.id}`);
    } else {
      navigate('/diario-bordo');
    }
  };

  const handleNaoMostrarHoje = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Diário de Bordo para envio hoje
          </AlertDialogTitle>
          <AlertDialogDescription>
            {data.length === 1
              ? 'Há 1 diário de bordo com envio agendado para hoje.'
              : `Há ${data.length} diários de bordo com envio agendado para hoje.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
          {visible.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg border bg-card"
            >
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarImage src={item.colaborador?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(item.colaborador?.full_name || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.colaborador?.full_name || '—'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{MILESTONE_LABELS[item.milestone_type] ?? item.milestone_type}</span>
                  {item.company?.name && (
                    <>
                      <span>•</span>
                      <span className="truncate">{item.company.name}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                Hoje
              </Badge>
            </div>
          ))}
          {extras > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{extras} {extras === 1 ? 'adicional' : 'adicionais'}
            </p>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleNaoMostrarHoje}>
            Não mostrar hoje
          </Button>
          <AlertDialogCancel>Lembrar mais tarde</AlertDialogCancel>
          <AlertDialogAction onClick={handleVerAgora}>Ver agora</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
