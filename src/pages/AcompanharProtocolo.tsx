import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldCheck,
  Search,
  Lock,
  MessageSquare,
  Send,
  RotateCw,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  ConsultaProtocoloResultado,
  useConsultarProtocolo,
  useResponderProtocolo,
} from "@/hooks/useDenuncias";

const ETAPAS_TIMELINE = [
  { chave: "Recebida", label: "Recebida", desc: "Registrada no sistema seguro" },
  { chave: "Em análise", label: "Em análise", desc: "Triagem inicial pelo comitê" },
  { chave: "Em apuração", label: "Em apuração", desc: "Diligências e averiguação em andamento" },
  { chave: "Concluída", label: "Concluída", desc: "Processo apurado e finalizado" },
];

export default function AcompanharProtocolo() {
  const [searchParams] = useSearchParams();
  const paramProtocolo = searchParams.get("protocolo") || "";

  const [protocoloInput, setProtocoloInput] = useState(paramProtocolo);
  const [dataFatoInput, setDataFatoInput] = useState("");
  const [resultado, setResultado] = useState<ConsultaProtocoloResultado | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  const consultar = useConsultarProtocolo();
  const responder = useResponderProtocolo();

  const handleConsultar = async (protoOverride?: string) => {
    const proto = (protoOverride || protocoloInput).trim().toUpperCase();
    if (!proto) {
      toast.error("Informe o código do protocolo.");
      return;
    }

    setErroConsulta(null);
    try {
      const data = await consultar.mutateAsync({
        protocolo: proto,
        dataFato: dataFatoInput || null,
      });
      setResultado(data);
    } catch (err: any) {
      setResultado(null);
      setErroConsulta(err?.message || "Protocolo inválido ou não encontrado.");
    }
  };

  useEffect(() => {
    if (paramProtocolo) {
      setProtocoloInput(paramProtocolo);
      handleConsultar(paramProtocolo);
    }
  }, [paramProtocolo]);

  const handleCopiarProtocolo = async () => {
    if (!resultado?.protocolo) return;
    try {
      await navigator.clipboard.writeText(resultado.protocolo);
      setCopiado(true);
      toast.success("Protocolo copiado!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleEnviarResposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultado?.protocolo) return;
    const msg = respostaTexto.trim();
    if (!msg) {
      toast.error("Digite sua mensagem.");
      return;
    }

    try {
      await responder.mutateAsync({
        protocolo: resultado.protocolo,
        dataFato: dataFatoInput || null,
        mensagem: msg,
      });
      toast.success("Mensagem enviada com sucesso ao comitê!");
      setRespostaTexto("");
      // Recarrega os dados para exibir a nova mensagem na lista
      await handleConsultar(resultado.protocolo);
    } catch (err: any) {
      toast.error("Erro ao enviar mensagem", { description: err?.message });
    }
  };

  const getEtapaIndex = (status: string) => {
    const index = ETAPAS_TIMELINE.findIndex((e) => e.chave === status);
    return index >= 0 ? index : 0;
  };

  const etapaAtualIndex = resultado ? getEtapaIndex(resultado.status_externo) : 0;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between">
      {/* Header institucional */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
            <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span>Canal de Ética & Rastreio Seguro</span>
          </div>

          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {!resultado ? (
          /* Formulário de Consulta Inicial */
          <div className="max-w-md mx-auto my-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-1">
                <Search className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Acompanhar Manifestação</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Consulte o andamento da sua denúncia de forma 100% anônima e segura (Lei nº 14.457/2022).
              </p>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Dados para Consulta</CardTitle>
                <CardDescription className="text-xs">
                  Autenticação em 2 fatores para garantia de sigilo estrito.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proto-input" className="text-xs font-semibold uppercase">
                    Protocolo de Rastreio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="proto-input"
                    value={protocoloInput}
                    onChange={(e) => setProtocoloInput(e.target.value.toUpperCase())}
                    placeholder="DEN-2026-XXXXXXXX"
                    className="font-mono text-base uppercase"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Código de 8 caracteres fornecido no momento do registro.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="data-fato-input" className="text-xs font-semibold uppercase">
                      Data aproximada do fato
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Opcional</span>
                  </div>
                  <Input
                    id="data-fato-input"
                    type="date"
                    value={dataFatoInput}
                    onChange={(e) => setDataFatoInput(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Informe a mesma data preenchida no registro, caso a tenha indicado.
                  </p>
                </div>

                {erroConsulta && (
                  <Alert variant="destructive" className="py-2.5 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-semibold">Falha na consulta</AlertTitle>
                    <AlertDescription className="text-xs">
                      {erroConsulta}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => handleConsultar()}
                  disabled={consultar.isPending || !protocoloInput.trim()}
                  className="w-full gap-2 text-xs"
                >
                  <Search className="h-4 w-4" />
                  {consultar.isPending ? "Consultando..." : "Consultar andamento"}
                </Button>
              </CardContent>
            </Card>

            <Alert className="bg-muted/40 border-border text-xs leading-relaxed text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <AlertDescription>
                Seu anonimato é protegido por lei. Nenhuma informação pessoal ou de rede é registrada publicamente.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          /* Painel de Acompanhamento Autenticado */
          <div className="space-y-6">
            {/* Top card com informações do protocolo */}
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Protocolo em Consulta
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                        {resultado.protocolo}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopiarProtocolo}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Copiar protocolo"
                      >
                        {copiado ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Registrado em{" "}
                      {format(new Date(resultado.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConsultar(resultado.protocolo)}
                      disabled={consultar.isPending}
                      className="gap-1.5 text-xs h-9"
                    >
                      <RotateCw className={`h-3.5 w-3.5 ${consultar.isPending ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResultado(null);
                        setProtocoloInput("");
                        setDataFatoInput("");
                      }}
                      className="text-xs h-9 text-muted-foreground"
                    >
                      Nova consulta
                    </Button>
                  </div>
                </div>

                {/* Linha do tempo visual do status externo */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Etapa de Tramitação</span>
                    <Badge variant="default" className="text-xs px-2.5 py-0.5">
                      {resultado.status_externo}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {ETAPAS_TIMELINE.map((etapa, idx) => {
                      const isPassado = idx < etapaAtualIndex;
                      const isAtual = idx === etapaAtualIndex;
                      return (
                        <div
                          key={etapa.chave}
                          className={`rounded-lg border p-3 text-xs space-y-1 transition-colors ${
                            isAtual
                              ? "border-primary bg-primary/10 shadow-sm"
                              : isPassado
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-500/5"
                              : "border-border/50 bg-muted/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            {isPassado ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isAtual ? (
                              <Clock className="h-4 w-4 text-primary animate-pulse" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 ml-1 mr-0.5" />
                            )}
                            <span className={isAtual ? "text-primary" : ""}>
                              {etapa.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {etapa.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo de conclusão (quando o caso foi finalizado) */}
                {resultado.status_externo === "Concluída" && resultado.resumo_publico && (
                  <Alert className="border-emerald-300 dark:border-emerald-700 bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <AlertTitle className="text-emerald-950 dark:text-emerald-300 font-semibold text-sm">
                      Manifestação Concluída — Retorno do Comitê de Ética
                    </AlertTitle>
                    <AlertDescription className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200 mt-2 whitespace-pre-wrap">
                      {resultado.resumo_publico}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Mensageria Bidirecional Anônima */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Comunicação Anônima com o Comitê</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Você pode receber esclarecimentos ou enviar informações complementares sem revelar sua identidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Thread de mensagens */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {resultado.mensagens.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground italic">
                      Nenhuma mensagem trocada até o momento. Caso queira fornecer detalhes adicionais, utilize o campo abaixo.
                    </div>
                  ) : (
                    resultado.mensagens.map((msg) => {
                      const isComite = msg.autor === "comite";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isComite ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 text-xs space-y-1 ${
                              isComite
                                ? "bg-muted border border-border text-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                              <span className="font-semibold uppercase tracking-wider">
                                {isComite ? "Comitê de Apuração" : "Você (Denunciante)"}
                              </span>
                              <span>
                                {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {msg.mensagem}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Formulário para envio de resposta */}
                {resultado.permite_resposta ? (
                  <form onSubmit={handleEnviarResposta} className="space-y-2 pt-2 border-t">
                    <Label htmlFor="resposta-input" className="text-xs font-semibold">
                      Enviar Mensagem ao Comitê
                    </Label>
                    <Textarea
                      id="resposta-input"
                      value={respostaTexto}
                      onChange={(e) => setRespostaTexto(e.target.value)}
                      placeholder="Escreva sua resposta, esclarecimento ou novas informações..."
                      rows={3}
                      maxLength={2000}
                      className="text-xs resize-y"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {respostaTexto.length} / 2000 caracteres
                      </span>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={responder.isPending || !respostaTexto.trim()}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {responder.isPending ? "Enviando..." : "Enviar resposta anônima"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center pt-2 border-t">
                    Este relato já foi concluído pelo comitê. O canal de mensagens diretas está encerrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer com conformidade legal */}
      <footer className="border-t py-4 bg-background text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>
            Canal de Ouvidoria e Denúncias em estrita conformidade com a Lei Federal nº 14.457/2022 (CIPA+A).
          </p>
          <p className="text-[11px] opacity-75">
            Garantia de apuração imparcial, sigilo das informações e não retaliação ao denunciante.
          </p>
        </div>
      </footer>
    </div>
  );
}

