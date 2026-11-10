import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, Loader2, RotateCcw, Save, Plus } from "lucide-react";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { usePgrDocumento } from "@/hooks/usePgrDocumento";
import { usePgrSecoes, type PgrSecao } from "@/hooks/usePgrSecoes";
import { usePgrDadosAutomaticos } from "@/hooks/usePgrDadosAutomaticos";
import { usePgrDadosPsicossociais } from "@/hooks/usePgrDadosPsicossociais";
import { gerarPgrPdf } from "@/lib/pgrPdfGenerator";
import { toast } from "sonner";
import { PGR_TEXTO_PADRAO } from "@/lib/pgrTextoPadrao";
import { PGR_TEXTO_PSICOSSOCIAL } from "@/lib/pgrTextoPsicossocial";
import { sanitizeRichText } from "@/lib/sanitize";
import { PgrSecoesList } from "./PgrSecoesList";
import { PgrSecaoEditor } from "./PgrSecaoEditor";
import { PgrIdentificacaoForm } from "./PgrIdentificacaoForm";
import { PgrAlteracoesTable } from "./PgrAlteracoesTable";
import { PgrPsicossocialPanel } from "./PgrPsicossocialPanel";
import { PgrBlocoAutomatico } from "./PgrBlocoAutomatico";


const isIdentificacao = (s: PgrSecao) =>
  s.chave_automatica === "identificacao" || s.titulo.toLowerCase().includes("identificação da empresa");
const isPsico = (s: PgrSecao) => (s.numero ?? "").startsWith("17");

export function PgrTab() {
  const companyId = useEffectiveCompanyId();
  const { documento, isLoading: loadingDoc, criar, salvar } = usePgrDocumento(companyId);
  const documentoId = documento?.id ?? null;
  const { secoes: secoesRemotas, alteracoes, empresa, isLoading, salvar: salvarSecoes, salvarAlteracoes } =
    usePgrSecoes(documentoId);
  const { data: dadosAuto } = usePgrDadosAutomaticos(documentoId);
  const { data: dadosPsico } = usePgrDadosPsicossociais(documentoId);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const [secoes, setSecoes] = useState<PgrSecao[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSecoes(secoesRemotas);
    setSelectedId((cur) => cur ?? secoesRemotas[0]?.id ?? null);
  }, [secoesRemotas]);

  const selected = useMemo(() => secoes.find((s) => s.id === selectedId) ?? null, [secoes, selectedId]);

  function patchSecao(id: string, patch: Partial<PgrSecao>) {
    setSecoes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function novaSecao() {
    const tempId = `nova-${Date.now()}`;
    const nova = {
      id: tempId,
      documento_id: documentoId ?? "",
      numero: String(secoes.length + 1),
      titulo: "Nova seção",
      conteudo: "",
      tipo: "texto",
      chave_automatica: null,
      ordem: secoes.length + 1,
      ativo: true,
      created_at: "",
      updated_at: "",
    } as PgrSecao;
    setSecoes((ss) => [...ss, nova]);
    setSelectedId(tempId);
  }

  function handleSalvar() {
    salvarSecoes.mutate(
      secoes.map((s) => ({
        ...s,
        id: s.id.startsWith("nova-") ? undefined : s.id,
        updated_at: s.id.startsWith("nova-") ? undefined : s.updated_at,
      }))
    );
  }

  async function handleGerarPdf() {
    if (!documento) return;
    setGerandoPdf(true);
    try {
      await gerarPgrPdf({
        documento,
        empresa: {
          nome: empresa?.nome ?? documento.titulo,
          cnpj: empresa?.cnpj ?? null,
          logo_url: empresa?.logo_url ?? null,
        },
        secoes,
        alteracoes,
        dadosAuto,
        dadosPsico,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar o PDF");
    } finally {
      setGerandoPdf(false);
    }
  }

  function restaurarPadrao() {
    if (!selected || selected.tipo !== "texto") return;
    const base =
      PGR_TEXTO_PADRAO.find((t) => t.numero === selected.numero) ??
      PGR_TEXTO_PSICOSSOCIAL.find((t) => t.numero === selected.numero);
    if (!base) return;
    patchSecao(selected.id, { conteudo: base.conteudo, titulo: base.titulo });
  }

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Selecione uma empresa para editar o PGR.</p>;
  }

  if (loadingDoc || isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (!documento) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Nenhum documento PGR criado para esta empresa.</p>
          <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar documento PGR
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{documento.titulo}</h3>
          <p className="text-xs text-muted-foreground">
            Vigência: {documento.vigencia_inicio ?? "—"} a {documento.vigencia_fim ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={restaurarPadrao} disabled={!selected || selected.tipo !== "texto"}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restaurar texto padrão
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={salvarSecoes.isPending}>
            {salvarSecoes.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          <Button size="sm" variant="secondary" onClick={handleGerarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            {gerandoPdf ? "Gerando..." : "Gerar PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Seções</CardTitle>
          </CardHeader>
          <CardContent>
            <PgrSecoesList
              secoes={secoes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggle={(id, ativo) => patchSecao(id, { ativo })}
              onReorder={setSecoes}
              onNova={novaSecao}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm">{selected ? selected.titulo : "Selecione uma seção"}</CardTitle>
            {selected?.tipo === "automatico" && <Badge variant="secondary">Preenchida pelo sistema</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected && <p className="text-sm text-muted-foreground">Escolha uma seção à esquerda.</p>}

            {selected && isIdentificacao(selected) && (
              <>
                <PgrIdentificacaoForm
                  documento={documento}
                  saving={salvar.isPending}
                  onSave={(payload) =>
                    salvar.mutate({ documentoId: documento.id, updated_at: documento.updated_at, ...payload })
                  }
                />
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Quadro de alterações</p>
                  <PgrAlteracoesTable
                    alteracoes={alteracoes}
                    saving={salvarAlteracoes.isPending}
                    onSave={(linhas) => salvarAlteracoes.mutate(linhas)}
                  />
                </div>
              </>
            )}

            {selected && !isIdentificacao(selected) && isPsico(selected) && (
              <PgrPsicossocialPanel
                documentoId={documento.id}
                secao={selected}
                subSecoes={secoes.filter(isPsico)}
                onChange={patchSecao}
                onToggleBloco={(ativo) =>
                  setSecoes((ss) => ss.map((s) => (isPsico(s) ? { ...s, ativo } : s)))
                }
              />
            )}

            {selected && !isIdentificacao(selected) && !isPsico(selected) && selected.tipo === "texto" && (
              <PgrSecaoEditor secao={selected} onChange={(patch) => patchSecao(selected.id, patch)} />
            )}

            {selected && !isIdentificacao(selected) && !isPsico(selected) && selected.tipo === "automatico" && (
              <div className="space-y-3">
                {selected.conteudo && (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(selected.conteudo) }}
                  />
                )}
                <PgrBlocoAutomatico
                  chave={selected.chave_automatica ?? ""}
                  documentoId={documento.id}
                  dados={dadosAuto}
                />
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
