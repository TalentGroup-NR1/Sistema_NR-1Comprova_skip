import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useImportarCbo } from '@/hooks/useEstruturaConfig';
import { toast } from '@/hooks/use-toast';

function parseCsv(texto: string) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (linhas.length === 0) return [];
  const sep = linhas[0].includes(';') ? ';' : ',';
  const head = linhas[0].toLowerCase();
  const temHeader = head.includes('codigo') || head.includes('código');
  return linhas
    .slice(temHeader ? 1 : 0)
    .map((l) => {
      const cols = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      return { codigo: cols[0], titulo: cols[1] ?? '', descricao: cols[2] ?? null };
    })
    .filter((r) => r.codigo && r.titulo);
}

export function ImportarCboDialog() {
  const [open, setOpen] = useState(false);
  const importar = useImportarCbo();

  const handleFile = async (file: File) => {
    const linhas = parseCsv(await file.text());
    if (linhas.length === 0) {
      toast({
        title: 'Arquivo inválido',
        description: 'Use um CSV com as colunas: código, título, descrição.',
        variant: 'destructive',
      });
      return;
    }
    await importar.mutateAsync(linhas);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Importar CBO
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar catálogo CBO</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV com as colunas: código, título e descrição (opcional). Códigos já
            existentes são atualizados.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={importar.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
        />
      </DialogContent>
    </Dialog>
  );
}
