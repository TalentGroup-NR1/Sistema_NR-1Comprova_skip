import { useState, useMemo } from "react";
import {
  Search,
  Globe,
  Clock,
  Award,
  AlertTriangle,
  ExternalLink,
  FileText,
  Video,
  FileType2,
  File,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useTreinamentosPlataformaPublicados,
  useEmpresaHabilitacoesMap,
  useSalvarHabilitacaoTreinamento,
  isSaudeMentalOuPsicossocial,
} from "@/hooks/useEmpresaTreinamentosHabilitados";
import { Treinamento } from "@/hooks/useTreinamentos";
import { useCapaTreinamento, getFallbackGradient } from "./capaUtils";

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case "pdf":
      return <FileText className="h-3.5 w-3.5" />;
    case "video":
      return <Video className="h-3.5 w-3.5" />;
    case "ppt":
      return <FileType2 className="h-3.5 w-3.5" />;
    case "link":
      return <ExternalLink className="h-3.5 w-3.5" />;
    default:
      return <File className="h-3.5 w-3.5" />;
  }
}

function getCertificadoBadge(treinamento: Treinamento) {
  if (treinamento.tipo === "link") {
    return (
      <Badge variant="outline" className="text-[11px] bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
        Link externo — certificado na instituição emissora
      </Badge>
    );
  }

  if (treinamento.gera_certificado === false) {
    return (
      <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300">
        Sem certificado
      </Badge>
    );
  }

  const validadeText = treinamento.validade_meses
    ? `Certificado: ${treinamento.validade_meses} meses`
    : "Certificado: sem expiração";

  return (
    <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
      <Award className="h-3 w-3 mr-1" />
      {validadeText}
    </Badge>
  );
}

export function EmpresaCatalogoPlataforma() {
  const [search, setSearch] = useState("");
  const [pendenteObrigatorioCurso, setPendenteObrigatorioCurso] = useState<Treinamento | null>(null);

  const { data: cursosPlataforma = [], isLoading: loadingCursos } = useTreinamentosPlataformaPublicados();
  const { data: habilitacoesMap = {}, isLoading: loadingHabilitacoes } = useEmpresaHabilitacoesMap();
  const salvarHabilitacao = useSalvarHabilitacaoTreinamento();

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return cursosPlataforma;
    return cursosPlataforma.filter((c) => {
      return (
        c.titulo.toLowerCase().includes(termo) ||
        (c.descricao?.toLowerCase().includes(termo) ?? false) ||
        (c.categoria?.nome?.toLowerCase().includes(termo) ?? false)
      );
    });
  }, [cursosPlataforma, search]);

  const totalHabilitados = useMemo(() => {
    return cursosPlataforma.filter((c) => habilitacoesMap[c.id]?.habilitado).length;
  }, [cursosPlataforma, habilitacoesMap]);

  const handleToggleHabilitado = (curso: Treinamento, novoHabilitado: boolean) => {
    const estadoAtual = habilitacoesMap[curso.id];
    const obrigatorioAtual = estadoAtual?.obrigatorio ?? false;

    salvarHabilitacao.mutate({
      treinamentoId: curso.id,
      habilitado: novoHabilitado,
      obrigatorio: novoHabilitado ? obrigatorioAtual : false,
    });
  };

  const handleToggleObrigatorio = (curso: Treinamento, novoObrigatorio: boolean) => {
    const estadoAtual = habilitacoesMap[curso.id];
    const habilitadoAtual = estadoAtual?.habilitado ?? true;

    // P1: Se for marcar como obrigatório e for tema de saúde mental / psicossocial -> abrir aviso
    if (novoObrigatorio && isSaudeMentalOuPsicossocial(curso.titulo, curso.categoria?.nome)) {
      setPendenteObrigatorioCurso(curso);
      return;
    }

    // Caso contrário, grava diretamente
    salvarHabilitacao.mutate({
      treinamentoId: curso.id,
      habilitado: habilitadoAtual,
      obrigatorio: novoObrigatorio,
    });
  };

  const handleConfirmarObrigatorioSaudeMental = () => {
    if (!pendenteObrigatorioCurso) return;
    const estadoAtual = habilitacoesMap[pendenteObrigatorioCurso.id];
    const habilitadoAtual = estadoAtual?.habilitado ?? true;

    salvarHabilitacao.mutate({
      treinamentoId: pendenteObrigatorioCurso.id,
      habilitado: habilitadoAtual,
      obrigatorio: true,
    });

    setPendenteObrigatorioCurso(null);
  };

  if (loadingCursos || loadingHabilitacoes) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo e busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Catálogo da Plataforma</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cursos globais oficiais e parceiros disponíveis para seus colaboradores. Habilite apenas os que deseja disponibilizar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            {cursosPlataforma.length} disponíveis • {totalHabilitados} habilitados
          </Badge>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar no catálogo da plataforma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {cursosPlataforma.length === 0 ? (
        <Card className="p-8 text-center bg-muted/20 border-dashed">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-base font-medium">Nenhum treinamento global disponível no momento.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Novos cursos publicados pela Talent Group no catálogo da plataforma aparecerão aqui.
          </p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center bg-muted/20 border-dashed">
          <p className="text-sm text-muted-foreground">Nenhum treinamento corresponde à sua busca.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((curso) => {
            const estado = habilitacoesMap[curso.id];
            const estaHabilitado = estado?.habilitado ?? false;
            const estaObrigatorio = estado?.obrigatorio ?? false;

            return (
              <Card
                key={curso.id}
                className={`flex flex-col transition-all duration-200 ${
                  estaHabilitado
                    ? "border-primary/40 shadow-sm"
                    : "opacity-80 bg-muted/20"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    {curso.categoria ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase font-semibold"
                        style={{
                          backgroundColor: curso.categoria.cor ? `${curso.categoria.cor}15` : undefined,
                          color: curso.categoria.cor || undefined,
                          borderColor: curso.categoria.cor || undefined,
                        }}
                      >
                        {curso.categoria.nome}
                      </Badge>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {getTipoIcon(curso.tipo)}
                      <span className="capitalize">{curso.tipo}</span>
                      {curso.duracao_estimada_minutos ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {curso.duracao_estimada_minutos}m
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <CardTitle className="text-base line-clamp-2 mt-2 leading-snug">
                    {curso.titulo}
                  </CardTitle>
                  {curso.descricao && (
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {curso.descricao}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pb-4">
                  {/* Badge de certificado */}
                  <div className="pt-1">{getCertificadoBadge(curso)}</div>
                </CardContent>

                <CardFooter className="pt-3 border-t bg-muted/10 flex flex-col gap-3">
                  {/* Switch Habilitar */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium">
                      {estaHabilitado ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Habilitado
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Desabilitado</span>
                      )}
                    </span>
                    <Switch
                      checked={estaHabilitado}
                      onCheckedChange={(checked) => handleToggleHabilitado(curso, checked)}
                      disabled={salvarHabilitacao.isPending}
                      aria-label={`Habilitar ${curso.titulo}`}
                    />
                  </div>

                  {/* Toggle Obrigatório */}
                  <div className="flex items-center justify-between w-full pt-1 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">
                        Treinamento Obrigatório
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {estaHabilitado
                          ? estaObrigatorio
                            ? "Exibido com destaque obrigatório"
                            : "Opcional para os colaboradores"
                          : "Habilite para tornar obrigatório"}
                      </span>
                    </div>
                    <Switch
                      checked={estaHabilitado && estaObrigatorio}
                      disabled={!estaHabilitado || salvarHabilitacao.isPending}
                      onCheckedChange={(checked) => handleToggleObrigatorio(curso, checked)}
                      aria-label={`Tornar ${curso.titulo} obrigatório`}
                    />
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Aviso Informativo (P1) para Cursos de Saúde Mental / Psicossocial */}
      <Dialog
        open={!!pendenteObrigatorioCurso}
        onOpenChange={(open) => {
          if (!open) setPendenteObrigatorioCurso(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Tornar obrigatório?</DialogTitle>
            </div>
            <DialogDescription className="space-y-2 pt-2 text-sm leading-relaxed text-foreground">
              <span className="block">
                Cursos de saúde mental e temas psicossociais costumam ter mais adesão quando o colaborador escolhe fazê-los voluntariamente.
              </span>
              <span className="block text-muted-foreground">
                Marcar como obrigatório pode gerar desconforto — avalie se é o melhor caminho para sua equipe.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendenteObrigatorioCurso(null)}
              disabled={salvarHabilitacao.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarObrigatorioSaudeMental}
              disabled={salvarHabilitacao.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {salvarHabilitacao.isPending ? "Salvando..." : "Marcar como obrigatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
