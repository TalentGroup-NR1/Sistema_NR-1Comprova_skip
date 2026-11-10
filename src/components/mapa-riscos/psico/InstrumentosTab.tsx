import { useState } from 'react';
import { Copy, Pencil, Plus, Trash2, Lock, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  useInstrumentoMutations,
  useInstrumentosPsico,
  type PsicoInstrumentoResumo,
} from '@/hooks/usePsicoAvaliacoes';
import { InstrumentoEditorSheet } from './InstrumentoEditorSheet';

export function InstrumentosTab() {
  const { data: instrumentos = [], isLoading } = useInstrumentosPsico();
  const { salvarInstrumento, duplicar, excluirInstrumento } = useInstrumentoMutations();

  const [novoAberto, setNovoAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', versao: '1.0', descricao: '' });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<PsicoInstrumentoResumo | null>(null);

  const criar = async () => {
    if (!form.nome.trim()) return;
    const id = await salvarInstrumento.mutateAsync({
      nome: form.nome.trim(),
      versao: form.versao.trim() || '1.0',
      descricao: form.descricao.trim() || null,
    });
    setNovoAberto(false);
    setForm({ nome: '', versao: '1.0', descricao: '' });
    setEditandoId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Instrumentos</h2>
          <p className="text-sm text-muted-foreground">
            Modelos padrão validados cientificamente e questionários próprios da empresa
          </p>
        </div>
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo instrumento
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && instrumentos.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum instrumento disponível</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {instrumentos.map((i) => {
          const bloqueado = !i.editavel || i.em_uso;
          return (
            <Card key={i.id} className="animate-fade-in rounded-xl transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold leading-tight">{i.nome}</p>
                    <p className="text-xs text-muted-foreground">Versão {i.versao}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!i.editavel && <Badge variant="secondary">Modelo padrão</Badge>}
                    {i.em_uso && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" /> Em uso
                      </Badge>
                    )}
                  </div>
                </div>

                {i.descricao && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{i.descricao}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{i.total_dimensoes} dimensões</span>
                  <span>·</span>
                  <span>{i.total_perguntas} perguntas</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditandoId(i.id)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    {bloqueado ? 'Visualizar' : 'Editar perguntas'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicar.mutate({ id: i.id })}
                    disabled={duplicar.isPending}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={bloqueado}
                    onClick={() => setExcluindo(i)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>

                {bloqueado && (
                  <p className="text-xs text-muted-foreground">
                    {i.em_uso
                      ? 'Este instrumento está em uso em campanhas ativas. Duplique para criar uma versão editável.'
                      : 'Modelo padrão protegido. Duplique para criar uma versão editável.'}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo instrumento</DialogTitle>
            <DialogDescription>
              Crie um questionário psicossocial do zero. As dimensões e perguntas são definidas em
              seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Diagnóstico psicossocial interno"
              />
            </div>
            <div className="space-y-2">
              <Label>Versão</Label>
              <Input
                value={form.versao}
                onChange={(e) => setForm({ ...form, versao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={criar} disabled={!form.nome.trim() || salvarInstrumento.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instrumento</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as dimensões e perguntas de “{excluindo?.nome}” serão removidas. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluindo) excluirInstrumento.mutate(excluindo.id);
                setExcluindo(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InstrumentoEditorSheet
        instrumentoId={editandoId}
        onClose={() => setEditandoId(null)}
      />
    </div>
  );
}
