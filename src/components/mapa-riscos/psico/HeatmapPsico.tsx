import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Info, Loader2, Users } from "lucide-react";
import { useAvaliacoesPsico } from "@/hooks/usePsicoAvaliacoes";
import { useHeatmapPsico, type AgrupamentoHeatmap } from "@/hooks/usePsicoHeatmap";
import { CORES_RISCO, MIN_RESPONDENTES, classificarRisco, faixasTexto } from "@/lib/psicoRiscos";

interface Props {
  avaliacaoId?: string | null;
  onChangeAvaliacao?: (id: string) => void;
}

export function HeatmapPsico({ avaliacaoId: controlled, onChangeAvaliacao }: Props) {
  const { data: campanhas = [], isLoading: loadingCampanhas } = useAvaliacoesPsico();
  const [internal, setInternal] = useState<string>("");
  const [agrupamento, setAgrupamento] = useState<AgrupamentoHeatmap>("ghe");

  const avaliacaoId = controlled ?? (internal || campanhas[0]?.id || null);
  const { data, isLoading } = useHeatmapPsico(avaliacaoId, agrupamento);

  const setAvaliacao = (id: string) => {
    setInternal(id);
    onChangeAvaliacao?.(id);
  };

  const dimensoes = data?.dimensoes ?? [];
  const linhas = data?.linhas ?? [];

  const adesao = useMemo(() => {
    if (!data || !data.total_atribuidos) return 0;
    return Math.round((data.total_respondidos / data.total_atribuidos) * 100);
  }, [data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Heatmap de Riscos Psicossociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Campanha</label>
              <Select value={avaliacaoId ?? ""} onValueChange={setAvaliacao} disabled={loadingCampanhas}>
                <SelectTrigger><SelectValue placeholder="Selecione a campanha" /></SelectTrigger>
                <SelectContent>
                  {campanhas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo} — {c.instrumento_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Agrupar por</label>
              <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as AgrupamentoHeatmap)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ghe">GHE (Grupo Homogêneo de Exposição)</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Adesão</div>
                <div className="font-semibold">
                  {data ? `${adesao}% (${data.total_respondidos}/${data.total_atribuidos})` : "—"}
                </div>
              </div>
              {!!data?.grupos_omitidos && (
                <Badge variant="outline" className="bg-slate-50">
                  {data.grupos_omitidos} grupo(s) omitido(s)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Grupos com menos de {data?.min_respondentes ?? MIN_RESPONDENTES} respondentes são omitidos para preservar
              o anonimato. As faixas de risco são configuráveis por dimensão no editor de instrumentos, e a leitura
              respeita o tipo da dimensão (positiva ou negativa).
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : !avaliacaoId ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Selecione uma campanha.</div>
          ) : linhas.length === 0 || dimensoes.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Dados insuficientes para exibir o heatmap desta campanha.
            </div>
          ) : (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-background text-left p-2 border-b min-w-[180px]">
                        {agrupamento === "ghe" ? "GHE" : "Departamento"}
                      </th>
                      <th className="p-2 border-b text-center w-16">Resp.</th>
                      {dimensoes.map((d) => (
                        <th key={d.dimensao_id} className="p-2 border-b text-center align-bottom min-w-[90px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help leading-tight inline-block">{d.dimensao}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium mb-1">
                                {d.dimensao} · dimensão {d.tipo_dimensao}
                              </p>
                              {faixasTexto(d.tipo_dimensao, d.corte_medio, d.corte_alto).map((f) => (
                                <p key={f.nivel}>
                                  {f.nivel}: {f.texto}
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.grupo_chave} className="hover:bg-muted/30">
                        <td className="sticky left-0 bg-background p-2 border-b font-medium">{l.grupo_nome}</td>
                        <td className="p-2 border-b text-center text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {l.respondentes}
                          </span>
                        </td>
                        {dimensoes.map((d) => {
                          const c = l.celulas.find((x) => x.dimensao_id === d.dimensao_id);
                          const nivel = classificarRisco(d.tipo_dimensao, c?.indice, d.corte_medio, d.corte_alto);
                          return (
                            <td key={d.dimensao_id} className="p-1 border-b text-center">
                              {nivel ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`rounded px-2 py-1.5 font-semibold cursor-help ${CORES_RISCO[nivel]}`}
                                    >
                                      {c?.indice?.toFixed(0)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{l.grupo_nome} · {d.dimensao}</p>
                                    <p>Índice: {c?.indice?.toFixed(1)} / 100</p>
                                    <p>Média: {c?.media?.toFixed(2)}</p>
                                    <p>Nível: {nivel}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="rounded px-2 py-1.5 bg-slate-100 text-slate-400">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-red-600 inline-block" /> Risco Alto
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-orange-500 inline-block" /> Risco Médio
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-emerald-600 inline-block" /> Risco Baixo
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-slate-100 border inline-block" /> Sem dados / omitido
                </span>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
