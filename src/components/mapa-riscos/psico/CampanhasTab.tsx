import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useGhes } from '@/hooks/useEstruturaConfig';
import { useColaboradores } from '@/hooks/useColaboradores';
import {
  useAcompanhamentoPsico,
  useAvaliacaoMutations,
  useAvaliacoesPsico,
  useInstrumentosPsico,
  type CampanhaStatus,
  type PsicoAvaliacao,
} from '@/hooks/usePsicoAvaliacoes';
import { ResultadosPanel } from './ResultadosPanel';

const STATUS_LABEL: Record<CampanhaStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  em_execucao: { label: 'Em execução', className: 'bg-primary/10 text-primary' },
  finalizada: { label: 'Finalizada', className: 'bg-emerald-500/10 text-emerald-600' },
};

function useCargoGheMap(companyId: string | null) {
  return useQuery({
    queryKey: ['cargos-ghe-map', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase
        .from('cargos')
        .select('id,ghe_id')
        .eq('company_id', companyId as string);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((c) => {
        map[c.id] = c.ghe_id;
      });
      return map;
    },
  });
}

export function CampanhasTab() {
  const companyId = useEffectiveCompanyId();
  const { data: avaliacoes = [], isLoading } = useAvaliacoesPsico();
  const { data: instrumentos = [] } = useInstrumentosPsico();
  const { data: ghes = [] } = useGhes(companyId);
  const { data: colaboradores = [] } = useColaboradores();
  const { data: cargoGhe = {} } = useCargoGheMap(companyId);
  const { criar, atribuir, reabrir, alterarStatus, excluir } = useAvaliacaoMutations();

  const [criarAberto, setCriarAberto] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    instrumento_id: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    ghe_ids: [] as string[],
  });

  const [acompanhando, setAcompanhando] = useState<PsicoAvaliacao | null>(null);
  const [resultadosDe, setResultadosDe] = useState<PsicoAvaliacao | null>(null);
  const [atribuindo, setAtribuindo] = useState<PsicoAvaliacao | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [excluindo, setExcluindo] = useState<PsicoAvaliacao | null>(null);

  const { data: acompanhamento = [], isLoading: carregandoAcomp } = useAcompanhamentoPsico(
    acompanhando?.id ?? null
  );

  const elegiveis = useMemo(() => {
    if (!atribuindo) return [];
    const escopo = new Set(atribuindo.ghe_ids ?? []);
    const termo = busca.trim().toLowerCase();
    return colaboradores
      .filter((c) => (c.status ?? '') !== 'DESLIGADO')
      .filter((c) => {
        if (escopo.size === 0) return true;
        const ghe = c.cargo_id ? cargoGhe[c.cargo_id] : null;
        return ghe ? escopo.has(ghe) : false;
      })
      .filter((c) => !termo || (c.full_name ?? '').toLowerCase().includes(termo));
  }, [atribuindo, colaboradores, cargoGhe, busca]);

  const criarCampanha = async () => {
    if (!form.titulo.trim() || !form.instrumento_id || !form.data_fim) return;
    await criar.mutateAsync({
      titulo: form.titulo.trim(),
      instrumento_id: form.instrumento_id,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      ghe_ids: form.ghe_ids,
    });
    setCriarAberto(false);
    setForm({
      titulo: '',
      instrumento_id: '',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: '',
      ghe_ids: [],
    });
  };

  const confirmarAtribuicao = async () => {
    if (!atribuindo || selecionados.length === 0) return;
    await atribuir.mutateAsync({ avaliacao_id: atribuindo.id, colaborador_ids: selecionados });
    setAtribuindo(null);
    setSelecionados([]);
    setBusca('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Campanhas de avaliação</h2>
          <p className="text-sm text-muted-foreground">
            Aplique instrumentos psicossociais por GHE e acompanhe a adesão em tempo real
          </p>
        </div>
        <Button onClick={() => setCriarAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova campanha
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}

      {!isLoading && avaliacoes.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma campanha criada</p>
            <p className="text-sm text-muted-foreground">
              Crie uma campanha para iniciar o diagnóstico psicossocial.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {avaliacoes.map((a) => {
          const pct =
            a.total_atribuidos > 0
              ? Math.round((a.total_respondidos / a.total_atribuidos) * 100)
              : 0;
          const meta = STATUS_LABEL[a.status] ?? STATUS_LABEL.rascunho;
          return (
            <Card key={a.id} className="animate-fade-in rounded-xl">
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{a.titulo}</p>
                      <Badge className={meta.className} variant="secondary">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.instrumento_nome} ·{' '}
                      {format(new Date(`${a.data_inicio}T12:00:00`), 'dd/MM/yyyy')} a{' '}
                      {format(new Date(`${a.data_fim}T12:00:00`), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={(v) =>
                      alterarStatus.mutate({ id: a.id, status: v as CampanhaStatus })
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="em_execucao">Em execução</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {a.total_respondidos} de {a.total_atribuidos} respostas
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAtribuindo(a);
                      setSelecionados([]);
                    }}
                  >
                    <UserPlus className="mr-2 h-3.5 w-3.5" /> Atribuir colaboradores
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAcompanhando(a)}>
                    <ClipboardList className="mr-2 h-3.5 w-3.5" /> Acompanhamento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResultadosDe(a)}>
                    <BarChart3 className="mr-2 h-3.5 w-3.5" /> Resultados
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setExcluindo(a)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Criar campanha */}
      <Dialog open={criarAberto} onOpenChange={setCriarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
            <DialogDescription>
              Selecione o instrumento, o período e os grupos homogêneos (GHE) participantes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: Diagnóstico psicossocial 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Instrumento</Label>
              <Select
                value={form.instrumento_id}
                onValueChange={(v) => setForm({ ...form, instrumento_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {instrumentos
                    .filter((i) => i.ativo && i.total_perguntas > 0)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome} ({i.total_perguntas} perguntas)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grupos (GHE)</Label>
              <ScrollArea className="h-40 rounded-lg border p-3">
                <div className="space-y-2">
                  {ghes.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.ghe_ids.includes(g.id)}
                        onCheckedChange={(c) =>
                          setForm((f) => ({
                            ...f,
                            ghe_ids: c
                              ? [...f.ghe_ids, g.id]
                              : f.ghe_ids.filter((id) => id !== g.id),
                          }))
                        }
                      />
                      <span>
                        {g.codigo ? `${g.codigo} · ` : ''}
                        {g.nome}
                      </span>
                    </label>
                  ))}
                  {ghes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Cadastre GHEs em Estrutura Organizacional.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={criarCampanha}
              disabled={
                !form.titulo.trim() || !form.instrumento_id || !form.data_fim || criar.isPending
              }
            >
              Criar campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Atribuir colaboradores */}
      <Dialog
        open={!!atribuindo}
        onOpenChange={(o) => {
          if (!o) {
            setAtribuindo(null);
            setSelecionados([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atribuir colaboradores</DialogTitle>
            <DialogDescription>
              Apenas colaboradores dos GHEs da campanha são listados. Cada um recebe uma
              notificação para responder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar colaborador"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{elegiveis.length} elegíveis</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSelecionados(
                    selecionados.length === elegiveis.length
                      ? []
                      : elegiveis.map((c) => c.id as string)
                  )
                }
              >
                {selecionados.length === elegiveis.length ? 'Limpar' : 'Selecionar todos'}
              </Button>
            </div>
            <ScrollArea className="h-64 rounded-lg border p-3">
              <div className="space-y-2">
                {elegiveis.map((c) => (
                  <label key={c.id as string} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selecionados.includes(c.id as string)}
                      onCheckedChange={(v) =>
                        setSelecionados((prev) =>
                          v
                            ? [...prev, c.id as string]
                            : prev.filter((id) => id !== (c.id as string))
                        )
                      }
                    />
                    <span className="flex-1">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">{c.department}</span>
                  </label>
                ))}
                {elegiveis.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum colaborador elegível para os GHEs desta campanha.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuindo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAtribuicao}
              disabled={selecionados.length === 0 || atribuir.isPending}
            >
              Atribuir ({selecionados.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acompanhamento */}
      <Sheet open={!!acompanhando} onOpenChange={(o) => !o && setAcompanhando(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Acompanhamento</SheetTitle>
            <SheetDescription>
              {acompanhando?.titulo} — atualizado em tempo real
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {carregandoAcomp && <Skeleton className="h-40 rounded-xl" />}
            {!carregandoAcomp && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>GHE</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acompanhamento.map((i) => (
                    <TableRow key={i.atribuicao_id}>
                      <TableCell className="font-medium">{i.colaborador_nome}</TableCell>
                      <TableCell className="text-muted-foreground">{i.ghe_nome ?? '—'}</TableCell>
                      <TableCell>
                        {i.status === 'preenchido' ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Respondido
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {i.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.status === 'preenchido' && acompanhando && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              reabrir.mutate({
                                atribuicao_id: i.atribuicao_id,
                                avaliacao_id: acompanhando.id,
                              })
                            }
                          >
                            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reabrir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {acompanhamento.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Nenhum colaborador atribuído ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Resultados */}
      <Sheet open={!!resultadosDe} onOpenChange={(o) => !o && setResultadosDe(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Resultados</SheetTitle>
            <SheetDescription>{resultadosDe?.titulo}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ResultadosPanel avaliacaoId={resultadosDe?.id ?? null} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
            <AlertDialogDescription>
              As atribuições e respostas de “{excluindo?.titulo}” serão removidas
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluindo) excluir.mutate(excluindo.id);
                setExcluindo(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
