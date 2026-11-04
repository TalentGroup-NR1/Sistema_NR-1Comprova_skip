import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Download, Check, AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: string;
  titulo?: string;
  dataEnvio?: Date;
}

export function ProtocoloSucessoModal({
  open,
  onOpenChange,
  protocolo,
  titulo,
  dataEnvio = new Date(),
}: Props) {
  const [copiado, setCopiado] = useState(false);
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);
  const navigate = useNavigate();

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(protocolo);
      setCopiado(true);
      toast.success("Protocolo copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código manualmente.");
    }
  };

  const handleDownload = () => {
    const conteudo = `=====================================================
SISTEMA NR-1 COMPROVA — COMPROVANTE DE PROTOCOLO
=====================================================
Código de Rastreio: ${protocolo}
Data de Envio: ${dataEnvio.toLocaleString("pt-BR")}
${titulo ? `Assunto: ${titulo}\n` : ""}
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
    a.download = `comprovante-${protocolo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiado(true);
    toast.success("Comprovante baixado com sucesso!");
  };

  const handleTentarFechar = () => {
    if (!copiado) {
      setConfirmarFechamento(true);
    } else {
      onOpenChange(false);
      setConfirmarFechamento(false);
    }
  };

  const handleIrParaAcompanhar = () => {
    onOpenChange(false);
    navigate(`/acompanhar?protocolo=${encodeURIComponent(protocolo)}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleTentarFechar() : onOpenChange(o))}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
            <DialogTitle className="text-xl">Registro Concluído com Sucesso</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Sua manifestação foi gravada em nosso canal sigiloso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seu Protocolo Único de Rastreio
            </span>
            <div className="font-mono text-2xl font-bold tracking-wider text-primary select-all py-1">
              {protocolo}
            </div>
            <p className="text-xs text-muted-foreground">
              Código não sequencial e aleatório gerado para a sua proteção.
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
                Certifique-se de salvar o protocolo antes de fechar. Se fechar agora, você não poderá mais acompanhar esta denúncia.
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="default" onClick={handleCopiar} className="text-xs h-7">
                    Copiar agora
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfirmarFechamento(false);
                      onOpenChange(false);
                    }}
                    className="text-xs h-7 text-muted-foreground"
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
              if (!copiado) setConfirmarFechamento(true);
              else onOpenChange(false);
            }}
            className="text-xs"
          >
            Entendi e guardei o código
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

