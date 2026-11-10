import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldAlert,
  Lock,
  AlertTriangle,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
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

const schema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, "Informe um título com no mínimo 3 caracteres")
    .max(200, "Máximo 200 caracteres"),
  categoria: z.string().min(1, "Selecione o tipo de comportamento ofensivo"),
  origem: z.string().min(1, "Selecione a origem da ofensa"),
  mensagem: z
    .string()
    .trim()
    .min(10, "Descreva os fatos com no mínimo 10 caracteres")
    .max(5000, "Máximo 5000 caracteres"),
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

  // Estado do Protocolo e Segurança pós-envio
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [tituloGravado, setTituloGravado] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);

  const criar = useCriarDenuncia();
  const navigate = useNavigate();
  const hojeStr = new Date().toISOString().split("T")[0];

  const resetForm = () => {
    setTitulo("");
    setCategoria("");
    setOrigem("");
    setMensagem("");
    setDataFato("");
    setProtocoloGerado(null);
    setTituloGravado("");
    setCopiado(false);
    setConfirmarFechamento(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleCopiar = async () => {
    if (!protocoloGerado) return;
    try {
      await navigator.clipboard.writeText(protocoloGerado);
      setCopiado(true);
      toast.success("Protocolo copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código manualmente.");
    }
  };

  const handleDownload = () => {
    if (!protocoloGerado) return;
    const conteudo = `=====================================================
SISTEMA NR-1 COMPROVA — COMPROVANTE DE PROTOCOLO
=====================================================
Código de Rastreio: ${protocoloGerado}
Data de Envio: ${new Date().toLocaleString("pt-BR")}
${tituloGravado ? `Assunto: ${tituloGravado}\n` : ""}
IMPORTANTE:
Guarde este código em local seguro. É a sua ÚNICA via para
consultar o andamento da manifestação e interagir de forma
totalmente anônima com o Comitê de Apuração (Lei nº 14.457/2022).

Para acompanhar, acesse:
/acompanhar
=====================================================`;

    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-${protocoloGerado}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiado(true);
    toast.success("Comprovante baixado com sucesso!");
  };

  const handleIrParaAcompanhar = () => {
    if (!protocoloGerado) return;
    const proto = protocoloGerado;
    resetForm();
    onOpenChange(false);
    navigate(`/acompanhar?protocolo=${encodeURIComponent(proto)}`);
  };

  const handleTentativaFechar = (novoAberto: boolean) => {
    if (!novoAberto) {
      // Guard de confirmação: se há protocolo gerado e o usuário ainda não copiou/baixou
      if (protocoloGerado && !copiado) {
        setConfirmarFechamento(true);
        return; // Bloqueia fechamento involuntário
      }
      resetForm();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
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

      if (!protocolo || typeof protocolo !== "string") {
        console.warn("[CanalDenuncia] Retorno de protocolo inválido:", protocolo);
        throw new Error("Não foi possível gerar o código do protocolo.");
      }

      setTituloGravado(parsed.data.titulo);
      setProtocoloGerado(protocolo);
      setCopiado(false);
      setConfirmarFechamento(false);
      toast.success("Denúncia gravada com sucesso! Guarde seu protocolo.");
      // NÃO FECHA O MODAL: O modal transiciona diretamente para a tela de exibição do protocolo
    } catch (err: any) {
      const msg =
        err?.message === "company_not_found"
          ? "Não foi possível identificar sua empresa. Contate o suporte."
          : err?.message;
      toast.error("Erro ao registrar denúncia", { description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleTentativaFechar}>
      <DialogContent
        className={
          protocoloGerado
            ? "max-w-md sm:max-w-lg"
            : "max-w-xl max-h-[90vh] overflow-y-auto"
        }
      >
        {protocoloGerado ? (
          // ==========================================
          // TELA 2: PROTOCOLO GERADO + GUARDS DE SEGURANÇA
          // ==========================================
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
                <DialogTitle className="text-xl">Registro Concluído com Sucesso</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Sua manifestação foi gravada em nosso canal sigiloso com proteção da Lei nº 14.457/2022.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Seu Protocolo Único de Rastreio
                </span>
                <div className="font-mono text-2xl font-bold tracking-wider text-primary select-all py-1">
                  {protocoloGerado}
                </div>
                <p className="text-xs text-muted-foreground">
                  Código aleatório e sigiloso gerado para a sua proteção.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopiar}
                  className="gap-2 text-xs"
                >
                  {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiado ? "Copiado!" : "Copiar protocolo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-2 text-xs"
                >
                  <Download className="h-4 w-4" />
                  Baixar comprovante (.txt)
                </Button>
              </div>

              <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Aviso Crítico de Segurança</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  Guarde este código. É a sua <strong>ÚNICA</strong> forma de acompanhar o andamento da denúncia e responder às solicitações do comitê. Por motivos de sigilo estrito, o sistema não recupera protocolos perdidos.
                </AlertDescription>
              </Alert>

              {confirmarFechamento && (
                <Alert className="border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-xs font-semibold">Você ainda não copiou o código!</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    Certifique-se de salvar o protocolo antes de fechar. Sem ele não será possível acompanhar sua denúncia.
                    <div className="mt-2.5 flex gap-2">
                      <Button size="sm" variant="default" onClick={handleCopiar} className="text-xs h-7">
                        Copiar agora
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setConfirmarFechamento(false);
                          resetForm();
                          onOpenChange(false);
                        }}
                        className="text-xs h-7 text-muted-foreground hover:text-foreground"
                      >
                        Fechar mesmo assim
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleIrParaAcompanhar}
                className="text-xs text-primary hover:text-primary gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Acompanhar agora
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!copiado) {
                    setConfirmarFechamento(true);
                  } else {
                    resetForm();
                    onOpenChange(false);
                  }
                }}
                className="text-xs"
              >
                Entendi e guardei o código
              </Button>
            </div>
          </div>
        ) : (
          // ==========================================
          // TELA 1: FORMULÁRIO DE REGISTRO DE DENÚNCIA
          // ==========================================
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
