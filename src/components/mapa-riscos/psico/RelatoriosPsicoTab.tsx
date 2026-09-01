import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PgrTab } from "@/components/mapa-riscos/pgr/PgrTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAvaliacoesPsico } from "@/hooks/usePsicoAvaliacoes";
import { useHeatmapPsico, type AgrupamentoHeatmap } from "@/hooks/usePsicoHeatmap";
import { usePlanosAcao } from "@/hooks/usePlanosAcao";
import { resolverEmitente } from "@/lib/relatorioEmitente";
import { gerarRelatorioPsicoPDF } from "@/lib/relatorioPsicoPDF";

export function RelatoriosPsicoTab() {
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const { data: campanhas = [] } = useAvaliacoesPsico();

  const [avaliacaoSel, setAvaliacaoSel] = useState("");
  const [agrupamento, setAgrupamento] = useState<AgrupamentoHeatmap>("ghe");
  const [respNome, setRespNome] = useState("");
  const [respRegistro, setRespRegistro] = useState("");
  const [respCargo, setRespCargo] = useState("");
  const [gerando, setGerando] = useState(false);

  const avaliacaoId = avaliacaoSel || campanhas[0]?.id || null;
  const campanha = campanhas.find((c) => c.id === avaliacaoId) ?? null;
  const { data: heatmap, isLoading } = useHeatmapPsico(avaliacaoId, agrupamento);
  const { data: planos = [] } = usePlanosAcao(avaliacaoId);

  async function handleGerar() {
    if (!campanha || !heatmap) return toast.error("Selecione uma campanha com dados apurados");
    setGerando(true);
    try {
      let empresa: { name: string; cnpj: string | null; logo_url: string | null } | null = null;
      if (companyId) {
        const { data } = await supabase
          .from("companies")
          .select("name, cnpj, logo_url")
          .eq("id", companyId)
          .maybeSingle();
        empresa = (data as any) ?? null;
      }
      const emitente = await resolverEmitente(user?.id ?? "", user?.email ?? "—");
      await gerarRelatorioPsicoPDF({
        campanha,
        heatmap,
        planos,
        empresa,
        responsavelTecnico: {
          nome: respNome.trim() || emitente.nome,
          registro: respRegistro.trim() || null,
          cargo: respCargo.trim() || null,
        },
        emitente,
      });
      toast.success("Relatório gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar relatório");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Tabs defaultValue="tecnico" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tecnico">Relatório técnico</TabsTrigger>
        <TabsTrigger value="pgr">PGR completo</TabsTrigger>
      </TabsList>

      <TabsContent value="pgr">
        <PgrTab />
      </TabsContent>

      <TabsContent value="tecnico" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-orange-500" />
            Relatório técnico NR-1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Campanha</Label>
              <Select value={avaliacaoId ?? ""} onValueChange={setAvaliacaoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
              <Label>Agrupamento dos resultados</Label>
              <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as AgrupamentoHeatmap)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ghe">GHE</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Responsável técnico</Label>
              <Input value={respNome} onChange={(e) => setRespNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>Registro profissional</Label>
              <Input value={respRegistro} onChange={(e) => setRespRegistro(e.target.value)} placeholder="CRP / CREA / etc." />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={respCargo} onChange={(e) => setRespCargo(e.target.value)} placeholder="Ex.: Psicóloga do Trabalho" />
            </div>
          </div>

          {heatmap && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Apuração: {heatmap.total_respondidos} de {heatmap.total_atribuidos} respondentes ·{" "}
              {heatmap.linhas.length} grupo(s) analisado(s) · {heatmap.dimensoes.length} dimensão(ões) ·{" "}
              {planos.length} plano(s) de ação · {heatmap.grupos_omitidos} grupo(s) omitido(s) por anonimato.
            </div>
          )}

          <Button onClick={handleGerar} disabled={gerando || isLoading || !heatmap}>
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar relatório em PDF
          </Button>
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
}
