import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PgrDadosAutomaticos } from "@/hooks/usePgrDadosAutomaticos";
import { PgrRiscoDetalheDialog, type PgrRiscoItem } from "./PgrRiscoDetalheDialog";
import { nivelRiscoClasse, nivelRiscoLabel } from "./pgrRiscoUtils";

interface Props {
  chave: string;
  documentoId: string;
  dados?: PgrDadosAutomaticos;
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground">{texto}</p>;
}

/** Preview dos blocos automáticos do PGR (caracterização, cargos, inventário GHE e plano de ação). */
export function PgrBlocoAutomatico({ chave, documentoId, dados }: Props) {
  const [riscoSel, setRiscoSel] = useState<{ risco: PgrRiscoItem; ghe: string } | null>(null);

  const setores = (dados?.setores ?? []) as Array<Record<string, any>>;
  const cargos = (dados?.cargos ?? []) as Array<Record<string, any>>;
  const descricoes = (dados?.descricoes_cargo ?? []) as Array<Record<string, any>>;
  const ghes = (dados?.ghes ?? []) as Array<Record<string, any>>;
  const planos = (dados?.planos_acao ?? []) as Array<Record<string, any>>;

  const linhasCaracterizacao = useMemo(() => {
    return ghes.length || setores.length
      ? cargos.map((c) => {
          const ghe = ghes.find((g) => g.id === c.ghe_id);
          return { setor: ghe?.setor ?? "—", cargo: c.nome, headcount: c.headcount ?? 0 };
        })
      : cargos.map((c) => ({ setor: "—", cargo: c.nome, headcount: c.headcount ?? 0 }));
  }, [cargos, ghes, setores]);

  if (chave === "caracterizacao") {
    return (
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">Caracterização da organização</CardTitle>
          <Badge variant="outline">Headcount total: {dados?.headcount_total ?? 0}</Badge>
        </CardHeader>
        <CardContent>
          {linhasCaracterizacao.length === 0 ? (
            <Vazio texto="Nenhum cargo cadastrado na estrutura organizacional." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-40">Nº de funcionários</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasCaracterizacao.map((l, i) => (
                  <TableRow key={`${l.cargo}-${i}`}>
                    <TableCell className="text-sm">{l.setor}</TableCell>
                    <TableCell className="text-sm">{l.cargo}</TableCell>
                    <TableCell className="text-sm">{l.headcount}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-sm font-medium" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="text-sm font-medium">{dados?.headcount_total ?? 0}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  if (chave === "relacao_cargos") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Relação de cargos e descrições</CardTitle>
        </CardHeader>
        <CardContent>
          {cargos.length === 0 ? (
            <Vazio texto="Nenhum cargo cadastrado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Cargo</TableHead>
                  <TableHead>Descrição de atividades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargos.map((c) => {
                  const d = descricoes.find((x) => x.cargo_id === c.id);
                  const texto =
                    d?.descricao_sumaria || c.tarefa_prescrita || c.tarefa_real || "Descrição não cadastrada.";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm align-top">
                        <div className="font-medium">{c.nome}</div>
                        {c.cbo_codigo && (
                          <div className="text-xs text-muted-foreground">CBO {c.cbo_codigo}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-pre-wrap">{texto}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  if (chave === "inventario_ghe") {
    return (
      <div className="space-y-4">
        {ghes.length === 0 && <Vazio texto="Nenhum GHE cadastrado." />}
        {ghes.map((g) => {
          const riscos = (g.riscos ?? []) as PgrRiscoItem[];
          const cargosGhe = (g.cargos ?? []) as Array<Record<string, any>>;
          const headcount = cargos
            .filter((c) => c.ghe_id === g.id)
            .reduce((acc, c) => acc + (c.headcount ?? 0), 0);
          return (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {g.codigo ? `${g.codigo} — ` : ""}
                  {g.nome}
                </CardTitle>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Local / setor: {g.setor ?? "—"}</p>
                  <p>Atividade: {g.descricao ?? "—"}</p>
                  <p>Exposição: {g.tipo_exposicao ?? "—"}</p>
                  <p>
                    Cargos: {cargosGhe.length ? cargosGhe.map((c) => c.nome).join(", ") : "—"} · Nº de
                    funcionários: {headcount}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {riscos.length === 0 ? (
                  <Vazio texto="Nenhum risco vinculado a este GHE." />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {riscos.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRiscoSel({ risco: r, ghe: g.nome })}
                        className="text-left rounded-lg border p-3 hover:bg-accent transition-colors"
                      >
                        <p className="text-sm font-medium">{r.nome_risco}</p>
                        <p className="text-xs text-muted-foreground">Grupo: {r.categoria ?? "—"}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          <Badge variant="outline">S: {r.severidade ?? "—"}</Badge>
                          <Badge variant="outline">P: {r.probabilidade ?? "—"}</Badge>
                          <Badge variant="outline" className={nivelRiscoClasse(r.nivel_risco)}>
                            {nivelRiscoLabel(r.nivel_risco)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <PgrRiscoDetalheDialog
          documentoId={documentoId}
          risco={riscoSel?.risco ?? null}
          gheNome={riscoSel?.ghe}
          open={!!riscoSel}
          onOpenChange={(o) => !o && setRiscoSel(null)}
        />
      </div>
    );
  }

  if (chave === "plano_acao") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Plano de ação</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {planos.length === 0 ? (
            <Vazio texto="Nenhum plano de ação cadastrado." />
          ) : (
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
                {planos.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.numero ?? i + 1}</TableCell>
                    <TableCell className="text-sm">{p.acao}</TableCell>
                    <TableCell className="text-sm">{p.obrigatoriedade ?? "—"}</TableCell>
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
          )}
        </CardContent>
      </Card>
    );
  }

  return <Vazio texto="Esta seção é gerada automaticamente a partir dos dados do sistema." />;
}
