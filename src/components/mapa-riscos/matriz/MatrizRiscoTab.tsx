import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3X3, Plus, Settings2, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useGhes } from "@/hooks/useEstruturaConfig";
import { useAvaliacoesPsico } from "@/hooks/usePsicoAvaliacoes";
import { useMatrizConfig } from "@/hooks/useMatrizConfig";
import { useRiscosGhe, type RiscoGhe } from "@/hooks/useRiscosGhe";
import { useSyncPsicossociais } from "@/hooks/useSugestaoRiscos";
import { CONFIG_PADRAO, FAIXA_LABEL, FAIXA_SUAVE, faixaDoNivel } from "@/lib/matrizRisco";
import { MatrizGrid } from "./MatrizGrid";
import { RiscosPanel } from "./RiscosPanel";
import { RiscoFormDialog } from "./RiscoFormDialog";
import { SugestoesModal } from "./SugestoesModal";
import { MatrizConfigDialog } from "./MatrizConfigDialog";
import { PlanosAcaoPanel } from "./PlanosAcaoPanel";

export function MatrizRiscoTab() {
  const companyId = useEffectiveCompanyId();
  const { data: ghes = [] } = useGhes(companyId);
  const { data: avaliacoes = [] } = useAvaliacoesPsico();
  const { data: config = CONFIG_PADRAO } = useMatrizConfig();

  const [gheId, setGheId] = useState<string | null>(null);
  const [avaliacaoId, setAvaliacaoId] = useState<string>("");
  const [celula, setCelula] = useState<{ p: number; s: number } | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [riscoEditando, setRiscoEditando] = useState<RiscoGhe | null>(null);
  const [sugestoesAberto, setSugestoesAberto] = useState(false);
  const [configAberto, setConfigAberto] = useState(false);
  const [riscoParaPlano, setRiscoParaPlano] = useState<RiscoGhe | null>(null);
  const [subTab, setSubTab] = useState("matriz");

  const abrirPlano = (r: RiscoGhe) => {
    setRiscoParaPlano(r);
    setSubTab("planos");
  };

  const gheAtual = ghes.find((g) => g.id === gheId) ?? null;
  const { data: riscos = [], isLoading } = useRiscosGhe(gheId);
  const sync = useSyncPsicossociais();

  const resumo = useMemo(() => {
    const base = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };
    riscos.forEach((r) => {
      base[faixaDoNivel(r.probabilidade * r.severidade, config)] += 1;
    });
    return base;
  }, [riscos, config]);

  const sincronizar = async () => {
    if (!avaliacaoId) {
      toast({ title: "Selecione uma campanha psicossocial", variant: "destructive" });
      return;
    }
    try {
      const res = await sync.mutateAsync(avaliacaoId);
      toast({
        title: "Sincronização concluída",
        description: `${res.riscos_criados} risco(s) e ${res.planos_criados} plano(s) criados.`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="h-5 w-5 text-orange-500" />
            Matriz de Risco 5×5
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={gheId ?? ""} onValueChange={(v) => { setGheId(v); setCelula(null); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione o GHE" />
              </SelectTrigger>
              <SelectContent>
                {ghes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.codigo ? `${g.codigo} — ` : ""}{g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setConfigAberto(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Faixas
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!gheId ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Selecione um Grupo Homogêneo de Exposição (GHE) para montar a matriz de risco.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => { setRiscoEditando(null); setFormAberto(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar risco
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSugestoesAberto(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Sugerir riscos
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Select value={avaliacaoId} onValueChange={setAvaliacaoId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Campanha psicossocial" />
                    </SelectTrigger>
                    <SelectContent>
                      {avaliacoes.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.titulo ?? a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={sincronizar} disabled={sync.isPending}>
                    {sync.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sincronizar psicossociais
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["vermelho", "laranja", "amarelo", "verde"] as const).map((f) => (
                  <Badge key={f} variant="outline" className={FAIXA_SUAVE[f]}>
                    {FAIXA_LABEL[f]}: {resumo[f]}
                  </Badge>
                ))}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="matriz">Matriz</TabsTrigger>
                    <TabsTrigger value="riscos">Riscos ({riscos.length})</TabsTrigger>
                    <TabsTrigger value="planos">Planos de ação</TabsTrigger>
                  </TabsList>

                  <TabsContent value="matriz" className="space-y-6">
                    <MatrizGrid
                      riscos={riscos}
                      config={config}
                      selecionada={celula}
                      onSelecionar={setCelula}
                    />
                    {celula && (
                      <RiscosPanel
                        riscos={riscos}
                        config={config}
                        celula={celula}
                        onLimparCelula={() => setCelula(null)}
                        onEditar={(r) => { setRiscoEditando(r); setFormAberto(true); }}
                        onCriarPlano={abrirPlano}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="riscos">
                    <RiscosPanel
                      riscos={riscos}
                      config={config}
                      celula={null}
                      onLimparCelula={() => setCelula(null)}
                      onEditar={(r) => { setRiscoEditando(r); setFormAberto(true); }}
                      onCriarPlano={abrirPlano}
                    />
                  </TabsContent>

                  <TabsContent value="planos">
                    <PlanosAcaoPanel
                      gheId={gheId}
                      gheNome={gheAtual?.nome ?? ""}
                      config={config}
                      riscoParaPlano={riscoParaPlano}
                      onFecharPlano={() => setRiscoParaPlano(null)}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {gheId && (
        <>
          <RiscoFormDialog
            open={formAberto}
            onOpenChange={setFormAberto}
            gheId={gheId}
            config={config}
            risco={riscoEditando}
          />
          <SugestoesModal
            open={sugestoesAberto}
            onOpenChange={setSugestoesAberto}
            gheId={gheId}
            config={config}
          />
        </>
      )}

      <MatrizConfigDialog open={configAberto} onOpenChange={setConfigAberto} config={config} />
    </div>
  );
}
