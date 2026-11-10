import { useMemo, useState } from "react";
import { BookOpen, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListarConteudosAtivos, type CuidarConteudo } from "@/hooks/useCuidarConteudos";
import { ConteudoCard } from "./ConteudoCard";

export function BibliotecaApoio() {
  const { data, isLoading } = useListarConteudosAtivos();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("all");

  const conteudos = useMemo(() => data ?? [], [data]);

  const categorias = useMemo(
    () => Array.from(new Set(conteudos.map((c) => c.categoria))).sort((a, b) => a.localeCompare(b)),
    [conteudos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return conteudos.filter((c) => {
      if (categoriaAtiva !== "all" && c.categoria !== categoriaAtiva) return false;
      if (!termo) return true;
      return (
        c.titulo.toLowerCase().includes(termo) ||
        (c.descricao ?? "").toLowerCase().includes(termo) ||
        (c.parceiro_nome ?? "").toLowerCase().includes(termo)
      );
    });
  }, [conteudos, busca, categoriaAtiva]);

  const destaques = useMemo(() => filtrados.filter((c) => c.destaque), [filtrados]);

  const grupos = useMemo(() => {
    const map = new Map<string, CuidarConteudo[]>();
    filtrados
      .filter((c) => !c.destaque)
      .forEach((c) => {
        const arr = map.get(c.categoria) ?? [];
        arr.push(c);
        map.set(c.categoria, arr);
      });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  const vazio = !isLoading && filtrados.length === 0;

  return (
    <section className="mt-8">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-[20px] font-bold text-foreground">
              Biblioteca de Apoio
            </h2>
            <p className="text-xs text-muted-foreground">
              Cartilhas, vídeos e artigos para cuidar da sua saúde mental.
            </p>
          </div>
        </div>
        {conteudos.length > 0 && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </header>

      {categorias.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoriaAtiva("all")}>
            <Badge
              variant={categoriaAtiva === "all" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              Todos
            </Badge>
          </button>
          {categorias.map((cat) => (
            <button key={cat} type="button" onClick={() => setCategoriaAtiva(cat)}>
              <Badge
                variant={categoriaAtiva === cat ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-xs"
              >
                {cat}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : vazio ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {conteudos.length === 0
              ? "Nenhum material disponível no momento."
              : "Nenhum material encontrado para esta busca."}
          </p>
          {conteudos.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              O RH publicará conteúdos sobre saúde mental e bem-estar em breve.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-9">
          {destaques.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-primary" />
                Em destaque
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {destaques.map((c) => (
                  <ConteudoCard key={c.id} conteudo={c} destaque />
                ))}
              </div>
            </div>
          )}

          {grupos.map(([categoria, itens]) => (
            <div key={categoria}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {categoria}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {itens.map((c) => (
                  <ConteudoCard key={c.id} conteudo={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
