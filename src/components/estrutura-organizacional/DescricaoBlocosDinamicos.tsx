import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DBloco, DCampo } from '@/lib/descricaoModelo';

export type ValorCampo = string | string[] | null;

interface Props {
  blocos: DBloco[];
  /** Índice inicial da numeração dos blocos (o bloco 1 é sempre a Identificação). */
  inicioNumeracao?: number;
  getValor: (campo: DCampo) => ValorCampo;
  setValor: (campo: DCampo, valor: ValorCampo) => void;
  readOnly?: boolean;
}

function asLista(v: ValorCampo): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) return v.split('\n');
  return [];
}

export function DescricaoBlocosDinamicos({
  blocos,
  inicioNumeracao = 2,
  getValor,
  setValor,
  readOnly,
}: Props) {
  const renderCampo = (campo: DCampo) => {
    const valor = getValor(campo);

    if (campo.tipo === 'lista' || campo.tipo === 'atividades') {
      const itens = asLista(valor);
      return (
        <div className="space-y-2">
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
          )}
          {itens.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Textarea
                rows={2}
                disabled={readOnly}
                value={item}
                onChange={(e) => {
                  const arr = [...itens];
                  arr[i] = e.target.value;
                  setValor(campo, arr);
                }}
              />
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setValor(campo, itens.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setValor(campo, [...itens, ''])}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar item
            </Button>
          )}
        </div>
      );
    }

    if (campo.tipo === 'selecao') {
      return (
        <Select
          value={typeof valor === 'string' ? valor : ''}
          disabled={readOnly}
          onValueChange={(v) => setValor(campo, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-background">
            {(campo.opcoes ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (campo.tipo === 'sim_nao') {
      return (
        <Select
          value={typeof valor === 'string' ? valor : ''}
          disabled={readOnly}
          onValueChange={(v) => setValor(campo, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-background">
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (campo.tipo === 'texto_curto') {
      return (
        <Input
          disabled={readOnly}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => setValor(campo, e.target.value)}
        />
      );
    }

    return (
      <Textarea
        rows={4}
        disabled={readOnly}
        value={typeof valor === 'string' ? valor : ''}
        onChange={(e) => setValor(campo, e.target.value)}
      />
    );
  };

  return (
    <>
      {blocos.map((bloco, i) => (
        <Card key={bloco.id} className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {inicioNumeracao + i} · {bloco.titulo}
            </CardTitle>
            {bloco.descricao && (
              <p className="text-sm text-muted-foreground">{bloco.descricao}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {bloco.campos.length === 0 && (
              <p className="text-sm text-muted-foreground">Bloco sem campos configurados.</p>
            )}
            {bloco.campos.map((campo) => (
              <div key={campo.id} className="space-y-1.5">
                <Label>
                  {campo.label}
                  {campo.obrigatorio && ' *'}
                </Label>
                {campo.ajuda && <p className="text-xs text-muted-foreground">{campo.ajuda}</p>}
                {renderCampo(campo)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
