import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { useCriarDenuncia } from "@/hooks/useDenuncias";
import {
  CATEGORIA_OPTIONS,
  ORIGEM_OPTIONS,
  CIPA_AVISO_SIGILO,
  type CategoriaComportamento,
  type OrigemOfensa,
} from "@/lib/cipaCategorias";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtocoloSucessoModal } from "./ProtocoloSucessoModal";

const schema = z.object({
  titulo: z.string().trim().min(3, "Informe um título com no mínimo 3 caracteres").max(200, "Máximo 200 caracteres"),
  categoria: z.string().min(1, "Selecione o tipo de comportamento ofensivo"),
  origem: z.string().min(1, "Selecione a origem da ofensa"),
  mensagem: z.string().trim().min(10, "Descreva os fatos com no mínimo 10 caracteres").max(5000, "Máximo 5000 caracteres"),
  dataFato: z.string().nullable().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CanalDenunciaModal({ open, onOpenChange }: Props) {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaComportamento | "">("");
  const [origem, setOrigem] = useState<OrigemOfensa | "">("");
  const [mensagem, setMensagem] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [tituloGravado, setTituloGravado] = useState<string>("");

  const criar = useCriarDenuncia();
  const hojeStr = new Date().toISOString().split("T")[0];

  const reset = () => {
    setTitulo("");
    setCategoria("");
    setOrigem("");
    setMensagem("");
    setDataFato("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      titulo,
      categoria,
      origem,
      mensagem,
      dataFato: dataFato || null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    try {
      const protocolo = await criar.mutateAsync({
        tipo: "denuncia",
        titulo: parsed.data.titulo,
        mensagem: parsed.data.mensagem,
        anonimo: true,
        categoria: parsed.data.categoria,
        origem: parsed.data.origem,
        data_fato: parsed.data.dataFato ?? null,
      });

      setTituloGravado(parsed.data.titulo);
      setProtocoloGerado(protocolo);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.message === "company_not_found"
          ? "Não foi possível identificar sua empresa. Contate o suporte."
          : err?.message;
      toast.error("Erro ao registrar denúncia", { description: msg });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              <DialogTitle className="text-xl">Canal de Denúncias — Lei nº 14.457/2022</DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed">
              Canal sigiloso e independente para relatos de assédio, discriminação ou violência no trabalho.
              As denúncias são tratadas com total imparcialidade pelo comitê designado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-destructive">
                <Lock className="h-3.5 w-3.5" />
                Anonimato Garantido por Lei
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {CIPA_AVISO_SIGILO}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cd-titulo" className="text-xs font-semibold">
                Título do Relato <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cd-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Ex: Assédio moral recorrente no setor operacional"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cd-categoria" className="text-xs font-semibold">
                  Natureza da Conduta <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={categoria}
                  onValueChange={(v) => setCategoria(v as CategoriaComportamento)}
                >
                  <SelectTrigger id="cd-categoria" className="text-xs">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cd-origem" className="text-xs font-semibold">
                  Origem do Fato <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={origem}
                  onValueChange={(v) => setOrigem(v as OrigemOfensa)}
                >
                  <SelectTrigger id="cd-origem" className="text-xs">
                    <SelectValue placeholder="Por parte de quem ocorreu" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGEM_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cd-data-fato" className="text-xs font-semibold">
                  Data aproximada do ocorrido
                </Label>
                <span className="text-[11px] text-muted-foreground">Opcional</span>
              </div>
              <Input
                id="cd-data-fato"
                type="date"
                max={hojeStr}
                value={dataFato}
                onChange={(e) => setDataFato(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Ajuda na averiguação e atua como fator de consulta do protocolo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cd-mensagem" className="text-xs font-semibold">
                Descrição dos Fatos <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cd-mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={5000}
                placeholder="Descreva a situação com o máximo de detalhes possível (locais, datas, testemunhas, impacto na integridade física ou psicológica)..."
                rows={5}
                className="text-xs resize-y"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                <span>Mínimo de 10 caracteres</span>
                <span>{mensagem.length}/5000</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={criar.isPending}
                className="gap-2 text-xs"
              >
                <ShieldAlert className="h-4 w-4" />
                {criar.isPending ? "Gravando denúncia..." : "Registrar Denúncia Sigilosa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {protocoloGerado && (
        <ProtocoloSucessoModal
          open={!!protocoloGerado}
          onOpenChange={(aberto) => !aberto && setProtocoloGerado(null)}
          protocolo={protocoloGerado}
          titulo={tituloGravado}
        />
      )}
    </>
  );
}

