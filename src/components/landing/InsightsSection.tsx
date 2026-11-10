import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";
import { BlogCard } from "@/components/blog/BlogCard";
import { usePublishedPosts } from "@/hooks/useBlogPosts";

const placeholders = [
  {
    title: "NR-1 e riscos psicossociais: o que muda na fiscalização",
    category: "NR-1",
    date: "Em breve",
  },
  {
    title: "Trabalho prescrito x Trabalho real: por que o PGR falha",
    category: "Gestão de Pessoas",
    date: "Em breve",
  },
  {
    title: "Anonimato e LGPD em pesquisas de clima organizacional",
    category: "LGPD",
    date: "Em breve",
  },
];

export function InsightsSection() {
  const { data: posts = [] } = usePublishedPosts(3);

  return (
    <section id="insights" className="bg-brand-offwhite font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            Insights
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Conteúdos sobre conformidade NR-1, saúde ocupacional e gestão estratégica de pessoas.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.length > 0
            ? posts.map((post, i) => (
                <Reveal key={post.id} delay={i * 80}>
                  <BlogCard post={post} />
                </Reveal>
              ))
            : placeholders.map((post, i) => (
                <Reveal
                  as="article"
                  key={post.title}
                  delay={i * 80}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="landing-navy flex h-36 items-center justify-center">
                    <FileText className="h-8 w-8 text-white/40" aria-hidden="true" />
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
                      {post.category} · {post.date}
                    </p>
                    <h3 className="mt-2 text-base font-bold leading-snug text-brand-gray-dark">
                      {post.title}
                    </h3>
                  </div>
                </Reveal>
              ))}
        </div>

        <Reveal delay={100} className="mt-8">
          <Button variant="outline" asChild className="border-brand-blue text-brand-blue">
            <Link to="/blog">Ver todos os artigos</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
