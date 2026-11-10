import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Play, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTreinamentosPublicados, useCategoriasTreinamento, Treinamento } from "@/hooks/useTreinamentos";
import { useMeuProgressoTodos } from "@/hooks/useTreinamentoProgresso";
import { TrilhaHorizontal } from "./catalogo/TrilhaHorizontal";
import { TreinamentoCard } from "./catalogo/TreinamentoCard";
import { useCapaTreinamento, getFallbackGradient } from "./catalogo/capaUtils";

function HeroDestaque({ treinamento, iniciado }: { treinamento: Treinamento; iniciado: boolean }) {
  const navigate = useNavigate();
  const capaUrl = useCapaTreinamento(treinamento);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border"
      style={!capaUrl ? { backgroundImage: getFallbackGradient(treinamento.id) } : undefined}
    >
      {capaUrl && (
        <img
          src={capaUrl}
          alt={`Capa do treinamento em destaque ${treinamento.titulo}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />

      <div className="relative flex max-w-2xl flex-col gap-3 p-6 sm:p-10">
        <Badge className="w-fit gap-1" variant="secondary">
          <Sparkles className="h-3 w-3" />
          Em destaque
        </Badge>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{treinamento.titulo}</h1>
        {treinamento.descricao && (
          <p className="line-clamp-3 text-sm text-muted-foreground sm:text-base">{treinamento.descricao}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {treinamento.categoria && <span>{treinamento.categoria.nome}</span>}
          {treinamento.duracao_estimada_minutos ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {treinamento.duracao_estimada_minutos} min
            </span>
          ) : null}
          {treinamento.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
        </div>
        <div>
          <Button className="mt-2" onClick={() => navigate(`/treinamento/${treinamento.id}`)}>
            <Play className="mr-2 h-4 w-4" />
            {iniciado ? "Continuar treinamento" : "Iniciar treinamento"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function TreinamentosCatalogo() {
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");

  const { data: treinamentos, isLoading } = useTreinamentosPublicados();
  const { data: categorias } = useCategoriasTreinamento();
  const { data: progressos = {} } = useMeuProgressoTodos();

  const filtrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return (treinamentos || []).filter((t) => {
      const matchesSearch =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        (t.descricao?.toLowerCase().includes(termo) ?? false);
      const matchesCategoria = categoriaFilter === "all" || t.categoria_id === categoriaFilter;
      return matchesSearch && matchesCategoria;
    });
  }, [treinamentos, search, categoriaFilter]);

  const buscaAtiva = search.trim().length > 0 || categoriaFilter !== "all";

  const destaque = useMemo(
    () => (treinamentos || []).find((t) => t.destaque) || (treinamentos || [])[0] || null,
    [treinamentos]
  );

  const continuar = useMemo(
    () =>
      filtrados.filter((t) => {
        const p = progressos[t.id];
        return p && p.status !== "concluido" && p.status !== "nao_iniciado";
      }),
    [filtrados, progressos]
  );

  const obrigatorios = useMemo(
    () => filtrados.filter((t) => t.obrigatorio && progressos[t.id]?.status !== "concluido"),
    [filtrados, progressos]
  );

  const concluidos = useMemo(
    () => filtrados.filter((t) => progressos[t.id]?.status === "concluido"),
    [filtrados, progressos]
  );

  const porCategoria = useMemo(() => {
    const grupos: { id: string; nome: string; cor?: string | null; itens: Treinamento[] }[] = [];
    (categorias || []).forEach((cat) => {
      const itens = filtrados.filter((t) => t.categoria_id === cat.id);
      if (itens.length) grupos.push({ id: cat.id, nome: cat.nome, cor: cat.cor, itens });
    });
    const semCategoria = filtrados.filter((t) => !t.categoria_id);
    if (semCategoria.length) grupos.push({ id: "sem", nome: "Outros treinamentos", itens: semCategoria });
    return grupos;
  }, [categorias, filtrados]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {destaque && !buscaAtiva && (
        <HeroDestaque
          treinamento={destaque}
          iniciado={!!progressos[destaque.id] && progressos[destaque.id].status !== "nao_iniciado"}
        />
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar treinamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!filtrados.length ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-40" />
          <p>Nenhum treinamento encontrado.</p>
        </div>
      ) : buscaAtiva ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((t) => (
            <TreinamentoCard key={t.id} treinamento={t} progresso={progressos[t.id]} />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <TrilhaHorizontal titulo="Continue de onde parou" treinamentos={continuar} progressos={progressos} />
          <TrilhaHorizontal
            titulo="Obrigatórios para você"
            cor="hsl(var(--destructive))"
            treinamentos={obrigatorios}
            progressos={progressos}
          />
          {porCategoria.map((g) => (
            <TrilhaHorizontal
              key={g.id}
              titulo={g.nome}
              cor={g.cor}
              treinamentos={g.itens}
              progressos={progressos}
            />
          ))}
          <TrilhaHorizontal titulo="Concluídos" treinamentos={concluidos} progressos={progressos} />
        </div>
      )}
    </div>
  );
}
