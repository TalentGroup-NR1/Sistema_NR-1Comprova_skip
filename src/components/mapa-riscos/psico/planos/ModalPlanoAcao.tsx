import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  PlanoAcao,
  PlanoAcaoNivel,
  PlanoAcaoStatus,
  PlanoGrupoTipo,
  useCreatePlanoManual,
  useDeletePlanoAcao,
  useUpdatePlanoAcao,
} from "@/hooks/usePlanosAcao";
import { useResponsaveisRH } from "@/hooks/useResponsaveisRH";
import { CORES_RISCO_SUAVE } from "@/lib/psicoRiscos";
import type { HeatmapDimensao, HeatmapLinha, AgrupamentoHeatmap } from "@/hooks/usePsicoHeatmap";

export type ModalPlanoMode =
  | { kind: "edit"; plano: PlanoAcao; forceStatus?: PlanoAcaoStatus }
  | {
      kind: "create-manual";
      avaliacaoId: string;
      agrupamento: AgrupamentoHeatmap;
      dimensoes: HeatmapDimensao[];
      linhas: HeatmapLinha[];
    };

interface Props {
  open: boolean;
  mode: ModalPlanoMode | null;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: Exclude<PlanoAcaoStatus, "pendente">; label: string }[] = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "atrasado", label: "Atrasado" },
  { value: "concluido", label: "Concluído" },
];

const NIVEIS: { value: PlanoAcaoNivel; label: string }[] = [
  { value: "primaria", label: "Ação Primária — Prevenção e mudança no processo de trabalho" },
  { value: "secundaria", label: "Ação Secundária — Treinamento, suporte e educação" },
  { value: "terciaria", label: "Ação Terciária — Reabilitação e acompanhamento de afastados" },
];

export function ModalPlanoAcao({ open, mode, onClose }: Props) {
  const { data: responsaveis = [] } = useResponsaveisRH();
  const updateMut = useUpdatePlanoAcao();
  const createMut = useCreatePlanoManual();
  const deleteMut = useDeletePlanoAcao();

  const isEdit = mode?.kind === "edit";

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivelIntervencao, setNivelIntervencao] = useState<PlanoAcaoNivel | "">("");
  const [participacao, setParticipacao] = useState(false);
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [prazo, setPrazo] = useState<string>("");
  const [status, setStatus] = useState<Exclude<PlanoAcaoStatus, "pendente">>("planejado");

  // Criação manual
  const [grupoChave, setGrupoChave] = useState<string>("");
  const [dimensaoId, setDimensaoId] = useState<string>("");
  const [nivelRisco, setNivelRisco] = useState<"Vermelho" | "Laranja">("Vermelho");

  useEffect(() => {
    if (!open || !mode) return;
    if (mode.kind === "edit") {
      const p = mode.plano;
      setTitulo(p.titulo ?? "");
      setDescricao(p.descricao ?? "");
      setNivelIntervencao(p.nivel_intervencao ?? "");
      setParticipacao(p.participacao_trabalhadores);
      setResponsavelId(p.responsavel_id ?? "");
      setPrazo(p.prazo ?? "");
      const initialStatus =
        mode.forceStatus && mode.forceStatus !== "pendente"
          ? (mode.forceStatus as Exclude<PlanoAcaoStatus, "pendente">)
          : p.status === "pendente"
            ? "planejado"
            : (p.status as Exclude<PlanoAcaoStatus, "pendente">);
      setStatus(initialStatus);
      setNivelRisco(p.nivel_risco);
    } else {
      setTitulo("");
      setDescricao("");
      setNivelIntervencao("");
      setParticipacao(false);
      setResponsavelId("");
      setPrazo("");
      setStatus("planejado");
      setGrupoChave("");
      setDimensaoId("");
      setNivelRisco("Vermelho");
    }
  }, [open, mode]);

  if (!mode) return null;

  async function handleSave() {
    if (!mode) return;
    if (!titulo.trim()) return toast.error("Informe o título da ação");
    if (!descricao.trim()) return toast.error("Descreva a intervenção");
    if (!nivelIntervencao) return toast.error("Selecione o nível da intervenção");
    if (!participacao) return toast.error("É obrigatório confirmar a participação dos trabalhadores");
    if (!prazo) return toast.error("Informe o prazo");

    try {
      if (mode.kind === "edit") {
        await updateMut.mutateAsync({
          id: mode.plano.id,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          nivel_intervencao: nivelIntervencao as PlanoAcaoNivel,
          participacao_trabalhadores: participacao,
          responsavel_id: responsavelId || null,
          prazo,
          status,
        });
      } else {
        const linha = mode.linhas.find((l) => l.grupo_chave === grupoChave);
        if (!linha) return toast.error("Selecione o grupo");
        const dim = mode.dimensoes.find((d) => d.dimensao_id === dimensaoId) ?? null;
        const celula = linha.celulas.find((c) => c.dimensao_id === dimensaoId);
        await createMut.mutateAsync({
          avaliacao_id: mode.avaliacaoId,
          dimensao_id: dim?.dimensao_id ?? null,
          dimensao_nome: dim?.dimensao ?? null,
          grupo_tipo: mode.agrupamento as PlanoGrupoTipo,
          grupo_id: linha.grupo_id,
          grupo_nome: linha.grupo_nome,
          indice: celula?.indice ?? null,
          nivel_risco: nivelRisco,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          nivel_intervencao: nivelIntervencao as PlanoAcaoNivel,
          participacao_trabalhadores: participacao,
          responsavel_id: responsavelId || null,
          prazo,
          status,
        });
      }
      toast.success("Plano de ação salvo");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar plano");
    }
  }

  async function handleDelete() {
    if (!mode || mode.kind !== "edit") return;
    if (!confirm("Excluir este plano de ação? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteMut.mutateAsync(mode.plano.id);
      toast.success("Plano excluído");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir");
    }
  }

  const saving = updateMut.isPending || createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Plano de Ação" : "Novo Plano Manual"}</DialogTitle>
          <DialogDescription>
            Registre a intervenção corretiva para o risco identificado, conforme NR-1 e CFP nº 14/2023.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Atenção:</strong> Evite planos de prateleira ou focados apenas no indivíduo (ex: transferir o
            funcionário de setor). A legislação exige ações específicas para modificar a causa raiz no ambiente de
            trabalho.
          </span>
        </div>

        {mode.kind === "edit" ? (
          <div className="rounded-md bg-muted/40 p-3 text-xs flex flex-wrap gap-2 items-center">
            <Badge variant="outline">{mode.plano.grupo_nome ?? mode.plano.departamento ?? "—"}</Badge>
            {mode.plano.dimensao_nome && <Badge variant="outline">{mode.plano.dimensao_nome}</Badge>}
            {mode.plano.indice != null && (
              <Badge variant="outline">Índice {Number(mode.plano.indice).toFixed(1)}</Badge>
            )}
            <Badge variant="outline" className={CORES_RISCO_SUAVE[mode.plano.nivel_risco]}>
              {mode.plano.nivel_risco}
            </Badge>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>{mode.agrupamento === "ghe" ? "GHE *" : "Departamento *"}</Label>
              <Select value={grupoChave} onValueChange={setGrupoChave}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {mode.linhas.map((l) => (
                    <SelectItem key={l.grupo_chave} value={l.grupo_chave}>{l.grupo_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Dimensão *</Label>
              <Select value={dimensaoId} onValueChange={setDimensaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {mode.dimensoes.map((d) => (
                    <SelectItem key={d.dimensao_id} value={d.dimensao_id}>{d.dimensao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nível de Risco *</Label>
              <Select value={nivelRisco} onValueChange={(v) => setNivelRisco(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vermelho">Vermelho</SelectItem>
                  <SelectItem value="Laranja">Laranja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título da Ação *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1">
            <Label>Descrição da Intervenção *</Label>
            <Textarea
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva como esta ação transformará a organização ou a gestão do trabalho neste grupo"
            />
          </div>

          <div className="space-y-1">
            <Label>Nível da Intervenção *</Label>
            <Select value={nivelIntervencao} onValueChange={(v) => setNivelIntervencao(v as PlanoAcaoNivel)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
            <Checkbox
              id="participacao"
              checked={participacao}
              onCheckedChange={(v) => setParticipacao(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="participacao" className="text-xs leading-snug cursor-pointer">
              Confirmo que as medidas propostas contaram com a escuta e participação ativa dos trabalhadores do grupo,
              conforme diretrizes do CFP. *
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Responsável pela Execução</Label>
              <Select value={responsavelId || "__none"} onValueChange={(v) => setResponsavelId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Não definido —</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prazo *</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending} className="mr-auto">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
