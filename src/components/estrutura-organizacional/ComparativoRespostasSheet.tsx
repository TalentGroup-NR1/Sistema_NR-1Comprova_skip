import { useMemo, useState } from 'react';
import { Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { respostaToTexto, type QSecao } from '@/lib/questionarioCargo';
import { construirPatch, mesclarValores, type ImportPatch } from '@/lib/questionarioConsolidacao';
import type { DCampo } from '@/lib/descricaoModelo';
import type { Atribuicao } from '@/hooks/useQuestionarioAtribuicoes';
import { useRespostasMultiplas } from '@/hooks/useQuestionarioAtribuicoes';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  atribuicoes: Atribuicao[];
  secoes: QSecao[];
  campos: Record<string, DCampo>;
  onImport: (patch: ImportPatch) => void;
}

export function ComparativoRespostasSheet({
  open,
  onOpenChange,
  atribuicoes,
  secoes,
  campos,
  onImport,
}: Props) {
  const ids = useMemo(() => atribuicoes.map((a) => a.id), [atribuicoes]);
  const { data: porAtribuicao = {} } = useRespostasMultiplas(open ? ids : []);

  // seleção: pergunta_id -> lista de atribuicao_id escolhidas
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const toggle = (perguntaId: string, atribId: string, checked: boolean) =>
    setSel((s) => {
      const atual = s[perguntaId] ?? [];
      return {
        ...s,
        [perguntaId]: checked ? [...atual, atribId] : atual.filter((x) => x !== atribId),
      };
    });

  const totalSelecionado = Object.values(sel).reduce((n, v) => n + v.length, 0);

  const perguntas = useMemo(() => secoes.flatMap((s) => s.perguntas), [secoes]);

  const importar = () => {
    const respostas: Record<string, unknown> = {};
    perguntas.forEach((p) => {
      const escolhidos = sel[p.id] ?? [];
      if (escolhidos.length === 0) return;
      const valores = escolhidos.map((aid) => porAtribuicao[aid]?.[p.id]);
      const merged = mesclarValores(p.tipo, valores);
      if (merged != null) respostas[p.id] = merged;
    });
    onImport(construirPatch(secoes, campos, respostas));
    setSel({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Comparar respostas
          </SheetTitle>
          <SheetDescription>
            Marque, em cada pergunta, as respostas que devem compor a descrição. Se marcar mais de
            uma, os textos são combinados (as atividades são somadas).
          </SheetDescription>
        </SheetHeader>

        <div className="sticky top-0 z-10 -mx-6 mt-4 border-b bg-background px-6 pb-3">
          <Button onClick={importar} disabled={totalSelecionado === 0} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Usar seleção na descrição
            {totalSelecionado > 0 ? ` (${totalSelecionado})` : ''}
          </Button>
        </div>

        <div className="mt-4 space-y-6">
          {secoes.map((s) => (
            <div key={s.id} className="space-y-3">
              <p className="text-sm font-semibold">{s.titulo}</p>
              {s.perguntas.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{p.titulo}</p>
                  <Separator className="my-2" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {atribuicoes.map((a) => {
                      const texto = respostaToTexto(p, porAtribuicao[a.id]?.[p.id]);
                      const marcado = (sel[p.id] ?? []).includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-sm transition-colors ${
                            marcado ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={marcado}
                            disabled={!texto}
                            onCheckedChange={(v) => toggle(p.id, a.id, !!v)}
                          />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-xs font-medium">
                              {a.colaborador_nome}
                              {!texto && (
                                <Badge variant="secondary" className="text-[10px]">
                                  sem resposta
                                </Badge>
                              )}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                              {texto || '—'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
