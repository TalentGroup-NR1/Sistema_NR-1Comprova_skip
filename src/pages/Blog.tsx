import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BlogCard } from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublishedPosts } from "@/hooks/useBlogPosts";

const Blog = () => {
  const { data: posts = [], isLoading } = usePublishedPosts();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");

  const categorias = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category))).sort(),
    [posts],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return posts.filter((p) => {
      const okCategoria = categoria === "todas" || p.category === categoria;
      const okBusca =
        !termo ||
        p.title.toLowerCase().includes(termo) ||
        p.excerpt.toLowerCase().includes(termo);
      return okCategoria && okBusca;
    });
  }, [posts, busca, categoria]);

  return (
    <div className="min-h-screen bg-brand-offwhite font-brand">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-gray-dark">Insights</h1>
          <p className="mt-4 text-muted-foreground">
            Conteúdos sobre conformidade NR-1, saúde ocupacional e gestão estratégica de pessoas.
          </p>
        </header>

        {posts.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar artigo..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={categoria === "todas" ? "default" : "outline"}
                onClick={() => setCategoria("todas")}
              >
                Todas
              </Button>
              {categorias.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={categoria === c ? "default" : "outline"}
                  onClick={() => setCategoria(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">
              {posts.length === 0
                ? "Nossos artigos estarão disponíveis em breve."
                : "Nenhum artigo encontrado com esses filtros."}
            </p>
            <Button asChild className="mt-8 bg-brand-red text-white hover:bg-brand-red/90">
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {filtrados.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
};

export default Blog;
