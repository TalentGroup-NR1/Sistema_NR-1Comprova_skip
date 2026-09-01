import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCboSearch } from '@/hooks/useEstruturaConfig';

interface Props {
  codigo: string;
  descricao: string;
  onChange: (codigo: string, descricao: string) => void;
}

export function CboAutocomplete({ codigo, descricao, onChange }: Props) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const { data: resultados = [], isFetching } = useCboSearch(termo);

  useEffect(() => {
    if (!termo) setAberto(false);
  }, [termo]);

  return (
    <div className="space-y-2">
      <Label>Buscar CBO</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          placeholder="Código ou título da ocupação"
          className="pl-8"
        />
        {isFetching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        {aberto && resultados.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-md">
            {resultados.map((r: { codigo: string; titulo: string }) => (
              <button
                key={r.codigo}
                type="button"
                onClick={() => {
                  onChange(r.codigo, r.titulo);
                  setTermo('');
                  setAberto(false);
                }}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span> — {r.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Código CBO</Label>
          <Input value={codigo} onChange={(e) => onChange(e.target.value, descricao)} placeholder="1234-56" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Descrição CBO</Label>
          <Input value={descricao} onChange={(e) => onChange(codigo, e.target.value)} />
        </div>
      </div>
    </div>
  );
}
