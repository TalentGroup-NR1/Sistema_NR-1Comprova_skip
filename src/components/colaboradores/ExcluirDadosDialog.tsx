import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useExcluirDadosLgpd } from '@/hooks/useLgpd';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  colaboradorId: string;
  colaboradorNome: string;
  onDeleted?: () => void;
}

export function ExcluirDadosDialog({ open, onOpenChange, colaboradorId, colaboradorNome, onDeleted }: Props) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [nome, setNome] = useState('');
  const excluir = useExcluirDadosLgpd();

  const fechar = () => {
    setEtapa(1);
    setNome('');
    onOpenChange(false);
  };

  const confirmar = async () => {
    await excluir.mutateAsync(colaboradorId);
    fechar();
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) fechar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir dados (LGPD)
          </DialogTitle>
          <DialogDescription>
            {etapa === 1
              ? 'Tem certeza? Esta ação é PERMANENTE e não pode ser desfeita. Todos os dados pessoais e históricos deste colaborador serão removidos definitivamente.'
              : 'Digite o nome do colaborador para confirmar a exclusão:'}
          </DialogDescription>
        </DialogHeader>

        {etapa === 2 && (
          <div className="space-y-2">
            <Label htmlFor="confirm-nome">Nome completo</Label>
            <Input
              id="confirm-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={colaboradorNome}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          {etapa === 1 ? (
            <Button variant="destructive" onClick={() => setEtapa(2)}>Continuar</Button>
          ) : (
            <Button
              variant="destructive"
              disabled={nome.trim() !== colaboradorNome.trim() || excluir.isPending}
              onClick={confirmar}
            >
              {excluir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir permanentemente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
