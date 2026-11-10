import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { PgrSecaoEditor } from "./PgrSecaoEditor";
import { usePgrDadosPsicossociais } from "@/hooks/usePgrDadosPsicossociais";
import type { PgrSecao } from "@/hooks/usePgrSecoes";
import { classificacaoClasse } from "./pgrRiscoUtils";


interface Props {
  documentoId: string;
  secao: PgrSecao;
  subSecoes: PgrSecao[];
  onChange: (id: string, patch: Partial<PgrSecao>) => void;
  onToggleBloco: (ativo: boolean) => void;
}

export function PgrPsicossocialPanel({ documentoId, secao, subSecoes, onChange, onToggleBloco }: Props) {
  const { data, isLoading } = usePgrDadosPsicossociais(documentoId);
  const blocoAtivo = subSecoes.some((s) => s.ativo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Adendo psicossocial</p>
          <p className="text-xs text-muted-foreground">Liga ou desliga todo o bloco no PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{blocoAtivo ? "Incluído" : "Excluído"}</Label>
          <Switch checked={blocoAtivo} onCheckedChange={onToggleBloco} />
        </div>
      </div>

      {secao.tipo === "texto" ? (
        <PgrSecaoEditor secao={secao} onChange={(patch) => onChange(secao.id, patch)} />
      ) : (
        <Badge variant="secondary">Preenchida pelo sistema</Badge>
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">Resultados apurados</CardTitle>
          {data?.classificacao_geral && (
            <Badge variant="outline" className={classificacaoClasse(data.classificacao_geral)}>
              Classificação geral: {data.classificacao_geral}
              {data.score_ponderado != null ? ` (${data.score_ponderado})` : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}

          {!isLoading && (
            <>
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Domínios</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domínio</TableHead>
                      <TableHead className="w-20">Grupo</TableHead>
                      <TableHead className="w-20">Peso</TableHead>
                      <TableHead className="w-24">Mediana</TableHead>
                      <TableHead className="w-32">Classificação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.dominios ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          Sem domínios cadastrados.
                        </TableCell>
                      </TableRow>
                    )}
                    {(data?.dominios ?? []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.nome_dominio}</TableCell>
                        <TableCell className="text-sm">{d.grupo}</TableCell>
                        <TableCell className="text-sm">{d.peso}</TableCell>
                        <TableCell className="text-sm">{d.mediana ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {d.classificacao ? (
                            <Badge variant="outline" className={classificacaoClasse(d.classificacao)}>
                              {d.classificacao}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Resultados por setor</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor</TableHead>
                      <TableHead className="w-28">Respondentes</TableHead>
                      <TableHead className="w-20">E1</TableHead>
                      <TableHead className="w-20">E2</TableHead>
                      <TableHead className="w-20">E3</TableHead>
                      <TableHead className="w-20">E4</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.resultados_por_setor ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                          Sem respostas apuradas.
                        </TableCell>
                      </TableRow>
                    )}
                    {(data?.resultados_por_setor ?? []).map((r) => (
                      <TableRow key={r.setor}>
                        <TableCell className="text-sm">{r.setor}</TableCell>
                        <TableCell className="text-sm">{r.respondentes}</TableCell>
                        <TableCell className="text-sm">{r.escala_1 ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.escala_2 ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.escala_3 ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.escala_4 ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="overflow-x-auto">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Planos de ação psicossociais</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Nº</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="w-32">Obrigatoriedade</TableHead>
                      <TableHead className="w-40">Responsável</TableHead>
                      <TableHead className="w-32">Método</TableHead>
                      <TableHead className="w-32">Data prevista</TableHead>
                      <TableHead className="w-32">Local</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-32">Prioridade (dias)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.planos_acao ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                          Nenhum plano de ação.
                        </TableCell>
                      </TableRow>
                    )}
                    {(data?.planos_acao ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.numero}</TableCell>
                        <TableCell className="text-sm">{p.acao}</TableCell>
                        <TableCell className="text-sm">{p.obrigatoriedade}</TableCell>
                        <TableCell className="text-sm">{p.responsavel ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.metodo ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.data_prevista ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.local ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.status ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.prioridade_dias ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
