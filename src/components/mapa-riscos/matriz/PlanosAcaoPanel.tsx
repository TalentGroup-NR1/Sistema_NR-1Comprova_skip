import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FAIXA_SUAVE, faixaDoNivel, type MatrizConfig } from "@/lib/matrizRisco";
import type { RiscoGhe } from "@/hooks/useRiscosGhe";

interface PlanoRow {
  id: string;
  titulo: string | null;
  descricao: string | null;
  nivel_risco: string;
  status: string;
  prazo: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  planejado: "Planejado",
  em_andamento: "Em andamento",
  atrasado: "Atrasado",
  concluido: "Concluído",
};

function usePlanosDoGhe(gheId: string | null) {
  return useQuery({
    queryKey: ["nr1-planos-risco", gheId],
    enabled: !!gheId,
    queryFn: async (): Promise<PlanoRow[]> => {
      const { data, error } = await (supabase as any)
        .from("nr1_planos_acao")
        .select("id,titulo,descricao,nivel_risco,status,prazo,created_at")
        .eq("grupo_tipo", "ghe")
        .eq("grupo_id", gheId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanoRow[];
    },
  });
}

interface Props {
  gheId: string;
  gheNome: string;
  config: MatrizConfig;
  riscoParaPlano: RiscoGhe | null;
  onFecharPlano: () => void;
}

export function PlanosAcaoPanel({ gheId, gheNome, config, riscoParaPlano, onFecharPlano }: Props) {
  const { data: planos = [] } = usePlanosDoGhe(gheId);
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivelIntervencao, setNivelIntervencao] = useState("primaria");
  const [prazo, setPrazo] = useState("");

  useEffect(() => {
    if (riscoParaPlano) {
      setTitulo(`${riscoParaPlano.nome_risco} — ${gheNome}`);
      setDescricao(riscoParaPlano.controles_existentes ?? riscoParaPlano.descricao ?? "");
      setPrazo("");
    }
  }, [riscoParaPlano, gheNome]);

  const criar = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      if (!user?.id) throw new Error("Não autenticado.");
      if (!riscoParaPlano) throw new Error("Risco não informado.");
      const nivel = riscoParaPlano.probabilidade * riscoParaPlano.severidade;
      const faixa = faixaDoNivel(nivel, config);
      const { error } = await (supabase as any).from("nr1_planos_acao").insert({
        company_id: companyId,
        origem: "manual",
        grupo_tipo: "ghe",
        grupo_id: gheId,
        grupo_nome: gheNome,
        dimensao_nome: riscoParaPlano.nome_risco,
        indice: nivel,
        nivel_risco: faixa === "vermelho" ? "Vermelho" : "Laranja",
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        nivel_intervencao: nivelIntervencao,
        participacao_trabalhadores: false,
        prazo: prazo || null,
        status: "pendente",
        criado_por: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nr1-planos-risco"] });
      qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] });
      toast({ title: "Plano de ação criado" });
      onFecharPlano();
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar plano", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="space-y-2">
        {planos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum plano de ação vinculado a este GHE.
          </p>
        ) : (
          planos.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <div>
                <div className="font-medium">{p.titulo ?? "Plano sem título"}</div>
                {p.descricao && (
                  <div className="line-clamp-1 text-xs text-muted-foreground">{p.descricao}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {p.prazo && (
                  <span className="text-xs text-muted-foreground">
                    Prazo {format(new Date(`${p.prazo}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={p.nivel_risco === "Vermelho" ? FAIXA_SUAVE.vermelho : FAIXA_SUAVE.laranja}
                >
                  {p.nivel_risco}
                </Badge>
                <Badge variant="secondary">{STATUS_LABEL[p.status] ?? p.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!riscoParaPlano} onOpenChange={(v) => !v && onFecharPlano()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo plano de ação</DialogTitle>
            <DialogDescription>
              Plano vinculado ao risco selecionado no grupo {gheNome}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição / medidas</Label>
              <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nível de intervenção</Label>
                <Select value={nivelIntervencao} onValueChange={setNivelIntervencao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaria">Primária</SelectItem>
                    <SelectItem value="secundaria">Secundária</SelectItem>
                    <SelectItem value="terciaria">Terciária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onFecharPlano}>Cancelar</Button>
            <Button
              onClick={() => criar.mutate()}
              disabled={criar.isPending || !titulo.trim()}
            >
              {criar.isPending ? "Salvando..." : "Criar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
