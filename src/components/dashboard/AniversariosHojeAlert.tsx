import { useEffect, useState } from 'react';
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
import { Cake, PartyPopper } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { differenceInYears, parseISO } from 'date-fns';

interface Colaborador {
  id: string;
  full_name: string;
  birth_date?: string;
  avatar_url?: string;
  department?: string;
}

interface WorkAnniv {
  colaborador: Colaborador;
  anos: number;
  isToday: boolean;
}

interface Props {
  aniversariantes: Colaborador[];
  aniversariosEmpresa: WorkAnniv[];
  isLoading?: boolean;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

function isBirthdayToday(birth_date?: string) {
  if (!birth_date) return false;
  const d = parseISO(birth_date);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function AniversariosHojeAlert({ aniversariantes, aniversariosEmpresa, isLoading }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const storageKey = user?.id ? `aniversarios-aviso-${user.id}-${today}` : null;

  const birthdaysToday = aniversariantes.filter(c => isBirthdayToday(c.birth_date));
  const workAnnivToday = aniversariosEmpresa.filter(a => a.isToday);
  const total = birthdaysToday.length + workAnnivToday.length;

  useEffect(() => {
    if (isLoading || !storageKey || total === 0) return;
    if (localStorage.getItem(storageKey)) return;
    setOpen(true);
  }, [isLoading, total, storageKey]);

  if (total === 0) return null;

  const handleNaoMostrarHoje = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            Aniversariantes de hoje
          </AlertDialogTitle>
          <AlertDialogDescription>
            Não esqueça de parabenizar quem está fazendo aniversário hoje.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
          {birthdaysToday.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Cake className="h-3.5 w-3.5" />
                Aniversário ({birthdaysToday.length})
              </h4>
              <div className="space-y-2">
                {birthdaysToday.map(c => {
                  const idade = c.birth_date
                    ? differenceInYears(new Date(), parseISO(c.birth_date))
                    : null;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <Avatar className="h-9 w-9 border-2 border-primary/20">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        {c.department && (
                          <p className="text-xs text-muted-foreground truncate">{c.department}</p>
                        )}
                      </div>
                      {idade != null && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {idade} anos
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {workAnnivToday.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <PartyPopper className="h-3.5 w-3.5" />
                Aniversário de empresa ({workAnnivToday.length})
              </h4>
              <div className="space-y-2">
                {workAnnivToday.map(a => (
                  <div key={a.colaborador.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarImage src={a.colaborador.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(a.colaborador.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.colaborador.full_name}</p>
                      {a.colaborador.department && (
                        <p className="text-xs text-muted-foreground truncate">{a.colaborador.department}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {a.anos} {a.anos === 1 ? 'ano' : 'anos'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleNaoMostrarHoje}>
            Não mostrar hoje
          </Button>
          <AlertDialogCancel>Lembrar mais tarde</AlertDialogCancel>
          <AlertDialogAction onClick={() => setOpen(false)}>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
